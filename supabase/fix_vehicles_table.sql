-- Fix vehicles table by adding missing columns
-- Run this in the Supabase SQL Editor
-- Explicitly targeting neta_ops schema

-- First verify the schema exists
CREATE SCHEMA IF NOT EXISTS neta_ops;

-- Add the missing columns to the vehicles table
-- Core vehicle details
ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS make TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS model TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS year INTEGER;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS license_plate TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS vin TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Location and division
ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS current_location TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS division TEXT;

-- Maintenance dates
ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE;

-- Additional details
ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS serial_number TEXT;

ALTER TABLE neta_ops.vehicles 
ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Add comments to all columns
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

-- Update existing records to have an empty string for text columns
UPDATE neta_ops.vehicles
SET current_location = ''
WHERE current_location IS NULL;

UPDATE neta_ops.vehicles
SET division = 'default'
WHERE division IS NULL;

-- Verify the vehicles table exists (create if needed)
CREATE TABLE IF NOT EXISTS neta_ops.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  equipment_id UUID REFERENCES neta_ops.equipment(id) ON DELETE CASCADE
); 