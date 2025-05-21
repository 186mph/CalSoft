-- Database function to get user metadata without requiring direct auth schema access
CREATE OR REPLACE FUNCTION get_user_metadata(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with the privileges of the function creator
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Get the user data from auth.users
  SELECT 
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'name', u.raw_user_meta_data->'name',
      'full_name', u.raw_user_meta_data->'full_name',
      'username', u.raw_user_meta_data->'username',
      'profile_image', u.raw_user_meta_data->'profileImage',
      'avatar_url', u.raw_user_meta_data->'avatar_url',
      'role', u.raw_user_meta_data->'role'
    ) INTO v_result
  FROM auth.users u
  WHERE u.id = p_user_id;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_metadata(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_metadata IS 'Gets user metadata from auth.users for a specific user ID'; 