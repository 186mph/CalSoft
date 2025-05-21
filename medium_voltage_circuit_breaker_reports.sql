-- Drop existing table if it exists
DROP TABLE IF EXISTS neta_ops.medium_voltage_circuit_breaker_reports;

-- Create the table
CREATE TABLE neta_ops.medium_voltage_circuit_breaker_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES neta_ops.jobs(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    report_data JSONB DEFAULT '{}'
);

-- Grant permissions
GRANT ALL ON neta_ops.medium_voltage_circuit_breaker_reports TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS mv_cb_reports_job_id_idx
ON neta_ops.medium_voltage_circuit_breaker_reports(job_id);

CREATE INDEX IF NOT EXISTS mv_cb_reports_user_id_idx
ON neta_ops.medium_voltage_circuit_breaker_reports(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE neta_ops.medium_voltage_circuit_breaker_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own reports and reports from jobs they have access to
CREATE POLICY "Users can view their own reports and reports from accessible jobs"
ON neta_ops.medium_voltage_circuit_breaker_reports
FOR SELECT
USING (
    auth.uid() = user_id
    OR 
    job_id IN (
        SELECT j.id 
        FROM neta_ops.jobs j
        WHERE j.user_id = auth.uid()
    )
);

-- Policy to allow users to insert their own reports
CREATE POLICY "Users can insert their own reports"
ON neta_ops.medium_voltage_circuit_breaker_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reports
CREATE POLICY "Users can update their own reports"
ON neta_ops.medium_voltage_circuit_breaker_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
ON neta_ops.medium_voltage_circuit_breaker_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON neta_ops.medium_voltage_circuit_breaker_reports
    FOR EACH ROW
    EXECUTE FUNCTION common.set_updated_at();

-- Ensure assets table has template_type column
ALTER TABLE neta_ops.assets ADD COLUMN IF NOT EXISTS template_type TEXT; 