-- Minimal fix for admin chat room visibility
-- Focus on just getting the basic functionality working

-- First, update Admin chat room
UPDATE common.chat_rooms
SET role_access = 'Admin'
WHERE name = 'Admin';

-- Create a very basic function with only essential functionality
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

  -- Simple query for chat rooms based on user role
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    r.role_access,
    0::BIGINT AS unread_count, -- Placeholder for unread count
    NULL::TEXT AS last_message,
    NULL::TIMESTAMPTZ AS last_message_time
  FROM 
    common.chat_rooms r
  WHERE 
    -- Room is visible to all users
    r.role_access = 'All'
    -- OR room matches the user's role (case insensitive)
    OR LOWER(r.role_access) = user_role
    -- OR user has admin in their role name and room is Admin
    OR (user_role LIKE '%admin%' AND r.name = 'Admin')
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms TO authenticated; 