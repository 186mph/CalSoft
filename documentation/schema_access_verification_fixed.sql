-- SQL Script to verify schema access and permissions
-- This script checks access rights, RLS policies, and permissions
-- Fixed version for Supabase compatibility

-- 1. Check available schemas
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('common', 'neta_ops', 'business')
ORDER BY schema_name;

-- 2. Check schema usage privileges (fixed)
SELECT 
    n.nspname AS schema_name,
    pg_get_userbyid(n.nspowner) AS schema_owner,
    has_schema_privilege(current_user, n.nspname, 'USAGE') AS has_usage,
    has_schema_privilege(current_user, n.nspname, 'CREATE') AS has_create
FROM pg_namespace n
WHERE n.nspname IN ('common', 'neta_ops', 'business')
ORDER BY n.nspname;

-- 3. List tables in each schema with RLS status
SELECT
    table_schema,
    table_name,
    has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'SELECT') AS has_select,
    has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'INSERT') AS has_insert,
    has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'UPDATE') AS has_update,
    has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'DELETE') AS has_delete,
    obj_description((quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass::oid, 'pg_class') AS description
FROM
    information_schema.tables
WHERE
    table_schema IN ('common', 'neta_ops', 'business')
    AND table_type = 'BASE TABLE'
ORDER BY
    table_schema,
    table_name;

-- 4. Check RLS policies in each schema
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname IN ('common', 'neta_ops', 'business')
ORDER BY
    schemaname,
    tablename,
    policyname;

-- 5. Check foreign key relationships across schemas
SELECT
    tc.table_schema AS schema_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND (
        tc.table_schema IN ('common', 'neta_ops', 'business')
        OR ccu.table_schema IN ('common', 'neta_ops', 'business')
    )
ORDER BY
    tc.table_schema,
    tc.table_name,
    kcu.column_name;

-- 6. Check for views and materialized views
SELECT
    table_schema,
    table_name,
    view_definition
FROM
    information_schema.views
WHERE
    table_schema IN ('common', 'neta_ops', 'business')
ORDER BY
    table_schema,
    table_name;

-- 7. Check for functions and triggers that cross schemas
SELECT
    n.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS result_data_type,
    pg_get_function_arguments(p.oid) AS argument_data_types,
    CASE
        WHEN p.prosrc ILIKE '%common.%' AND n.nspname <> 'common' THEN true
        WHEN p.prosrc ILIKE '%neta_ops.%' AND n.nspname <> 'neta_ops' THEN true
        WHEN p.prosrc ILIKE '%business.%' AND n.nspname <> 'business' THEN true
        ELSE false
    END AS crosses_schemas
FROM
    pg_proc p
    LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE
    n.nspname IN ('common', 'neta_ops', 'business')
    AND p.prokind = 'f'
    AND (
        p.prosrc ILIKE '%common.%'
        OR p.prosrc ILIKE '%neta_ops.%'
        OR p.prosrc ILIKE '%business.%'
    )
ORDER BY
    function_schema,
    function_name;

-- 8. Test cross-schema query execution
-- These queries test if the current user can perform common cross-schema operations

-- 8.1. Test common -> business
EXPLAIN (ANALYZE false)
SELECT c.name, o.name
FROM common.customers c
JOIN business.opportunities o ON c.id = o.customer_id
LIMIT 1;

-- 8.2. Test common -> neta_ops
EXPLAIN (ANALYZE false)
SELECT c.name, j.title
FROM common.customers c
JOIN neta_ops.jobs j ON c.id = j.customer_id
LIMIT 1;

-- 8.3. Test business -> neta_ops
EXPLAIN (ANALYZE false)
SELECT o.name, j.title
FROM business.opportunities o
JOIN neta_ops.jobs j ON o.id = j.opportunity_id
LIMIT 1;

-- 8.4. Test three-way join
EXPLAIN (ANALYZE false)
SELECT c.name, o.name, j.title
FROM common.customers c
JOIN business.opportunities o ON c.id = o.customer_id
JOIN neta_ops.jobs j ON o.id = j.opportunity_id
LIMIT 1;

-- 8.5. Test equipment related join
EXPLAIN (ANALYZE false)
SELECT e.name, c.name as customer_name, a.name as asset_name
FROM neta_ops.equipment e
LEFT JOIN common.customers c ON e.customer_id = c.id
LEFT JOIN neta_ops.assets a ON e.asset_id = a.id
LIMIT 1;

-- 9. Check row level security for equipment management tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'neta_ops'
    AND tablename IN (
        'equipment',
        'calibrations',
        'procedures',
        'certificates',
        'quality_metrics',
        'equipment_assignments',
        'maintenance_records',
        'vehicles'
    )
ORDER BY
    tablename,
    policyname;

-- 10. Verify equipment table relationships
SELECT
    tc.table_schema AS schema_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND (
        tc.table_name IN (
            'equipment',
            'calibrations',
            'procedures',
            'certificates',
            'quality_metrics',
            'equipment_assignments',
            'maintenance_records',
            'vehicles'
        )
        OR ccu.table_name IN (
            'equipment',
            'calibrations',
            'procedures',
            'certificates',
            'quality_metrics',
            'equipment_assignments',
            'maintenance_records',
            'vehicles'
        )
    )
ORDER BY
    tc.table_schema,
    tc.table_name,
    kcu.column_name; 