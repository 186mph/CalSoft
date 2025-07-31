/*
  # Asset Testing History Schema

  Creates tables to track testing history for assets to monitor degradation over time.
  This will allow tracking of multiple test results per asset across different dates.

  1. New Tables
    - `asset_testing_history`
      - Stores individual test records for assets
      - Links to assets in both neta_ops and lab_ops schemas
      - Tracks test results, measurements, and pass/fail status
    
  2. Features
    - Track multiple tests per asset over time
    - Store test measurements and results
    - Monitor degradation patterns
    - Link to specific jobs where tests were performed
    - Support for different asset types and test types

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create asset testing history table for neta_ops assets
CREATE TABLE IF NOT EXISTS neta_ops.asset_testing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Asset identification
  asset_id uuid NOT NULL REFERENCES neta_ops.assets(id) ON DELETE CASCADE,
  job_id uuid REFERENCES neta_ops.jobs(id) ON DELETE SET NULL,
  
  -- Test information
  test_date timestamptz NOT NULL DEFAULT now(),
  test_type text NOT NULL, -- e.g., 'visual_inspection', 'insulation_resistance', 'continuity', etc.
  test_performed_by uuid REFERENCES auth.users(id),
  
  -- Test results
  pass_fail_status text NOT NULL CHECK (pass_fail_status IN ('PASS', 'FAIL', 'CONDITIONAL')),
  test_measurements jsonb, -- Store various measurements depending on test type
  notes text,
  
  -- Equipment condition assessment
  condition_rating integer CHECK (condition_rating >= 1 AND condition_rating <= 10), -- 1=Poor, 10=Excellent
  degradation_notes text,
  
  -- Reference data
  test_standards text, -- Standards used for testing
  environmental_conditions jsonb, -- Temperature, humidity, etc. during test
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_test_date CHECK (test_date <= now())
);

-- Create asset testing history table for lab_ops assets  
CREATE TABLE IF NOT EXISTS lab_ops.asset_testing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Asset identification
  asset_id uuid NOT NULL REFERENCES lab_ops.lab_assets(id) ON DELETE CASCADE,
  job_id uuid REFERENCES lab_ops.lab_jobs(id) ON DELETE SET NULL,
  
  -- Test information
  test_date timestamptz NOT NULL DEFAULT now(),
  test_type text NOT NULL, -- e.g., 'electrical_test', 'calibration', 'visual_inspection', etc.
  test_performed_by uuid REFERENCES auth.users(id),
  
  -- Test results
  pass_fail_status text NOT NULL CHECK (pass_fail_status IN ('PASS', 'FAIL', 'CONDITIONAL')),
  test_measurements jsonb, -- Store various measurements depending on test type
  notes text,
  
  -- Equipment condition assessment
  condition_rating integer CHECK (condition_rating >= 1 AND condition_rating <= 10), -- 1=Poor, 10=Excellent
  degradation_notes text,
  
  -- Reference data
  test_standards text, -- Standards used for testing
  environmental_conditions jsonb, -- Temperature, humidity, etc. during test
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_test_date CHECK (test_date <= now())
);

-- Enable Row Level Security
ALTER TABLE neta_ops.asset_testing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.asset_testing_history ENABLE ROW LEVEL SECURITY;

-- Create policies for neta_ops.asset_testing_history
CREATE POLICY "Users can insert asset testing history"
ON neta_ops.asset_testing_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view asset testing history"
ON neta_ops.asset_testing_history FOR SELECT TO authenticated
USING (true); -- Allow viewing all records for analysis

CREATE POLICY "Users can update their own asset testing history"
ON neta_ops.asset_testing_history FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own asset testing history"
ON neta_ops.asset_testing_history FOR DELETE TO authenticated
USING (auth.uid() = created_by);

-- Create policies for lab_ops.asset_testing_history
CREATE POLICY "Users can insert lab asset testing history"
ON lab_ops.asset_testing_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view lab asset testing history"
ON lab_ops.asset_testing_history FOR SELECT TO authenticated
USING (true); -- Allow viewing all records for analysis

CREATE POLICY "Users can update their own lab asset testing history"
ON lab_ops.asset_testing_history FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own lab asset testing history"
ON lab_ops.asset_testing_history FOR DELETE TO authenticated
USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_neta_asset_testing_history_asset_id 
ON neta_ops.asset_testing_history(asset_id);

CREATE INDEX IF NOT EXISTS idx_neta_asset_testing_history_test_date 
ON neta_ops.asset_testing_history(test_date);

CREATE INDEX IF NOT EXISTS idx_neta_asset_testing_history_job_id 
ON neta_ops.asset_testing_history(job_id);

CREATE INDEX IF NOT EXISTS idx_lab_asset_testing_history_asset_id 
ON lab_ops.asset_testing_history(asset_id);

CREATE INDEX IF NOT EXISTS idx_lab_asset_testing_history_test_date 
ON lab_ops.asset_testing_history(test_date);

CREATE INDEX IF NOT EXISTS idx_lab_asset_testing_history_job_id 
ON lab_ops.asset_testing_history(job_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE OR REPLACE TRIGGER update_neta_asset_testing_history_updated_at
    BEFORE UPDATE ON neta_ops.asset_testing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_lab_asset_testing_history_updated_at
    BEFORE UPDATE ON lab_ops.asset_testing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON neta_ops.asset_testing_history TO authenticated;
GRANT ALL ON lab_ops.asset_testing_history TO authenticated; 