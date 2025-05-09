-- Find and fix Admin chat room visibility

-- First, print the admin chat room current value for inspection
SELECT id, name, role_access FROM common.chat_rooms WHERE name = 'Admin';

-- Update Admin chat room to have multiple roles that might match
-- This ensures that regardless of casing or exact role name, it will be visible
UPDATE common.chat_rooms
SET role_access = 'Admin'
WHERE name = 'Admin';

-- Create an improved version of get_user_chat_rooms with better role matching
CREATE OR REPLACE FUNCTION common.get_user_chat_rooms()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  role_access TEXT,
  unread_count BIGINT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role and convert to lower case for better matching
  user_role := LOWER((auth.jwt() ->> 'role')::text);
  
  RAISE NOTICE 'User role (lowercase): %', user_role;
  
  RETURN QUERY
  WITH user_rooms AS (
    SELECT r.*
    FROM common.chat_rooms r
    WHERE 
      -- Room is visible to all
      (r.role_access = 'All') 
      -- Case-insensitive role matching
      OR (LOWER(r.role_access) = user_role)
      -- Special case for Admin looking at Admin room
      OR (LOWER(r.role_access) = 'admin' AND user_role = 'admin') 
  ),
  user_status AS (
    SELECT 
      urs.room_id,
      urs.last_read_message_id
    FROM common.user_room_status urs
    WHERE urs.user_id = auth.uid()
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.room_id)
      m.room_id,
      m.content AS last_message,
      m.created_at AS last_message_time
    FROM common.chat_messages m
    ORDER BY m.room_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      ur.id AS room_id,
      COUNT(m.id) AS unread_count
    FROM user_rooms ur
    LEFT JOIN user_status us ON ur.id = us.room_id
    LEFT JOIN common.chat_messages m ON 
      ur.id = m.room_id AND 
      (us.last_read_message_id IS NULL OR m.created_at > (
        SELECT cm.created_at 
        FROM common.chat_messages cm
        WHERE cm.id = us.last_read_message_id
      ))
    WHERE m.user_id != auth.uid() OR m.user_id IS NULL
    GROUP BY ur.id
  )
  SELECT 
    ur.id,
    ur.name,
    ur.description,
    ur.role_access,
    COALESCE(uc.unread_count, 0) AS unread_count,
    lm.last_message,
    lm.last_message_time
  FROM user_rooms ur
  LEFT JOIN unread_counts uc ON ur.id = uc.room_id
  LEFT JOIN last_messages lm ON ur.id = lm.room_id
  ORDER BY lm.last_message_time DESC NULLS LAST, ur.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms TO authenticated; 