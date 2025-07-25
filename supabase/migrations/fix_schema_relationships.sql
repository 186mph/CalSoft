-- Fix for "Could not find a relationship between 'neta_ops.jobs' and 'customer_id'" error
-- This script fixes cross-schema foreign key relationships

-- First, drop existing foreign key constraints
ALTER TABLE IF EXISTS neta_ops.jobs DROP CONSTRAINT IF EXISTS fk_job_customer;
ALTER TABLE IF EXISTS neta_ops.jobs DROP CONSTRAINT IF EXISTS fk_job_opportunity;
ALTER TABLE IF EXISTS neta_ops.assets DROP CONSTRAINT IF EXISTS fk_asset_customer;
ALTER TABLE IF EXISTS neta_ops.job_assets DROP CONSTRAINT IF EXISTS fk_job_asset_job;
ALTER TABLE IF EXISTS neta_ops.job_assets DROP CONSTRAINT IF EXISTS fk_job_asset_asset;
ALTER TABLE IF EXISTS business.opportunities DROP CONSTRAINT IF EXISTS fk_opportunity_customer;
ALTER TABLE IF EXISTS common.contacts DROP CONSTRAINT IF EXISTS fk_contact_customer;
ALTER TABLE IF EXISTS business.opportunities DROP CONSTRAINT IF EXISTS opportunities_job_id_fkey;

-- Update Supabase schema cache
SELECT pg_notify('pgrst', 'reload schema');

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

-- Add job_id foreign key in opportunities table if it exists
ALTER TABLE business.opportunities ADD CONSTRAINT opportunities_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES neta_ops.jobs(id) ON DELETE SET NULL;

-- Refresh Supabase schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Add a notification that migration is complete
DO $$
BEGIN
  RAISE NOTICE 'Cross-schema foreign key relationships have been fixed';
END
$$; 