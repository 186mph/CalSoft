-- Create meter_template_reports table
CREATE TABLE IF NOT EXISTS lab_ops.meter_template_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    report_info JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy
        WHERE polrelid = 'lab_ops.meter_template_reports'::regclass
        AND polname = 'Allow all operations for authenticated users'
    ) THEN
        ALTER TABLE lab_ops.meter_template_reports ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.meter_template_reports
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$; 