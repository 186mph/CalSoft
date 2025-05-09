-- Create a sequence for generating job numbers
CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1000;

-- Create a function to generate a job number on job insert
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_number := 'JOB-' || nextval('job_number_seq')::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add job_number column to jobs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'job_number'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_number TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create a trigger to automatically set job_number on insert if not already set
DROP TRIGGER IF EXISTS set_job_number ON jobs;
CREATE TRIGGER set_job_number
BEFORE INSERT ON jobs
FOR EACH ROW
WHEN (NEW.job_number IS NULL)
EXECUTE FUNCTION generate_job_number();

-- Update existing jobs that don't have a job_number
UPDATE jobs
SET job_number = 'JOB-' || nextval('job_number_seq')::text
WHERE job_number IS NULL; 