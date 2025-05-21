-- First disable RLS temporarily to troubleshoot the issue
ALTER TABLE common.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_room_status DISABLE ROW LEVEL SECURITY;

-- Grant direct permissions to the authenticated role
GRANT ALL PRIVILEGES ON common.chat_rooms TO authenticated;
GRANT ALL PRIVILEGES ON common.chat_messages TO authenticated;
GRANT ALL PRIVILEGES ON common.user_room_status TO authenticated;

-- Grant direct permissions to anon role as well (some Supabase operations use this role)
GRANT ALL PRIVILEGES ON common.chat_rooms TO anon;
GRANT ALL PRIVILEGES ON common.chat_messages TO anon;
GRANT ALL PRIVILEGES ON common.user_room_status TO anon;

-- Grant all privileges on sequences too
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA common TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA common TO anon;

-- Make sure permissions propagate to postgres role
GRANT ALL PRIVILEGES ON common.chat_rooms TO postgres;
GRANT ALL PRIVILEGES ON common.chat_messages TO postgres;
GRANT ALL PRIVILEGES ON common.user_room_status TO postgres; 