-- Create the lab_assets table for the Calibration Division
CREATE TABLE IF NOT EXISTS lab_ops.lab_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  file_url TEXT,
  job_id UUID REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
  user_id UUID,
  asset_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE lab_ops.lab_assets IS 'Assets for Calibration Division jobs';

-- Create indexes
CREATE INDEX IF NOT EXISTS lab_assets_job_id_idx ON lab_ops.lab_assets(job_id);
CREATE INDEX IF NOT EXISTS lab_assets_asset_id_idx ON lab_ops.lab_assets(asset_id);

-- Set up RLS policies
ALTER TABLE lab_ops.lab_assets ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY select_lab_assets ON lab_ops.lab_assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_lab_assets ON lab_ops.lab_assets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY update_lab_assets ON lab_ops.lab_assets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY delete_lab_assets ON lab_ops.lab_assets
  FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON lab_ops.lab_assets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_ops.lab_assets TO authenticated;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 