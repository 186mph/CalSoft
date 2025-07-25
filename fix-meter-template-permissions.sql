-- Comprehensive fix for meter_template_reports table

-- 1. Drop the existing table to start fresh
DROP TABLE IF EXISTS lab_ops.meter_template_reports CASCADE;

-- 2. Recreate the table with proper structure for templates
CREATE TABLE lab_ops.meter_template_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID, -- Nullable for templates
    user_id UUID REFERENCES auth.users(id),
    report_info JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    template_name TEXT, -- For template functionality
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraint to ensure templates have template_name
    CONSTRAINT check_template_name CHECK (
        (is_template = false AND job_id IS NOT NULL) OR 
        (is_template = true AND template_name IS NOT NULL)
    )
);

-- 3. Add foreign key constraint that allows NULL job_id
ALTER TABLE lab_ops.meter_template_reports 
ADD CONSTRAINT meter_template_reports_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE lab_ops.meter_template_reports ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" 
ON lab_ops.meter_template_reports
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Create index for better performance
CREATE INDEX idx_meter_template_reports_job_id ON lab_ops.meter_template_reports(job_id);
CREATE INDEX idx_meter_template_reports_is_template ON lab_ops.meter_template_reports(is_template);
CREATE INDEX idx_meter_template_reports_template_name ON lab_ops.meter_template_reports(template_name);

-- 7. Grant permissions (though RLS should handle this)
GRANT ALL ON lab_ops.meter_template_reports TO authenticated;
GRANT USAGE ON SCHEMA lab_ops TO authenticated; 