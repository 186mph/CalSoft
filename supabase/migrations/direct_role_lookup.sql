-- Create a function to directly check if a user is an admin by looking in the database
-- rather than relying on the JWT role claim
CREATE OR REPLACE FUNCTION common.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- First try to check if the role is in the JWT for backward compatibility
  IF (auth.jwt() ->> 'role')::text = 'Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise look directly in the auth.users table
  -- This assumes admin status is stored in raw_app_meta_data->>'role'
  SELECT 
    COALESCE(
      raw_app_meta_data->>'role' = 'Admin' OR 
      raw_user_meta_data->>'role' = 'Admin',
      FALSE
    ) INTO v_is_admin
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION common.is_user_admin TO authenticated;

-- Get user's chat rooms that uses direct role lookup
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
  v_is_admin BOOLEAN;
BEGIN
  -- Check if the user is an admin
  v_is_admin := common.is_user_admin();
  
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
    -- OR user is admin and the room is the Admin room
    OR (v_is_admin AND r.name = 'Admin')
    -- OR room matches the user's role from JWT (backward compatibility)
    OR (
      (auth.jwt() ->> 'role') IS NOT NULL AND
      LOWER(r.role_access) = LOWER((auth.jwt() ->> 'role')::text)
    )
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_user_chat_rooms TO authenticated; 