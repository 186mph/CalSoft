/**
 * FINAL FIX SCRIPT V2 FOR EQUIPMENT MANAGEMENT PERMISSIONS
 * 
 * This script:
 * 1. Creates the neta_ops schema if it doesn't exist
 * 2. Creates all necessary equipment tables in neta_ops schema
 * 3. Creates a technicians view in common schema for safe access to users
 * 4. Grants explicit permissions to authenticated users
 * 5. Disables RLS for development
 * 
 * This version has been updated to handle the division column error
 */

-- Step 1: Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;

-- Drop existing tables/views to avoid conflicts
DROP TABLE IF EXISTS neta_ops.equipment_assignments CASCADE;
DROP TABLE IF EXISTS neta_ops.maintenance_records CASCADE;
DROP TABLE IF EXISTS neta_ops.vehicles CASCADE;
DROP TABLE IF EXISTS neta_ops.equipment CASCADE;
DROP VIEW IF EXISTS common.technicians CASCADE;

-- Step 2: Create the technicians view in common schema
CREATE OR REPLACE VIEW common.technicians AS
SELECT 
  id,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'email' as email,
  raw_user_meta_data->>'role' as role,
  -- Extract division from user metadata if available, but provide null if not
  NULLIF(raw_user_meta_data->>'division', '') as division
FROM 
  auth.users
WHERE
  raw_user_meta_data->>'role' LIKE '%Technician%'
  OR raw_user_meta_data->>'role' LIKE '%Engineer%';

-- Step 3: Create equipment tables in neta_ops schema with robust field definitions
CREATE TABLE IF NOT EXISTS neta_ops.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  warranty_expiration DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  location TEXT,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  asset_id UUID,
  customer_id UUID,
  division TEXT, -- Division is optional and can be null
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS neta_ops.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  technician_id UUID, -- Referencing auth.users directly can be problematic, so we keep it simple
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'checked-out' CHECK (status IN ('checked-out', 'returned', 'overdue', 'damaged')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
  created_by UUID
);

CREATE TABLE IF NOT EXISTS neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES neta_ops.equipment(id) ON DELETE CASCADE,
  make TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  mileage INTEGER,
  fuel_type TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Ensure Row Level Security is disabled for development
ALTER TABLE neta_ops.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.equipment_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles DISABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions to authenticated users
GRANT ALL ON SCHEMA common TO authenticated;
GRANT ALL ON SCHEMA neta_ops TO authenticated;
GRANT ALL ON common.technicians TO authenticated;
GRANT ALL ON neta_ops.equipment TO authenticated;
GRANT ALL ON neta_ops.equipment_assignments TO authenticated;
GRANT ALL ON neta_ops.maintenance_records TO authenticated;
GRANT ALL ON neta_ops.vehicles TO authenticated;

-- Step 6: Insert sample data for testing
-- We use a safer approach that doesn't reference the division column directly
DO $$
BEGIN
  INSERT INTO neta_ops.equipment (name, type, status)
  VALUES 
    ('Test Equipment 1', 'tool', 'available'),
    ('Test Equipment 2', 'safety-equipment', 'assigned'),
    ('Test Equipment 3', 'testing-equipment', 'maintenance');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting sample data: %', SQLERRM;
END $$;

-- Create custom_roles table for roleService
CREATE TABLE IF NOT EXISTS common.custom_roles (
  name TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

GRANT ALL ON common.custom_roles TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_status ON neta_ops.equipment(status);
-- Only create division index if operations succeed
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_equipment_division ON neta_ops.equipment(division);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create division index: %', SQLERRM;
END $$;

-- Notify user of completion
SELECT 'Equipment management database setup complete! Tables created: equipment, vehicles, equipment_assignments, maintenance_records' as result; 