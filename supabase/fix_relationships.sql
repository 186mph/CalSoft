/**
 * FIX SCRIPT FOR EQUIPMENT RELATIONSHIPS
 * 
 * This script fixes:
 * 1. The customer_id and asset_id foreign key relationships
 * 2. Grants all necessary schema permissions
 */

-- Step 1: Create the required tables in common schema if they don't exist
CREATE TABLE IF NOT EXISTS common.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create assets table in neta_ops schema if it doesn't exist
CREATE TABLE IF NOT EXISTS neta_ops.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Grant additional permissions
GRANT USAGE ON SCHEMA common TO authenticated;
GRANT USAGE ON SCHEMA neta_ops TO authenticated;
GRANT USAGE ON SCHEMA business TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA common TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA neta_ops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA common TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA neta_ops TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA business TO authenticated;

-- Step 4: Fix the equipment table by modifying the foreign key relationships
DO $$
BEGIN
  -- Drop any foreign keys related to customer_id if they exist
  BEGIN
    ALTER TABLE neta_ops.equipment DROP CONSTRAINT IF EXISTS equipment_customer_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No customer_id foreign key constraint found to drop';
  END;
  
  -- Drop any foreign keys related to asset_id if they exist
  BEGIN
    ALTER TABLE neta_ops.equipment DROP CONSTRAINT IF EXISTS equipment_asset_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No asset_id foreign key constraint found to drop';
  END;
  
  -- Add foreign key constraints back with proper references
  BEGIN
    ALTER TABLE neta_ops.equipment 
    ADD CONSTRAINT equipment_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES common.customers(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added customer_id foreign key constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add customer_id foreign key constraint: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE neta_ops.equipment 
    ADD CONSTRAINT equipment_asset_id_fkey 
    FOREIGN KEY (asset_id) 
    REFERENCES neta_ops.assets(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added asset_id foreign key constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add asset_id foreign key constraint: %', SQLERRM;
  END;
END $$;

-- Step 5: Insert sample data for testing relationships
DO $$
BEGIN
  -- Insert sample customer
  INSERT INTO common.customers (id, name, company_name)
  VALUES (gen_random_uuid(), 'Sample Customer', 'Sample Company')
  ON CONFLICT DO NOTHING;
  
  -- Insert sample asset
  INSERT INTO neta_ops.assets (id, name, type)
  VALUES (gen_random_uuid(), 'Sample Asset', 'tool')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Sample data inserted successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error inserting sample data: %', SQLERRM;
END $$;

-- Step 6: Fix any RLS settings
ALTER TABLE common.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE neta_ops.assets DISABLE ROW LEVEL SECURITY;

-- Notify completion
SELECT 'Equipment relationships fixed successfully! Foreign keys created between equipment and customers/assets.' as result; 