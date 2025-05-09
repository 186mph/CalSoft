-- First, let's check what chat rooms exist
SELECT * FROM common.chat_rooms;

-- Then check the user role for debugging
CREATE OR REPLACE FUNCTION common.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get the role from the JWT
  v_role := auth.jwt() ->> 'role';
  RETURN v_role;
END;
$$;

-- Let's modify the get_user_chat_rooms function to show all chat rooms
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
BEGIN
  RAISE NOTICE 'Current user role: %', (auth.jwt() ->> 'role')::text;
  
  RETURN QUERY
  WITH user_rooms AS (
    -- Show ALL chat rooms by changing this condition to true
    SELECT r.*
    FROM common.chat_rooms r
    -- WHERE (r.role_access = 'All') OR (r.role_access = (auth.jwt() ->> 'role')::text)
    WHERE true -- Show all rooms regardless of role
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION common.get_current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms TO authenticated; 