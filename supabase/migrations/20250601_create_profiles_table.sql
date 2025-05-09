-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT,
  bio TEXT,
  division TEXT,
  birthday DATE,
  avatar_url TEXT,
  cover_image TEXT,
  title TEXT,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to auto-update the updated_at field
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Create RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profile information
CREATE POLICY profiles_select_policy 
ON profiles FOR SELECT 
TO authenticated
USING (true);

-- Users can only update their own profiles
CREATE POLICY profiles_update_policy
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Create function to sync user data from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_data_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'profileImage'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'name',
    avatar_url = NEW.raw_user_meta_data->>'profileImage',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync user data whenever a user is created or updated
CREATE TRIGGER on_auth_user_created_or_updated
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_user_data_to_profiles();

-- Populate profiles table with existing users
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT 
  id,
  email,
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'profileImage'
FROM auth.users
ON CONFLICT (id) DO NOTHING; 