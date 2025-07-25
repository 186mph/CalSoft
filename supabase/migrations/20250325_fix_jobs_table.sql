-- Drop and recreate just the jobs table
DROP TABLE IF EXISTS jobs CASCADE;

-- Create jobs table with ALL potentially needed fields
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    job_number TEXT UNIQUE,
    title TEXT NOT NULL,
    name TEXT, -- Some code might use name instead of title
    status TEXT DEFAULT 'pending',
    division TEXT,
    amp_division TEXT, -- Alternative division field
    department TEXT, -- Sometimes used instead of division
    description TEXT,
    location TEXT, -- Job site location
    address TEXT, -- Physical address for the job
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    scheduled_date DATE, -- Sometimes used for scheduling
    budget DECIMAL,
    amount_paid DECIMAL DEFAULT 0,
    cost DECIMAL, -- Alternative to budget
    price DECIMAL, -- Alternative to budget
    priority TEXT DEFAULT 'medium',
    type TEXT, -- Type of job
    category TEXT, -- Category of job
    tags TEXT[], -- For tagging jobs
    manager TEXT, -- Job manager
    technician TEXT, -- Assigned technician
    assigned_to TEXT, -- Generic assignment field
    assigned_to_id UUID, -- ID of assigned user
    notes TEXT,
    comments TEXT,
    is_completed BOOLEAN DEFAULT false,
    is_paid BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to ensure title and name synchronization
CREATE OR REPLACE FUNCTION ensure_job_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is NULL but title is not, use title for name
  IF NEW.name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.name := NEW.title;
  END IF;
  
  -- If title is NULL but name is not, use name for title
  IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
    NEW.title := NEW.name;
  END IF;
  
  -- If job_number is NULL, generate one based on ID
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'JOB-' || substring(NEW.id::text, 1, 8);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_job_title_trigger ON jobs;
CREATE TRIGGER ensure_job_title_trigger
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION ensure_job_title();

-- Enable RLS on the jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy that allows all operations for authenticated users
DROP POLICY IF EXISTS "Allow all operations" ON jobs;
CREATE POLICY "Allow all operations" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true); 