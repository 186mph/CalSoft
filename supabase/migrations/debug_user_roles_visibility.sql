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
  -- Explicitly cast to text, handle NULL
  RETURN COALESCE((auth.jwt() ->> 'role')::text, 'NULL_ROLE');
END;
$$;

GRANT EXECUTE ON FUNCTION common.get_my_role TO authenticated;

-- Show all chat rooms with their role_access to check what's available
-- Order by name for consistency
SELECT id, name, role_access FROM common.chat_rooms ORDER BY name;

-- Function to test if the current user would see each room based on the minimal logic
CREATE OR REPLACE FUNCTION common.test_minimal_visibility()
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_role_access TEXT,
  user_role TEXT,
  is_visible BOOLEAN,
  condition_met TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  v_user_role := LOWER(COALESCE((auth.jwt() ->> 'role')::text, 'null_role'));
  
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.role_access,
    v_user_role,
    (
      r.role_access = 'All' OR
      LOWER(r.role_access) = v_user_role OR
      (v_user_role LIKE '%admin%' AND r.name = 'Admin')
    ) as is_visible,
    CASE
      WHEN r.role_access = 'All' THEN 'role_access=All'
      WHEN LOWER(r.role_access) = v_user_role THEN 'LOWER(role_access)=user_role'
      WHEN (v_user_role LIKE '%admin%' AND r.name = 'Admin') THEN 'user_role LIKE %admin% AND name=Admin'
      ELSE 'None'
    END AS condition_met
  FROM common.chat_rooms r
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION common.test_minimal_visibility TO authenticated; 