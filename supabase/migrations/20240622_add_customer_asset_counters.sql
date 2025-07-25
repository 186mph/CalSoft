-- Create customer_asset_counters table
CREATE TABLE IF NOT EXISTS lab_ops.customer_asset_counters (
    customer_id TEXT PRIMARY KEY,
    next_counter INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE lab_ops.customer_asset_counters IS 'Tracks the next sequential asset ID number for each customer';

-- Create or replace function to get the next asset ID
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_id TEXT;
    counter INT;
BEGIN
    -- Insert or update the counter for this customer
    INSERT INTO lab_ops.customer_asset_counters (customer_id, next_counter)
    VALUES (p_customer_id, 1)
    ON CONFLICT (customer_id) 
    DO UPDATE SET 
        next_counter = customer_asset_counters.next_counter + 1,
        updated_at = NOW()
    RETURNING next_counter INTO counter;
    
    -- Format the asset ID as customer_id-counter
    next_id := p_customer_id || '-' || counter;
    
    RETURN next_id;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION lab_ops.get_next_asset_id IS 'Generates the next sequential asset ID for a customer in the format customer_id-number';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON lab_ops.customer_asset_counters TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO service_role;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO authenticated;
GRANT EXECUTE ON FUNCTION lab_ops.get_next_asset_id TO anon;

-- Create RLS policy for the counter table
ALTER TABLE lab_ops.customer_asset_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage customer asset counters"
ON lab_ops.customer_asset_counters
FOR ALL
TO service_role
USING (true);

-- Notify schema changes
SELECT pg_notify('reload_schema', ''); 