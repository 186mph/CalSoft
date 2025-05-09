-- Add division column to jobs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'division'
  ) THEN
    ALTER TABLE jobs ADD COLUMN division text;
    
    -- Map any existing divisions that don't match our standard values
    -- Copy division from opportunities when a job was created from an opportunity
    UPDATE jobs
    SET division = CASE 
      WHEN opportunities.amp_division = 'Decatur' THEN 'north_alabama'
      ELSE opportunities.amp_division 
    END
    FROM opportunities
    WHERE opportunities.job_id = jobs.id
    AND opportunities.amp_division IS NOT NULL;
    
    -- Also handle any direct "Decatur" values in the jobs table
    UPDATE jobs
    SET division = 'north_alabama'
    WHERE division = 'Decatur';
    
    -- Add check constraint for valid division values
    ALTER TABLE jobs 
    ADD CONSTRAINT jobs_division_check 
    CHECK (division IN ('north_alabama', 'tennessee', 'georgia', 'international'));
    
    -- Create an index for the division column
    CREATE INDEX idx_jobs_division ON jobs(division);
  END IF;
END $$;

-- Add a comment to document this change
COMMENT ON COLUMN jobs.division IS 'Division responsible for the job (north_alabama, tennessee, georgia, international)'; 