-- Function to update lab_assets with asset_id from calibration_gloves_reports
CREATE OR REPLACE FUNCTION lab_ops.update_lab_asset_from_report()
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_asset_id_trigger ON lab_ops.calibration_gloves_reports;

-- Create trigger to run after insert or update on calibration_gloves_reports
CREATE TRIGGER sync_asset_id_trigger
AFTER INSERT OR UPDATE ON lab_ops.calibration_gloves_reports
FOR EACH ROW
EXECUTE FUNCTION lab_ops.update_lab_asset_from_report();

-- Grant permissions
GRANT EXECUTE ON FUNCTION lab_ops.update_lab_asset_from_report TO service_role;

-- Also update existing records
DO $$
DECLARE
  report RECORD;
  report_data JSONB;
  asset_id_value TEXT;
BEGIN
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
END $$; 