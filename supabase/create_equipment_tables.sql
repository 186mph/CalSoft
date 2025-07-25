-- Create neta_ops schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS neta_ops;

-- Create equipment table
CREATE TABLE IF NOT EXISTS neta_ops.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  warranty_expiration DATE,
  status TEXT DEFAULT 'available',
  location TEXT,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID,
  asset_id UUID,
  division TEXT,
  category TEXT,
  current_location TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  purchase_price DECIMAL(10,2),
  last_calibration_date DATE,
  next_calibration_date DATE,
  created_by UUID
);

-- Create equipment_assignments table
CREATE TABLE IF NOT EXISTS neta_ops.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES neta_ops.equipment(id),
  technician_id UUID,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'checked-out',
  condition_before INTEGER,
  condition_after INTEGER,
  return_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS neta_ops.maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES neta_ops.equipment(id),
  maintenance_type TEXT,
  maintenance_date DATE,
  next_maintenance_date DATE,
  performed_by TEXT,
  cost DECIMAL(10,2),
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  status_after_maintenance TEXT
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  division TEXT,
  status TEXT DEFAULT 'available',
  license_plate TEXT,
  vin TEXT,
  year TEXT,
  make TEXT,
  model TEXT,
  current_location TEXT,
  assigned_to UUID,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create common.technicians view
CREATE SCHEMA IF NOT EXISTS common;

CREATE OR REPLACE VIEW common.technicians AS
SELECT 
  id,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'email' as email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'division' as division,
  raw_user_meta_data->>'phone' as phone
FROM 
  auth.users
WHERE
  raw_user_meta_data->>'role' LIKE '%Technician%'
  OR raw_user_meta_data->>'role' LIKE '%Engineer%';

-- Grant permissions
GRANT USAGE ON SCHEMA neta_ops TO authenticated;
GRANT USAGE ON SCHEMA common TO authenticated;

GRANT ALL ON neta_ops.equipment TO authenticated;
GRANT ALL ON neta_ops.equipment_assignments TO authenticated;
GRANT ALL ON neta_ops.maintenance_records TO authenticated;
GRANT ALL ON neta_ops.vehicles TO authenticated;
GRANT SELECT ON common.technicians TO authenticated;

-- Disable Row Level Security on these tables for development
ALTER TABLE neta_ops.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.equipment_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_division ON neta_ops.equipment(division);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON neta_ops.equipment(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_division ON neta_ops.vehicles(division);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_equipment_id ON neta_ops.maintenance_records(equipment_id); 