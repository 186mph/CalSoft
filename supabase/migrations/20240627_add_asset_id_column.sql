-- Add the asset_id column to lab_assets table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'lab_ops' 
        AND table_name = 'lab_assets' 
        AND column_name = 'asset_id'
    ) THEN
        ALTER TABLE lab_ops.lab_assets 
        ADD COLUMN asset_id TEXT;
        
        RAISE NOTICE 'Added asset_id column to lab_assets table';
    ELSE
        RAISE NOTICE 'asset_id column already exists in lab_assets table';
    END IF;
END $$;

-- Grant permissions to the table
GRANT ALL ON lab_ops.lab_assets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_ops.lab_assets TO authenticated;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 