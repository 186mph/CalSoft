-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  warranty_expiration DATE,
  status TEXT NOT NULL DEFAULT 'available',
  location TEXT,
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create equipment_assignment table
CREATE TABLE IF NOT EXISTS equipment_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT check_end_date_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create index for equipment search
CREATE INDEX IF NOT EXISTS equipment_name_search ON equipment USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS equipment_type_idx ON equipment(type);
CREATE INDEX IF NOT EXISTS equipment_status_idx ON equipment(status);

-- Create index for equipment_assignment
CREATE INDEX IF NOT EXISTS equipment_assignment_equipment_id_idx ON equipment_assignment(equipment_id);
CREATE INDEX IF NOT EXISTS equipment_assignment_technician_id_idx ON equipment_assignment(technician_id);

-- Create RLS policies for equipment table
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_select_policy ON equipment
  FOR SELECT USING (true);

CREATE POLICY equipment_insert_policy ON equipment
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY equipment_update_policy ON equipment
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY equipment_delete_policy ON equipment
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  );

-- Create RLS policies for equipment_assignment table
ALTER TABLE equipment_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_assignment_select_policy ON equipment_assignment
  FOR SELECT USING (true);

CREATE POLICY equipment_assignment_insert_policy ON equipment_assignment
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY equipment_assignment_update_policy ON equipment_assignment
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY equipment_assignment_delete_policy ON equipment_assignment
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'manager')
  ); 