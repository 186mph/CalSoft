-- Combined script to fix lab_jobs foreign key constraint issue
-- Run this in Supabase SQL Editor

-- PART 1: Fix the foreign key constraint for lab_jobs.customer_id
-- The constraint appears to be pointing to the wrong table

-- First, let's check what constraints currently exist
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find any existing foreign key constraints on lab_jobs.customer_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'lab_ops'
    AND tc.table_name = 'lab_jobs'
    AND kcu.column_name = 'customer_id'
    AND tc.constraint_type = 'FOREIGN KEY';
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Found existing constraint: %', constraint_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE lab_ops.lab_jobs DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No existing foreign key constraint found for lab_jobs.customer_id';
    END IF;
END $$;

-- Drop any other potential constraints that might be interfering
ALTER TABLE lab_ops.lab_jobs DROP CONSTRAINT IF EXISTS lab_jobs_customer_id_fkey;
ALTER TABLE lab_ops.lab_jobs DROP CONSTRAINT IF EXISTS fk_lab_jobs_customer;
ALTER TABLE lab_ops.lab_jobs DROP CONSTRAINT IF EXISTS lab_jobs_customer_id_key;

-- Add the correct foreign key constraint
ALTER TABLE lab_ops.lab_jobs 
ADD CONSTRAINT lab_jobs_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES lab_ops.lab_customers(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
DO $$
DECLARE
    constraint_exists BOOLEAN;
    referenced_table TEXT;
BEGIN
    -- Check if the constraint exists and what it references
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'lab_ops'
        AND tc.table_name = 'lab_jobs'
        AND tc.constraint_name = 'lab_jobs_customer_id_fkey'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- Get the referenced table
        SELECT ccu.table_name INTO referenced_table
        FROM information_schema.referential_constraints rc
        JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
        WHERE rc.constraint_name = 'lab_jobs_customer_id_fkey';
        
        RAISE NOTICE 'Constraint lab_jobs_customer_id_fkey created successfully, references table: %', referenced_table;
    ELSE
        RAISE EXCEPTION 'Failed to create constraint lab_jobs_customer_id_fkey';
    END IF;
END $$;

-- PART 2: Create a helper function for creating lab jobs with automatic customer validation
CREATE OR REPLACE FUNCTION create_lab_job_with_customer_check(job_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_id_value UUID;
    customer_exists BOOLEAN;
    job_result RECORD;
    result_json JSON;
BEGIN
    -- Extract customer_id from the job_data
    customer_id_value := (job_data->>'customer_id')::UUID;
    
    -- Check if customer exists in lab_customers
    SELECT EXISTS(
        SELECT 1 FROM lab_ops.lab_customers 
        WHERE id = customer_id_value
    ) INTO customer_exists;
    
    -- If customer doesn't exist, try to find in common.customers and copy
    IF NOT customer_exists THEN
        INSERT INTO lab_ops.lab_customers (id, name, company_name, address, phone, email, status, created_at, updated_at)
        SELECT id, name, company_name, address, phone, email, 
               COALESCE(status, 'active'), created_at, updated_at
        FROM common.customers 
        WHERE id = customer_id_value
        ON CONFLICT (id) DO NOTHING;
        
        -- If still no customer found, create a minimal one
        INSERT INTO lab_ops.lab_customers (id, name, company_name, status)
        VALUES (customer_id_value, 'Auto-created Customer', 'Unknown Company', 'active')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Now create the job
    INSERT INTO lab_ops.lab_jobs (
        customer_id, title, description, status, start_date, due_date, 
        budget, notes, priority, division
    ) VALUES (
        customer_id_value,
        job_data->>'title',
        job_data->>'description',
        COALESCE(job_data->>'status', 'pending'),
        (job_data->>'start_date')::DATE,
        (job_data->>'due_date')::DATE,
        (job_data->>'budget')::DECIMAL,
        job_data->>'notes',
        COALESCE(job_data->>'priority', 'medium'),
        job_data->>'division'
    ) RETURNING * INTO job_result;
    
    -- Convert the result to JSON
    result_json := to_json(job_result);
    
    RETURN result_json;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN json_build_object(
            'error', TRUE,
            'code', SQLSTATE,
            'message', SQLERRM
        );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_lab_job_with_customer_check TO authenticated;

-- Refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Add comments for documentation
COMMENT ON CONSTRAINT lab_jobs_customer_id_fkey ON lab_ops.lab_jobs 
IS 'Foreign key constraint ensuring customer_id references lab_ops.lab_customers(id)';

COMMENT ON FUNCTION create_lab_job_with_customer_check IS 'Helper function to create lab jobs with automatic customer validation and creation if needed';

-- Final verification with detailed info
SELECT 
    'Foreign Key Constraints for lab_jobs.customer_id:' AS info_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS referenced_schema,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'lab_ops'
AND tc.table_name = 'lab_jobs'
AND kcu.column_name = 'customer_id'; 