-- Create calibration_digger_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_digger_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_info JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'PASS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calibration_digger_reports_job_id ON lab_ops.calibration_digger_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_calibration_digger_reports_status ON lab_ops.calibration_digger_reports (status);
CREATE INDEX IF NOT EXISTS idx_calibration_digger_reports_created_at ON lab_ops.calibration_digger_reports (created_at);

-- Enable Row Level Security
ALTER TABLE lab_ops.calibration_digger_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read calibration_digger_reports"
ON lab_ops.calibration_digger_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert calibration_digger_reports"
ON lab_ops.calibration_digger_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update calibration_digger_reports"
ON lab_ops.calibration_digger_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete calibration_digger_reports"
ON lab_ops.calibration_digger_reports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON lab_ops.calibration_digger_reports TO authenticated;

-- Add comments
COMMENT ON TABLE lab_ops.calibration_digger_reports IS 'Calibration reports for digger equipment';
COMMENT ON COLUMN lab_ops.calibration_digger_reports.report_info IS 'JSON object containing all report data including digger information, test results, and DOT inspection data';
COMMENT ON COLUMN lab_ops.calibration_digger_reports.status IS 'Overall test status: PASS or FAIL'; 