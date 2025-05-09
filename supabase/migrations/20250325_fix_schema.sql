-- First, add any missing columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add missing columns to opportunities table that the application expects
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS amp_division TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Add missing columns to contacts table that the application expects
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Update existing contacts to use first_name from name if it exists
UPDATE contacts SET first_name = name WHERE first_name IS NULL AND name IS NOT NULL;

-- Fix the NOT NULL constraint issue with the name column
-- Option 1: Remove the NOT NULL constraint
ALTER TABLE contacts ALTER COLUMN name DROP NOT NULL;

-- Option 2: Create a trigger to automatically set name from first_name and last_name
CREATE OR REPLACE FUNCTION set_contact_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
      NEW.name = NEW.first_name || ' ' || NEW.last_name;
    ELSIF NEW.first_name IS NOT NULL THEN
      NEW.name = NEW.first_name;
    ELSIF NEW.last_name IS NOT NULL THEN
      NEW.name = NEW.last_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contact_name_trigger ON contacts;
CREATE TRIGGER set_contact_name_trigger
BEFORE INSERT OR UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION set_contact_name();

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
DROP POLICY IF EXISTS "Admins can view all data" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to view customers" ON customers;
DROP POLICY IF EXISTS "All users can view all customers" ON customers;
DROP POLICY IF EXISTS "All users can insert customers" ON customers;
DROP POLICY IF EXISTS "All users can update customers" ON customers;
DROP POLICY IF EXISTS "All users can delete customers" ON customers;

DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Allow authenticated users to view contacts" ON contacts;
DROP POLICY IF EXISTS "All users can view all contacts" ON contacts;
DROP POLICY IF EXISTS "All users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "All users can update contacts" ON contacts;
DROP POLICY IF EXISTS "All users can delete contacts" ON contacts;

DROP POLICY IF EXISTS "Users can manage their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to view jobs" ON jobs;
DROP POLICY IF EXISTS "All users can view all jobs" ON jobs;
DROP POLICY IF EXISTS "All users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "All users can update jobs" ON jobs;
DROP POLICY IF EXISTS "All users can delete jobs" ON jobs;

DROP POLICY IF EXISTS "Users can manage their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can view their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can insert their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can update their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can delete their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins can view all opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow authenticated users to view opportunities" ON opportunities;
DROP POLICY IF EXISTS "All users can view all opportunities" ON opportunities;
DROP POLICY IF EXISTS "All users can insert opportunities" ON opportunities;
DROP POLICY IF EXISTS "All users can update opportunities" ON opportunities;
DROP POLICY IF EXISTS "All users can delete opportunities" ON opportunities;

-- Create extremely simple RLS policies that allow all actions regardless of user_id

-- Create single policy for each table that allows all operations
CREATE POLICY "Allow all operations" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create admin function if it doesn't exist
CREATE OR REPLACE FUNCTION make_user_admin(target_email TEXT)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'Admin')
  WHERE email = target_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated; 