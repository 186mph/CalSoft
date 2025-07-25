-- First drop the existing table
DROP TABLE IF EXISTS neta_ops.low_voltage_switch_reports;

-- Create the table with the correct structure
CREATE TABLE neta_ops.low_voltage_switch_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES neta_ops.jobs(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    report_info JSONB DEFAULT '{}',
    switch_data JSONB DEFAULT '[]',
    fuse_data JSONB DEFAULT '[]',
    visual_inspection JSONB DEFAULT '{}',
    insulation_resistance JSONB DEFAULT '{}',
    temp_corrected_insulation JSONB DEFAULT '{}',
    contact_resistance JSONB DEFAULT '{}',
    test_equipment JSONB DEFAULT '{}',
    comments TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING'
);

-- Grant permissions
GRANT ALL ON neta_ops.low_voltage_switch_reports TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS low_voltage_switch_reports_job_id_idx 
ON neta_ops.low_voltage_switch_reports(job_id);

CREATE INDEX IF NOT EXISTS low_voltage_switch_reports_user_id_idx 
ON neta_ops.low_voltage_switch_reports(user_id); 