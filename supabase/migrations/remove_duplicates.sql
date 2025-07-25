-- First identify duplicate chat rooms and keep only one per name
WITH duplicate_rooms AS (
  SELECT 
    name,
    array_agg(id ORDER BY created_at) as ids
  FROM common.chat_rooms
  GROUP BY name
  HAVING COUNT(*) > 1
),
keep_ids AS (
  SELECT unnest(array_remove(ids, ids[1])) as id 
  FROM duplicate_rooms
)
DELETE FROM common.chat_rooms
WHERE id IN (SELECT id FROM keep_ids);

-- Add a unique constraint to prevent future duplicates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'chat_rooms_name_key'
  ) THEN
    ALTER TABLE common.chat_rooms ADD CONSTRAINT chat_rooms_name_key UNIQUE (name);
  END IF;
END $$; 