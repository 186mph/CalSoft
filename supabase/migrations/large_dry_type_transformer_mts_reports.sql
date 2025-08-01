-- Drop existing table if it exists
DROP TABLE IF EXISTS neta_ops.large_dry_type_transformer_mts_reports;

-- Create the table
CREATE TABLE neta_ops.large_dry_type_transformer_mts_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES neta_ops.jobs(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    report_info JSONB DEFAULT '{}',
    visual_inspection JSONB DEFAULT '{}',
    insulation_resistance JSONB DEFAULT '{}',
    turns_ratio JSONB DEFAULT '{}',
    test_equipment JSONB DEFAULT '{}',
    comments TEXT DEFAULT ''
);

-- Grant permissions
GRANT ALL ON neta_ops.large_dry_type_transformer_mts_reports TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS large_dry_type_transformer_mts_reports_job_id_idx
ON neta_ops.large_dry_type_transformer_mts_reports(job_id);

CREATE INDEX IF NOT EXISTS large_dry_type_transformer_mts_reports_user_id_idx
ON neta_ops.large_dry_type_transformer_mts_reports(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE neta_ops.large_dry_type_transformer_mts_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own reports and reports from jobs they have access to
CREATE POLICY "Users can view their own reports and reports from accessible jobs"
ON neta_ops.large_dry_type_transformer_mts_reports
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
ON neta_ops.large_dry_type_transformer_mts_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reports
CREATE POLICY "Users can update their own reports"
ON neta_ops.large_dry_type_transformer_mts_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
ON neta_ops.large_dry_type_transformer_mts_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON neta_ops.large_dry_type_transformer_mts_reports
    FOR EACH ROW
    EXECUTE FUNCTION common.set_updated_at(); 