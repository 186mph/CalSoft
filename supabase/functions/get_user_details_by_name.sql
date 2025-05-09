-- Function to help look up users by name
CREATE OR REPLACE FUNCTION get_user_details_by_name(name_fragment TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with the privileges of the function creator
AS $$
BEGIN
  -- First try to find in auth.users using raw_user_meta_data
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(
      u.raw_user_meta_data->>'name', 
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'username',
      u.email
    )::TEXT AS name,
    COALESCE(
      u.raw_user_meta_data->>'profileImage',
      u.raw_user_meta_data->>'avatar_url'
    )::TEXT AS profile_image
  FROM auth.users u
  WHERE 
    (u.raw_user_meta_data->>'name' ILIKE '%' || name_fragment || '%') OR
    (u.raw_user_meta_data->>'full_name' ILIKE '%' || name_fragment || '%') OR
    (u.raw_user_meta_data->>'username' ILIKE '%' || name_fragment || '%') OR
    (u.email ILIKE '%' || name_fragment || '%')
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_details_by_name(TEXT) TO authenticated;

COMMENT ON FUNCTION get_user_details_by_name IS 'Gets user details by searching for name, fullname, username or email'; 