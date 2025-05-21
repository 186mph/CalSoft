-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS common;

-- Create technician_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.technician_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_time_check CHECK (start_time < end_time),
  UNIQUE(user_id, day_of_week, start_time, portal_type, division)
);

-- Create technician_exceptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.technician_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exception_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exception_time_check CHECK (
    (is_available = FALSE) OR 
    (is_available = TRUE AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  ),
  UNIQUE(user_id, exception_date, portal_type, division)
);

-- Create technician_skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.technician_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  skill_name TEXT NOT NULL,
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
  certification TEXT,
  certification_date DATE,
  expiration_date DATE,
  notes TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name, portal_type)
);

-- Create technician_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id UUID NOT NULL,
  assignment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT assignment_time_check CHECK (start_time < end_time),
  UNIQUE(user_id, job_id, assignment_date, start_time)
);

-- Create job_skill_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.job_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  minimum_proficiency INTEGER CHECK (minimum_proficiency BETWEEN 1 AND 5),
  is_required BOOLEAN DEFAULT TRUE,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, skill_name)
);

-- Create update_timestamp function
CREATE OR REPLACE FUNCTION common.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS update_technician_availability_timestamp ON common.technician_availability;
CREATE TRIGGER update_technician_availability_timestamp
BEFORE UPDATE ON common.technician_availability
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

DROP TRIGGER IF EXISTS update_technician_exceptions_timestamp ON common.technician_exceptions;
CREATE TRIGGER update_technician_exceptions_timestamp
BEFORE UPDATE ON common.technician_exceptions
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

DROP TRIGGER IF EXISTS update_technician_skills_timestamp ON common.technician_skills;
CREATE TRIGGER update_technician_skills_timestamp
BEFORE UPDATE ON common.technician_skills
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

DROP TRIGGER IF EXISTS update_technician_assignments_timestamp ON common.technician_assignments;
CREATE TRIGGER update_technician_assignments_timestamp
BEFORE UPDATE ON common.technician_assignments
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

DROP TRIGGER IF EXISTS update_job_skill_requirements_timestamp ON common.job_skill_requirements;
CREATE TRIGGER update_job_skill_requirements_timestamp
BEFORE UPDATE ON common.job_skill_requirements
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

-- Enable Row Level Security
ALTER TABLE common.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.technician_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.job_skill_requirements ENABLE ROW LEVEL SECURITY;

-- Create view for available technicians
CREATE OR REPLACE VIEW common.available_technicians AS
SELECT 
  u.id AS user_id,
  u.email,
  u.raw_user_meta_data->>'name' as full_name,
  u.raw_user_meta_data->>'profileImage' as avatar_url,
  u.raw_user_meta_data->>'division' as division,
  ta.portal_type,
  ta.day_of_week,
  ta.start_time,
  ta.end_time
FROM 
  auth.users u
JOIN 
  common.technician_availability ta ON u.id = ta.user_id
WHERE
  u.raw_user_meta_data->>'role' IN ('NETA Technician', 'Lab Technician', 'Scav')
ORDER BY
  ta.portal_type, u.raw_user_meta_data->>'division', u.raw_user_meta_data->>'name', ta.day_of_week, ta.start_time; 