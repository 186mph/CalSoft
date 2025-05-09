-- Create medium voltage switch oil reports table
CREATE TABLE IF NOT EXISTS neta_ops.medium_voltage_switch_oil_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES neta_ops.jobs(id),
  user_id UUID REFERENCES auth.users(id),
  report_info JSONB NOT NULL DEFAULT '{}'::JSONB,
  insulation_resistance_measured JSONB NOT NULL DEFAULT '{}'::JSONB,
  contact_resistance JSONB NOT NULL DEFAULT '{}'::JSONB,
  dielectric_s1s2 JSONB NOT NULL DEFAULT '{}'::JSONB,
  dielectric_s1t1 JSONB NOT NULL DEFAULT '{}'::JSONB,
  dielectric_s1t2 JSONB NOT NULL DEFAULT '{}'::JSONB,
  dielectric_s1t3 JSONB NOT NULL DEFAULT '{}'::JSONB,
  vfi_test_rows JSONB NOT NULL DEFAULT '[]'::JSONB,
  test_equipment JSONB NOT NULL DEFAULT '{}'::JSONB,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'PASS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE neta_ops.medium_voltage_switch_oil_reports ENABLE ROW LEVEL SECURITY;

-- Allow users to view reports for jobs they have access to
CREATE POLICY "Users can view reports for their jobs" ON neta_ops.medium_voltage_switch_oil_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM neta_ops.job_users
      WHERE job_users.job_id = medium_voltage_switch_oil_reports.job_id
      AND job_users.user_id = auth.uid()
    )
  );

-- Allow users to create reports for jobs they have access to
CREATE POLICY "Users can create reports for their jobs" ON neta_ops.medium_voltage_switch_oil_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM neta_ops.job_users
      WHERE job_users.job_id = medium_voltage_switch_oil_reports.job_id
      AND job_users.user_id = auth.uid()
    )
  );

-- Allow users to update reports they created
CREATE POLICY "Users can update their own reports" ON neta_ops.medium_voltage_switch_oil_reports
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON neta_ops.medium_voltage_switch_oil_reports
  FOR EACH ROW
  EXECUTE FUNCTION common.set_updated_at(); 