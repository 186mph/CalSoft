-- COMPLETE REBUILD OF VEHICLES TABLE
-- Run this in the Supabase SQL Editor

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS neta_ops;

-- Temporarily disable RLS for admin operations
ALTER TABLE IF EXISTS neta_ops.vehicles DISABLE ROW LEVEL SECURITY;

-- Drop existing vehicles table if it exists and recreate it properly
DROP TABLE IF EXISTS neta_ops.vehicles CASCADE;

-- Create the vehicles table with ALL required columns
CREATE TABLE neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  type TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  status TEXT,
  division TEXT,
  current_location TEXT,
  notes TEXT,
  manufacturer TEXT,
  serial_number TEXT,
  purchase_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  equipment_id UUID
);

-- Add comments to all columns
COMMENT ON TABLE neta_ops.vehicles IS 'Vehicles tracked by the system';
COMMENT ON COLUMN neta_ops.vehicles.id IS 'Primary key for the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.name IS 'Display name of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.make IS 'Make/brand of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.model IS 'Model of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.year IS 'Year the vehicle was manufactured';
COMMENT ON COLUMN neta_ops.vehicles.license_plate IS 'License plate number of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN neta_ops.vehicles.type IS 'Type of vehicle (truck, van, car, etc.)';
COMMENT ON COLUMN neta_ops.vehicles.status IS 'Current status of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.notes IS 'Additional notes about the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.current_location IS 'Current location of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.division IS 'Division the vehicle belongs to';
COMMENT ON COLUMN neta_ops.vehicles.last_maintenance_date IS 'Date when the vehicle last had maintenance';
COMMENT ON COLUMN neta_ops.vehicles.next_maintenance_date IS 'Date when the vehicle is due for next maintenance';
COMMENT ON COLUMN neta_ops.vehicles.manufacturer IS 'Manufacturer of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.serial_number IS 'Serial number of the vehicle';
COMMENT ON COLUMN neta_ops.vehicles.purchase_date IS 'Date when the vehicle was purchased';
COMMENT ON COLUMN neta_ops.vehicles.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN neta_ops.vehicles.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN neta_ops.vehicles.equipment_id IS 'Foreign key to the equipment table';

-- Grant permissions to authenticated users
GRANT ALL ON neta_ops.vehicles TO authenticated;
GRANT USAGE ON SCHEMA neta_ops TO authenticated;

-- Add foreign key constraint if equipment table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment'
  ) THEN
    ALTER TABLE neta_ops.vehicles
    ADD CONSTRAINT vehicles_equipment_id_fkey
    FOREIGN KEY (equipment_id)
    REFERENCES neta_ops.equipment(id)
    ON DELETE CASCADE;
  END IF;
END
$$;

-- Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Sample vehicle for testing
INSERT INTO neta_ops.vehicles
(name, make, model, year, type, status, division, current_location)
VALUES
('Test Vehicle', 'Test Make', 'Test Model', 2023, 'truck', 'available', 'default', 'Main Office');

-- Enable RLS for security but allow all authenticated operations for now
ALTER TABLE neta_ops.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated operations on vehicles" ON neta_ops.vehicles
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true); 