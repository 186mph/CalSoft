-- Drop the existing function
DROP FUNCTION IF EXISTS lab_ops.get_next_asset_id;

-- Create the updated function with better validation and debugging
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id TEXT;
    current_counter INT;
    normalized_id TEXT;
BEGIN
    -- Normalize the customer ID - convert any UUID to '1'
    IF p_customer_id LIKE '%-%' THEN
        -- UUID format detected, use '1' instead
        normalized_id := '1';
    ELSE
        normalized_id := p_customer_id;
    END IF;
    
    -- Log the input and normalized ID
    RAISE NOTICE 'get_next_asset_id called with ID: %, normalized to: %', p_customer_id, normalized_id;
    
    -- First check if there's an existing counter
    SELECT next_counter
    INTO current_counter
    FROM lab_ops.customer_asset_counters
    WHERE customer_id = normalized_id
    FOR UPDATE; -- Lock this row to prevent race conditions
    
    IF current_counter IS NULL THEN
        -- No counter exists for this customer yet
        -- Insert with initial value of 1 and return ID with "-1"
        INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
        VALUES (normalized_id, 2); -- Next will be 2
        
        current_counter := 1; -- First asset is 1
        RAISE NOTICE 'Created new counter for customer %, starting at 1', normalized_id;
    ELSE
        -- Counter exists, use it and increment by exactly 1
        UPDATE lab_ops.customer_asset_counters
        SET next_counter = current_counter + 1,
            updated_at = NOW()
        WHERE customer_id = normalized_id;
        
        RAISE NOTICE 'Updated counter for customer % from % to %', 
                     normalized_id, current_counter, current_counter + 1;
    END IF;
    
    -- Format the asset ID as customer_id-counter
    next_id := normalized_id || '-' || current_counter;
    RAISE NOTICE 'Returning asset ID: %', next_id;
    
    RETURN next_id;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in get_next_asset_id: %', SQLERRM;
        RETURN normalized_id || '-error';
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION lab_ops.get_next_asset_id IS 'Generates the next sequential asset ID for a customer in the format customer_id-number. Handles UUID inputs by normalizing to "1".';

-- Grant permissions
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO anon;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 