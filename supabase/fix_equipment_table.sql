/**
 * FIX SCRIPT FOR EQUIPMENT TABLE
 * 
 * This script ensures the equipment table exists with all required columns
 * and fixes schema permission issues
 */

-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS neta_ops;
CREATE SCHEMA IF NOT EXISTS business;

-- Grant schema usage to authenticated users
GRANT USAGE ON SCHEMA common TO authenticated;
GRANT USAGE ON SCHEMA neta_ops TO authenticated;
GRANT USAGE ON SCHEMA business TO authenticated;

-- Create the equipment table if it doesn't exist
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

-- For existing table, ensure all columns exist
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check and add each column if it doesn't exist
  
  -- category column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'category'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN category TEXT;
    RAISE NOTICE 'Added category column';
  END IF;
  
  -- division column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'division'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN division TEXT;
    RAISE NOTICE 'Added division column';
  END IF;
  
  -- portal_type column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'portal_type'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN portal_type TEXT;
    RAISE NOTICE 'Added portal_type column';
  END IF;
  
  -- customer_id column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'customer_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN customer_id UUID;
    RAISE NOTICE 'Added customer_id column';
  END IF;
  
  -- asset_id column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'asset_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN asset_id UUID;
    RAISE NOTICE 'Added asset_id column';
  END IF;
  
  -- condition_rating column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'neta_ops' 
    AND table_name = 'equipment' 
    AND column_name = 'condition_rating'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE neta_ops.equipment ADD COLUMN condition_rating NUMERIC;
    RAISE NOTICE 'Added condition_rating column';
  END IF;
END $$;

-- Grant permissions on the equipment table
GRANT ALL ON neta_ops.equipment TO authenticated;

-- Create a sample equipment item
INSERT INTO neta_ops.equipment (
  name, type, category, status, serial_number
)
VALUES (
  'Sample Equipment', 'tool', 'hand tool', 'available', 'SN12345'
)
ON CONFLICT DO NOTHING;

-- Disable RLS for development
ALTER TABLE neta_ops.equipment DISABLE ROW LEVEL SECURITY;

-- Also fix chat_rooms access if that table exists
DO $$
BEGIN
  -- Check if chat_rooms table exists and add it to one of the allowed schemas
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_rooms'
  ) THEN
    -- Move the table to the common schema
    CREATE TABLE IF NOT EXISTS common.chat_rooms (LIKE public.chat_rooms INCLUDING ALL);
    
    -- Copy data if there's any
    BEGIN
      INSERT INTO common.chat_rooms SELECT * FROM public.chat_rooms;
      RAISE NOTICE 'Copied chat_rooms data to common schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error copying chat_rooms data: %', SQLERRM;
    END;
    
    -- Grant permissions
    GRANT ALL ON common.chat_rooms TO authenticated;
    ALTER TABLE common.chat_rooms DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Created chat_rooms table in common schema';
  END IF;
  
  -- Check if chat_room_members table exists and add it to the common schema
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_room_members'
  ) THEN
    -- Move the table to the common schema
    CREATE TABLE IF NOT EXISTS common.chat_room_members (LIKE public.chat_room_members INCLUDING ALL);
    
    -- Copy data if there's any
    BEGIN
      INSERT INTO common.chat_room_members SELECT * FROM public.chat_room_members;
      RAISE NOTICE 'Copied chat_room_members data to common schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error copying chat_room_members data: %', SQLERRM;
    END;
    
    -- Grant permissions
    GRANT ALL ON common.chat_room_members TO authenticated;
    ALTER TABLE common.chat_room_members DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Created chat_room_members table in common schema';
  ELSE
    -- Create a minimal version of the table if it doesn't exist anywhere
    CREATE TABLE IF NOT EXISTS common.chat_room_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID,
      user_id UUID,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Grant permissions
    GRANT ALL ON common.chat_room_members TO authenticated;
    ALTER TABLE common.chat_room_members DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Created new chat_room_members table in common schema';
  END IF;
END $$;

-- Ensure RPC function is properly schema'd
DO $$
BEGIN
  -- Check if the RPC function exists
  IF EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_user_chat_rooms'
  ) THEN
    -- Drop existing function first
    DROP FUNCTION IF EXISTS common.get_user_chat_rooms();
    
    -- Create with simple, reliable syntax
    EXECUTE $execute$
    CREATE FUNCTION common.get_user_chat_rooms() 
    RETURNS SETOF common.chat_rooms AS
    $body$
      SELECT cr.* FROM common.chat_rooms cr
      JOIN common.chat_room_members crm ON cr.id = crm.room_id
      WHERE crm.user_id = auth.uid();
    $body$
    LANGUAGE sql SECURITY DEFINER;
    $execute$;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms() TO authenticated;
    
    RAISE NOTICE 'Created get_user_chat_rooms function in common schema';
  END IF;
END $$;

-- Notify completion
SELECT 'Equipment table and chat rooms fixed successfully!' as result; 