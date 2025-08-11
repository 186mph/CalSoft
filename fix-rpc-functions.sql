-- Fix RPC Functions with Correct Type Casting
-- Run this in Supabase SQL Editor

-- Drop existing functions first
DROP FUNCTION IF EXISTS common.get_user_details(UUID);
DROP FUNCTION IF EXISTS common.get_user_metadata(UUID);

-- Create get_user_details function with proper type casting
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
        au.id::UUID,
        au.email::TEXT,
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

-- Create get_user_metadata function
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION common.get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_metadata(UUID) TO authenticated;

-- Test the functions
SELECT 'Testing get_user_details function...' as test;
SELECT * FROM common.get_user_details(auth.uid()) LIMIT 1;

SELECT 'Testing get_user_metadata function...' as test;
SELECT common.get_user_metadata(auth.uid()); 