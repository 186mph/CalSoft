-- Create custom_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.custom_roles (
  name TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

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

-- Grant ALL permissions directly on the equipment tables
GRANT ALL ON neta_ops.equipment TO authenticated;
GRANT ALL ON neta_ops.maintenance_records TO authenticated;
GRANT ALL ON neta_ops.equipment_assignments TO authenticated;
GRANT ALL ON neta_ops.vehicles TO authenticated;

-- Ensure Row Level Security is disabled on these tables for development
ALTER TABLE neta_ops.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.equipment_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.vehicles DISABLE ROW LEVEL SECURITY; 