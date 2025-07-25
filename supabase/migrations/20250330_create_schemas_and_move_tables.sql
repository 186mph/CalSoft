-- Create the new schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS common;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA neta_ops TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA business TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA common TO authenticated, anon, service_role;

-- Move tables to new schemas (using ALTER TABLE to move the tables)

-- Move tables to neta_ops schema
ALTER TABLE IF EXISTS public.assets SET SCHEMA neta_ops;
ALTER TABLE IF EXISTS public.job_assets SET SCHEMA neta_ops;
ALTER TABLE IF EXISTS public.jobs SET SCHEMA neta_ops;
ALTER TABLE IF EXISTS public.reports SET SCHEMA neta_ops;

-- Move tables to business schema
ALTER TABLE IF EXISTS public.estimates SET SCHEMA business;
ALTER TABLE IF EXISTS public.opportunities SET SCHEMA business;

-- Move tables to common schema
ALTER TABLE IF EXISTS public.contacts SET SCHEMA common;
ALTER TABLE IF EXISTS public.customers SET SCHEMA common;

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

-- Re-create foreign key constraints with schema-qualified references
ALTER TABLE neta_ops.jobs ADD CONSTRAINT fk_job_customer
  FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE;

ALTER TABLE neta_ops.jobs ADD CONSTRAINT fk_job_opportunity
  FOREIGN KEY (opportunity_id) REFERENCES business.opportunities(id) ON DELETE SET NULL;

ALTER TABLE neta_ops.assets ADD CONSTRAINT fk_asset_customer
  FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE;

ALTER TABLE neta_ops.job_assets ADD CONSTRAINT fk_job_asset_job
  FOREIGN KEY (job_id) REFERENCES neta_ops.jobs(id) ON DELETE CASCADE;

ALTER TABLE neta_ops.job_assets ADD CONSTRAINT fk_job_asset_asset
  FOREIGN KEY (asset_id) REFERENCES neta_ops.assets(id) ON DELETE CASCADE;

ALTER TABLE business.opportunities ADD CONSTRAINT fk_opportunity_customer
  FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE;

ALTER TABLE common.contacts ADD CONSTRAINT fk_contact_customer
  FOREIGN KEY (customer_id) REFERENCES common.customers(id) ON DELETE CASCADE;

-- Update RLS policies on the new schemas
ALTER TABLE neta_ops.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.job_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.customers ENABLE ROW LEVEL SECURITY;

-- Re-create policies for the tables (example for one table - repeat for others)
CREATE POLICY "Allow authenticated users to view assets"
ON neta_ops.assets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view job_assets"
ON neta_ops.job_assets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view jobs"
ON neta_ops.jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view opportunities"
ON business.opportunities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view estimates"
ON business.estimates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view contacts"
ON common.contacts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view customers"
ON common.customers FOR SELECT
TO authenticated
USING (true);

-- Grant table permissions to roles
GRANT ALL ON ALL TABLES IN SCHEMA neta_ops TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA business TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA common TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA neta_ops TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA business TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA common TO anon;

-- Additional permission sync for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA neta_ops GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA neta_ops GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA business GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT SELECT ON TABLES TO anon; 