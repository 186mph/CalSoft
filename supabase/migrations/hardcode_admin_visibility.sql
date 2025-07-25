-- Create a function that explicitly adds the Admin room for users with roles containing "admin"
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
  is_admin BOOLEAN;
  admin_room_id UUID;
BEGIN
  -- Get user's role
  user_role := (auth.jwt() ->> 'role')::text;
  is_admin := LOWER(user_role) LIKE '%admin%';
  
  -- Get the Admin room ID if it exists
  SELECT id INTO admin_room_id FROM common.chat_rooms WHERE name = 'Admin' LIMIT 1;
  
  -- Main query to get rooms based on role
  WITH user_rooms AS (
    SELECT r.*
    FROM common.chat_rooms r
    WHERE (r.role_access = 'All') OR (LOWER(r.role_access) = LOWER(user_role))
    
    -- Hard-coded addition: If user is admin AND admin room exists, include it
    UNION ALL
    SELECT r.*
    FROM common.chat_rooms r
    WHERE is_admin = true 
      AND r.name = 'Admin'
      AND NOT EXISTS (
        -- Don't add admin room twice if it was already included
        SELECT 1 FROM common.chat_rooms 
        WHERE (role_access = 'All' OR LOWER(role_access) = LOWER(user_role))
          AND name = 'Admin'
      )
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
  RETURN QUERY
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