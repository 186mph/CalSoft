-- Update the convert_opportunity_to_job function to include division
CREATE OR REPLACE FUNCTION convert_opportunity_to_job()
RETURNS TRIGGER AS $$
DECLARE
  new_job_id uuid;
  next_job_number text;
  division_value text;
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

      -- Map division value if needed
      IF NEW.amp_division = 'Decatur' THEN
        division_value := 'north_alabama';
      ELSE
        division_value := NEW.amp_division;
      END IF;

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
        priority,
        division
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
        'medium', -- Default priority
        division_value -- Mapped division value
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

      -- Map division value if needed
      IF NEW.amp_division = 'Decatur' THEN
        division_value := 'north_alabama';
      ELSE
        division_value := NEW.amp_division;
      END IF;

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
        priority,
        division
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
        'medium', -- Default priority
        division_value -- Mapped division value
      )
      RETURNING id INTO new_job_id;
      
      -- Update the opportunity with the job_id and awarded_date
      NEW.job_id := new_job_id;
      NEW.awarded_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update the manual conversion function to include division
CREATE OR REPLACE FUNCTION convert_opportunity_manually(opportunity_id uuid) 
RETURNS void AS $$
DECLARE
    opp RECORD;
    new_job_id uuid;
    next_job_number text;
    division_value text;
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

        -- Map division value if needed
        IF opp.amp_division = 'Decatur' THEN
          division_value := 'north_alabama';
        ELSE
          division_value := opp.amp_division;
        END IF;

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
            priority,
            division
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
            'medium', -- Default priority
            division_value -- Mapped division value
        )
        RETURNING id INTO new_job_id;
        
        -- Update the opportunity with the job_id and awarded_date
        UPDATE opportunities 
        SET job_id = new_job_id, awarded_date = CURRENT_DATE
        WHERE id = opportunity_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 