-- Equipment Table
CREATE TABLE IF NOT EXISTS common.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  model TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  warranty_expiration DATE,
  status TEXT NOT NULL CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  location TEXT NOT NULL,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Equipment Assignment Table
CREATE TABLE IF NOT EXISTS common.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES common.equipment(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES common.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Equipment Maintenance Records Table
CREATE TABLE IF NOT EXISTS common.equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES common.equipment(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  maintenance_type TEXT NOT NULL,
  technician_id UUID REFERENCES common.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10, 2),
  vendor TEXT,
  report_file_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Row Level Security Policies
-- Enable RLS on tables
ALTER TABLE common.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- Equipment Policies
CREATE POLICY equipment_select_policy ON common.equipment 
  FOR SELECT USING (true);  -- Everyone can view

CREATE POLICY equipment_insert_policy ON common.equipment 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY equipment_update_policy ON common.equipment 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY equipment_delete_policy ON common.equipment 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

-- Equipment Assignment Policies
CREATE POLICY assignment_select_policy ON common.equipment_assignments 
  FOR SELECT USING (true);  -- Everyone can view

CREATE POLICY assignment_insert_policy ON common.equipment_assignments 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY assignment_update_policy ON common.equipment_assignments 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY assignment_delete_policy ON common.equipment_assignments 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

-- Equipment Maintenance Policies
CREATE POLICY maintenance_select_policy ON common.equipment_maintenance 
  FOR SELECT USING (true);  -- Everyone can view

CREATE POLICY maintenance_insert_policy ON common.equipment_maintenance 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY maintenance_update_policy ON common.equipment_maintenance 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

CREATE POLICY maintenance_delete_policy ON common.equipment_maintenance 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM common.user_permissions 
      WHERE permission_type = 'equipment_manage' AND is_active = true
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION common.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_timestamp
BEFORE UPDATE ON common.equipment
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_assignment_timestamp
BEFORE UPDATE ON common.equipment_assignments
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

CREATE TRIGGER update_maintenance_timestamp
BEFORE UPDATE ON common.equipment_maintenance
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS equipment_status_idx ON common.equipment(status);
CREATE INDEX IF NOT EXISTS equipment_type_idx ON common.equipment(type);
CREATE INDEX IF NOT EXISTS assignment_equipment_idx ON common.equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS assignment_technician_idx ON common.equipment_assignments(technician_id);
CREATE INDEX IF NOT EXISTS maintenance_equipment_idx ON common.equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS maintenance_technician_idx ON common.equipment_maintenance(technician_id); 