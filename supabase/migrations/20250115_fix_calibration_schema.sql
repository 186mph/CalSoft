-- Migration to fix calibration division schema issues
-- This migration implements Option A: Store all calibration jobs in lab_ops.lab_jobs

-- First, let's enhance the lab_customers table to include missing fields
ALTER TABLE lab_ops.lab_customers 
ADD COLUMN IF NOT EXISTS company_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enhance the lab_jobs table to include all necessary fields for compatibility
ALTER TABLE lab_ops.lab_jobs 
ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'lab_technician',
ADD COLUMN IF NOT EXISTS portal_type TEXT DEFAULT 'lab',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct_entry',
ADD COLUMN IF NOT EXISTS contact_id UUID,
ADD COLUMN IF NOT EXISTS opportunity_id UUID;

-- Enhance the lab_assets table to include missing fields
ALTER TABLE lab_ops.lab_assets 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES lab_ops.lab_customers(id),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS asset_id TEXT,
ADD COLUMN IF NOT EXISTS template_type TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lab_jobs_division ON lab_ops.lab_jobs(division);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_status ON lab_ops.lab_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_customer_id ON lab_ops.lab_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_created_at ON lab_ops.lab_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_lab_customers_status ON lab_ops.lab_customers(status);
CREATE INDEX IF NOT EXISTS idx_lab_assets_job_id ON lab_ops.lab_assets(job_id);

-- Update the job number generation function to handle different prefixes
CREATE OR REPLACE FUNCTION lab_ops.generate_lab_job_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate job number based on division
    IF NEW.division = 'calibration' THEN
        NEW.job_number := 'CAL-' || LPAD(nextval('lab_ops.lab_job_number_seq')::text, 4, '0');
    ELSIF NEW.division = 'armadillo' THEN
        NEW.job_number := 'ARM-' || LPAD(nextval('lab_ops.lab_job_number_seq')::text, 4, '0');
    ELSE
        NEW.job_number := 'LAB-' || LPAD(nextval('lab_ops.lab_job_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to migrate existing calibration jobs from neta_ops to lab_ops
CREATE OR REPLACE FUNCTION migrate_calibration_jobs()
RETURNS INTEGER AS $$
DECLARE
    job_record RECORD;
    migrated_count INTEGER := 0;
    customer_exists BOOLEAN;
BEGIN
    -- Loop through all calibration and armadillo jobs in neta_ops.jobs
    FOR job_record IN 
        SELECT * FROM neta_ops.jobs 
        WHERE division IN ('calibration', 'armadillo')
    LOOP
        -- Check if customer exists in lab_customers
        SELECT EXISTS(
            SELECT 1 FROM lab_ops.lab_customers 
            WHERE id = job_record.customer_id
        ) INTO customer_exists;
        
        -- If customer doesn't exist in lab_customers, try to migrate from common.customers
        IF NOT customer_exists THEN
            INSERT INTO lab_ops.lab_customers (id, name, company_name, address, phone, email, status, created_at, updated_at)
            SELECT id, name, company_name, address, phone, email, 
                   COALESCE(status, 'active'), created_at, updated_at
            FROM common.customers 
            WHERE id = job_record.customer_id
            ON CONFLICT (id) DO NOTHING;
        END IF;
        
        -- Insert job into lab_ops.lab_jobs
        INSERT INTO lab_ops.lab_jobs (
            id, customer_id, title, job_number, description, status, division,
            priority, start_date, due_date, budget, notes, user_id,
            job_type, portal_type, created_by, source, created_at, updated_at
        ) VALUES (
            job_record.id,
            job_record.customer_id,
            job_record.title,
            job_record.job_number,
            job_record.description,
            job_record.status,
            job_record.division,
            COALESCE(job_record.priority, 'medium'),
            job_record.start_date,
            job_record.due_date,
            job_record.budget,
            job_record.notes,
            job_record.user_id,
            COALESCE(job_record.job_type, 'lab_technician'),
            COALESCE(job_record.portal_type, 'lab'),
            job_record.user_id, -- Use user_id as created_by
            'migrated',
            job_record.created_at,
            job_record.updated_at
        ) ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            division = EXCLUDED.division,
            priority = EXCLUDED.priority,
            start_date = EXCLUDED.start_date,
            due_date = EXCLUDED.due_date,
            budget = EXCLUDED.budget,
            notes = EXCLUDED.notes,
            updated_at = NOW();
            
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for unified job access (for backward compatibility)
CREATE OR REPLACE VIEW lab_ops.all_lab_jobs AS
SELECT 
    j.*,
    c.name as customer_name,
    c.company_name as customer_company_name,
    c.address as customer_address,
    c.phone as customer_phone,
    c.email as customer_email
FROM lab_ops.lab_jobs j
LEFT JOIN lab_ops.lab_customers c ON j.customer_id = c.id;

-- Grant permissions on the view
GRANT SELECT ON lab_ops.all_lab_jobs TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Allow authenticated users to view all_lab_jobs"
ON lab_ops.all_lab_jobs FOR SELECT
TO authenticated
USING (true);

-- Add comments for documentation
COMMENT ON TABLE lab_ops.lab_customers IS 'Customers specific to lab operations (calibration, armadillo divisions)';
COMMENT ON TABLE lab_ops.lab_jobs IS 'Jobs for lab operations including calibration and armadillo divisions';
COMMENT ON TABLE lab_ops.lab_assets IS 'Assets and reports associated with lab jobs';
COMMENT ON VIEW lab_ops.all_lab_jobs IS 'Unified view of lab jobs with customer information for easy querying';

-- Execute the migration function
SELECT migrate_calibration_jobs() as migrated_jobs_count; 