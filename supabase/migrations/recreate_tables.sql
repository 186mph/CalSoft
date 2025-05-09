-- Create a simple function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(schema text, tablename text) 
RETURNS boolean AS $$
DECLARE
   exists boolean;
BEGIN
    SELECT count(*) > 0 INTO exists
    FROM pg_tables
    WHERE schemaname = schema
    AND tablename = tablename;
    RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- Recreate the chat tables if they don't exist
DO $$
BEGIN
    -- Create chat_rooms table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'common' AND tablename = 'chat_rooms') THEN
        CREATE TABLE common.chat_rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          role_access TEXT NOT NULL, -- Role name that can access this room ('All' for everyone)
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created chat_rooms table';
    ELSE
        RAISE NOTICE 'chat_rooms table already exists';
    END IF;

    -- Create chat_messages table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'common' AND tablename = 'chat_messages') THEN
        CREATE TABLE common.chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID NOT NULL REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created chat_messages table';
    ELSE
        RAISE NOTICE 'chat_messages table already exists';
    END IF;

    -- Create user_room_status table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'common' AND tablename = 'user_room_status') THEN
        CREATE TABLE common.user_room_status (
          user_id UUID NOT NULL,
          room_id UUID NOT NULL REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
          last_read_message_id UUID REFERENCES common.chat_messages(id),
          last_visit_time TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (user_id, room_id)
        );
        RAISE NOTICE 'Created user_room_status table';
    ELSE
        RAISE NOTICE 'user_room_status table already exists';
    END IF;
END $$;

-- Insert default chat rooms if the table is empty
INSERT INTO common.chat_rooms (name, description, role_access)
SELECT 'General', 'Chat room for all employees', 'All'
WHERE NOT EXISTS (SELECT 1 FROM common.chat_rooms);

-- Disable RLS for now to simplify debugging
ALTER TABLE common.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_room_status DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL PRIVILEGES ON common.chat_rooms TO authenticated;
GRANT ALL PRIVILEGES ON common.chat_messages TO authenticated;
GRANT ALL PRIVILEGES ON common.user_room_status TO authenticated; 