-- Add template support columns to meter_template_reports table
ALTER TABLE lab_ops.meter_template_reports 
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_meter_template_reports_is_template 
ON lab_ops.meter_template_reports(is_template) 
WHERE is_template = TRUE;

-- Create index for template name lookups
CREATE INDEX IF NOT EXISTS idx_meter_template_reports_template_name 
ON lab_ops.meter_template_reports(template_name) 
WHERE template_name IS NOT NULL;

-- Allow job_id to be nullable for templates
ALTER TABLE lab_ops.meter_template_reports 
ALTER COLUMN job_id DROP NOT NULL; 