-- Check the exact value of the current user's role in the JWT
CREATE OR REPLACE FUNCTION common.debug_jwt()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.jwt();
END;
$$;

GRANT EXECUTE ON FUNCTION common.debug_jwt TO authenticated;

-- Helper function to test if a user with a specific role can see a chat room
CREATE OR REPLACE FUNCTION common.is_room_visible_to_role(p_room_id UUID, p_test_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_access TEXT;
BEGIN
  SELECT role_access INTO v_role_access FROM common.chat_rooms WHERE id = p_room_id;
  
  RETURN (v_role_access = 'All') OR (LOWER(v_role_access) = LOWER(p_test_role));
END;
$$;

GRANT EXECUTE ON FUNCTION common.is_room_visible_to_role TO authenticated;

-- Create a query to show all chat rooms and which roles can see them
SELECT 
  id, 
  name, 
  role_access,
  common.is_room_visible_to_role(id, 'Admin') as visible_to_admin,
  common.is_room_visible_to_role(id, 'admin') as visible_to_lowercase_admin,
  common.is_room_visible_to_role(id, 'ADMIN') as visible_to_uppercase_admin
FROM common.chat_rooms; 