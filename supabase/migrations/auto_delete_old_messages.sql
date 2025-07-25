-- Create a function to delete messages older than 24 hours
CREATE OR REPLACE FUNCTION common.delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete messages older than 24 hours
  DELETE FROM common.chat_messages
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Log the deletion (optional)
  RAISE NOTICE 'Deleted chat messages older than 24 hours';
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION common.delete_old_chat_messages() TO service_role;

-- Create a scheduled job to run this function every hour
DO $$
BEGIN
  -- Check if pgcron extension exists and is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- If pg_cron is available, create a scheduled job
    PERFORM cron.schedule(
      'delete-old-chat-messages',  -- Job name
      '0 * * * *',                 -- Cron schedule (every hour)
      'SELECT common.delete_old_chat_messages()'
    );
    RAISE NOTICE 'Created scheduled job to delete old chat messages';
  ELSE
    -- If pg_cron is not available, show a message
    RAISE NOTICE 'pg_cron extension is not available. Please run the common.delete_old_chat_messages() function manually or set up an external scheduler';
    
    -- Create a comment in the database to document the need for manual deletion
    COMMENT ON FUNCTION common.delete_old_chat_messages() IS 
      'This function should be run periodically (e.g., hourly) to delete chat messages older than 24 hours. Since pg_cron is not available, set up an external scheduler or run manually.';
  END IF;
END;
$$;

-- Add an index on created_at to make the deletion more efficient
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
ON common.chat_messages (created_at);

-- Create a view to show message retention stats (for monitoring)
CREATE OR REPLACE VIEW common.chat_message_stats AS
SELECT
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent_messages,
  COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '24 hours') AS pending_deletion,
  MIN(created_at) AS oldest_message_time,
  MAX(created_at) AS newest_message_time
FROM common.chat_messages;

GRANT SELECT ON common.chat_message_stats TO authenticated; 