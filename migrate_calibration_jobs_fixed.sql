-- Migration script to move all calibration division jobs from neta_ops.jobs to lab_ops.lab_jobs
-- This ensures all calibration jobs are stored separately in the lab_ops schema
-- FIXED VERSION - Removes template_type column reference
-- Run this in Supabase SQL Editor

-- STEP 1: Check what calibration jobs exist in neta_ops.jobs
DO $$
DECLARE
    calibration_jobs_count INTEGER;
    armadillo_jobs_count INTEGER;
BEGIN
    -- Count calibration jobs in neta_ops.jobs
    SELECT COUNT(*) INTO calibration_jobs_count
    FROM neta_ops.jobs
    WHERE division = 'calibration';
    
    -- Count armadillo jobs in neta_ops.jobs (they should also be moved to lab_ops)
    SELECT COUNT(*) INTO armadillo_jobs_count
    FROM neta_ops.jobs
    WHERE division = 'armadillo';
    
    RAISE NOTICE 'Found % calibration jobs in neta_ops.jobs', calibration_jobs_count;
    RAISE NOTICE 'Found % armadillo jobs in neta_ops.jobs', armadillo_jobs_count;
    
    IF calibration_jobs_count = 0 AND armadillo_jobs_count = 0 THEN
        RAISE NOTICE 'No calibration or armadillo jobs found to migrate';
    END IF;
END $$;

-- STEP 2: Ensure all customers referenced by calibration/armadillo jobs exist in lab_customers
-- First, copy any missing customers from common.customers to lab_customers
INSERT INTO lab_ops.lab_customers (id, name, company_name, address, phone, email, status, created_at, updated_at)
SELECT DISTINCT c.id, c.name, c.company_name, c.address, c.phone, c.email, 
       COALESCE(c.status, 'active'), c.created_at, c.updated_at
FROM common.customers c
INNER JOIN neta_ops.jobs j ON c.id = j.customer_id
WHERE j.division IN ('calibration', 'armadillo')
AND NOT EXISTS (
    SELECT 1 FROM lab_ops.lab_customers lc 
    WHERE lc.id = c.id
)
ON CONFLICT (id) DO NOTHING;

-- Create minimal records for any customers that don't exist in common.customers either
INSERT INTO lab_ops.lab_customers (id, name, company_name, status, created_at, updated_at)
SELECT DISTINCT j.customer_id, 
       'Migrated Customer', 
       'Unknown Company', 
       'active',
       NOW(),
       NOW()
FROM neta_ops.jobs j
WHERE j.division IN ('calibration', 'armadillo')
AND j.customer_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM lab_ops.lab_customers lc 
    WHERE lc.id = j.customer_id
)
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Migrate calibration and armadillo jobs to lab_ops.lab_jobs
-- Note: We'll preserve the original job IDs to maintain references
INSERT INTO lab_ops.lab_jobs (
    id, customer_id, title, description, status, 
    start_date, due_date, budget, notes, priority, 
    division, job_number, created_at, updated_at
)
SELECT 
    j.id,
    j.customer_id,
    j.title,
    j.description,
    j.status,
    j.start_date,
    j.due_date,
    j.budget,
    j.notes,
    COALESCE(j.priority, 'medium'),
    j.division,
    j.job_number,
    j.created_at,
    j.updated_at
FROM neta_ops.jobs j
WHERE j.division IN ('calibration', 'armadillo')
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Migrate related assets for calibration/armadillo jobs
-- First, check if there are any assets linked to these jobs
DO $$
DECLARE
    assets_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO assets_count
    FROM neta_ops.job_assets ja
    INNER JOIN neta_ops.jobs j ON ja.job_id = j.id
    WHERE j.division IN ('calibration', 'armadillo');
    
    RAISE NOTICE 'Found % assets linked to calibration/armadillo jobs', assets_count;
END $$;

