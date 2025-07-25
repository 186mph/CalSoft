-- Drop existing RLS policies first
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
DROP POLICY IF EXISTS "Admins can view all data" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to view customers" ON customers;

DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Allow authenticated users to view contacts" ON contacts;

DROP POLICY IF EXISTS "Users can manage their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to view jobs" ON jobs;

DROP POLICY IF EXISTS "Users can manage their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can view their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can insert their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can update their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Users can delete their own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins can view all opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow authenticated users to view opportunities" ON opportunities;

-- Create new RLS policies that allow all actions for authenticated users

-- Customers table policies
CREATE POLICY "All users can view all customers"
ON customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All users can insert customers"
ON customers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All users can update customers" 
ON customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All users can delete customers"
ON customers
FOR DELETE
TO authenticated
USING (true);

-- Contacts table policies
CREATE POLICY "All users can view all contacts"
ON contacts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All users can insert contacts"
ON contacts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All users can update contacts" 
ON contacts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All users can delete contacts"
ON contacts
FOR DELETE
TO authenticated
USING (true);

-- Jobs table policies
CREATE POLICY "All users can view all jobs"
ON jobs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All users can insert jobs"
ON jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All users can update jobs" 
ON jobs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All users can delete jobs"
ON jobs
FOR DELETE
TO authenticated
USING (true);

-- Opportunities table policies
CREATE POLICY "All users can view all opportunities"
ON opportunities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All users can insert opportunities"
ON opportunities
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All users can update opportunities" 
ON opportunities
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All users can delete opportunities"
ON opportunities
FOR DELETE
TO authenticated
USING (true);

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