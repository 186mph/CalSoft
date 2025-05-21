-- Rename the table
ALTER TABLE transformer_tests RENAME TO LargeDryTransformer_Tests;

-- Update the policies for the already renamed table
ALTER POLICY "Users can view their own transformer tests" 
  ON LargeDryTransformer_Tests 
  RENAME TO "Users can view their own large dry transformer tests";

ALTER POLICY "Users can insert their own transformer tests" 
  ON LargeDryTransformer_Tests 
  RENAME TO "Users can insert their own large dry transformer tests";

ALTER POLICY "Users can update their own transformer tests" 
  ON LargeDryTransformer_Tests 
  RENAME TO "Users can update their own large dry transformer tests";

-- Rename the index if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'transformer_tests_job_id_idx') THEN
    ALTER INDEX transformer_tests_job_id_idx 
      RENAME TO LargeDryTransformer_Tests_job_id_idx;
  END IF;
END $$;

-- Update the trigger name if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transformer_tests_updated_at') THEN
    ALTER TRIGGER update_transformer_tests_updated_at 
      ON LargeDryTransformer_Tests 
      RENAME TO update_LargeDryTransformer_Tests_updated_at;
  END IF;
END $$; 