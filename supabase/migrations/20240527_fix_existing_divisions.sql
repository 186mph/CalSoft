-- Fix any existing division values that don't match our constraint
DO $$
BEGIN
  -- Map any non-standard division values
  UPDATE jobs
  SET division = 'north_alabama'
  WHERE division = 'Decatur';

  -- Also check opportunities table for Decatur and add any missing mappings
  UPDATE opportunities
  SET amp_division = 'north_alabama'
  WHERE amp_division = 'Decatur';

  -- Check if any other invalid division values exist
  IF EXISTS (
    SELECT 1 FROM jobs
    WHERE division IS NOT NULL
    AND division NOT IN ('north_alabama', 'tennessee', 'georgia', 'international')
  ) THEN
    -- Get the list of invalid divisions for the error message
    RAISE NOTICE 'Found jobs with invalid division values. Please check and fix these records manually.';
    -- To see the list, run: SELECT DISTINCT division FROM jobs WHERE division NOT IN ('north_alabama', 'tennessee', 'georgia', 'international');
  END IF;
END $$; 