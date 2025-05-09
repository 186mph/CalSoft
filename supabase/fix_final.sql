/**
 * COMPREHENSIVE FIX SCRIPT FOR EQUIPMENT MANAGEMENT SYSTEM
 * 
 * This script ensures all required schemas, tables, and permissions are in place
 * with the correct structure for the equipment management system.
 */

-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;

-- Grant schema usage to authenticated users
GRANT USAGE ON SCHEMA common TO authenticated;
GRANT USAGE ON SCHEMA neta_ops TO authenticated;
GRANT USAGE ON SCHEMA business TO authenticated;

-- Create technicians view
DO $$
BEGIN
  -- First drop the view if it exists
  DROP VIEW IF EXISTS common.technicians;
END $$;

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

-- Grant permissions on the technicians view
GRANT ALL ON common.technicians TO authenticated;

-- Create the equipment table
CREATE TABLE IF NOT EXISTS neta_ops.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT,
  category TEXT,
  status TEXT,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  warranty_expiration DATE,
  location TEXT,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  division TEXT,
  condition_rating NUMERIC,
  customer_id UUID,
  asset_id UUID,
  portal_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
  file_url TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure job_assets table exists (for linking assets to jobs)
CREATE TABLE IF NOT EXISTS neta_ops.job_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  asset_id UUID REFERENCES neta_ops.assets(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- For existing tables, ensure critical columns exist
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check type column in assets
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
  
  -- Check file_url column in assets
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'assets' 
    AND column_name = 'file_url'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.assets ADD COLUMN file_url TEXT;
    RAISE NOTICE 'Added file_url column to assets table';
  END IF;
  
  -- Check user_id column in assets
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'assets' 
    AND column_name = 'user_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.assets ADD COLUMN user_id UUID;
    RAISE NOTICE 'Added user_id column to assets table';
  END IF;
END $$;

-- Create the get_maintenance_due_equipment function
DO $$
BEGIN
  -- Drop existing function to avoid errors
  DROP FUNCTION IF EXISTS neta_ops.get_maintenance_due_equipment(INTEGER);
END $$;

CREATE FUNCTION neta_ops.get_maintenance_due_equipment(days_threshold INTEGER DEFAULT 30)
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

-- Also ensure chat rooms table exists in common schema if needed
DO $$
BEGIN
  -- Create common.chat_rooms table if it doesn't exist
  CREATE TABLE IF NOT EXISTS common.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  
  -- Create common.chat_room_members table if it doesn't exist
  CREATE TABLE IF NOT EXISTS common.chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
  );
END $$;

-- Create function for getting user chat rooms
DO $$
BEGIN
  -- Drop function if exists to avoid errors
  DROP FUNCTION IF EXISTS common.get_user_chat_rooms();
END $$;

CREATE FUNCTION common.get_user_chat_rooms()
RETURNS SETOF common.chat_rooms AS $$
  SELECT cr.* FROM common.chat_rooms cr
  JOIN common.chat_room_members crm ON cr.id = crm.room_id
  WHERE crm.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA common TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA neta_ops TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA business TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION neta_ops.get_maintenance_due_equipment(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms() TO authenticated;

-- Disable RLS for development
ALTER TABLE neta_ops.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.equipment_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.job_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_room_members DISABLE ROW LEVEL SECURITY;

-- Create sample data for testing
INSERT INTO common.customers (id, name, company_name)
VALUES (gen_random_uuid(), 'John Doe', 'Sample Company')
ON CONFLICT DO NOTHING;

INSERT INTO neta_ops.assets (id, name, type, file_url, user_id)
VALUES (gen_random_uuid(), 'Sample Asset', 'tool', '/sample/path', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

INSERT INTO neta_ops.equipment (name, type, category, status, serial_number, division, portal_type)
VALUES ('Sample Equipment', 'tool', 'hand tool', 'available', 'SN12345', 'neta', 'neta')
ON CONFLICT DO NOTHING;

-- Notify completion
SELECT 'Equipment management system setup completed successfully!' as result; 