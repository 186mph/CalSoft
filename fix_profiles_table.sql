-- Check and fix profiles table
-- Run this in the Supabase SQL Editor

-- First, let's see what's in the profiles table
SELECT 'Current profiles table contents:' as info;
SELECT id, email, full_name, created_at FROM profiles LIMIT 10;

-- Check what's in auth.users
SELECT 'Current auth.users contents:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users LIMIT 10;

-- Populate profiles table with missing users
-- This will create profile records for any users that don't have them
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) as full_name,
  raw_user_meta_data->>'profileImage' as avatar_url
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
  updated_at = NOW();

-- Update existing profiles with latest data
UPDATE profiles 
SET
  email = auth_users.email,
  full_name = COALESCE(
    auth_users.raw_user_meta_data->>'full_name',
    auth_users.raw_user_meta_data->>'name',
    auth_users.email
  ),
  avatar_url = auth_users.raw_user_meta_data->>'profileImage',
  updated_at = NOW()
FROM auth.users as auth_users
WHERE profiles.id = auth_users.id;

-- Show final result
SELECT 'Final profiles table contents:' as info;
SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;

-- Check if the trigger is working
SELECT 'Checking if sync trigger exists:' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth'; 