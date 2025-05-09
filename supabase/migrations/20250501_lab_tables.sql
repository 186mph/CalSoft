-- Create the lab schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS lab;

-- Create the equipment table for the lab
CREATE TABLE IF NOT EXISTS lab.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'in-use', 'maintenance', 'calibration', 'out-of-service')),
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  warranty_expiration DATE,
  location TEXT,
  responsible_user UUID REFERENCES auth.users(id),
  notes TEXT,
  last_calibration_date DATE,
  next_calibration_date DATE,
  calibration_frequency INT, -- in days
  calibration_procedure_id UUID,
  accuracy_rating TEXT,
  measurement_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the calibrations table to track calibration history
CREATE TABLE IF NOT EXISTS lab.calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES lab.equipment(id),
  calibration_date DATE NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  calibration_standard TEXT,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'adjusted')),
  certificate_number TEXT,
  notes TEXT,
  next_calibration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the procedures table for testing procedures documentation
CREATE TABLE IF NOT EXISTS lab.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'under-review', 'approved', 'deprecated')),
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the certificates table
CREATE TABLE IF NOT EXISTS lab.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_type TEXT NOT NULL,
  issued_date DATE NOT NULL,
  issued_to TEXT NOT NULL,
  issued_by UUID REFERENCES auth.users(id),
  equipment_id UUID REFERENCES lab.equipment(id),
  calibration_id UUID REFERENCES lab.calibrations(id),
  document_url TEXT,
  expiration_date DATE,
  status TEXT NOT NULL CHECK (status IN ('valid', 'expired', 'revoked')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the quality metrics table
CREATE TABLE IF NOT EXISTS lab.quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  unit TEXT,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  target_value DECIMAL(10, 2),
  lower_threshold DECIMAL(10, 2),
  upper_threshold DECIMAL(10, 2),
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN metric_value < lower_threshold THEN 'below-threshold'
      WHEN metric_value > upper_threshold THEN 'above-threshold'
      ELSE 'within-threshold'
    END
  ) STORED,
  equipment_id UUID REFERENCES lab.equipment(id),
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create functions to check and create tables if needed
CREATE OR REPLACE FUNCTION check_lab_tables_exist()
RETURNS BOOLEAN AS $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'lab' 
    AND table_name = 'equipment'
  ) INTO tables_exist;
  
  RETURN tables_exist;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for lab tables
ALTER TABLE lab.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab.calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab.quality_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for lab.equipment
CREATE POLICY "Users can view equipment" 
ON lab.equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Lab technicians can insert equipment" 
ON lab.equipment FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'Lab Technician' OR
  auth.jwt() ->> 'role' = 'Lab Manager' OR
  auth.jwt() ->> 'role' = 'Admin'
);

CREATE POLICY "Lab technicians can update their equipment" 
ON lab.equipment FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'Lab Technician' OR
  auth.jwt() ->> 'role' = 'Lab Manager' OR
  auth.jwt() ->> 'role' = 'Admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'Lab Technician' OR
  auth.jwt() ->> 'role' = 'Lab Manager' OR
  auth.jwt() ->> 'role' = 'Admin'
);

-- Similar policies for other lab tables (abbreviated)
-- Calibrations
CREATE POLICY "Users can view calibrations" 
ON lab.calibrations FOR SELECT
TO authenticated
USING (true);

-- Procedures
CREATE POLICY "Users can view procedures" 
ON lab.procedures FOR SELECT
TO authenticated
USING (true);

-- Certificates
CREATE POLICY "Users can view certificates" 
ON lab.certificates FOR SELECT
TO authenticated
USING (true);

-- Quality metrics
CREATE POLICY "Users can view quality metrics" 
ON lab.quality_metrics FOR SELECT
TO authenticated
USING (true);

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_lab_equipment_timestamp
BEFORE UPDATE ON lab.equipment
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_lab_calibrations_timestamp
BEFORE UPDATE ON lab.calibrations
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_lab_procedures_timestamp
BEFORE UPDATE ON lab.procedures
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_lab_certificates_timestamp
BEFORE UPDATE ON lab.certificates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_lab_quality_metrics_timestamp
BEFORE UPDATE ON lab.quality_metrics
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 