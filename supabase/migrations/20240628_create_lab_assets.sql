/*
  ===================================================
  INSTRUCTIONS FOR APPLYING THIS MIGRATION
  ===================================================
  
  1. Go to your Supabase dashboard (https://app.supabase.com)
  2. Navigate to the SQL Editor
  3. Create a new query
  4. Copy the entire contents of this file
  5. Paste it into the SQL Editor
  6. Run the query
  
  This migration creates:
   - lab_assets table for storing calibration asset records
   - customer_asset_counters table for tracking sequential asset IDs
   - get_next_asset_id function for generating sequential asset IDs
   - All necessary permissions and RLS policies
*/

-- Create lab_ops schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS lab_ops;

-- First check if the lab_assets table exists and drop it if necessary
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'lab_ops' 
    AND table_name = 'lab_assets'
  ) THEN
    -- Table exists, so we'll drop it and recreate it
    DROP TABLE lab_ops.lab_assets;
  END IF;
END
$$;

-- Create lab_assets table
CREATE TABLE lab_ops.lab_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  customer_id UUID,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  user_id UUID,
  asset_id TEXT, -- For storing user-friendly asset IDs like "1-123"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_lab_assets_job_id ON lab_ops.lab_assets (job_id);
CREATE INDEX idx_lab_assets_customer_id ON lab_ops.lab_assets (customer_id);
CREATE INDEX idx_lab_assets_asset_id ON lab_ops.lab_assets (asset_id);

-- Grant permissions
ALTER TABLE lab_ops.lab_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Check and drop each policy individually
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'lab_assets' 
    AND policyname = 'Authenticated users can read all lab assets'
  ) THEN
    DROP POLICY "Authenticated users can read all lab assets" ON lab_ops.lab_assets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'lab_assets' 
    AND policyname = 'Users can insert lab assets'
  ) THEN
    DROP POLICY "Users can insert lab assets" ON lab_ops.lab_assets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'lab_assets' 
    AND policyname = 'Users can update lab assets they created'
  ) THEN
    DROP POLICY "Users can update lab assets they created" ON lab_ops.lab_assets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'lab_assets' 
    AND policyname = 'Users can delete lab assets they created'
  ) THEN
    DROP POLICY "Users can delete lab assets they created" ON lab_ops.lab_assets;
  END IF;
END
$$;

-- Create policy to allow authenticated users to read all assets
CREATE POLICY "Authenticated users can read all lab assets"
  ON lab_ops.lab_assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for insert
CREATE POLICY "Users can insert lab assets"
  ON lab_ops.lab_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for update
CREATE POLICY "Users can update lab assets they created"
  ON lab_ops.lab_assets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for delete
CREATE POLICY "Users can delete lab assets they created"
  ON lab_ops.lab_assets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Check if customer_asset_counters exists and drop if necessary
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'lab_ops' 
    AND table_name = 'customer_asset_counters'
  ) THEN
    DROP TABLE lab_ops.customer_asset_counters;
  END IF;
END
$$;

-- Create customer_asset_counters table
CREATE TABLE lab_ops.customer_asset_counters (
  customer_id TEXT PRIMARY KEY,
  next_counter INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions to the customer_asset_counters table
ALTER TABLE lab_ops.customer_asset_counters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on customer_asset_counters if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'customer_asset_counters' 
    AND policyname = 'Authenticated users can read all customer asset counters'
  ) THEN
    DROP POLICY "Authenticated users can read all customer asset counters" ON lab_ops.customer_asset_counters;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'lab_ops' 
    AND tablename = 'customer_asset_counters' 
    AND policyname = 'Authenticated users can manage customer asset counters'
  ) THEN
    DROP POLICY "Authenticated users can manage customer asset counters" ON lab_ops.customer_asset_counters;
  END IF;
END
$$;

-- Create policy to allow authenticated users to read all counters
CREATE POLICY "Authenticated users can read all customer asset counters"
  ON lab_ops.customer_asset_counters
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for insert/update/delete to asset counters
CREATE POLICY "Authenticated users can manage customer asset counters"
  ON lab_ops.customer_asset_counters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop the function if it exists
