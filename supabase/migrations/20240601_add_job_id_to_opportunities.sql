-- Add job_id column to opportunities table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'job_id'
  ) THEN
    -- Add the job_id column with a foreign key to jobs
    ALTER TABLE opportunities ADD COLUMN job_id uuid REFERENCES jobs(id);
    
    -- Add an index for better performance
    CREATE INDEX IF NOT EXISTS idx_opportunities_job_id ON opportunities(job_id);
    
    -- Log that the column was added
    RAISE NOTICE 'job_id column added to opportunities table';
  ELSE
    RAISE NOTICE 'job_id column already exists in opportunities table';
  END IF;
END $$; 