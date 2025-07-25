/*
  # Setup Function for Panelboard Reports Table
  
  Creates an RPC function that can be called to setup the panelboard_reports table
  and related functionality if it doesn't already exist.
*/

-- Create function to setup panelboard reports table
CREATE OR REPLACE FUNCTION setup_panelboard_reports_table()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if table already exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'panelboard_reports'
  ) INTO table_exists;

  -- If table exists, return early
  IF table_exists THEN
    RETURN 'Table already exists';
  END IF;

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

  RETURN 'Panelboard reports table created successfully';
END;
$$; 