DROP FUNCTION IF EXISTS lab_ops.get_next_asset_id;

-- Create RPC function for getting the next asset ID
CREATE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  counter_value INTEGER;
BEGIN
  -- Try to get existing counter
  SELECT next_counter INTO counter_value
  FROM lab_ops.customer_asset_counters
  WHERE customer_id = p_customer_id;
  
  -- If counter doesn't exist, create it
  IF counter_value IS NULL THEN
    INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
    VALUES (p_customer_id, 2) -- Start at 2 so first ID is 1
    RETURNING next_counter - 1 INTO counter_value;
  ELSE
    -- Update counter for next use
    UPDATE lab_ops.customer_asset_counters
    SET next_counter = next_counter + 1,
        updated_at = NOW()
    WHERE customer_id = p_customer_id;
  END IF;
  
  -- Return formatted asset ID
  RETURN p_customer_id || '-' || counter_value;
END;
$$;

-- Also create the trigger for synchronizing asset_id from reports to assets
DROP FUNCTION IF EXISTS lab_ops.update_lab_asset_from_report CASCADE;

-- Function to update lab_assets with asset_id from calibration_gloves_reports
CREATE FUNCTION lab_ops.update_lab_asset_from_report()
RETURNS TRIGGER AS $$
DECLARE
  report_data JSONB;
  asset_id_value TEXT;
BEGIN
  -- Get the report data from the inserted/updated record
  SELECT report_info INTO report_data FROM lab_ops.calibration_gloves_reports 
  WHERE id = NEW.id;
  
  -- Extract asset_id from the report_info JSON
  IF report_data IS NOT NULL AND 
     report_data->'gloveData' IS NOT NULL AND
     report_data->'gloveData'->>'assetId' IS NOT NULL THEN
    
    asset_id_value := report_data->'gloveData'->>'assetId';
    
    -- Update any lab_assets records that link to this report but don't have an asset_id
    UPDATE lab_ops.lab_assets
    SET asset_id = asset_id_value
    WHERE file_url LIKE '%calibration-gloves/' || NEW.id || '%'
    AND (asset_id IS NULL OR asset_id = '');
    
    RAISE NOTICE 'Updated lab_assets with asset_id: %', asset_id_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if calibration_gloves_reports table exists before creating the trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'lab_ops' 
    AND table_name = 'calibration_gloves_reports'
  ) THEN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS sync_asset_id_trigger ON lab_ops.calibration_gloves_reports;
    
    -- Create trigger to run after insert or update on calibration_gloves_reports
    CREATE TRIGGER sync_asset_id_trigger
    AFTER INSERT OR UPDATE ON lab_ops.calibration_gloves_reports
    FOR EACH ROW
    EXECUTE FUNCTION lab_ops.update_lab_asset_from_report();
  ELSE
    RAISE NOTICE 'calibration_gloves_reports table does not exist, skipping trigger creation';
  END IF;
END
$$;

-- Also update existing records
DO $$
DECLARE
  report RECORD;
  report_data JSONB;
  asset_id_value TEXT;
BEGIN
  -- Check if calibration_gloves_reports table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'lab_ops' 
    AND table_name = 'calibration_gloves_reports'
  ) THEN
    FOR report IN 
      SELECT id, report_info FROM lab_ops.calibration_gloves_reports
    LOOP
      report_data := report.report_info;
      
      -- Extract asset_id from report_info
      IF report_data IS NOT NULL AND 
         report_data->'gloveData' IS NOT NULL AND
         report_data->'gloveData'->>'assetId' IS NOT NULL THEN
        
        asset_id_value := report_data->'gloveData'->>'assetId';
        
        -- Update any lab_assets records that link to this report
        UPDATE lab_ops.lab_assets
        SET asset_id = asset_id_value
        WHERE file_url LIKE '%calibration-gloves/' || report.id || '%'
        AND (asset_id IS NULL OR asset_id = '');
        
      END IF;
    END LOOP;
  END IF;
END $$; 