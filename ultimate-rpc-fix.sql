-- Ultimate RPC Fix - Run this in Supabase SQL Editor
-- This creates functions in both public and common schemas to handle all calls

-- Step 1: Create the common schema
CREATE SCHEMA IF NOT EXISTS common;

-- Step 2: Create the profiles table
CREATE TABLE IF NOT EXISTS common.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'user',
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 3: Create system_config table
CREATE TABLE IF NOT EXISTS common.system_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 4: Enable RLS (safe - won't error if already enabled)
ALTER TABLE common.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.system_config ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies safely (if they exist)
DROP POLICY IF EXISTS "Allow all authenticated users to access profiles" ON common.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to access system_config" ON common.system_config;

-- Step 6: Create permissive policies
CREATE POLICY "Allow all authenticated users to access profiles"
    ON common.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to access system_config"
    ON common.system_config
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON common.profiles TO authenticated;
GRANT ALL ON common.system_config TO authenticated;

-- Step 8: Drop ALL existing RPC functions to avoid conflicts
DROP FUNCTION IF EXISTS common.get_user_details(UUID);
DROP FUNCTION IF EXISTS common.get_user_metadata(UUID);
DROP FUNCTION IF EXISTS get_user_details(UUID);
DROP FUNCTION IF EXISTS get_user_metadata(UUID);
DROP FUNCTION IF EXISTS get_user_details_by_name(TEXT);
DROP FUNCTION IF EXISTS common.get_user_details_by_name(TEXT);

-- Step 9: Create RPC functions in BOTH public and common schemas

-- Public schema functions (for calls without schema prefix)
CREATE OR REPLACE FUNCTION get_user_details(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(
            au.raw_user_meta_data->>'name',
            au.raw_user_meta_data->>'full_name',
            au.email
        ),
        COALESCE(
            au.raw_user_meta_data->>'profileImage',
            au.raw_user_meta_data->>'avatar_url'
        )
    FROM 
        auth.users au
    WHERE 
        au.id = user_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION get_user_details_by_name(name_fragment TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(
            u.raw_user_meta_data->>'name', 
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'username',
            u.email
        ) AS name,
        COALESCE(
            u.raw_user_meta_data->>'profileImage',
            u.raw_user_meta_data->>'avatar_url'
        ) AS profile_image
    FROM auth.users u
    WHERE 
        (u.raw_user_meta_data->>'name' ILIKE '%' || name_fragment || '%') OR
        (u.raw_user_meta_data->>'full_name' ILIKE '%' || name_fragment || '%') OR
        (u.raw_user_meta_data->>'username' ILIKE '%' || name_fragment || '%') OR
        (u.email ILIKE '%' || name_fragment || '%')
    LIMIT 10;
END;
$$;

-- Common schema functions (for calls with schema prefix)
CREATE OR REPLACE FUNCTION common.get_user_details(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(
            au.raw_user_meta_data->>'name',
            au.raw_user_meta_data->>'full_name',
            au.email
        ),
        COALESCE(
            au.raw_user_meta_data->>'profileImage',
            au.raw_user_meta_data->>'avatar_url'
        )
    FROM 
        auth.users au
    WHERE 
        au.id = user_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION common.get_user_details_by_name(name_fragment TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(
            u.raw_user_meta_data->>'name', 
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'username',
            u.email
        ) AS name,
        COALESCE(
            u.raw_user_meta_data->>'profileImage',
            u.raw_user_meta_data->>'avatar_url'
        ) AS profile_image
    FROM auth.users u
    WHERE 
        (u.raw_user_meta_data->>'name' ILIKE '%' || name_fragment || '%') OR
        (u.raw_user_meta_data->>'full_name' ILIKE '%' || name_fragment || '%') OR
        (u.raw_user_meta_data->>'username' ILIKE '%' || name_fragment || '%') OR
        (u.email ILIKE '%' || name_fragment || '%')
    LIMIT 10;
END;
$$;

-- Step 10: Grant execute permissions on ALL functions
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_details_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_details_by_name(TEXT) TO authenticated;

-- Step 11: Populate profiles with existing users
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

-- Step 12: Create initial encryption settings
INSERT INTO common.system_config (key, value)
VALUES (
    'encryptionSettings',
    jsonb_build_object(
        'currentKey', 'default-key-for-development',
        'created', NOW()::text,
        'rotationIntervalDays', 90,
        'previousKeys', '[]'::jsonb
    )
)
ON CONFLICT (key) DO NOTHING;

-- Step 13: Test ALL functions
SELECT 'Testing public.get_user_details function...' as test;
SELECT * FROM get_user_details(auth.uid()) LIMIT 1;

SELECT 'Testing public.get_user_metadata function...' as test;
SELECT get_user_metadata(auth.uid());

SELECT 'Testing public.get_user_details_by_name function...' as test;
SELECT * FROM get_user_details_by_name('test') LIMIT 1;

SELECT 'Testing common.get_user_details function...' as test;
SELECT * FROM common.get_user_details(auth.uid()) LIMIT 1;

SELECT 'Testing common.get_user_metadata function...' as test;
SELECT common.get_user_metadata(auth.uid());

SELECT 'Testing common.get_user_details_by_name function...' as test;
SELECT * FROM common.get_user_details_by_name('test') LIMIT 1;

-- Step 14: Verify the fix
SELECT 'Profiles table count:' as info, COUNT(*) as count FROM common.profiles;
SELECT 'System config entries:' as info, COUNT(*) as count FROM common.system_config;

-- Success message
SELECT 'All RPC functions fixed! 406 errors should be resolved.' as status; 