-- Create a function to get user data by ID
CREATE OR REPLACE FUNCTION common.get_user_details(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  profile_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    (au.raw_user_meta_data->>'name')::TEXT as name,
    (au.raw_user_meta_data->>'profileImage')::TEXT as profile_image
  FROM 
    auth.users au
  WHERE 
    au.id = user_id;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION common.get_user_details TO authenticated; 