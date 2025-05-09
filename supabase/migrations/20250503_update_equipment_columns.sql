-- Add missing columns to the equipment table to match the UI needs
ALTER TABLE neta_ops.equipment 
  -- Add columns for locations
  ADD COLUMN IF NOT EXISTS current_location TEXT,
  
  -- Add columns for assignments
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  
  -- Add columns for purchase info
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
  
  -- Add columns for calibration
  ADD COLUMN IF NOT EXISTS last_calibration_date DATE,
  ADD COLUMN IF NOT EXISTS next_calibration_date DATE,
  
  -- Add column for division to support filtering
  ADD COLUMN IF NOT EXISTS division TEXT;

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS equipment_division_idx ON neta_ops.equipment(division);
CREATE INDEX IF NOT EXISTS equipment_assigned_to_idx ON neta_ops.equipment(assigned_to);

-- Update timestamps trigger if it doesn't exist
CREATE OR REPLACE FUNCTION neta_ops.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_equipment_updated_at'
  ) THEN
    CREATE TRIGGER set_equipment_updated_at
    BEFORE UPDATE ON neta_ops.equipment
    FOR EACH ROW
    EXECUTE FUNCTION neta_ops.set_updated_at();
  END IF;
END
$$; 

-- Enable row level security on the equipment table
ALTER TABLE neta_ops.equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment table
-- Policy for administrative users (admins and managers)
DROP POLICY IF EXISTS equipment_admin_policy ON neta_ops.equipment;
CREATE POLICY equipment_admin_policy ON neta_ops.equipment
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policy for all authenticated users to access equipment in all divisions
DROP POLICY IF EXISTS equipment_all_access_policy ON neta_ops.equipment;
CREATE POLICY equipment_all_access_policy ON neta_ops.equipment
  FOR ALL
  TO authenticated
  USING (true);

-- Policy for regular users to view equipment in their division
DROP POLICY IF EXISTS equipment_division_select_policy ON neta_ops.equipment;
CREATE POLICY equipment_division_select_policy ON neta_ops.equipment
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is in same division or equipment is not assigned to a division
    (division = (auth.jwt()->>'division')) OR 
    (division IS NULL) OR
    -- Allow if equipment is assigned to the user
    (assigned_to = auth.uid())
  );

-- Policy for users to update equipment assigned to them
DROP POLICY IF EXISTS equipment_assigned_update_policy ON neta_ops.equipment;
CREATE POLICY equipment_assigned_update_policy ON neta_ops.equipment
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid());

-- Apply similar policies to related tables
-- Enable RLS on maintenance_records table
ALTER TABLE neta_ops.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Admin policy for maintenance_records
DROP POLICY IF EXISTS maintenance_records_admin_policy ON neta_ops.maintenance_records;
CREATE POLICY maintenance_records_admin_policy ON neta_ops.maintenance_records
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Open access policy for maintenance records
DROP POLICY IF EXISTS maintenance_records_all_access_policy ON neta_ops.maintenance_records;
CREATE POLICY maintenance_records_all_access_policy ON neta_ops.maintenance_records
  FOR ALL
  TO authenticated
  USING (true);

-- Select policy to view maintenance records for equipment in user's division
DROP POLICY IF EXISTS maintenance_records_select_policy ON neta_ops.maintenance_records;
CREATE POLICY maintenance_records_select_policy ON neta_ops.maintenance_records
  FOR SELECT
  TO authenticated
  USING (
    equipment_id IN (
      SELECT id FROM neta_ops.equipment
      WHERE division = (auth.jwt()->>'division') OR
            assigned_to = auth.uid() OR
            division IS NULL
    )
  ); 