-- Create customer_categories table in common schema
CREATE TABLE IF NOT EXISTS common.customer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#CCCCCC', -- Default to a light gray color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add RLS policies for the new table
ALTER TABLE common.customer_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view customer_categories"
    ON common.customer_categories
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert/update customer_categories"
    ON common.customer_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true); 