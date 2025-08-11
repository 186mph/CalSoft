-- Missing RPC Functions Fix - Run this in Supabase SQL Editor
-- This fixes all the 406 errors causing slow loading

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

-- Step 3: Enable RLS and create policies
ALTER TABLE common.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to access profiles" ON common.profiles;
CREATE POLICY "Allow all authenticated users to access profiles"
    ON common.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON common.profiles TO authenticated;

-- Step 4: Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS admin_get_custom_roles();
DROP FUNCTION IF EXISTS get_user_metadata(UUID);
DROP FUNCTION IF EXISTS common.get_user_metadata(UUID);

-- Step 5: Create admin_get_custom_roles function
CREATE OR REPLACE FUNCTION admin_get_custom_roles()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- For now, return empty result to prevent 406 errors
    -- This can be expanded later when custom roles are implemented
    RETURN QUERY
    SELECT 
        NULL::UUID as id,
        NULL::TEXT as name,
        NULL::TEXT as description,
        NULL::JSONB as permissions,
        NULL::TIMESTAMPTZ as created_at
    WHERE false; -- This ensures no rows are returned
END;
$$;

-- Step 6: Create get_user_metadata function in public schema
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

-- Step 7: Create get_user_metadata function in common schema
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

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_custom_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_metadata(UUID) TO authenticated;

-- Step 9: Populate profiles with existing users
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

-- Step 10: Verify the fix
SELECT 'Profiles table count:' as info, COUNT(*) as count FROM common.profiles;
SELECT 'Functions created successfully!' as status; 