-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat rooms they have access to" ON common.chat_rooms;
DROP POLICY IF EXISTS "Users can send messages to rooms they have access to" ON common.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in rooms they have access to" ON common.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own room status" ON common.user_room_status;

-- Make sure Row Level Security is enabled
ALTER TABLE common.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_room_status ENABLE ROW LEVEL SECURITY;

-- Re-create the policies with more permissive read access

-- Chat rooms policy - allow all authenticated users to view all rooms
CREATE POLICY "Users can view all chat rooms" ON common.chat_rooms
  FOR SELECT TO authenticated
  USING (true);

-- Messages policy - allow all authenticated users to view all messages
CREATE POLICY "Users can view all messages" ON common.chat_messages
  FOR SELECT TO authenticated
  USING (true);

-- Messages insertion policy - allow authenticated users to add messages
CREATE POLICY "Users can add messages" ON common.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User room status policy - users can manage their own status
CREATE POLICY "Users can manage their own room status" ON common.user_room_status
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- For debugging, make sure we have correct ownership of the tables
ALTER TABLE common.chat_rooms OWNER TO postgres;
ALTER TABLE common.chat_messages OWNER TO postgres;
ALTER TABLE common.user_room_status OWNER TO postgres; 