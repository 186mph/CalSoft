/*
  ===================================================
  PERMISSIONS FIX FOR LAB_ASSETS TABLE
  ===================================================
  
  This script fixes permission issues with the lab_assets table.
  Run this in the Supabase SQL Editor if you encounter:
  "permission denied for table lab_assets" errors.
*/

-- Grant all permissions to the authenticated role
GRANT ALL ON lab_ops.lab_assets TO authenticated;
GRANT ALL ON lab_ops.customer_asset_counters TO authenticated;

-- Grant permissions to the service_role (used by the API)
GRANT ALL ON lab_ops.lab_assets TO service_role;
GRANT ALL ON lab_ops.customer_asset_counters TO service_role;

-- Grant permissions on the id sequence
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lab_ops TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lab_ops TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.update_lab_asset_from_report TO service_role;

-- Disable RLS temporarily to diagnose issues (ENABLE it back after testing if needed)
ALTER TABLE lab_ops.lab_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.customer_asset_counters DISABLE ROW LEVEL SECURITY;

-- Create more permissive policies (if RLS is later re-enabled)
DROP POLICY IF EXISTS "Full access for authenticated users" ON lab_ops.lab_assets;
CREATE POLICY "Full access for authenticated users"
  ON lab_ops.lab_assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated users" ON lab_ops.customer_asset_counters;
CREATE POLICY "Full access for authenticated users"
  ON lab_ops.customer_asset_counters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
  
-- Make sure calibration_gloves_reports has proper permissions too
ALTER TABLE lab_ops.calibration_gloves_reports DISABLE ROW LEVEL SECURITY;
GRANT ALL ON lab_ops.calibration_gloves_reports TO authenticated;
GRANT ALL ON lab_ops.calibration_gloves_reports TO service_role; 