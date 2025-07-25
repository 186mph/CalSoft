-- Migration to create missing calibration report tables
-- These tables are referenced in the code but don't exist in the database

-- Create calibration_sleeve_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_sleeve_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calibration_blanket_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_blanket_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calibration_line_hose_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_line_hose_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calibration_hotstick_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_hotstick_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calibration_ground_cable_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_ground_cable_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calibration_bucket_truck_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_bucket_truck_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  report_info JSONB NOT NULL,
  status TEXT DEFAULT 'PASS',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calibration_sleeve_reports_job_id ON lab_ops.calibration_sleeve_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sleeve_reports_status ON lab_ops.calibration_sleeve_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_sleeve_reports_created_at ON lab_ops.calibration_sleeve_reports (created_at);

CREATE INDEX IF NOT EXISTS idx_calibration_blanket_reports_job_id ON lab_ops.calibration_blanket_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_blanket_reports_status ON lab_ops.calibration_blanket_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_blanket_reports_created_at ON lab_ops.calibration_blanket_reports (created_at);

CREATE INDEX IF NOT EXISTS idx_calibration_line_hose_reports_job_id ON lab_ops.calibration_line_hose_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_line_hose_reports_status ON lab_ops.calibration_line_hose_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_line_hose_reports_created_at ON lab_ops.calibration_line_hose_reports (created_at);

CREATE INDEX IF NOT EXISTS idx_calibration_hotstick_reports_job_id ON lab_ops.calibration_hotstick_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_hotstick_reports_status ON lab_ops.calibration_hotstick_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_hotstick_reports_created_at ON lab_ops.calibration_hotstick_reports (created_at);

CREATE INDEX IF NOT EXISTS idx_calibration_ground_cable_reports_job_id ON lab_ops.calibration_ground_cable_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_ground_cable_reports_status ON lab_ops.calibration_ground_cable_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_ground_cable_reports_created_at ON lab_ops.calibration_ground_cable_reports (created_at);

CREATE INDEX IF NOT EXISTS idx_calibration_bucket_truck_reports_job_id ON lab_ops.calibration_bucket_truck_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_bucket_truck_reports_status ON lab_ops.calibration_bucket_truck_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_bucket_truck_reports_created_at ON lab_ops.calibration_bucket_truck_reports (created_at);

-- Enable Row Level Security
ALTER TABLE lab_ops.calibration_sleeve_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_blanket_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_line_hose_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_hotstick_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_ground_cable_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_bucket_truck_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to read calibration_sleeve_reports"
ON lab_ops.calibration_sleeve_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_sleeve_reports"
ON lab_ops.calibration_sleeve_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_sleeve_reports"
ON lab_ops.calibration_sleeve_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_sleeve_reports"
ON lab_ops.calibration_sleeve_reports FOR DELETE
TO authenticated
USING (true);

-- Blanket reports policies
CREATE POLICY "Allow authenticated users to read calibration_blanket_reports"
ON lab_ops.calibration_blanket_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_blanket_reports"
ON lab_ops.calibration_blanket_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_blanket_reports"
ON lab_ops.calibration_blanket_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_blanket_reports"
ON lab_ops.calibration_blanket_reports FOR DELETE
TO authenticated
USING (true);

-- Line hose reports policies
CREATE POLICY "Allow authenticated users to read calibration_line_hose_reports"
ON lab_ops.calibration_line_hose_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_line_hose_reports"
ON lab_ops.calibration_line_hose_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_line_hose_reports"
ON lab_ops.calibration_line_hose_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_line_hose_reports"
ON lab_ops.calibration_line_hose_reports FOR DELETE
TO authenticated
USING (true);

-- Hotstick reports policies
CREATE POLICY "Allow authenticated users to read calibration_hotstick_reports"
ON lab_ops.calibration_hotstick_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_hotstick_reports"
ON lab_ops.calibration_hotstick_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_hotstick_reports"
ON lab_ops.calibration_hotstick_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_hotstick_reports"
ON lab_ops.calibration_hotstick_reports FOR DELETE
TO authenticated
USING (true);

-- Ground cable reports policies
CREATE POLICY "Allow authenticated users to read calibration_ground_cable_reports"
ON lab_ops.calibration_ground_cable_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_ground_cable_reports"
ON lab_ops.calibration_ground_cable_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_ground_cable_reports"
ON lab_ops.calibration_ground_cable_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_ground_cable_reports"
ON lab_ops.calibration_ground_cable_reports FOR DELETE
TO authenticated
USING (true);

-- Bucket truck reports policies
CREATE POLICY "Allow authenticated users to read calibration_bucket_truck_reports"
ON lab_ops.calibration_bucket_truck_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_bucket_truck_reports"
ON lab_ops.calibration_bucket_truck_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update calibration_bucket_truck_reports"
ON lab_ops.calibration_bucket_truck_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete calibration_bucket_truck_reports"
ON lab_ops.calibration_bucket_truck_reports FOR DELETE
TO authenticated
USING (true);

-- Grant permissions
GRANT ALL ON lab_ops.calibration_sleeve_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_blanket_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_line_hose_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_hotstick_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_ground_cable_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_bucket_truck_reports TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA lab_ops TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE lab_ops.calibration_sleeve_reports IS 'Calibration reports for sleeve equipment';
COMMENT ON TABLE lab_ops.calibration_blanket_reports IS 'Calibration reports for blanket equipment';
COMMENT ON TABLE lab_ops.calibration_line_hose_reports IS 'Calibration reports for line hose equipment';
COMMENT ON TABLE lab_ops.calibration_hotstick_reports IS 'Calibration reports for hotstick equipment';
COMMENT ON TABLE lab_ops.calibration_ground_cable_reports IS 'Calibration reports for ground cable equipment';
COMMENT ON TABLE lab_ops.calibration_bucket_truck_reports IS 'Calibration reports for bucket truck equipment'; 