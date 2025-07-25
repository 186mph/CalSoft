-- Create a sequence for generating quote numbers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'quote_number_seq') THEN
    EXECUTE 'CREATE SEQUENCE quote_number_seq START WITH 1';
  END IF;
END
$$;

-- Create opportunities table if it doesn't exist
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  customer_id uuid REFERENCES customers NOT NULL,
  contact_id uuid REFERENCES contacts,
  title text NOT NULL,
  description text,
  status text CHECK (status IN ('awareness', 'interest', 'quote', 'decision', 'decision - forecasted win', 'decision - forecast lose', 'awarded', 'lost', 'no quote')) DEFAULT 'awareness',
  expected_value numeric,
  probability integer DEFAULT 0,
  expected_close_date date,
  quote_number text UNIQUE,
  job_id uuid REFERENCES jobs,
  amp_division text,
  sales_person text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  awarded_date date
);

-- Drop the function if it exists
DROP FUNCTION IF EXISTS generate_quote_number();

-- Function to generate a quote number on opportunity insert
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_part text;
  next_val integer;
BEGIN
  -- Get the current year
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence value
  next_val := nextval('quote_number_seq');
  
  -- Format with leading zeros (e.g., Q2025-0001)
  sequence_part := LPAD(next_val::text, 4, '0');
  
  -- Set the quote number
  NEW.quote_number := 'Q' || year_part || '-' || sequence_part;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set quote_number on insert if not already set
CREATE TRIGGER set_quote_number
BEFORE INSERT ON opportunities
FOR EACH ROW
WHEN (NEW.quote_number IS NULL)
EXECUTE FUNCTION generate_quote_number();

-- Drop the function if it exists
DROP FUNCTION IF EXISTS reset_quote_number_sequence();

-- Reset sequence at the beginning of each year
CREATE OR REPLACE FUNCTION reset_quote_number_sequence()
RETURNS void AS $$
DECLARE
  current_year text;
  max_quote_number text;
  max_sequence integer;
  restart_value integer;
BEGIN
  -- Get the current year
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Find the highest quote number for the current year
  SELECT quote_number INTO max_quote_number 
  FROM opportunities 
  WHERE quote_number LIKE 'Q' || current_year || '-%'
  ORDER BY quote_number DESC
  LIMIT 1;
  
  -- If no quotes exist for the current year, reset to 1
  IF max_quote_number IS NULL THEN
    restart_value := 1;
  ELSE
    -- Extract the sequence part and set the next value
    max_sequence := to_number(SUBSTRING(max_quote_number FROM 8), '9999');
    restart_value := max_sequence + 1;
  END IF;
  
  -- Use EXECUTE to run the ALTER SEQUENCE with the variable
  EXECUTE 'ALTER SEQUENCE quote_number_seq RESTART WITH ' || restart_value;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger first
DROP TRIGGER IF EXISTS convert_opportunity ON opportunities;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS convert_opportunity_to_job();

-- Create function to convert opportunity to job
CREATE OR REPLACE FUNCTION convert_opportunity_to_job()
RETURNS TRIGGER AS $$
DECLARE
  new_job_id uuid;
  next_job_number integer;
BEGIN
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Only proceed if status changed to 'awarded' and job_id is NULL
    IF NEW.status = 'awarded' AND (OLD.status IS NULL OR OLD.status != 'awarded') AND NEW.job_id IS NULL THEN
      -- Get the next job number
      SELECT COALESCE(
          (
              SELECT MAX(CAST(REGEXP_REPLACE(job_number, '[^0-9]', '', 'g') AS INTEGER)) + 1
              FROM jobs
              WHERE job_number ~ '^JOB-[0-9]+$'
          ),
          1000
      )
      INTO next_job_number;

      -- Insert a new job record
      INSERT INTO jobs (
        user_id,
        customer_id,
        contact_id,
        title,
        description,
        status,
        start_date,
        due_date,
        budget,
        notes,
        job_number,
        priority
      ) VALUES (
        NEW.user_id,
        NEW.customer_id,
        NEW.contact_id,
        NEW.title,
        NEW.description,
        'pending', -- Default job status
        CURRENT_DATE, -- Default start date to today
        NULL,
        NEW.expected_value,
        COALESCE(NEW.notes, '') || E'\n\nConverted from opportunity: ' || NEW.quote_number,
        'JOB-' || LPAD(next_job_number::text, 4, '0'),
        'medium' -- Default priority
      )
      RETURNING id INTO new_job_id;
      
      -- Update the opportunity with the job_id and awarded_date
      NEW.job_id := new_job_id;
      NEW.awarded_date := CURRENT_DATE;
    END IF;
  -- For INSERT operations
  ELSIF TG_OP = 'INSERT' THEN
    -- Only proceed if status is 'awarded' and job_id is NULL
    IF NEW.status = 'awarded' AND NEW.job_id IS NULL THEN
      -- Get the next job number
      SELECT COALESCE(
          (
              SELECT MAX(CAST(REGEXP_REPLACE(job_number, '[^0-9]', '', 'g') AS INTEGER)) + 1
              FROM jobs
              WHERE job_number ~ '^JOB-[0-9]+$'
          ),
          1000
      )
      INTO next_job_number;

      -- Insert a new job record
      INSERT INTO jobs (
        user_id,
        customer_id,
        contact_id,
        title,
        description,
        status,
        start_date,
        due_date,
        budget,
        notes,
        job_number,
        priority
      ) VALUES (
        NEW.user_id,
        NEW.customer_id,
        NEW.contact_id,
        NEW.title,
        NEW.description,
        'pending', -- Default job status
        CURRENT_DATE, -- Default start date to today
        NULL,
        NEW.expected_value,
        COALESCE(NEW.notes, '') || E'\n\nConverted from opportunity: ' || NEW.quote_number,
        'JOB-' || LPAD(next_job_number::text, 4, '0'),
        'medium' -- Default priority
      )
      RETURNING id INTO new_job_id;
      
      -- Update the opportunity with the job_id and awarded_date
      NEW.job_id := new_job_id;
      NEW.awarded_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to convert opportunity to job when status changes to 'awarded'
