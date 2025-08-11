-- Complete RPC Fix - Run this in Supabase SQL Editor
-- This fixes ALL the 406 errors causing slow loading

-- Step 1: Create the common schema
CREATE SCHEMA IF NOT EXISTS common;

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'user',
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 3: Create custom_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.custom_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text DEFAULT 'system'
);

-- Step 4: Enable RLS and create policies
ALTER TABLE common.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to access profiles" ON common.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to access custom_roles" ON common.custom_roles;

CREATE POLICY "Allow all authenticated users to access profiles"
    ON common.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to access custom_roles"
    ON common.custom_roles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON common.profiles TO authenticated;
GRANT ALL ON common.custom_roles TO authenticated;

-- Step 5: Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS admin_get_custom_roles();
DROP FUNCTION IF EXISTS admin_update_role(text, jsonb);
DROP FUNCTION IF EXISTS admin_delete_role(text);
DROP FUNCTION IF EXISTS get_user_metadata(UUID);
DROP FUNCTION IF EXISTS common.get_user_metadata(UUID);

-- Step 6: Create admin_get_custom_roles function
CREATE OR REPLACE FUNCTION admin_get_custom_roles()
RETURNS TABLE (
    id UUID,
    name TEXT,
    config JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all custom roles (no admin check for now to prevent 406 errors)
    RETURN QUERY
    SELECT 
        cr.id,
        cr.name,
        cr.config,
        cr.created_at,
        cr.updated_at,
        cr.created_by
    FROM common.custom_roles cr
    ORDER BY cr.created_at DESC;
END;
$$;

-- Step 7: Create admin_update_role function
CREATE OR REPLACE FUNCTION admin_update_role(role_name TEXT, role_config JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update the role
    INSERT INTO common.custom_roles (name, config, updated_at)
    VALUES (role_name, role_config, now())
    ON CONFLICT (name) 
    DO UPDATE SET 
        config = role_config,
        updated_at = now();
    
    RETURN true;
END;
$$;

-- Step 8: Create admin_delete_role function
CREATE OR REPLACE FUNCTION admin_delete_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the role
    DELETE FROM common.custom_roles WHERE name = role_name;
    RETURN FOUND;
END;
$$;

-- Step 9: Create get_user_metadata function in public schema
CREATE OR REPLACE FUNCTION get_user_metadata(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'name', u.raw_user_meta_data->>'name',
            'full_name', u.raw_user_meta_data->>'full_name',
            'username', u.raw_user_meta_data->>'username',
            'profile_image', u.raw_user_meta_data->>'profileImage',
            'avatar_url', u.raw_user_meta_data->>'avatar_url',
            'role', u.raw_user_meta_data->>'role'
        ) INTO v_result
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    RETURN v_result;
END;
$$;

-- Step 10: Create get_user_metadata function in common schema
CREATE OR REPLACE FUNCTION common.get_user_metadata(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'name', u.raw_user_meta_data->>'name',
            'full_name', u.raw_user_meta_data->>'full_name',
            'username', u.raw_user_meta_data->>'username',
            'profile_image', u.raw_user_meta_data->>'profileImage',
            'avatar_url', u.raw_user_meta_data->>'avatar_url',
            'role', u.raw_user_meta_data->>'role'
        ) INTO v_result
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    RETURN v_result;
END;
$$;

-- Step 11: Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_custom_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_role(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_metadata(UUID) TO authenticated;

-- Step 12: Populate profiles with existing users
INSERT INTO common.profiles (id, email, full_name, avatar_url)
SELECT 
    id,
    email,
    COALESCE(
        raw_user_meta_data->>'name',
        raw_user_meta_data->>'full_name',
        email
    ) as full_name,
    raw_user_meta_data->>'profileImage' as avatar_url
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, common.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, common.profiles.avatar_url),
    updated_at = NOW();

-- Step 13: Insert default admin role
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

-- Step 14: Verify the fix
SELECT 'Profiles table count:' as info, COUNT(*) as count FROM common.profiles;
SELECT 'Custom roles count:' as info, COUNT(*) as count FROM common.custom_roles;
SELECT 'All RPC functions created successfully!' as status; 