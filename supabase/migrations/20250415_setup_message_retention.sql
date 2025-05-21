-- Create the common schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS common;

-- Create the chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES common.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE common.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for reading messages
CREATE POLICY "Users can view messages in rooms they have access to" 
ON common.chat_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM common.chat_rooms cr
        WHERE cr.id = room_id
        AND (
            (cr.role_access = 'All') OR 
            (cr.role_access = (auth.jwt() ->> 'role')::text)
        )
    )
);

-- Enable the required extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Store implementation timestamp
CREATE TABLE IF NOT EXISTS common.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert implementation timestamp if it doesn't exist
INSERT INTO common.system_config (key, value)
VALUES (
    'message_retention_start',
    jsonb_build_object('timestamp', NOW())
)
ON CONFLICT (key) DO NOTHING;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a function to delete messages older than 24 hours
CREATE OR REPLACE FUNCTION common.delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    retention_start TIMESTAMPTZ;
BEGIN
    -- Get the retention start timestamp
    SELECT (value->>'timestamp')::TIMESTAMPTZ 
    INTO retention_start 
    FROM common.system_config 
    WHERE key = 'message_retention_start';

    -- Delete messages older than 24 hours, but only those created after retention_start
    WITH deleted AS (
        DELETE FROM common.chat_messages
        WHERE created_at < NOW() - INTERVAL '24 hours'
        AND created_at >= retention_start
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the deletion count
    INSERT INTO common.system_logs (
        event_type,
        description,
        metadata
    ) VALUES (
        'message_cleanup',
        'Deleted old chat messages',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'deletion_time', NOW(),
            'retention_start', retention_start
        )
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION common.delete_old_chat_messages() TO service_role;
GRANT ALL ON TABLE common.system_logs TO service_role;
GRANT ALL ON TABLE common.system_config TO service_role;
GRANT ALL ON TABLE common.chat_messages TO service_role;
GRANT ALL ON TABLE common.chat_messages TO authenticated;

-- Create a cron job to run the cleanup function every hour
SELECT cron.schedule(
    'cleanup-old-messages',
    '0 * * * *',  -- Run every hour
    $$SELECT common.delete_old_chat_messages()$$
);

-- Add an index to make the deletion more efficient
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
    ON common.chat_messages (created_at);

-- Drop the view if it exists to avoid conflicts
DROP VIEW IF EXISTS common.message_retention_stats;

-- Create a view to monitor message retention
CREATE VIEW common.message_retention_stats AS
SELECT
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent_messages,
    COUNT(*) FILTER (
        WHERE created_at <= NOW() - INTERVAL '24 hours'
        AND created_at >= (
            SELECT (value->>'timestamp')::TIMESTAMPTZ 
            FROM common.system_config 
            WHERE key = 'message_retention_start'
        )
    ) AS pending_deletion,
    COUNT(*) FILTER (
        WHERE created_at < (
            SELECT (value->>'timestamp')::TIMESTAMPTZ 
            FROM common.system_config 
            WHERE key = 'message_retention_start'
        )
    ) AS preserved_old_messages,
    MIN(created_at) AS oldest_message_time,
    MAX(created_at) AS newest_message_time
FROM common.chat_messages;

-- Grant access to the stats view
GRANT SELECT ON common.message_retention_stats TO authenticated; 