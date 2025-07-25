-- SQL file to fix date timezone issues by ensuring dates are stored and retrieved consistently

-- Function to adjust date fields to ensure consistent representation
CREATE OR REPLACE FUNCTION set_date_timezone_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- When dates are inserted or updated, ensure they're stored as midnight UTC
  -- to avoid timezone shifts across client displays
  
  -- For jobs table
  IF TG_TABLE_NAME = 'jobs' THEN
    IF NEW.due_date IS NOT NULL THEN
      -- Store date at noon UTC to prevent date boundary issues
      NEW.due_date := (NEW.due_date::timestamp AT TIME ZONE 'UTC')::date;
    END IF;
    
    IF NEW.start_date IS NOT NULL THEN
      NEW.start_date := (NEW.start_date::timestamp AT TIME ZONE 'UTC')::date;
    END IF;
    
    IF NEW.completed_date IS NOT NULL THEN
      NEW.completed_date := (NEW.completed_date::timestamp AT TIME ZONE 'UTC')::date;
    END IF;
  
  -- For opportunities table
  ELSIF TG_TABLE_NAME = 'opportunities' THEN
    IF NEW.expected_close_date IS NOT NULL THEN
      NEW.expected_close_date := (NEW.expected_close_date::timestamp AT TIME ZONE 'UTC')::date;
    END IF;
    
    IF NEW.awarded_date IS NOT NULL THEN
      NEW.awarded_date := (NEW.awarded_date::timestamp AT TIME ZONE 'UTC')::date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to ensure consistent date handling
DROP TRIGGER IF EXISTS jobs_date_timezone_handler ON jobs;
CREATE TRIGGER jobs_date_timezone_handler
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_date_timezone_safe();

DROP TRIGGER IF EXISTS opportunities_date_timezone_handler ON opportunities;
CREATE TRIGGER opportunities_date_timezone_handler
BEFORE INSERT OR UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION set_date_timezone_safe();

-- Add documentation to the tables
COMMENT ON COLUMN jobs.due_date IS 'Due date for the job, stored UTC-normalized to prevent timezone issues';
COMMENT ON COLUMN jobs.start_date IS 'Start date for the job, stored UTC-normalized to prevent timezone issues';
COMMENT ON COLUMN opportunities.expected_close_date IS 'Expected close date, stored UTC-normalized to prevent timezone issues';
COMMENT ON COLUMN opportunities.awarded_date IS 'Date when opportunity was awarded, stored UTC-normalized to prevent timezone issues'; 