-- Combined script to fix lab_jobs foreign key constraint issue
-- This version handles existing data integrity issues first
-- Run this in Supabase SQL Editor

-- STEP 1: Check what existing data issues we have
DO $$
DECLARE
    orphaned_jobs_count INTEGER;
    missing_customers_count INTEGER;
BEGIN
    -- Count jobs that reference non-existent customers
    SELECT COUNT(*) INTO orphaned_jobs_count
    FROM lab_ops.lab_jobs lj
    WHERE lj.customer_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM lab_ops.lab_customers lc 
        WHERE lc.id = lj.customer_id
    );
    
    RAISE NOTICE 'Found % orphaned jobs (jobs with customer_id not in lab_customers)', orphaned_jobs_count;
    
    -- Count unique missing customers
    SELECT COUNT(DISTINCT lj.customer_id) INTO missing_customers_count
    FROM lab_ops.lab_jobs lj
    WHERE lj.customer_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM lab_ops.lab_customers lc 
        WHERE lc.id = lj.customer_id
    );
    
    RAISE NOTICE 'Found % unique missing customer IDs', missing_customers_count;
END $$;

-- STEP 2: Fix existing data by copying missing customers from common.customers
INSERT INTO lab_ops.lab_customers (id, name, company_name, address, phone, email, status, created_at, updated_at)
SELECT DISTINCT c.id, c.name, c.company_name, c.address, c.phone, c.email, 
       COALESCE(c.status, 'active'), c.created_at, c.updated_at
FROM common.customers c
INNER JOIN lab_ops.lab_jobs lj ON c.id = lj.customer_id
WHERE NOT EXISTS (
    SELECT 1 FROM lab_ops.lab_customers lc 
    WHERE lc.id = c.id
)
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Create minimal records for any customers that still don't exist in common.customers
INSERT INTO lab_ops.lab_customers (id, name, company_name, status, created_at, updated_at)
SELECT DISTINCT lj.customer_id, 
       'Imported Customer', 
       'Unknown Company', 
       'active',
       NOW(),
       NOW()
FROM lab_ops.lab_jobs lj
WHERE lj.customer_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM lab_ops.lab_customers lc 
    WHERE lc.id = lj.customer_id
)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Verify all orphaned jobs now have corresponding customers
DO $$
DECLARE
    remaining_orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned_count
    FROM lab_ops.lab_jobs lj
    WHERE lj.customer_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM lab_ops.lab_customers lc 
        WHERE lc.id = lj.customer_id
    );
    
    IF remaining_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Still have % orphaned jobs after customer creation', remaining_orphaned_count;
    ELSE
        RAISE NOTICE 'All orphaned jobs now have corresponding customers';
    END IF;
END $$;

-- STEP 5: Now drop any existing foreign key constraints
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

-- STEP 6: Add the correct foreign key constraint (should work now)
ALTER TABLE lab_ops.lab_jobs 
ADD CONSTRAINT lab_jobs_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES lab_ops.lab_customers(id) ON DELETE CASCADE;

-- STEP 7: Verify the constraint was created correctly
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
        
        RAISE NOTICE 'SUCCESS: Constraint lab_jobs_customer_id_fkey created successfully, references table: %', referenced_table;
    ELSE
        RAISE EXCEPTION 'FAILED: Could not create constraint lab_jobs_customer_id_fkey';
    END IF;
END $$;

-- STEP 8: Create a helper function for creating lab jobs with automatic customer validation
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

-- STEP 9: Final verification and summary
SELECT 
    'FINAL VERIFICATION - Foreign Key Constraints for lab_jobs.customer_id:' AS info_type,
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

-- Show final counts
SELECT 
    'SUMMARY' AS info_type,
    (SELECT COUNT(*) FROM lab_ops.lab_jobs) AS total_lab_jobs,
    (SELECT COUNT(*) FROM lab_ops.lab_customers) AS total_lab_customers,
    (SELECT COUNT(*) FROM lab_ops.lab_jobs WHERE customer_id IS NOT NULL) AS jobs_with_customer_id,
    (SELECT COUNT(*) FROM lab_ops.lab_jobs lj WHERE lj.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lab_ops.lab_customers lc WHERE lc.id = lj.customer_id)) AS remaining_orphaned_jobs; 