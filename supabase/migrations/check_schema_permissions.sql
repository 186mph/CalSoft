-- Check if common schema exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'common') THEN
        CREATE SCHEMA common;
        RAISE NOTICE 'Created common schema';
    ELSE
        RAISE NOTICE 'Common schema already exists';
    END IF;
END $$;

-- Grant permissions on the schema level
GRANT USAGE ON SCHEMA common TO authenticated;
GRANT USAGE ON SCHEMA common TO anon;
GRANT ALL ON SCHEMA common TO postgres;

-- Output information about the tables
SELECT 
    tablename,
    tableowner
FROM 
    pg_tables
WHERE 
    schemaname = 'common';

-- Check table permissions
SELECT 
    table_schema, 
    table_name, 
    grantee, 
    privilege_type
FROM 
    information_schema.table_privileges
WHERE 
    table_schema = 'common'
ORDER BY
    table_name, grantee, privilege_type; 