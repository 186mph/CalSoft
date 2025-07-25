-- Create the customer_asset_counters table
CREATE TABLE IF NOT EXISTS lab_ops.customer_asset_counters (
    customer_id TEXT PRIMARY KEY,
    last_asset_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to get next asset ID for a customer
CREATE OR REPLACE FUNCTION lab_ops.get_next_asset_id(p_customer_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Insert or update the counter
    INSERT INTO lab_ops.customer_asset_counters (customer_id, last_asset_number)
    VALUES (p_customer_id, 1)
    ON CONFLICT (customer_id) DO UPDATE
    SET last_asset_number = customer_asset_counters.last_asset_number + 1,
        updated_at = NOW()
    RETURNING last_asset_number INTO next_number;

    -- Return the formatted asset ID
    RETURN p_customer_id || '-' || next_number::text;
END;
$$;

-- Add RLS policies
ALTER TABLE lab_ops.customer_asset_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view counters"
    ON lab_ops.customer_asset_counters
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert/update counters"
    ON lab_ops.customer_asset_counters
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true); 