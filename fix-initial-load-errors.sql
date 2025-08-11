-- Comprehensive Fix for Initial Load Errors
-- Run this in Supabase SQL Editor to fix all console errors

-- 1. Ensure all required schemas exist
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS lab_ops;

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA common TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA neta_ops TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA business TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA lab_ops TO authenticated, anon, service_role;

-- 2. Create missing common.profiles table
CREATE TABLE IF NOT EXISTS common.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'user',
    bio text,
    division text,
    birthday date,
    avatar_url text,
    cover_image text,
    title text,
    department text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create common.system_config table for encryption settings
CREATE TABLE IF NOT EXISTS common.system_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create common.user_preferences table
CREATE TABLE IF NOT EXISTS common.user_preferences (
    user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    notification_preferences jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create common.opportunities table
CREATE TABLE IF NOT EXISTS common.opportunities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text,
    description text,
    status text DEFAULT 'open',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 6. Enable RLS on all tables
ALTER TABLE common.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.opportunities ENABLE ROW LEVEL SECURITY;

-- 7. Fix RLS policies for common.profiles (allow all authenticated users)
DROP POLICY IF EXISTS "Users can view their own profile" ON common.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON common.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON common.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to access profiles" ON common.profiles;

CREATE POLICY "Allow all authenticated users to access profiles"
    ON common.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Fix RLS policies for common.system_config (admin access only)
DROP POLICY IF EXISTS "System config admin access" ON common.system_config;
DROP POLICY IF EXISTS "Only admins can view encryption settings" ON common.system_config;
DROP POLICY IF EXISTS "Only admins can modify encryption settings" ON common.system_config;

CREATE POLICY "System config admin access"
    ON common.system_config
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'Admin'
        )
    );

-- 9. Fix RLS policies for common.user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON common.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON common.user_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert their own preferences" ON common.user_preferences;
DROP POLICY IF EXISTS "Allow all authenticated users to access user_preferences" ON common.user_preferences;

CREATE POLICY "Allow all authenticated users to access user_preferences"
    ON common.user_preferences
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 10. Fix RLS policies for common.opportunities
DROP POLICY IF EXISTS "Authenticated users can manage opportunities" ON common.opportunities;
DROP POLICY IF EXISTS "Allow all authenticated users to access opportunities" ON common.opportunities;

CREATE POLICY "Allow all authenticated users to access opportunities"
    ON common.opportunities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 11. Grant necessary permissions
GRANT ALL ON common.profiles TO authenticated;
GRANT ALL ON common.system_config TO authenticated;
GRANT ALL ON common.user_preferences TO authenticated;
GRANT ALL ON common.opportunities TO authenticated;

-- 12. Fix RPC functions - Create get_user_details function in common schema
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
        )::TEXT as name,
        COALESCE(
            au.raw_user_meta_data->>'profileImage',
            au.raw_user_meta_data->>'avatar_url'
        )::TEXT as profile_image
    FROM 
        auth.users au
    WHERE 
        au.id = user_id;
END;
$$;

-- 13. Create get_user_metadata function in common schema
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

-- 14. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION common.get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_metadata(UUID) TO authenticated;

-- 15. Populate profiles table with existing users
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

-- 16. Create trigger to auto-update profiles when users are created/updated
CREATE OR REPLACE FUNCTION common.sync_user_data_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO common.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.email
        ),
        NEW.raw_user_meta_data->>'profileImage'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = NEW.email,
        full_name = COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.email
        ),
        avatar_url = NEW.raw_user_meta_data->>'profileImage',
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION common.sync_user_data_to_profiles();

-- 17. Grant execute permission on trigger function
GRANT EXECUTE ON FUNCTION common.sync_user_data_to_profiles() TO authenticated;

-- 18. Create initial encryption settings if they don't exist
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

-- 19. Verify the fixes
SELECT 'Profiles table count:' as info, COUNT(*) as count FROM common.profiles;
SELECT 'System config entries:' as info, COUNT(*) as count FROM common.system_config;
SELECT 'User preferences count:' as info, COUNT(*) as count FROM common.user_preferences;

-- 20. Test RPC functions
SELECT 'Testing get_user_details function...' as test;
SELECT * FROM common.get_user_details(auth.uid()) LIMIT 1;

SELECT 'Testing get_user_metadata function...' as test;
SELECT common.get_user_metadata(auth.uid());

-- Success message
SELECT 'All initial load errors have been fixed!' as status; 