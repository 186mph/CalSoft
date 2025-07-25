-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chat rooms they have access to" ON common.chat_rooms;
DROP POLICY IF EXISTS "Users can send messages to rooms they have access to" ON common.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in rooms they have access to" ON common.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own room status" ON common.user_room_status; 