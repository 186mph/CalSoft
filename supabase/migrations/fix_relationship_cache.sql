-- This script specifically targets the relationship issue between neta_ops.jobs and customer_id
-- Run this if you're getting: "Schema cache issue: Could not find a relationship between 'neta_ops.jobs' and 'customer_id'"

-- First, let's verify the current state
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  -- Check if our constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'jobs'
    AND constraint_name = 'fk_job_customer'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'The fk_job_customer constraint exists, dropping it to recreate';
  ELSE
    RAISE NOTICE 'The fk_job_customer constraint does not exist, will create it';
  END IF;
END $$;

-- Drop the constraint if it exists
ALTER TABLE IF EXISTS neta_ops.jobs DROP CONSTRAINT IF EXISTS fk_job_customer;

-- Also check any other constraints that might be related to customer_id
SELECT conname, conrelid::regclass AS table_name, contype
FROM pg_constraint
WHERE conrelid = 'neta_ops.jobs'::regclass
AND conname LIKE '%customer%';

-- Make sure the customers table is properly in common schema
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'common' AND table_name = 'customers'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Error: common.customers table does not exist, migration incomplete';
  ELSE
    RAISE NOTICE 'Verified common.customers table exists';
  END IF;
END $$;

-- Add constraint with explicit schema qualification
ALTER TABLE neta_ops.jobs ADD CONSTRAINT fk_job_customer
  FOREIGN KEY (customer_id) REFERENCES common.customers(id) 
  ON DELETE CASCADE;

-- Verify the constraint was added
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'jobs'
    AND constraint_name = 'fk_job_customer'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Successfully created fk_job_customer constraint';
  ELSE
    RAISE EXCEPTION 'Failed to create fk_job_customer constraint';
  END IF;
END $$;

-- Refresh RLS for both tables
ALTER TABLE neta_ops.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.customers ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies to ensure they're using schema-qualified references
DO $$
BEGIN
  -- Drop any existing policies
  DROP POLICY IF EXISTS "Allow authenticated users to view jobs" ON neta_ops.jobs;
  
  -- Create the policy with schema qualification
  EXECUTE 'CREATE POLICY "Allow authenticated users to view jobs"
    ON neta_ops.jobs FOR SELECT
    TO authenticated
    USING (true)';
  
  RAISE NOTICE 'Recreated RLS policy for neta_ops.jobs';
END $$;

-- Force Supabase to refresh its schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Add explicit grant permissions
GRANT USAGE ON SCHEMA neta_ops TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA common TO authenticated, anon, service_role;
GRANT SELECT ON neta_ops.jobs TO authenticated, anon, service_role;
GRANT SELECT ON common.customers TO authenticated, anon, service_role;

-- Force another cache refresh
SELECT pg_notify('pgrst', 'reload config');
SELECT pg_notify('pgrst', 'reload schema');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '-----------------------------------------------------';
  RAISE NOTICE 'Foreign key relationship fix completed. Please refresh your browser to see if the issue is resolved.';
  RAISE NOTICE 'If you still see the error, you may need to restart the Supabase instance.';
  RAISE NOTICE '-----------------------------------------------------';
END $$; 