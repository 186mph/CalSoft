-- Create resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS neta_ops.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('employee', 'equipment', 'material', 'vehicle')),
  status TEXT NOT NULL CHECK (status IN ('available', 'partially_available', 'unavailable', 'scheduled', 'out_of_service')),
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resource_allocations table if it doesn't exist
CREATE TABLE IF NOT EXISTS neta_ops.resource_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES neta_ops.resources(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('employee', 'equipment', 'material', 'vehicle')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  hours_allocated NUMERIC,
  quantity_allocated NUMERIC,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure start date is before end date
  CONSTRAINT start_before_end CHECK (start_date <= end_date)
);

-- Add index for faster job-based queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_job_id ON neta_ops.resource_allocations(job_id);

-- Add index for faster resource-based queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource_id ON neta_ops.resource_allocations(resource_id);

-- Add index for better date range queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON neta_ops.resource_allocations(start_date, end_date);

-- Add trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION neta_ops.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on resources table
DROP TRIGGER IF EXISTS update_resources_timestamp ON neta_ops.resources;
CREATE TRIGGER update_resources_timestamp
BEFORE UPDATE ON neta_ops.resources
FOR EACH ROW
EXECUTE FUNCTION neta_ops.update_timestamp();

-- Create trigger on resource_allocations table
DROP TRIGGER IF EXISTS update_resource_allocations_timestamp ON neta_ops.resource_allocations;
CREATE TRIGGER update_resource_allocations_timestamp
BEFORE UPDATE ON neta_ops.resource_allocations
FOR EACH ROW
EXECUTE FUNCTION neta_ops.update_timestamp();

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS neta_ops.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) but without foreign key constraint (auth schema is managed by Supabase)
  role TEXT NOT NULL CHECK (role IN ('admin', 'project_manager', 'resource_manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS update_user_roles_timestamp ON neta_ops.user_roles;
CREATE TRIGGER update_user_roles_timestamp
BEFORE UPDATE ON neta_ops.user_roles
FOR EACH ROW
EXECUTE FUNCTION neta_ops.update_timestamp();

-- Add RLS policies
ALTER TABLE neta_ops.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.resource_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for resources
CREATE POLICY resources_select_policy ON neta_ops.resources
  FOR SELECT
  USING (true);  -- All authenticated users can view resources

CREATE POLICY resources_insert_policy ON neta_ops.resources
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);  -- Any authenticated user can insert resources

CREATE POLICY resources_update_policy ON neta_ops.resources
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);  -- Any authenticated user can update resources

CREATE POLICY resources_delete_policy ON neta_ops.resources
  FOR DELETE
  USING (auth.uid() IS NOT NULL);  -- Any authenticated user can delete resources

-- Create policies for resource_allocations
CREATE POLICY resource_allocations_select_policy ON neta_ops.resource_allocations
  FOR SELECT
  USING (true);  -- All authenticated users can view allocations

CREATE POLICY resource_allocations_insert_policy ON neta_ops.resource_allocations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);  -- Any authenticated user can insert allocations

CREATE POLICY resource_allocations_update_policy ON neta_ops.resource_allocations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);  -- Any authenticated user can update allocations

CREATE POLICY resource_allocations_delete_policy ON neta_ops.resource_allocations
  FOR DELETE
  USING (auth.uid() IS NOT NULL);  -- Any authenticated user can delete allocations

-- Function to add a role to a user (idempotent - won't create duplicates due to UNIQUE constraint)
CREATE OR REPLACE FUNCTION neta_ops.add_user_role(
  p_user_id UUID,
  p_role TEXT
) RETURNS UUID AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Insert role if it doesn't exist yet
  INSERT INTO neta_ops.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING id INTO v_role_id;
  
  -- If we didn't insert (already existed), get the existing ID
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM neta_ops.user_roles
    WHERE user_id = p_user_id AND role = p_role;
  END IF;
  
  RETURN v_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You'll need to add this for your own user
-- Replace the UUID with your actual user ID from auth.users
-- DO $$ 
-- BEGIN
--   PERFORM neta_ops.add_user_role('YOUR-USER-ID-HERE', 'admin');
-- END $$; 