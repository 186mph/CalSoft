-- Simplest fix for admin chat room visibility

-- First, update the Admin chat room to ensure it has the correct role_access
UPDATE common.chat_rooms
SET role_access = 'Admin'
WHERE name = 'Admin';

-- Create a simplified function using a more direct approach
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
  -- Get user's role
  user_role := LOWER((auth.jwt() ->> 'role')::text);
  
  -- Special handling for admin users
  IF user_role LIKE '%admin%' THEN
    RETURN QUERY
    SELECT 
      r.id,
      r.name,
      r.description,
      r.role_access,
      COALESCE(uc.unread_count, 0) AS unread_count,
      lm.content AS last_message,
      lm.created_at AS last_message_time
    FROM 
      common.chat_rooms r
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread_count, room_id
      FROM common.chat_messages m
      LEFT JOIN common.user_room_status urs 
        ON urs.room_id = m.room_id AND urs.user_id = auth.uid()
      WHERE 
        m.room_id = r.id AND
        m.user_id != auth.uid() AND
        (urs.last_read_message_id IS NULL OR m.created_at > (
          SELECT cm.created_at 
          FROM common.chat_messages cm
          WHERE cm.id = urs.last_read_message_id
        ))
      GROUP BY room_id
    ) uc ON true
    LEFT JOIN LATERAL (
      SELECT content, created_at, room_id
      FROM common.chat_messages
      WHERE room_id = r.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE 
      r.role_access = 'All' 
      OR LOWER(r.role_access) = user_role
      OR r.name = 'Admin' -- Admin users always see the Admin room
    ORDER BY lm.created_at DESC NULLS LAST, r.name;
  ELSE
    -- Regular users only see their allowed rooms
    RETURN QUERY
    SELECT 
      r.id,
      r.name,
      r.description,
      r.role_access,
      COALESCE(uc.unread_count, 0) AS unread_count,
      lm.content AS last_message,
      lm.created_at AS last_message_time
    FROM 
      common.chat_rooms r
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread_count, room_id
      FROM common.chat_messages m
      LEFT JOIN common.user_room_status urs 
        ON urs.room_id = m.room_id AND urs.user_id = auth.uid()
      WHERE 
        m.room_id = r.id AND
        m.user_id != auth.uid() AND
        (urs.last_read_message_id IS NULL OR m.created_at > (
          SELECT cm.created_at 
          FROM common.chat_messages cm
          WHERE cm.id = urs.last_read_message_id
        ))
      GROUP BY room_id
    ) uc ON true
    LEFT JOIN LATERAL (
      SELECT content, created_at, room_id
      FROM common.chat_messages
      WHERE room_id = r.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE 
      r.role_access = 'All' 
      OR LOWER(r.role_access) = user_role
    ORDER BY lm.created_at DESC NULLS LAST, r.name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms TO authenticated; 