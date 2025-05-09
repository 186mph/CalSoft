/*
  # Assets Management Schema

  1. New Tables
    - `assets`
      - Stores asset information (files, documents, etc.)
      - Linked to users
    - `job_assets`
      - Junction table linking jobs to assets
      - Allows many-to-many relationship between jobs and assets

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  file_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id)
);

-- Create job_assets junction table
CREATE TABLE IF NOT EXISTS job_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  UNIQUE(job_id, asset_id)
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for assets table
CREATE POLICY "Users can insert their own assets"
ON assets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own assets"
ON assets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
ON assets FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
ON assets FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create policies for job_assets table
CREATE POLICY "Users can insert their own job_assets"
ON job_assets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own job_assets"
ON job_assets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own job_assets"
ON job_assets FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job_assets"
ON job_assets FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_job_assets_job_id ON job_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assets_asset_id ON job_assets(asset_id); 