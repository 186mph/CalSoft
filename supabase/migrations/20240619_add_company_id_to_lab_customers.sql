-- Add company_id column to lab_customers table
ALTER TABLE lab_ops.lab_customers
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Update the schema cache for lab_customers
SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'lab_ops' AND tablename = 'lab_customers'; 