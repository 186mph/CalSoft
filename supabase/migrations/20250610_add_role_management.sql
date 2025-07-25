-- Migration to add role management features
-- This allows storing and managing custom roles with advanced permissions

-- Create a table to store custom roles
CREATE TABLE IF NOT EXISTS common.custom_roles (
  name TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add comment to explain the table
COMMENT ON TABLE common.custom_roles IS 'Stores custom role definitions with their permissions configuration';

-- Create a timestamp update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION common.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for timestamp updates
DROP TRIGGER IF EXISTS trigger_custom_roles_timestamp ON common.custom_roles;
CREATE TRIGGER trigger_custom_roles_timestamp
BEFORE UPDATE ON common.custom_roles
FOR EACH ROW
EXECUTE FUNCTION common.update_timestamp();

-- Enable RLS on roles table
ALTER TABLE common.custom_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles
CREATE POLICY "Only admins can manage roles" 
ON common.custom_roles 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'Admin')
WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- Create audit log table for role changes
CREATE TABLE IF NOT EXISTS common.role_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  previous_config JSONB,
  new_config JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE common.role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view role audit logs
CREATE POLICY "Only admins can view role audit logs" 
ON common.role_audit_logs 
FOR SELECT
USING (auth.jwt() ->> 'role' = 'Admin');

-- Function to create or update a role
CREATE OR REPLACE FUNCTION admin_update_role(role_name TEXT, role_config JSONB)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = common, neta_ops, business
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_config JSONB;
  v_user_id UUID;
  v_ip TEXT;
  v_user_agent TEXT;
BEGIN
  -- Get the current user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Get IP and user agent from request headers (if available)
  v_ip := coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown');
  v_user_agent := coalesce(current_setting('request.headers', true)::json->>'user-agent', 'unknown');
  
  -- Get previous config if exists
  SELECT config INTO v_prev_config
  FROM common.custom_roles
  WHERE name = role_name;
  
  -- Insert or update the role
  INSERT INTO common.custom_roles (name, config, created_by)
  VALUES (role_name, role_config, v_user_id)
  ON CONFLICT (name) 
  DO UPDATE SET 
    config = role_config,
    updated_at = NOW();
  
  -- Log the change
  INSERT INTO common.role_audit_logs
    (role_name, action, previous_config, new_config, user_id, ip_address, user_agent)
  VALUES
    (role_name, 
     CASE WHEN v_prev_config IS NULL THEN 'create' ELSE 'update' END,
     v_prev_config,
     role_config,
     v_user_id,
     v_ip,
     v_user_agent);
  
  RETURN TRUE;
END;
$$;

-- Function to delete a role
CREATE OR REPLACE FUNCTION admin_delete_role(role_name TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = common, neta_ops, business
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_config JSONB;
  v_user_id UUID;
  v_ip TEXT;
  v_user_agent TEXT;
BEGIN
  -- Get the current user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Get IP and user agent from request headers (if available)
  v_ip := coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown');
  v_user_agent := coalesce(current_setting('request.headers', true)::json->>'user-agent', 'unknown');
  
  -- Get previous config for audit log
  SELECT config INTO v_prev_config
  FROM common.custom_roles
  WHERE name = role_name;
  
  -- If role doesn't exist, return false
  IF v_prev_config IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the role
  DELETE FROM common.custom_roles
  WHERE name = role_name;
  
  -- Log the deletion
  INSERT INTO common.role_audit_logs
    (role_name, action, previous_config, user_id, ip_address, user_agent)
  VALUES
    (role_name, 'delete', v_prev_config, v_user_id, v_ip, v_user_agent);
  
  RETURN TRUE;
END;
$$;

-- Function to get all custom roles
CREATE OR REPLACE FUNCTION admin_get_custom_roles()
RETURNS SETOF common.custom_roles
SECURITY DEFINER
SET search_path = common, neta_ops, business
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM common.custom_roles;
END;
$$;

-- Function to check if a role has a specific permission (for policy use)
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, resource TEXT, action TEXT, scope TEXT DEFAULT 'own')
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = common, neta_ops, business
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
  v_has_permission BOOLEAN := FALSE;
BEGIN
  -- Get the user's role
  SELECT raw_user_meta_data->>'role' INTO v_role
  FROM auth.users
  WHERE id = user_id;
  
  -- First check if it's a system admin (has all permissions)
  IF v_role = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
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
          (perm->>'scope' = scope)
        )
    ) INTO v_has_permission;
  END IF;
  
  RETURN v_has_permission;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_update_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_custom_roles TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;

-- Grant permissions on the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE common.custom_roles TO authenticated;
GRANT SELECT, INSERT ON TABLE common.role_audit_logs TO authenticated; 