-- Drop the existing function
DROP FUNCTION IF EXISTS lab_ops.get_next_asset_id;

-- Create the improved function
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id TEXT;
    current_counter INT;
BEGIN
    -- First check if there's an existing counter
    SELECT next_counter
    INTO current_counter
    FROM lab_ops.customer_asset_counters
    WHERE customer_id = p_customer_id
    FOR UPDATE; -- Lock this row to prevent race conditions
    
    IF current_counter IS NULL THEN
        -- No counter exists for this customer yet
        -- Insert with initial value of 1 and return ID with "-1"
        INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
        VALUES (p_customer_id, 2); -- Next will be 2
        
        current_counter := 1; -- First asset is 1
    ELSE
        -- Counter exists, use it and increment by exactly 1
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
COMMENT ON FUNCTION lab_ops.get_next_asset_id IS 'Generates the next sequential asset ID for a customer in the format customer_id-number. Only increments the counter when the function is called.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO anon;

-- Ensure the table exists
CREATE TABLE IF NOT EXISTS lab_ops.customer_asset_counters (
    customer_id TEXT PRIMARY KEY,
    next_counter INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant appropriate permissions
GRANT ALL ON lab_ops.customer_asset_counters TO service_role;
GRANT SELECT, INSERT, UPDATE ON lab_ops.customer_asset_counters TO authenticated;

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 