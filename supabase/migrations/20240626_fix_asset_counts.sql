-- Drop the existing function
DROP FUNCTION IF EXISTS lab_ops.get_next_asset_id;

-- Create a completely rewritten function that properly handles initial values
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id TEXT;
    counter_value INT;
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
    
    -- Check if this customer already has a counter
    SELECT COUNT(*) INTO counter_value
    FROM lab_ops.customer_asset_counters
    WHERE customer_id = normalized_id;
    
    IF counter_value = 0 THEN
        -- No counter exists - insert one starting with 1
        INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
        VALUES (normalized_id, 2); -- Next ID will be 2
        
        -- For first asset, always use ID 1
        counter_value := 1;
        RAISE NOTICE 'Created new counter for customer %, starting at 1', normalized_id;
    ELSE
        -- Get the current counter value and increment it
        SELECT next_counter INTO counter_value
        FROM lab_ops.customer_asset_counters
        WHERE customer_id = normalized_id
        FOR UPDATE; -- Lock this row to prevent race conditions
        
        -- Update the counter for next time
        UPDATE lab_ops.customer_asset_counters
        SET next_counter = counter_value + 1,
            updated_at = NOW()
        WHERE customer_id = normalized_id;
        
        RAISE NOTICE 'Updated counter for customer % to %', 
                     normalized_id, counter_value + 1;
    END IF;
    
    -- Format the asset ID as customer_id-counter
    next_id := normalized_id || '-' || counter_value;
    RAISE NOTICE 'Returning asset ID: %', next_id;
    
    RETURN next_id;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in get_next_asset_id: %', SQLERRM;
        RETURN normalized_id || '-error';
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION lab_ops.get_next_asset_id IS 'Generates the next sequential asset ID for a customer starting at customer_id-1 and incrementing sequentially.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO anon;

-- Optionally reset counters if needed (uncomment if you want to reset all counters)
-- UPDATE lab_ops.customer_asset_counters SET next_counter = 1;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 