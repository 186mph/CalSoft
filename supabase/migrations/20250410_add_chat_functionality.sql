-- Create chat rooms table in common schema
CREATE TABLE IF NOT EXISTS common.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  role_access TEXT NOT NULL, -- Role name that can access this room ('All' for everyone)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat messages table in common schema
CREATE TABLE IF NOT EXISTS common.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_room_status table to track last read message per user per room
CREATE TABLE IF NOT EXISTS common.user_room_status (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  room_id UUID NOT NULL REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES common.chat_messages(id),
  last_visit_time TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE common.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_room_status ENABLE ROW LEVEL SECURITY;

-- Create policy for chat rooms access based on role
CREATE POLICY IF NOT EXISTS "Users can view chat rooms they have access to" ON common.chat_rooms
  FOR SELECT USING (
    (role_access = 'All') OR 
    (role_access = (auth.jwt() ->> 'role')::text)
  );

-- Create policy for sending messages to chat rooms
CREATE POLICY IF NOT EXISTS "Users can send messages to rooms they have access to" ON common.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM common.chat_rooms cr
      WHERE cr.id = room_id
      AND (
        (cr.role_access = 'All') OR 
        (cr.role_access = (auth.jwt() ->> 'role')::text)
      )
    )
  );

-- Create policy for reading messages in chat rooms
CREATE POLICY IF NOT EXISTS "Users can view messages in rooms they have access to" ON common.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM common.chat_rooms cr
      WHERE cr.id = room_id
      AND (
        (cr.role_access = 'All') OR 
        (cr.role_access = (auth.jwt() ->> 'role')::text)
      )
    )
  );

-- Create policy for user room status
CREATE POLICY IF NOT EXISTS "Users can manage their own room status" ON common.user_room_status
  USING (user_id = auth.uid());

-- Create function to mark all messages in a room as read for a user
CREATE OR REPLACE FUNCTION common.mark_room_messages_read(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_message_id UUID;
BEGIN
  -- Get the latest message in the room
  SELECT cm.id INTO v_last_message_id
  FROM common.chat_messages cm
  WHERE cm.room_id = p_room_id
  ORDER BY cm.created_at DESC
  LIMIT 1;
  
  -- If there are messages in the room
  IF v_last_message_id IS NOT NULL THEN
    -- Update or insert the user room status
    INSERT INTO common.user_room_status (user_id, room_id, last_read_message_id, last_visit_time)
    VALUES (auth.uid(), p_room_id, v_last_message_id, now())
    ON CONFLICT (user_id, room_id) 
    DO UPDATE SET 
      last_read_message_id = v_last_message_id,
      last_visit_time = now();
  END IF;
END;
$$;

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION common.get_unread_message_count()
RETURNS TABLE (
  room_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_rooms AS (
    SELECT r.id
    FROM common.chat_rooms r
    WHERE (r.role_access = 'All') OR (r.role_access = (auth.jwt() ->> 'role')::text)
  ),
  user_status AS (
    SELECT 
      urs.room_id,
      urs.last_read_message_id
    FROM common.user_room_status urs
    WHERE urs.user_id = auth.uid()
  )
  SELECT 
    ur.id,
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
  GROUP BY ur.id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION common.mark_room_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION common.get_unread_message_count TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON common.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON common.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON common.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_room_status_user_id ON common.user_room_status(user_id);

-- Insert default chat rooms for each role
INSERT INTO common.chat_rooms (name, description, role_access)
VALUES 
  ('General', 'Chat room for all employees', 'All'),
  ('NETA Technicians', 'Chat room for NETA Technicians', 'NETA Technician'),
  ('Lab Technicians', 'Chat room for Lab Technicians', 'Lab Technician'),
  ('HR', 'Chat room for HR Representatives', 'HR Rep'),
  ('Office', 'Chat room for Office Admins', 'Office Admin'),
  ('Sales', 'Chat room for Sales Representatives', 'Sales Representative'),
  ('Engineering', 'Chat room for Engineers', 'Engineer'),
  ('Admin', 'Chat room for Administrators', 'Admin');

-- Add a function to get user's accessible chat rooms with unread counts
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
  RETURN QUERY
  WITH user_rooms AS (
    SELECT r.*
    FROM common.chat_rooms r
    WHERE (r.role_access = 'All') OR (r.role_access = (auth.jwt() ->> 'role')::text)
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