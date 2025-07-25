/**
 * FIX SCRIPT FOR EQUIPMENT-RELATED TABLES
 * 
 * This script ensures all equipment-related tables exist with proper structure
 */

-- Ensure equipment_assignments table exists
CREATE TABLE IF NOT EXISTS neta_ops.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  technician_id UUID,
  start_date DATE,
  end_date DATE,
  return_date DATE,
  condition_before NUMERIC,
  condition_after NUMERIC,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure maintenance_records table exists
CREATE TABLE IF NOT EXISTS neta_ops.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT,
  maintenance_date DATE,
  performed_by UUID,
  cost NUMERIC,
  notes TEXT,
  next_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure vehicles table exists
CREATE TABLE IF NOT EXISTS neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  mileage NUMERIC,
  fuel_type TEXT,
  last_service_date DATE,
  next_service_date DATE,
  registration_expiration DATE,
  insurance_expiration DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure assets table exists (for asset_id foreign key)
CREATE TABLE IF NOT EXISTS neta_ops.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Check if assets table columns exist and add if missing
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if 'type' column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'assets' 
    AND column_name = 'type'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.assets ADD COLUMN type TEXT;
    RAISE NOTICE 'Added type column to assets table';
  END IF;
END $$;

-- Create view for technicians
DO $$
BEGIN
  -- First drop the view if it exists, so we can recreate it with different columns
  DROP VIEW IF EXISTS common.technicians;
END $$;

-- Now create the view with the desired structure
CREATE VIEW common.technicians AS 
SELECT 
  users.id AS id, 
  users.email AS email,
  users.raw_user_meta_data ->> 'firstName' AS first_name,
  users.raw_user_meta_data ->> 'lastName' AS last_name,
  -- Add concatenated name field that the UI expects
  (users.raw_user_meta_data ->> 'firstName') || ' ' || (users.raw_user_meta_data ->> 'lastName') AS name,
  users.raw_app_meta_data ->> 'role' AS role
FROM auth.users;

-- Grant permissions on all tables
GRANT ALL ON neta_ops.equipment_assignments TO authenticated;
GRANT ALL ON neta_ops.maintenance_records TO authenticated;
GRANT ALL ON neta_ops.vehicles TO authenticated;
GRANT ALL ON neta_ops.assets TO authenticated;
GRANT ALL ON common.technicians TO authenticated;

-- Disable RLS for development
ALTER TABLE neta_ops.equipment_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.assets DISABLE ROW LEVEL SECURITY;

-- Create the get_maintenance_due_equipment function
CREATE OR REPLACE FUNCTION neta_ops.get_maintenance_due_equipment(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  name TEXT,
  next_maintenance_date DATE,
  days_until_maintenance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.next_maintenance_date,
    (e.next_maintenance_date - CURRENT_DATE) AS days_until_maintenance
  FROM 
    neta_ops.equipment e
  WHERE 
    e.next_maintenance_date IS NOT NULL
    AND e.next_maintenance_date - CURRENT_DATE <= days_threshold
    AND e.next_maintenance_date >= CURRENT_DATE
  ORDER BY 
    e.next_maintenance_date;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION neta_ops.get_maintenance_due_equipment TO authenticated;

-- Add sample data
INSERT INTO neta_ops.assets (name, type)
VALUES ('Sample Asset', 'tool')
ON CONFLICT DO NOTHING;

INSERT INTO common.customers (name, company_name)
VALUES ('John Doe', 'Sample Company')
ON CONFLICT DO NOTHING;

-- Notify completion
SELECT 'Equipment-related tables fixed successfully!' as result; 