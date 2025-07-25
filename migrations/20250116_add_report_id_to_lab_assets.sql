-- Migration: Add report_id column to lab_assets table
-- This allows assets to be linked to parent reports (like bucket truck reports)

-- Add report_id column to lab_assets table
ALTER TABLE lab_ops.lab_assets 
ADD COLUMN IF NOT EXISTS report_id UUID;

-- Add foreign key constraint (optional, but good practice)
-- Note: This assumes the parent reports exist in various calibration tables
-- We'll make it a simple UUID field without specific foreign key for flexibility

-- Add comment to document the purpose
COMMENT ON COLUMN lab_ops.lab_assets.report_id IS 'Links asset to a parent report (e.g., bucket truck report) for hierarchical asset organization';

-- Update any existing indexes if needed (optional)
-- CREATE INDEX IF NOT EXISTS idx_lab_assets_report_id ON lab_ops.lab_assets(report_id); 