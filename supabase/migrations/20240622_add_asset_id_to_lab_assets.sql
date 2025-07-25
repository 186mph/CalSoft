-- Add asset_id column to lab_assets table
ALTER TABLE lab_ops.lab_assets
ADD COLUMN IF NOT EXISTS asset_id TEXT;

-- Create an index on asset_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lab_assets_asset_id
ON lab_ops.lab_assets(asset_id);

-- Update the schema cache
SELECT pg_notify('reload_schema', '');

-- Verify the column exists
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'lab_ops'
    AND table_name = 'lab_assets'
    AND column_name = 'asset_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION 'Error: asset_id column was not added successfully';
  ELSE
    RAISE NOTICE 'Successfully added asset_id column to lab_assets table';
  END IF;
END $$; 