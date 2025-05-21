-- SQL function to execute dynamic SQL queries
-- This helps with cross-schema queries that might be difficult with PostgREST

-- Create the function in the public schema
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY EXECUTE sql_query;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing SQL: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO authenticated;

-- Refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema'); 