/*
  # Switchgear Inspection Report Schema

  1. New Tables
    - `switchgear_reports`
      - Stores switchgear inspection report data
      - JSON storage for flexible schema
      - Related to jobs and users
*/

-- Create switchgear_reports table
CREATE TABLE IF NOT EXISTS switchgear_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  report_info jsonb NOT NULL,
  visual_mechanical jsonb NOT NULL,
  insulation_resistance jsonb NOT NULL,
  contact_resistance jsonb NOT NULL,
  comments text,
  overall_status text DEFAULT 'N/A'
);

-- Enable Row Level Security
ALTER TABLE switchgear_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own switchgear_reports"
ON switchgear_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own switchgear_reports"
ON switchgear_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own switchgear_reports"
ON switchgear_reports FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own switchgear_reports"
ON switchgear_reports FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_switchgear_reports_user_id ON switchgear_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_switchgear_reports_job_id ON switchgear_reports(job_id); 