-- Fix meter_template_reports table for template support
-- Run this in Supabase SQL Editor

-- Create the schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS lab_ops;

-- Drop the table if it exists with wrong constraints
DROP TABLE IF EXISTS lab_ops.meter_template_reports;

-- Create meter_template_reports table with nullable job_id for templates
CREATE TABLE lab_ops.meter_template_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID, -- Nullable for templates
    user_id UUID REFERENCES auth.users(id),
    report_info JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lab_ops.meter_template_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" 
ON lab_ops.meter_template_reports
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_meter_template_reports_job_id ON lab_ops.meter_template_reports(job_id);
CREATE INDEX idx_meter_template_reports_status ON lab_ops.meter_template_reports(status);
CREATE INDEX idx_meter_template_reports_user_id ON lab_ops.meter_template_reports(user_id);

-- Add a specific index for templates
CREATE INDEX idx_meter_template_reports_templates 
ON lab_ops.meter_template_reports(status) 
WHERE status = 'TEMPLATE';

-- Test table creation with a comment
COMMENT ON TABLE lab_ops.meter_template_reports IS 'Table for storing meter calibration reports and templates';
COMMENT ON COLUMN lab_ops.meter_template_reports.job_id IS 'Job ID - nullable for templates';
COMMENT ON COLUMN lab_ops.meter_template_reports.status IS 'Report status - use TEMPLATE for templates'; 