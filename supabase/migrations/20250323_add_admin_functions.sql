-- Create admin functions
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS SETOF auth.users
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM auth.users;
END;
$$;

-- Function to update user roles
CREATE OR REPLACE FUNCTION admin_update_user_role(user_id UUID, new_role TEXT)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new_role)
  WHERE id = user_id;
END;
$$;

-- Function to make a user an admin (use this to set up your first admin)
CREATE OR REPLACE FUNCTION make_user_admin(target_email TEXT)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'Admin')
  WHERE email = target_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated;

-- Create policies for the admin role
CREATE POLICY "Admins can view all data"
ON public.customers FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'Admin'
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can view all contacts"
ON public.contacts FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'Admin'
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can view all jobs"
ON public.jobs FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'Admin'
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can view all opportunities"
ON public.opportunities FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'Admin'
  OR auth.uid() = user_id
); 