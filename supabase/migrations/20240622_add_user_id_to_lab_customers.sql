-- Add user_id column to lab_customers table
ALTER TABLE lab_ops.lab_customers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update the schema cache for lab_customers
SELECT pg_notify('reload_schema', '');

-- Verify the column exists
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'lab_ops'
    AND table_name = 'lab_customers'
    AND column_name = 'user_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION 'Error: user_id column was not added successfully';
  ELSE
    RAISE NOTICE 'Successfully added user_id column to lab_customers table';
  END IF;
END $$;
