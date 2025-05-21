/*
  # Panelboard Inspection Report Schema

  1. New Tables
    - `panelboard_reports`
      - Stores panelboard inspection report data
      - JSON storage for flexible schema
      - Related to jobs and users
*/

-- Create panelboard_reports table
CREATE TABLE IF NOT EXISTS panelboard_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  report_info jsonb NOT NULL,
  visual_mechanical jsonb NOT NULL,
  insulation_resistance jsonb NOT NULL,
  circuit_breakers jsonb NOT NULL,
  comments text,
  overall_status text DEFAULT 'N/A'
);

-- Enable Row Level Security
ALTER TABLE panelboard_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own panelboard_reports"
ON panelboard_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own panelboard_reports"
ON panelboard_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own panelboard_reports"
ON panelboard_reports FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own panelboard_reports"
ON panelboard_reports FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_panelboard_reports_user_id ON panelboard_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_panelboard_reports_job_id ON panelboard_reports(job_id); 