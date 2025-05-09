-- Create job_notifications table for storing job-related notifications
CREATE TABLE IF NOT EXISTS neta_ops.job_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Null for global notifications
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'status_change', 'deadline_approaching', 'resource_assigned', 'cost_update', 'sla_violation', 'new_job', 'other'
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS job_notifications_job_id_idx ON neta_ops.job_notifications(job_id);
CREATE INDEX IF NOT EXISTS job_notifications_user_id_idx ON neta_ops.job_notifications(user_id);
CREATE INDEX IF NOT EXISTS job_notifications_type_idx ON neta_ops.job_notifications(type);
CREATE INDEX IF NOT EXISTS job_notifications_is_read_idx ON neta_ops.job_notifications(is_read);
CREATE INDEX IF NOT EXISTS job_notifications_is_dismissed_idx ON neta_ops.job_notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS job_notifications_created_at_idx ON neta_ops.job_notifications(created_at DESC);

-- Add RLS policies for job_notifications
ALTER TABLE neta_ops.job_notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies for idempotence
DROP POLICY IF EXISTS "Users can view their job notifications" ON neta_ops.job_notifications;
DROP POLICY IF EXISTS "Users can update their job notifications" ON neta_ops.job_notifications;
DROP POLICY IF EXISTS "Admins can view all job notifications" ON neta_ops.job_notifications;
DROP POLICY IF EXISTS "Admins can manage all job notifications" ON neta_ops.job_notifications;
DROP POLICY IF EXISTS "Services can create job notifications" ON neta_ops.job_notifications;

-- Users can view their own notifications or global notifications (where user_id is null)
CREATE POLICY "Users can view their job notifications"
  ON neta_ops.job_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can update (mark as read, dismiss) their own notifications or global notifications
CREATE POLICY "Users can update their job notifications"
  ON neta_ops.job_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Admins can view all notifications
CREATE POLICY "Admins can view all job notifications"
  ON neta_ops.job_notifications
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'admin'
  ));

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all job notifications"
  ON neta_ops.job_notifications
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'admin'
  ));

-- Allow special service role to create notifications
CREATE POLICY "Services can create job notifications"
  ON neta_ops.job_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create or update user_preferences table if it doesn't already contain notification_preferences
DO $$
BEGIN
  -- Add notification_preferences column to user_preferences if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'common' 
    AND table_name = 'user_preferences'
    AND column_name = 'notification_preferences'
  ) THEN
    -- If user_preferences table doesn't exist, create it
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'common' 
      AND table_name = 'user_preferences'
    ) THEN
      CREATE TABLE common.user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        notification_preferences JSONB DEFAULT '{
          "enableNotifications": true,
          "emailNotifications": false,
          "notificationTypes": {
            "status_change": true,
            "deadline_approaching": true,
            "resource_assigned": true,
            "cost_update": true,
            "sla_violation": true,
            "new_job": true
          }
        }'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
      
      -- Add RLS to user_preferences
      ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;
      
      -- Users can view and update their own preferences
      CREATE POLICY "Users can manage their preferences"
        ON common.user_preferences
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
      
      -- Admins can view all preferences
      CREATE POLICY "Admins can view all preferences"
        ON common.user_preferences
        FOR SELECT
        TO authenticated
        USING (EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        ));
      
      CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON common.user_preferences(user_id);
    ELSE
      -- If table exists but column doesn't, add it
      ALTER TABLE common.user_preferences 
      ADD COLUMN notification_preferences JSONB DEFAULT '{
        "enableNotifications": true,
        "emailNotifications": false,
        "notificationTypes": {
          "status_change": true,
          "deadline_approaching": true,
          "resource_assigned": true,
          "cost_update": true,
          "sla_violation": true,
          "new_job": true
        }
      }'::jsonb;
    END IF;
  END IF;
END;
$$;

-- Create notification helper functions

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_job_notifications_count(p_user_id UUID)
RETURNS INTEGER
SECURITY INVOKER
SET search_path = neta_ops, common
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM neta_ops.job_notifications 
    WHERE (user_id = p_user_id OR user_id IS NULL)
    AND is_read = FALSE
    AND is_dismissed = FALSE
  );
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_job_notifications_as_read(p_user_id UUID)
RETURNS void
SECURITY INVOKER
SET search_path = neta_ops, common
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE neta_ops.job_notifications
  SET 
    is_read = TRUE,
    updated_at = NOW()
  WHERE (user_id = p_user_id OR user_id IS NULL)
  AND is_read = FALSE;
END;
$$;

-- Function to create a job notification with triggers/webhooks 
CREATE OR REPLACE FUNCTION create_job_notification(
  p_job_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY INVOKER
SET search_path = neta_ops, common
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO neta_ops.job_notifications(
    job_id,
    user_id,
    title,
    message,
    type,
    metadata,
    is_read,
    is_dismissed,
    created_at,
    updated_at
  )
  VALUES (
    p_job_id,
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_metadata,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  -- Here we could add webhook calls or other notifications
  -- like sending emails if user preferences indicate that
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_unread_job_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_job_notifications_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION create_job_notification TO authenticated;

-- Create triggers for automatic notification generation

-- Create function to generate job status change notifications
CREATE OR REPLACE FUNCTION job_status_changed_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  job_title TEXT;
  notification_message TEXT;
  notification_title TEXT;
  previous_status TEXT;
  new_status TEXT;
BEGIN
  -- Only proceed if status has changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  previous_status := OLD.status;
  new_status := NEW.status;
  job_title := NEW.title;
  
  -- Create notification title and message based on status change
  notification_title := 'Job Status Updated';
  notification_message := format('Job "%s" has been updated from %s to %s', 
                                job_title, previous_status, new_status);
  
  -- Insert the notification (global notification with null user_id)
  PERFORM create_job_notification(
    NEW.id,
    NULL, -- Global notification
    notification_title,
    notification_message,
    'status_change',
    jsonb_build_object(
      'previous_status', previous_status,
      'new_status', new_status
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for job status changes
DROP TRIGGER IF EXISTS job_status_change_notification_trigger ON neta_ops.jobs;
CREATE TRIGGER job_status_change_notification_trigger
AFTER UPDATE OF status ON neta_ops.jobs
FOR EACH ROW
EXECUTE FUNCTION job_status_changed_notification(); 