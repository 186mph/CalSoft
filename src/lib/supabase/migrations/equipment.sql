-- Equipment management tables

-- Main equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_type TEXT NOT NULL,
  division TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  serial_number TEXT,
  asset_tag TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  expected_lifetime_years INT,
  warranty_expiry DATE,
  location TEXT,
  last_service_date DATE,
  next_service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT equipment_status_check CHECK (status IN ('available', 'in-use', 'maintenance', 'retired', 'lost'))
);

-- Vehicles table (extends equipment)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  make TEXT,
  year INT,
  license_plate TEXT,
  vin TEXT,
  mileage INT,
  fuel_type TEXT,
  insurance_expiry DATE,
  registration_expiry DATE, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  maintenance_date DATE NOT NULL,
  next_maintenance_date DATE,
  performed_by TEXT,
  cost DECIMAL(10,2),
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT maintenance_type_check CHECK (
    maintenance_type IN ('routine', 'repair', 'inspection', 'certification', 'calibration', 'other')
  )
);

-- Equipment assignments table
CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_return_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'checked-out',
  condition_on_checkout TEXT,
  condition_on_return TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT assignment_status_check CHECK (
    status IN ('checked-out', 'returned', 'overdue', 'damaged')
  )
);

-- RLS Policies
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- Allow read access to equipment data for authenticated users
CREATE POLICY equipment_read_policy ON public.equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow write access to equipment data for administrators
CREATE POLICY equipment_write_policy ON public.equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'equipment_manager')
    )
  );

-- Policies for vehicles
CREATE POLICY vehicles_read_policy ON public.vehicles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY vehicles_write_policy ON public.vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'equipment_manager')
    )
  );

-- Policies for maintenance records
CREATE POLICY maintenance_records_read_policy ON public.maintenance_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY maintenance_records_write_policy ON public.maintenance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'equipment_manager', 'technician')
    )
  );

-- Policies for equipment assignments
CREATE POLICY equipment_assignments_read_policy ON public.equipment_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY equipment_assignments_self_read_policy ON public.equipment_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY equipment_assignments_write_policy ON public.equipment_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'equipment_manager')
    )
  );

-- Allow users to update their own equipment assignments (for returning equipment)
CREATE POLICY equipment_assignments_self_update_policy ON public.equipment_assignments
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid() AND
    (OLD.status = 'checked-out' OR OLD.status = 'overdue') AND
    NEW.status = 'returned'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS equipment_portal_division_idx ON public.equipment(portal_type, division);
CREATE INDEX IF NOT EXISTS equipment_status_idx ON public.equipment(status);
CREATE INDEX IF NOT EXISTS equipment_category_idx ON public.equipment(category);
CREATE INDEX IF NOT EXISTS maintenance_equipment_id_idx ON public.maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS assignment_equipment_id_idx ON public.equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS assignment_user_id_idx ON public.equipment_assignments(user_id);
CREATE INDEX IF NOT EXISTS assignment_status_idx ON public.equipment_assignments(status);

-- Function to update equipment status based on assignments
CREATE OR REPLACE FUNCTION update_equipment_status_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked-out' THEN
    UPDATE public.equipment
    SET status = 'in-use',
        updated_at = now()
    WHERE id = NEW.equipment_id;
  ELSIF NEW.status = 'returned' THEN
    -- Check if there are any other active assignments for this equipment
    IF NOT EXISTS (
      SELECT 1 FROM public.equipment_assignments
      WHERE equipment_id = NEW.equipment_id
      AND status = 'checked-out'
      AND id != NEW.id
    ) THEN
      UPDATE public.equipment
      SET status = 'available',
          updated_at = now()
      WHERE id = NEW.equipment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update equipment status when assignments change
CREATE TRIGGER update_equipment_status_trigger
AFTER INSERT OR UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION update_equipment_status_on_assignment(); 