CREATE TRIGGER convert_opportunity
BEFORE INSERT OR UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION convert_opportunity_to_job();

-- Enable Row Level Security
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies for opportunities table
CREATE POLICY "Users can manage their own opportunities"
  ON opportunities
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_job_id ON opportunities(job_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_quote_number ON opportunities(quote_number);

-- Create function to execute annually to reset the sequence
SELECT reset_quote_number_sequence();

-- Add a stored procedure for direct opportunity insertion (without trigger interference)
CREATE OR REPLACE FUNCTION insert_opportunity(
  customer_id uuid,
  title text,
  description text,
  status text DEFAULT 'new',
  expected_value numeric DEFAULT NULL,
  probability integer DEFAULT 0,
  expected_close_date date DEFAULT NULL,
  notes text DEFAULT NULL,
  user_id uuid
) RETURNS json AS $$
DECLARE
  year_part text;
  sequence_part text;
  next_val integer;
  new_quote_number text;
  new_opportunity_id uuid;
  result json;
BEGIN
  -- Generate the quote number directly
  year_part := to_char(CURRENT_DATE, 'YYYY');
  next_val := nextval('quote_number_seq');
  sequence_part := LPAD(next_val::text, 4, '0');
  new_quote_number := 'Q' || year_part || '-' || sequence_part;
  
  -- Insert the record using direct SQL
  INSERT INTO opportunities (
    customer_id,
    title,
    description,
    status,
    expected_value,
    probability,
    expected_close_date,
    quote_number,
    notes,
    user_id
  ) VALUES (
    customer_id,
    title,
    description,
    status,
    expected_value,
    probability,
    expected_close_date,
    new_quote_number,
    notes,
    user_id
  ) RETURNING id INTO new_opportunity_id;
  
  -- Process the job creation for 'awarded' status
  IF status = 'awarded' THEN
    PERFORM convert_opportunity_manually(new_opportunity_id);
  END IF;
  
  -- Return the created record as JSON
  SELECT json_build_object(
    'id', new_opportunity_id,
    'quote_number', new_quote_number
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to manually convert an opportunity to a job
CREATE OR REPLACE FUNCTION convert_opportunity_manually(opportunity_id uuid) 
RETURNS void AS $$
DECLARE
  opp RECORD;
  new_job_id uuid;
  next_job_number integer;
BEGIN
  -- Get the opportunity record
  SELECT * INTO opp FROM opportunities WHERE id = opportunity_id;
  
  -- Only proceed if job_id is NULL
  IF opp.job_id IS NULL THEN
    -- Get the next job number
    SELECT COALESCE(
        (
            SELECT MAX(CAST(REGEXP_REPLACE(job_number, '[^0-9]', '', 'g') AS INTEGER)) + 1
            FROM jobs
            WHERE job_number ~ '^JOB-[0-9]+$'
        ),
        1000
    )
    INTO next_job_number;

    -- Insert a new job record
    INSERT INTO jobs (
      user_id,
      customer_id,
      contact_id,
      title,
      description,
      status,
      start_date,
      due_date,
      budget,
      notes,
      job_number,
      priority
    ) VALUES (
      opp.user_id,
      opp.customer_id,
      opp.contact_id,
      opp.title,
      opp.description,
      'pending', -- Default job status
      CURRENT_DATE, -- Default start date to today
      NULL,
      opp.expected_value,
      COALESCE(opp.notes, '') || E'\n\nConverted from opportunity: ' || opp.quote_number,
      'JOB-' || LPAD(next_job_number::text, 4, '0'),
      'medium' -- Default priority
    )
    RETURNING id INTO new_job_id;
    
    -- Update the opportunity with the job_id and awarded_date
    UPDATE opportunities 
    SET job_id = new_job_id, awarded_date = CURRENT_DATE
    WHERE id = opportunity_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;