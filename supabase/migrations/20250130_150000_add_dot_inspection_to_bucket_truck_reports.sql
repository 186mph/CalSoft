-- Add dot_inspection column to bucket_truck_reports table
ALTER TABLE neta_ops.bucket_truck_reports 
ADD COLUMN dot_inspection JSONB;

-- Add comment to document the column
COMMENT ON COLUMN neta_ops.bucket_truck_reports.dot_inspection IS 'DOT Inspection form data stored as JSONB'; 