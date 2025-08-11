-- Chat Functions Fix - Run this in Supabase SQL Editor
-- This creates all the missing chat RPC functions

-- Step 1: Create the common schema
CREATE SCHEMA IF NOT EXISTS common;

-- Step 2: Create chat tables if they don't exist
CREATE TABLE IF NOT EXISTS common.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    role_access TEXT DEFAULT 'All',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS common.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS common.user_room_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES common.chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, room_id)
);

-- Step 3: Enable RLS
ALTER TABLE common.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.user_room_status ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policies
DROP POLICY IF EXISTS "Allow all authenticated users to access chat_rooms" ON common.chat_rooms;
DROP POLICY IF EXISTS "Allow all authenticated users to access chat_messages" ON common.chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to access user_room_status" ON common.user_room_status;

CREATE POLICY "Allow all authenticated users to access chat_rooms"
    ON common.chat_rooms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to access chat_messages"
    ON common.chat_messages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to access user_room_status"
    ON common.user_room_status
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant permissions
GRANT ALL ON common.chat_rooms TO authenticated;
GRANT ALL ON common.chat_messages TO authenticated;
GRANT ALL ON common.user_room_status TO authenticated;

-- Step 6: Drop existing chat functions
DROP FUNCTION IF EXISTS common.get_user_chat_rooms();
DROP FUNCTION IF EXISTS get_user_chat_rooms();

-- Step 7: Create the get_user_chat_rooms function in common schema
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
    -- Get user's role from JWT
    user_role := (auth.jwt() ->> 'role')::text;
    
    RETURN QUERY
    WITH user_rooms AS (
        SELECT r.*
        FROM common.chat_rooms r
        WHERE (r.role_access = 'All') OR (LOWER(r.role_access) = LOWER(user_role))
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

-- Step 8: Create the same function in public schema (for calls without schema prefix)
CREATE OR REPLACE FUNCTION get_user_chat_rooms()
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
    -- Get user's role from JWT
    user_role := (auth.jwt() ->> 'role')::text;
    
    RETURN QUERY
    WITH user_rooms AS (
        SELECT r.*
        FROM common.chat_rooms r
        WHERE (r.role_access = 'All') OR (LOWER(r.role_access) = LOWER(user_role))
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

-- Step 9: Grant execute permissions
GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_chat_rooms() TO authenticated;

-- Step 10: Insert default chat rooms if they don't exist
INSERT INTO common.chat_rooms (name, description, role_access)
VALUES 
    ('General', 'Chat room for all employees', 'All'),
    ('NETA Technicians', 'Chat room for NETA Technicians', 'NETA Technician'),
    ('Lab Technicians', 'Chat room for Lab Technicians', 'Lab Technician'),
    ('HR', 'Chat room for HR Representatives', 'HR Rep'),
    ('Office', 'Chat room for Office Admins', 'Office Admin'),
    ('Sales', 'Chat room for Sales Representatives', 'Sales Representative'),
    ('Engineering', 'Chat room for Engineers', 'Engineer'),
    ('Admin', 'Chat room for Administrators', 'Admin')
ON CONFLICT (name) DO NOTHING;

-- Step 11: Verify the fix
SELECT 'Chat rooms count:' as info, COUNT(*) as count FROM common.chat_rooms;
SELECT 'Chat messages count:' as info, COUNT(*) as count FROM common.chat_messages;
SELECT 'User room status count:' as info, COUNT(*) as count FROM common.user_room_status;

-- Success message
SELECT 'All chat functions fixed! 406 errors for chat should be resolved.' as status; 