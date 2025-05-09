-- Migration to add permission audit logging
-- This enhances security by tracking who is accessing what resources and whether access was granted

-- Create permission access logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.permission_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  target_id TEXT,
  granted BOOLEAN NOT NULL,
  reason TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment to explain the table
COMMENT ON TABLE common.permission_access_logs IS 'Tracks permission checks and resource access attempts with detailed context';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_permission_access_logs_user_id ON common.permission_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_access_logs_resource ON common.permission_access_logs(resource);
CREATE INDEX IF NOT EXISTS idx_permission_access_logs_action ON common.permission_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_permission_access_logs_granted ON common.permission_access_logs(granted);
CREATE INDEX IF NOT EXISTS idx_permission_access_logs_created_at ON common.permission_access_logs(created_at);

-- Enable RLS on the table
ALTER TABLE common.permission_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view permission access logs
CREATE POLICY "Only admins can view permission access logs" 
ON common.permission_access_logs 
FOR SELECT
USING (auth.jwt() ->> 'role' = 'Admin');

-- Allow authenticated users to insert logs (needed for client-side logging)
CREATE POLICY "Authenticated users can log permission checks" 
ON common.permission_access_logs 
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions on the table
GRANT SELECT, INSERT ON TABLE common.permission_access_logs TO authenticated;

-- Create function to log permission access
CREATE OR REPLACE FUNCTION common.log_permission_access(
  p_user_id TEXT,
  p_role TEXT,
  p_resource TEXT,
  p_action TEXT,
  p_scope TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_granted BOOLEAN DEFAULT FALSE,
  p_reason TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = common, neta_ops, business
AS $$
DECLARE
  v_ip TEXT;
  v_user_agent TEXT;
  v_log_id UUID;
BEGIN
  -- Get IP and user agent from request headers if available
  v_ip := coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown');
  v_user_agent := coalesce(current_setting('request.headers', true)::json->>'user-agent', 'unknown');
  
  -- Insert the log entry
  INSERT INTO common.permission_access_logs
    (user_id, role, resource, action, scope, target_id, granted, reason, details, ip_address, user_agent)
  VALUES
    (p_user_id, p_role, p_resource, p_action, p_scope, p_target_id, p_granted, p_reason, p_details, v_ip, v_user_agent)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION common.log_permission_access TO authenticated;

-- Create a more comprehensive has_permission function that includes logging
CREATE OR REPLACE FUNCTION common.has_permission_with_log(
  user_id UUID,
  resource TEXT,
  action TEXT,
  scope TEXT DEFAULT 'own',
  target_id TEXT DEFAULT NULL,
  should_log BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = common, neta_ops, business
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
  v_has_permission BOOLEAN := FALSE;
  v_reason TEXT;
BEGIN
  -- Get the user's role
  SELECT raw_user_meta_data->>'role' INTO v_role
  FROM auth.users
  WHERE id = user_id;
  
  -- First check if it's a system admin (has all permissions)
  IF v_role = 'Admin' THEN
    v_has_permission := TRUE;
    v_reason := 'System Admin role';
  ELSE
    -- Check if it's a custom role
    SELECT config->'permissions' INTO v_permissions
    FROM common.custom_roles
    WHERE name = v_role;
    
    -- Check if the role has the specific permission
    IF v_permissions IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(v_permissions) AS perm
        WHERE 
          (perm->>'resource' = resource) AND
          (perm->>'action' = action) AND
          (
            (perm->>'scope' IS NULL) OR
            (perm->>'scope' = 'all') OR
            (perm->>'scope' = scope) OR
            (perm->>'scope' = 'division' AND scope = 'team')
          )
      ) INTO v_has_permission;
      
      IF v_has_permission THEN
        v_reason := 'Direct permission';
      ELSE
        -- Check if the role has a parent role with the permission
        WITH RECURSIVE role_hierarchy AS (
          -- Start with the current role
          SELECT 
            name,
            config->>'parentRole' AS parent_role
          FROM common.custom_roles
          WHERE name = v_role
          
          UNION ALL
          
          -- Join with parent roles
          SELECT
            cr.name,
            cr.config->>'parentRole' AS parent_role
          FROM common.custom_roles cr
          JOIN role_hierarchy rh ON cr.name = rh.parent_role
          WHERE rh.parent_role IS NOT NULL
        )
        SELECT EXISTS (
          SELECT 1
          FROM role_hierarchy rh
          JOIN common.custom_roles cr ON rh.parent_role = cr.name
          JOIN jsonb_array_elements(cr.config->'permissions') AS perm ON true
          WHERE
            (perm->>'resource' = resource) AND
            (perm->>'action' = action) AND
            (
              (perm->>'scope' IS NULL) OR
              (perm->>'scope' = 'all') OR
              (perm->>'scope' = scope) OR
              (perm->>'scope' = 'division' AND scope = 'team')
            )
        ) INTO v_has_permission;
        
        IF v_has_permission THEN
          v_reason := 'Inherited permission';
        ELSE
          v_reason := 'No matching permission found';
        END IF;
      END IF;
    ELSE
      v_reason := 'Role has no permissions defined';
    END IF;
  END IF;
  
  -- Log the permission check if requested
  IF should_log THEN
    PERFORM common.log_permission_access(
      user_id::text,
      v_role,
      resource,
      action,
      scope,
      target_id,
      v_has_permission,
      v_reason
    );
  END IF;
  
  RETURN v_has_permission;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION common.has_permission_with_log TO authenticated;

-- Update the user_permissions table for fine-grained permissions
CREATE TABLE IF NOT EXISTS common.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT DEFAULT 'own',
  conditions JSONB,
  granted_by UUID REFERENCES auth.users(id),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource, action, scope)
);

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON common.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource_action ON common.user_permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON common.user_permissions(is_active) WHERE is_active = TRUE;

-- Enable RLS on the table
ALTER TABLE common.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Only admins can manage permissions" 
ON common.user_permissions 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'Admin')
WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" 
ON common.user_permissions 
FOR SELECT
USING (user_id = auth.uid());

-- Grant permissions on the table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE common.user_permissions TO authenticated;

-- Create a timestamp update trigger
CREATE TRIGGER trigger_user_permissions_timestamp
BEFORE UPDATE ON common.user_permissions
FOR EACH ROW
EXECUTE FUNCTION common.update_timestamp(); 