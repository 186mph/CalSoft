-- Drop the existing function
DROP FUNCTION IF EXISTS lab_ops.get_next_asset_id;

-- Create the fixed function that correctly handles increments
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id TEXT;
    current_counter INT;
BEGIN
    -- First, get the current counter value (or set to 1 if not exists)
    SELECT COALESCE(next_counter, 1)
    INTO current_counter
    FROM lab_ops.customer_asset_counters
    WHERE customer_id = p_customer_id;
    
    IF current_counter IS NULL THEN
        -- Insert new customer counter
        INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
        VALUES (p_customer_id, 2);  -- Start at 2 because we'll return 1
        
        current_counter := 1;  -- First asset ID will be 1
    ELSE
        -- Update existing counter for next time
        UPDATE lab_ops.customer_asset_counters
        SET next_counter = current_counter + 1,
            updated_at = NOW()
        WHERE customer_id = p_customer_id;
    END IF;
    
    -- Format the asset ID as customer_id-counter
    next_id := p_customer_id || '-' || current_counter;
    
    RETURN next_id;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION lab_ops.get_next_asset_id IS 'Generates the next sequential asset ID for a customer in the format customer_id-number';

-- Grant permissions
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO anon;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 