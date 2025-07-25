-- Add priority column to jobs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'priority'
  ) THEN
    ALTER TABLE jobs ADD COLUMN priority text DEFAULT 'medium';
    
    -- Add check constraint for valid priority values
    ALTER TABLE jobs 
    ADD CONSTRAINT jobs_priority_check 
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$; 