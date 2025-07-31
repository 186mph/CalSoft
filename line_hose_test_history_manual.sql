-- Create line hose test history table
-- Run this in the Supabase SQL Editor

-- Create the line_hose_test_history table
CREATE TABLE IF NOT EXISTS lab_ops.line_hose_test_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_hose_report_id UUID NOT NULL REFERENCES lab_ops.calibration_line_hose_reports(id) ON DELETE CASCADE,
  test_result TEXT NOT NULL CHECK (test_result IN ('PASS', 'FAIL')),
  tested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_notes TEXT,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lab_ops.line_hose_test_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view line hose test history for reports they have access to" ON lab_ops.line_hose_test_history;
DROP POLICY IF EXISTS "Users can insert line hose test history for reports they own" ON lab_ops.line_hose_test_history;
DROP POLICY IF EXISTS "Users can update line hose test history for reports they own" ON lab_ops.line_hose_test_history;
DROP POLICY IF EXISTS "Users can delete line hose test history for reports they own" ON lab_ops.line_hose_test_history;

-- Create policies with simpler logic
CREATE POLICY "Enable read access for authenticated users" ON lab_ops.line_hose_test_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON lab_ops.line_hose_test_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON lab_ops.line_hose_test_history
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON lab_ops.line_hose_test_history
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_line_hose_test_history_report_id ON lab_ops.line_hose_test_history(line_hose_report_id);
CREATE INDEX IF NOT EXISTS idx_line_hose_test_history_test_date ON lab_ops.line_hose_test_history(test_date);
CREATE INDEX IF NOT EXISTS idx_line_hose_test_history_tested_by ON lab_ops.line_hose_test_history(tested_by);

-- Grant permissions to authenticated users
GRANT ALL ON lab_ops.line_hose_test_history TO authenticated; 