-- Run this SQL in your Supabase SQL Editor to add soft delete functionality

-- Add deleted_at column to lab_assets table for soft delete functionality
ALTER TABLE lab_ops.lab_assets 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index on deleted_at for better performance when querying deleted assets
CREATE INDEX IF NOT EXISTS idx_lab_assets_deleted_at 
ON lab_ops.lab_assets(deleted_at);

-- Add comment to explain the column
COMMENT ON COLUMN lab_ops.lab_assets.deleted_at IS 'Timestamp when the asset was soft deleted. NULL means the asset is active.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'lab_ops' 
AND table_name = 'lab_assets' 
AND column_name = 'deleted_at'; 