-- Manual SQL to create job_comments tables
-- Run this in your Supabase SQL Editor

-- Create job_comments table in neta_ops schema
CREATE TABLE IF NOT EXISTS neta_ops.job_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_comments table in lab_ops schema
CREATE TABLE IF NOT EXISTS lab_ops.job_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE neta_ops.job_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.job_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for neta_ops.job_comments
CREATE POLICY "Allow all operations for authenticated users on neta_ops job_comments"
ON neta_ops.job_comments
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create policies for lab_ops.job_comments
CREATE POLICY "Allow all operations for authenticated users on lab_ops job_comments"
ON lab_ops.job_comments
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_neta_ops_job_comments_job_id ON neta_ops.job_comments(job_id);
CREATE INDEX IF NOT EXISTS idx_neta_ops_job_comments_created_at ON neta_ops.job_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lab_ops_job_comments_job_id ON lab_ops.job_comments(job_id);
CREATE INDEX IF NOT EXISTS idx_lab_ops_job_comments_created_at ON lab_ops.job_comments(created_at DESC);

-- Grant permissions to authenticated users
GRANT ALL ON neta_ops.job_comments TO authenticated;
GRANT ALL ON lab_ops.job_comments TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA neta_ops TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA lab_ops TO authenticated;
