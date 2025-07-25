-- Remove duplicate chat rooms, keeping only one instance of each room by name

-- First, create a temporary table to store the IDs of rooms to keep
CREATE TEMP TABLE rooms_to_keep AS
WITH ranked_rooms AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as row_num
  FROM common.chat_rooms
)
SELECT id FROM ranked_rooms WHERE row_num = 1;

-- Delete rooms that are not in our "keep" list
DELETE FROM common.chat_rooms
WHERE id NOT IN (SELECT id FROM rooms_to_keep);

-- Drop the temporary table
DROP TABLE rooms_to_keep;

-- Ensure General chat room exists with correct role_access
INSERT INTO common.chat_rooms (name, description, role_access)
VALUES ('General', 'Chat room for all employees', 'All')
ON CONFLICT (name) 
DO UPDATE SET role_access = 'All', description = 'Chat room for all employees';

-- Verify that we now have only unique room names
SELECT name, COUNT(*) 
FROM common.chat_rooms 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Show the remaining chat rooms
SELECT id, name, description, role_access 
FROM common.chat_rooms
ORDER BY name; 