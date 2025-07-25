-- Function to get basic database statistics (Moved to common schema)
CREATE OR REPLACE FUNCTION common.get_database_statistics()
RETURNS jsonb
SECURITY DEFINER
SET search_path = common, public, extensions -- Ensure common is in search_path
LANGUAGE plpgsql
AS $$
DECLARE
  total_size_bytes BIGINT;
  total_rows BIGINT;
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Calculate total database size (approximate)
  SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::BIGINT
  INTO total_size_bytes
  FROM pg_tables
  WHERE schemaname IN ('public', 'neta_ops', 'business', 'common'); -- Include all relevant schemas

  -- Count total rows (estimate, can be slow on large DBs)
  SELECT SUM(n_live_tup)::BIGINT
  INTO total_rows
  FROM pg_stat_user_tables
  WHERE schemaname IN ('public', 'neta_ops', 'business', 'common');

  -- Count tables
  SELECT COUNT(*)::INTEGER
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema IN ('public', 'neta_ops', 'business', 'common');

  -- Count functions (excluding internal pg_* functions and common schema functions if desired)
  SELECT COUNT(*)::INTEGER
  INTO function_count
  FROM information_schema.routines
  WHERE specific_schema NOT IN ('pg_catalog', 'information_schema');

  RETURN jsonb_build_object(
    'total_size_bytes', COALESCE(total_size_bytes, 0),
    'total_rows_estimate', COALESCE(total_rows, 0),
    'table_count', COALESCE(table_count, 0),
    'function_count', COALESCE(function_count, 0)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION common.get_database_statistics TO authenticated;

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema'; 