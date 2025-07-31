-- Create glove test history table
CREATE TABLE IF NOT EXISTS lab_ops.glove_test_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  glove_report_id UUID NOT NULL REFERENCES lab_ops.calibration_gloves_reports(id) ON DELETE CASCADE,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  test_result TEXT NOT NULL CHECK (test_result IN ('PASS', 'FAIL')),
  tested_by UUID REFERENCES auth.users(id),
  test_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lab_ops.glove_test_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view glove test history for reports they have access to" ON lab_ops.glove_test_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lab_ops.calibration_gloves_reports r
      WHERE r.id = glove_report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert glove test history for reports they own" ON lab_ops.glove_test_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_ops.calibration_gloves_reports r
      WHERE r.id = glove_report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update glove test history for reports they own" ON lab_ops.glove_test_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lab_ops.calibration_gloves_reports r
      WHERE r.id = glove_report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete glove test history for reports they own" ON lab_ops.glove_test_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lab_ops.calibration_gloves_reports r
      WHERE r.id = glove_report_id
      AND r.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_glove_test_history_report_id ON lab_ops.glove_test_history(glove_report_id);
CREATE INDEX idx_glove_test_history_test_date ON lab_ops.glove_test_history(test_date);
CREATE INDEX idx_glove_test_history_tested_by ON lab_ops.glove_test_history(tested_by);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION lab_ops.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER glove_test_history_updated_at
  BEFORE UPDATE ON lab_ops.glove_test_history
  FOR EACH ROW
  EXECUTE FUNCTION lab_ops.handle_updated_at(); 