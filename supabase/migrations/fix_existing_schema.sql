-- Fix for existing schema where some tables may have already been moved
-- This script skips table moves if they already exist in the target schemas
-- and focuses on fixing foreign key relationships

-- Ensure the schemas exist
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS common;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA neta_ops TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA business TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA common TO authenticated, anon, service_role;

-- Move tables only if they DO NOT already exist in the target schema and DO exist in public
DO $$
DECLARE
  table_exists boolean;
BEGIN
  -- neta_ops.assets
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neta_ops' AND table_name = 'assets') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.assets SET SCHEMA neta_ops';
      RAISE NOTICE 'Moved public.assets to neta_ops.assets';
    END IF;
  END IF;
  
  -- neta_ops.job_assets
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neta_ops' AND table_name = 'job_assets') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_assets') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.job_assets SET SCHEMA neta_ops';
      RAISE NOTICE 'Moved public.job_assets to neta_ops.job_assets';
    END IF;
  END IF;
  
  -- neta_ops.jobs
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neta_ops' AND table_name = 'jobs') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.jobs SET SCHEMA neta_ops';
      RAISE NOTICE 'Moved public.jobs to neta_ops.jobs';
    END IF;
  END IF;
  
  -- neta_ops.reports
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neta_ops' AND table_name = 'reports') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.reports SET SCHEMA neta_ops';
      RAISE NOTICE 'Moved public.reports to neta_ops.reports';
    END IF;
  END IF;
  
  -- business.estimates
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'business' AND table_name = 'estimates') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimates') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.estimates SET SCHEMA business';
      RAISE NOTICE 'Moved public.estimates to business.estimates';
    END IF;
  END IF;
  
  -- business.opportunities
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'business' AND table_name = 'opportunities') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.opportunities SET SCHEMA business';
      RAISE NOTICE 'Moved public.opportunities to business.opportunities';
    END IF;
  END IF;
  
  -- common.contacts
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'common' AND table_name = 'contacts') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.contacts SET SCHEMA common';
      RAISE NOTICE 'Moved public.contacts to common.contacts';
    END IF;
  END IF;
  
  -- common.customers
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'common' AND table_name = 'customers') INTO table_exists;
  IF NOT table_exists THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') INTO table_exists;
    IF table_exists THEN
      EXECUTE 'ALTER TABLE public.customers SET SCHEMA common';
      RAISE NOTICE 'Moved public.customers to common.customers';
    END IF;
  END IF;
END $$;

-- Fix foreign key relationships between schemas
-- This is needed because the foreign keys need to reference the full schema-qualified name

-- First, drop existing foreign key constraints
ALTER TABLE IF EXISTS neta_ops.jobs DROP CONSTRAINT IF EXISTS fk_job_customer;
ALTER TABLE IF EXISTS neta_ops.jobs DROP CONSTRAINT IF EXISTS fk_job_opportunity;
ALTER TABLE IF EXISTS neta_ops.assets DROP CONSTRAINT IF EXISTS fk_asset_customer;
ALTER TABLE IF EXISTS neta_ops.job_assets DROP CONSTRAINT IF EXISTS fk_job_asset_job;
ALTER TABLE IF EXISTS neta_ops.job_assets DROP CONSTRAINT IF EXISTS fk_job_asset_asset;
ALTER TABLE IF EXISTS business.opportunities DROP CONSTRAINT IF EXISTS fk_opportunity_customer;
ALTER TABLE IF EXISTS common.contacts DROP CONSTRAINT IF EXISTS fk_contact_customer;
ALTER TABLE IF EXISTS business.opportunities DROP CONSTRAINT IF EXISTS opportunities_job_id_fkey;

-- Re-create foreign key constraints with schema-qualified references
DO $$
BEGIN
  -- Check if the column exists before adding constraints
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'neta_ops' AND table_name = 'jobs' AND column_name = 'customer_id') THEN
    EXECUTE 'ALTER TABLE neta_ops.jobs ADD CONSTRAINT fk_job_customer
      FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_job_customer';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'neta_ops' AND table_name = 'jobs' AND column_name = 'opportunity_id') THEN
    EXECUTE 'ALTER TABLE neta_ops.jobs ADD CONSTRAINT fk_job_opportunity
      FOREIGN KEY (opportunity_id) REFERENCES business.opportunities(id) ON DELETE SET NULL';
    RAISE NOTICE 'Added constraint fk_job_opportunity';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'neta_ops' AND table_name = 'assets' AND column_name = 'customer_id') THEN
    EXECUTE 'ALTER TABLE neta_ops.assets ADD CONSTRAINT fk_asset_customer
      FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_asset_customer';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'neta_ops' AND table_name = 'job_assets' AND column_name = 'job_id') THEN
    EXECUTE 'ALTER TABLE neta_ops.job_assets ADD CONSTRAINT fk_job_asset_job
      FOREIGN KEY (job_id) REFERENCES neta_ops.jobs(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_job_asset_job';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'neta_ops' AND table_name = 'job_assets' AND column_name = 'asset_id') THEN
    EXECUTE 'ALTER TABLE neta_ops.job_assets ADD CONSTRAINT fk_job_asset_asset
      FOREIGN KEY (asset_id) REFERENCES neta_ops.assets(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_job_asset_asset';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'business' AND table_name = 'opportunities' AND column_name = 'customer_id') THEN
    EXECUTE 'ALTER TABLE business.opportunities ADD CONSTRAINT fk_opportunity_customer
      FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_opportunity_customer';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'common' AND table_name = 'contacts' AND column_name = 'customer_id') THEN
    EXECUTE 'ALTER TABLE common.contacts ADD CONSTRAINT fk_contact_customer
      FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE';
    RAISE NOTICE 'Added constraint fk_contact_customer';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'business' AND table_name = 'opportunities' AND column_name = 'job_id') THEN
    EXECUTE 'ALTER TABLE business.opportunities ADD CONSTRAINT opportunities_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES neta_ops.jobs(id) ON DELETE SET NULL';
    RAISE NOTICE 'Added constraint opportunities_job_id_fkey';
  END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE neta_ops.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.job_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS neta_ops.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.customers ENABLE ROW LEVEL SECURITY;

-- Refresh Supabase schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Add a notification that migration is complete
DO $$
BEGIN
  RAISE NOTICE 'Schema migration completed successfully';
END
$$; 