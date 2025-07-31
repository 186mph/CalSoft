-- Create digger_test_history table
CREATE TABLE IF NOT EXISTS lab_ops.digger_test_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  digger_report_id UUID NOT NULL REFERENCES lab_ops.calibration_digger_reports(id) ON DELETE CASCADE,
  test_result TEXT NOT NULL CHECK (test_result IN ('PASS', 'FAIL')),
  tested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_notes TEXT,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_digger_test_history_report_id ON lab_ops.digger_test_history (digger_report_id);
CREATE INDEX IF NOT EXISTS idx_digger_test_history_test_date ON lab_ops.digger_test_history (test_date);
CREATE INDEX IF NOT EXISTS idx_digger_test_history_tested_by ON lab_ops.digger_test_history (tested_by);

-- Enable Row Level Security
ALTER TABLE lab_ops.digger_test_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read digger_test_history"
ON lab_ops.digger_test_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert digger_test_history"
ON lab_ops.digger_test_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = tested_by);

CREATE POLICY "Allow authenticated users to update digger_test_history"
ON lab_ops.digger_test_history FOR UPDATE
TO authenticated
USING (auth.uid() = tested_by)
WITH CHECK (auth.uid() = tested_by);

CREATE POLICY "Allow authenticated users to delete digger_test_history"
ON lab_ops.digger_test_history FOR DELETE
TO authenticated
USING (auth.uid() = tested_by);

-- Grant permissions
GRANT ALL ON lab_ops.digger_test_history TO authenticated;

-- Add comments
COMMENT ON TABLE lab_ops.digger_test_history IS 'Test history for digger calibration reports';
COMMENT ON COLUMN lab_ops.digger_test_history.test_result IS 'Result of the test: PASS or FAIL';
COMMENT ON COLUMN lab_ops.digger_test_history.tested_by IS 'User ID of the person who performed the test';
COMMENT ON COLUMN lab_ops.digger_test_history.test_notes IS 'Optional notes about the test'; 