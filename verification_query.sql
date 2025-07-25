-- Verification script for equipment setup

-- Query 1: Check if the equipment tables exist in neta_ops schema
SELECT 
  table_schema, 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'neta_ops' 
  AND table_name IN ('equipment', 'equipment_assignments', 'maintenance_records', 'vehicles')
ORDER BY 
  table_name;

-- Query 2: Check if Row Level Security is disabled as expected
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM
  pg_tables
WHERE
  schemaname = 'neta_ops'
  AND tablename IN ('equipment', 'equipment_assignments', 'maintenance_records', 'vehicles');

-- Query 3: Check if foreign key relationships are properly set up
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM
  pg_constraint
WHERE
  conrelid::regclass::text LIKE 'neta_ops.%'
  AND contype = 'f'
ORDER BY
  conrelid::regclass::text, conname;

-- Verify equipment management tables exist in neta_ops schema
SELECT 
    table_schema,
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'neta_ops' 
    AND table_name IN (
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
    table_name;

-- Verify RLS policies exist for equipment tables
SELECT 
    schemaname,
    tablename,
    policyname
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

-- Verify foreign key relationships
SELECT
    tc.table_schema AS table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'neta_ops'
    AND tc.table_name IN (
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
    tc.table_name,
    kcu.column_name; 