-- Migrate assets to lab_ops.lab_assets (FIXED: removed template_type column)
INSERT INTO lab_ops.lab_assets (
    id, job_id, name, file_url, customer_id, user_id, 
    asset_id, created_at, updated_at
)
SELECT 
    a.id,
    ja.job_id,
    a.name,
    a.file_url,
    j.customer_id,
    ja.user_id,
    null, -- asset_id can be null for migrated assets
    a.created_at,
    a.updated_at
FROM neta_ops.job_assets ja
INNER JOIN neta_ops.assets a ON ja.asset_id = a.id
INNER JOIN neta_ops.jobs j ON ja.job_id = j.id
WHERE j.division IN ('calibration', 'armadillo')
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Clean up - Remove the migrated jobs and assets from neta_ops
-- First, remove the job_assets relationships
DELETE FROM neta_ops.job_assets ja
WHERE EXISTS (
    SELECT 1 FROM neta_ops.jobs j 
    WHERE j.id = ja.job_id 
    AND j.division IN ('calibration', 'armadillo')
);

-- Remove the assets that were only used by calibration/armadillo jobs
DELETE FROM neta_ops.assets a
WHERE NOT EXISTS (
    SELECT 1 FROM neta_ops.job_assets ja 
    WHERE ja.asset_id = a.id
);

-- Finally, remove the calibration/armadillo jobs from neta_ops.jobs
DELETE FROM neta_ops.jobs 
WHERE division IN ('calibration', 'armadillo');

-- STEP 6: Verification and summary
DO $$
DECLARE
    remaining_neta_calibration INTEGER;
    lab_calibration_count INTEGER;
    lab_armadillo_count INTEGER;
    lab_assets_count INTEGER;
BEGIN
    -- Check no calibration jobs remain in neta_ops
    SELECT COUNT(*) INTO remaining_neta_calibration
    FROM neta_ops.jobs
    WHERE division IN ('calibration', 'armadillo');
    
    -- Count migrated jobs in lab_ops
    SELECT COUNT(*) INTO lab_calibration_count
    FROM lab_ops.lab_jobs
    WHERE division = 'calibration';
    
    SELECT COUNT(*) INTO lab_armadillo_count
    FROM lab_ops.lab_jobs
    WHERE division = 'armadillo';
    
    -- Count migrated assets in lab_ops
    SELECT COUNT(*) INTO lab_assets_count
    FROM lab_ops.lab_assets;
    
    RAISE NOTICE 'MIGRATION COMPLETE:';
    RAISE NOTICE '- Remaining calibration/armadillo jobs in neta_ops: %', remaining_neta_calibration;
    RAISE NOTICE '- Calibration jobs in lab_ops: %', lab_calibration_count;
    RAISE NOTICE '- Armadillo jobs in lab_ops: %', lab_armadillo_count;
    RAISE NOTICE '- Total assets in lab_ops: %', lab_assets_count;
    
    IF remaining_neta_calibration > 0 THEN
        RAISE WARNING 'Still have % calibration/armadillo jobs in neta_ops - migration may not be complete', remaining_neta_calibration;
    ELSE
        RAISE NOTICE 'SUCCESS: All calibration and armadillo jobs have been migrated to lab_ops';
    END IF;
END $$;

-- STEP 7: Final verification query
SELECT 
    'FINAL VERIFICATION' AS info_type,
    (SELECT COUNT(*) FROM lab_ops.lab_jobs WHERE division = 'calibration') AS calibration_jobs_in_lab_ops,
    (SELECT COUNT(*) FROM lab_ops.lab_jobs WHERE division = 'armadillo') AS armadillo_jobs_in_lab_ops,
    (SELECT COUNT(*) FROM neta_ops.jobs WHERE division IN ('calibration', 'armadillo')) AS remaining_in_neta_ops,
    (SELECT COUNT(*) FROM lab_ops.lab_assets) AS total_lab_assets;

-- Show sample of migrated jobs
SELECT 
    'SAMPLE MIGRATED JOBS' AS info_type,
    id,
    job_number,
    title,
    division,
    status,
    created_at
FROM lab_ops.lab_jobs 
WHERE division IN ('calibration', 'armadillo')
ORDER BY created_at DESC
LIMIT 5; 