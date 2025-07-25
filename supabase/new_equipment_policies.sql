-- Policy for all authenticated users to access equipment in all divisions
DROP POLICY IF EXISTS equipment_all_access_policy ON neta_ops.equipment;
CREATE POLICY equipment_all_access_policy ON neta_ops.equipment
  FOR ALL
  TO authenticated
  USING (true);

-- Open access policy for maintenance records
DROP POLICY IF EXISTS maintenance_records_all_access_policy ON neta_ops.maintenance_records;
CREATE POLICY maintenance_records_all_access_policy ON neta_ops.maintenance_records
  FOR ALL
  TO authenticated
  USING (true);

-- Open access policy for equipment assignments
DROP POLICY IF EXISTS equipment_assignments_all_access_policy ON neta_ops.equipment_assignments;
CREATE POLICY equipment_assignments_all_access_policy ON neta_ops.equipment_assignments
  FOR ALL
  TO authenticated
  USING (true);

-- Open access policy for vehicles
DROP POLICY IF EXISTS vehicles_all_access_policy ON neta_ops.vehicles;
CREATE POLICY vehicles_all_access_policy ON neta_ops.vehicles
  FOR ALL
  TO authenticated
  USING (true);

-- Ensure the technicians view exists in common schema
CREATE OR REPLACE VIEW common.technicians AS
SELECT 
  id,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'email' as email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'division' as division
FROM 
  auth.users
WHERE
  raw_user_meta_data->>'role' LIKE '%Technician%'
  OR raw_user_meta_data->>'role' LIKE '%Engineer%';

-- Grant permissions on the technicians view
GRANT SELECT ON common.technicians TO authenticated; 