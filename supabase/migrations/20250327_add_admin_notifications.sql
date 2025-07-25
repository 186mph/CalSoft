-- Create admin_notifications table for storing notifications for admins
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'new_user', 'role_request', etc.
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to ensure idempotency
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "All users can create notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;

-- Allow admins to read all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'Admin');

-- Allow authenticated users to insert notifications
CREATE POLICY "All users can create notifications"
  ON public.admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins to update notification status (e.g., mark as read)
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'Admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'Admin');

-- Create functions (also make idempotent)
DROP FUNCTION IF EXISTS get_unread_admin_notifications_count();
CREATE OR REPLACE FUNCTION get_unread_admin_notifications_count()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM public.admin_notifications 
    WHERE is_read = FALSE
  );
END;
$$;

DROP FUNCTION IF EXISTS mark_notification_as_read(UUID);
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = TRUE,
    updated_at = NOW()
  WHERE id = notification_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_unread_admin_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;

-- Add notifications index for performance (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS admin_notifications_is_read_idx ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS admin_notifications_type_idx ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON public.admin_notifications(created_at DESC); 