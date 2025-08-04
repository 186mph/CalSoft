-- Fix missing database tables and permissions
-- Run this in Supabase SQL Editor

-- Ensure the common schema exists
CREATE SCHEMA IF NOT EXISTS common;

-- Create common.system_config table for encryption settings
CREATE TABLE IF NOT EXISTS common.system_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create common.profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    role text DEFAULT 'user',
    division text,
    updated_at timestamp with time zone
);

-- Create common.user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.user_preferences (
    user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    notification_preferences jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- Create common.opportunities table if it doesn't exist (to fix 404 error)
CREATE TABLE IF NOT EXISTS common.opportunities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text,
    description text,
    status text DEFAULT 'open',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Set up RLS for all tables
ALTER TABLE common.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.opportunities ENABLE ROW LEVEL SECURITY;

-- Policies for common.system_config (admin access only)
DROP POLICY IF EXISTS "System config admin access" ON common.system_config;
CREATE POLICY "System config admin access" ON common.system_config
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

-- Policies for common.profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON common.profiles;
CREATE POLICY "Users can view their own profile" ON common.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON common.profiles;
CREATE POLICY "Users can update their own profile" ON common.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON common.profiles;
CREATE POLICY "Authenticated users can insert their own profile" ON common.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for common.user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON common.user_preferences;
CREATE POLICY "Users can view their own preferences" ON common.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON common.user_preferences;
CREATE POLICY "Users can update their own preferences" ON common.user_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert their own preferences" ON common.user_preferences;
CREATE POLICY "Authenticated users can insert their own preferences" ON common.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for common.opportunities (basic CRUD for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can manage opportunities" ON common.opportunities;
CREATE POLICY "Authenticated users can manage opportunities" ON common.opportunities
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON common.system_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON common.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON common.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON common.opportunities TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON common.system_config(key);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON common.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON common.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON common.opportunities(status); 