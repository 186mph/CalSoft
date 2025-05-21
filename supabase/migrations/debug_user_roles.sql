-- Function to get the user's JWT for debugging
CREATE OR REPLACE FUNCTION common.debug_get_jwt()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.jwt();
END;
$$;

GRANT EXECUTE ON FUNCTION common.debug_get_jwt TO authenticated;

-- Check the current user's role directly
CREATE OR REPLACE FUNCTION common.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.jwt() ->> 'role';
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_my_role TO authenticated;

-- Show all chat rooms with their role_access to check what's available
SELECT id, name, role_access FROM common.chat_rooms ORDER BY name;

-- Function to test if the current user would see each room
CREATE OR REPLACE FUNCTION common.test_room_visibility()
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_role_access TEXT,
  user_role TEXT,
  is_visible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  v_user_role := auth.jwt() ->> 'role';
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.role_access,
    v_user_role,
    (r.role_access = 'All') OR (LOWER(r.role_access) = LOWER(v_user_role)) as is_visible
  FROM common.chat_rooms r
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.test_room_visibility TO authenticated;

-- Alternative version of get_user_chat_rooms with debugging
CREATE OR REPLACE FUNCTION common.debug_get_user_chat_rooms()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  role_access TEXT,
  user_role TEXT,
  role_match_result BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role
  v_user_role := auth.jwt() ->> 'role';
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    r.role_access,
    v_user_role,
    (r.role_access = 'All') OR (LOWER(r.role_access) = LOWER(v_user_role)) as role_match_result
  FROM common.chat_rooms r
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.debug_get_user_chat_rooms TO authenticated; 