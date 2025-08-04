-- Fix missing custom_roles table and RPC functions
-- Run this in Supabase SQL Editor

-- Create common.custom_roles table
CREATE TABLE IF NOT EXISTS common.custom_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text DEFAULT 'system'
);

-- Create common.role_audit_logs table
CREATE TABLE IF NOT EXISTS common.role_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name text NOT NULL,
    action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    previous_config jsonb,
    new_config jsonb,
    user_id uuid REFERENCES auth.users(id),
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Set up RLS
ALTER TABLE common.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for custom_roles (admin access)
DROP POLICY IF EXISTS "Admin can manage custom roles" ON common.custom_roles;
CREATE POLICY "Admin can manage custom roles" ON common.custom_roles
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

-- Policies for role_audit_logs (admin access)
DROP POLICY IF EXISTS "Admin can view role audit logs" ON common.role_audit_logs;
CREATE POLICY "Admin can view role audit logs" ON common.role_audit_logs
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

-- Grant permissions
GRANT ALL ON common.custom_roles TO authenticated;
GRANT ALL ON common.role_audit_logs TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON common.custom_roles(name);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_role_name ON common.role_audit_logs(role_name);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_created_at ON common.role_audit_logs(created_at);

-- Create RPC function for getting custom roles
CREATE OR REPLACE FUNCTION admin_get_custom_roles()
RETURNS TABLE (
    name text,
    config jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        cr.name,
        cr.config,
        cr.created_at,
        cr.updated_at,
        cr.created_by
    FROM common.custom_roles cr
    ORDER BY cr.created_at DESC;
END;
$$;

-- Create RPC function for updating roles
CREATE OR REPLACE FUNCTION admin_update_role(
    role_name text,
    role_config jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Insert or update the role
    INSERT INTO common.custom_roles (name, config, updated_at)
    VALUES (role_name, role_config, now())
    ON CONFLICT (name) 
    DO UPDATE SET 
        config = role_config,
        updated_at = now();
    
    -- Log the action
    INSERT INTO common.role_audit_logs (role_name, action, new_config, user_id)
    VALUES (role_name, 'update', role_config, auth.uid());
    
    RETURN true;
END;
$$;

-- Create RPC function for deleting roles
CREATE OR REPLACE FUNCTION admin_delete_role(role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Log the action before deletion
    INSERT INTO common.role_audit_logs (role_name, action, previous_config, user_id)
    SELECT name, 'delete', config, auth.uid()
    FROM common.custom_roles
    WHERE name = role_name;
    
    -- Delete the role
    DELETE FROM common.custom_roles WHERE name = role_name;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION admin_get_custom_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_role(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_role(text) TO authenticated;

-- Insert default admin role
INSERT INTO common.custom_roles (name, config, created_by)
VALUES (
    'Admin',
    '{
        "dashboard": {"view": true, "edit": true, "delete": true},
        "jobs": {"view": true, "create": true, "edit": true, "delete": true},
        "customers": {"view": true, "create": true, "edit": true, "delete": true},
        "reports": {"view": true, "create": true, "edit": true, "delete": true},
        "users": {"view": true, "create": true, "edit": true, "delete": true},
        "settings": {"view": true, "edit": true}
    }'::jsonb,
    'system'
) ON CONFLICT (name) DO NOTHING; 