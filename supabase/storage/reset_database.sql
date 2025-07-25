-- Start a transaction
BEGIN;

-- Temporarily disable trigger enforcement
SET session_replication_role = 'replica';

-- Clear data from application tables
DO $$ 
BEGIN
    -- Clear data from application tables
    EXECUTE (
        SELECT string_agg('TRUNCATE TABLE ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' CASCADE;', ' ')
        FROM pg_tables
        WHERE schemaname = 'public' 
        AND tablename IN ('opportunities', 'customers', 'contacts', 'jobs', 'job_assets', 'panelboard_reports', 'profiles')
    );
    
    -- Clear auth users
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        TRUNCATE TABLE auth.users CASCADE;
    END IF;

    -- Clear storage objects and buckets
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        TRUNCATE TABLE storage.objects CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        TRUNCATE TABLE storage.buckets CASCADE;
    END IF;
END $$;

-- Re-enable trigger enforcement
SET session_replication_role = 'origin';

-- Reset sequences
DO $$ 
BEGIN
    -- Reset sequences if they exist
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'opportunities_id_seq') THEN
        ALTER SEQUENCE public.opportunities_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customers_id_seq') THEN
        ALTER SEQUENCE public.customers_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'contacts_id_seq') THEN
        ALTER SEQUENCE public.contacts_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'jobs_id_seq') THEN
        ALTER SEQUENCE public.jobs_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'job_assets_id_seq') THEN
        ALTER SEQUENCE public.job_assets_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'panelboard_reports_id_seq') THEN
        ALTER SEQUENCE public.panelboard_reports_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Commit the transaction
COMMIT; 