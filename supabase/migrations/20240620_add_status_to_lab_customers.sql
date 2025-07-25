-- Add status column to lab_customers table
ALTER TABLE lab_ops.lab_customers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update the schema cache for lab_customers
SELECT pg_notify('reload_schema', ''); 