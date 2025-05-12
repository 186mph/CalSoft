-- Drop the potentially truncated table (use the name you verified)
DROP TABLE IF EXISTS neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats;

-- Drop the original full-length name just in case it exists somehow
DROP TABLE IF EXISTS neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats;

-- Create the table with the new shorter name
CREATE TABLE neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES neta_ops.jobs(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    report_info JSONB DEFAULT '{}',
    nameplate_data JSONB DEFAULT '{}',
    visual_mechanical JSONB DEFAULT '{}',
    device_settings JSONB DEFAULT '{}',
    contact_resistance JSONB DEFAULT '{}',
    insulation_resistance JSONB DEFAULT '{}',
    primary_injection JSONB DEFAULT '{}',
    test_equipment JSONB DEFAULT '{}',
    comments TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING'
);

-- Grant permissions
GRANT ALL ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats TO authenticated;

-- Create indexes with names based on the new table name
CREATE INDEX IF NOT EXISTS lv_cb_tm_ats_job_id_idx
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats(job_id);

CREATE INDEX IF NOT EXISTS lv_cb_tm_ats_user_id_idx
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own reports and reports from jobs they have access to
CREATE POLICY "Users can view their own reports and reports from accessible jobs"
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats
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
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reports
CREATE POLICY "Users can update their own reports"
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON neta_ops.low_voltage_circuit_breaker_thermal_magnetic_ats
    FOR EACH ROW
    EXECUTE FUNCTION common.set_updated_at(); 