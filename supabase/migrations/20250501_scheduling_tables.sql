-- Migration for technician scheduling tables
-- This script will create all necessary tables and views for the scheduling system

-- Create the technician availability table
CREATE TABLE IF NOT EXISTS common.technician_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the technician exceptions table
CREATE TABLE IF NOT EXISTS common.technician_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the technician skills table
CREATE TABLE IF NOT EXISTS common.technician_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  certification TEXT,
  certification_date DATE,
  expiration_date DATE,
  notes TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create job skill requirements table
CREATE TABLE IF NOT EXISTS common.job_skill_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  minimum_proficiency INTEGER CHECK (minimum_proficiency >= 1 AND minimum_proficiency <= 5),
  is_required BOOLEAN NOT NULL DEFAULT true,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the technician assignments table
CREATE TABLE IF NOT EXISTS common.technician_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create the available technicians view
DROP VIEW IF EXISTS common.available_technicians;

CREATE OR REPLACE VIEW common.available_technicians AS
SELECT 
  u.id as user_id,
  u.email,
  (u.raw_user_meta_data->>'name')::TEXT as full_name,
  (u.raw_user_meta_data->>'division')::TEXT as division,
  ta.day_of_week,
  ta.start_time,
  ta.end_time,
  ta.portal_type
FROM 
  auth.users u
JOIN 
  common.technician_availability ta ON u.id = ta.user_id
WHERE 
  -- Only include users with technician-related roles
  (u.raw_user_meta_data->>'role')::TEXT LIKE '%Technician%'
  OR (u.raw_user_meta_data->>'role')::TEXT LIKE '%Scheduler%'
  OR (u.raw_user_meta_data->>'role')::TEXT = 'Admin';

-- Create triggers to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION common.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_technician_availability_timestamp
BEFORE UPDATE ON common.technician_availability
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_technician_exceptions_timestamp
BEFORE UPDATE ON common.technician_exceptions
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_technician_skills_timestamp
BEFORE UPDATE ON common.technician_skills
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_job_skill_requirements_timestamp
BEFORE UPDATE ON common.job_skill_requirements
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_technician_assignments_timestamp
BEFORE UPDATE ON common.technician_assignments
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

-- Add RLS policies for security
ALTER TABLE common.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.job_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_assignments ENABLE ROW LEVEL SECURITY;

-- Basic policies - can be refined as needed
CREATE POLICY "Admins and Schedulers have full access to technician_availability"
  ON common.technician_availability
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%' OR
    user_id = auth.uid()
  );

CREATE POLICY "Admins and Schedulers have full access to technician_exceptions"
  ON common.technician_exceptions
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%' OR
    user_id = auth.uid()
  );

CREATE POLICY "Admins and Schedulers have full access to technician_skills"
  ON common.technician_skills
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%' OR
    user_id = auth.uid()
  );

CREATE POLICY "Admins and Schedulers have full access to job_skill_requirements"
  ON common.job_skill_requirements
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%'
  );

CREATE POLICY "Admins and Schedulers have full access to technician_assignments"
  ON common.technician_assignments
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%' OR
    user_id = auth.uid()
  ); 