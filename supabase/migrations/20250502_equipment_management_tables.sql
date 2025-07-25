-- Migration to add equipment management tables to neta_ops schema
-- Based on the equipment management features from the frontend components

-- Create equipment table in neta_ops schema
CREATE TABLE IF NOT EXISTS neta_ops.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  warranty_expiration DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired', 'calibration')),
  location TEXT,
  asset_id UUID REFERENCES neta_ops.assets(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES common.customers(id) ON DELETE SET NULL,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create calibrations table for tracking equipment calibration
CREATE TABLE IF NOT EXISTS neta_ops.calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  calibration_date DATE NOT NULL,
  next_calibration_date DATE,
  performed_by UUID REFERENCES auth.users(id),
  calibration_standard TEXT,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'adjusted')),
  certificate_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create procedures table for testing and maintenance procedures
CREATE TABLE IF NOT EXISTS neta_ops.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'under-review', 'approved', 'deprecated')),
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_date DATE
);

-- Create certificates table for equipment certification
CREATE TABLE IF NOT EXISTS neta_ops.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_type TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiration_date DATE,
  status TEXT NOT NULL CHECK (status IN ('valid', 'expired', 'revoked')),
  equipment_id UUID REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES neta_ops.calibrations(id) ON DELETE SET NULL,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create quality_metrics table for equipment performance metrics
CREATE TABLE IF NOT EXISTS neta_ops.quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
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
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create equipment_assignments table for tracking equipment assignments
CREATE TABLE IF NOT EXISTS neta_ops.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  job_id UUID REFERENCES neta_ops.jobs(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create maintenance_records table for tracking equipment maintenance
CREATE TABLE IF NOT EXISTS neta_ops.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'certification', 'calibration', 'other')),
  maintenance_date DATE NOT NULL,
  next_maintenance_date DATE,
  performed_by TEXT,
  cost DECIMAL(10, 2),
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create vehicles table as a specialized extension of equipment
CREATE TABLE IF NOT EXISTS neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  make TEXT,
  model TEXT, 
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  mileage INTEGER,
  fuel_type TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE neta_ops.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for equipment
CREATE POLICY "Allow authenticated users to view equipment"
ON neta_ops.equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert equipment"
ON neta_ops.equipment FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update equipment"
ON neta_ops.equipment FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for calibrations
CREATE POLICY "Allow authenticated users to view calibrations"
ON neta_ops.calibrations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert calibrations"
ON neta_ops.calibrations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update calibrations"
ON neta_ops.calibrations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for procedures
CREATE POLICY "Allow authenticated users to view procedures"
ON neta_ops.procedures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert procedures"
ON neta_ops.procedures FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update procedures"
ON neta_ops.procedures FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for certificates
CREATE POLICY "Allow authenticated users to view certificates"
ON neta_ops.certificates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert certificates"
ON neta_ops.certificates FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update certificates"
ON neta_ops.certificates FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for quality_metrics
CREATE POLICY "Allow authenticated users to view quality_metrics"
ON neta_ops.quality_metrics FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert quality_metrics"
ON neta_ops.quality_metrics FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update quality_metrics"
ON neta_ops.quality_metrics FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for equipment_assignments
CREATE POLICY "Allow authenticated users to view equipment_assignments"
ON neta_ops.equipment_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert equipment_assignments"
ON neta_ops.equipment_assignments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update equipment_assignments"
ON neta_ops.equipment_assignments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for maintenance_records
CREATE POLICY "Allow authenticated users to view maintenance_records"
ON neta_ops.maintenance_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert maintenance_records"
ON neta_ops.maintenance_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update maintenance_records"
ON neta_ops.maintenance_records FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for vehicles
CREATE POLICY "Allow authenticated users to view vehicles"
ON neta_ops.vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to insert vehicles"
ON neta_ops.vehicles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update vehicles"
ON neta_ops.vehicles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create update triggers for timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_equipment_timestamp
BEFORE UPDATE ON neta_ops.equipment
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_calibrations_timestamp
BEFORE UPDATE ON neta_ops.calibrations
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_procedures_timestamp
BEFORE UPDATE ON neta_ops.procedures
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_certificates_timestamp
BEFORE UPDATE ON neta_ops.certificates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_quality_metrics_timestamp
BEFORE UPDATE ON neta_ops.quality_metrics
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_equipment_assignments_timestamp
BEFORE UPDATE ON neta_ops.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_maintenance_records_timestamp
BEFORE UPDATE ON neta_ops.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_vehicles_timestamp
BEFORE UPDATE ON neta_ops.vehicles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 