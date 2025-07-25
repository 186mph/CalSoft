-- Add category_id column to lab_customers table
ALTER TABLE lab_ops.lab_customers
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES common.customer_categories(id);

-- Add RLS policy for the new column
ALTER TABLE lab_ops.lab_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view lab_customers"
    ON lab_ops.lab_customers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert/update lab_customers"
    ON lab_ops.lab_customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true); 