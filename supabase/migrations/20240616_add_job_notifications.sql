-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS common;

-- Create job_notifications table
CREATE TABLE IF NOT EXISTS common.job_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy
        WHERE polrelid = 'common.job_notifications'::regclass
        AND polname = 'Allow authenticated users to view their notifications'
    ) THEN
        ALTER TABLE common.job_notifications ENABLE ROW LEVEL SECURITY;
        
        -- Allow users to view their own notifications
        CREATE POLICY "Allow authenticated users to view their notifications" 
        ON common.job_notifications
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
        
        -- Allow users to update their own notifications (e.g., marking as read)
        CREATE POLICY "Allow users to update their notifications"
        ON common.job_notifications
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END
$$;

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    notification_settings JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for user_preferences
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy
        WHERE polrelid = 'common.user_preferences'::regclass
        AND polname = 'Allow users to manage their preferences'
    ) THEN
        ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;
        
        -- Allow users to view and update their own preferences
        CREATE POLICY "Allow users to manage their preferences"
        ON common.user_preferences
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA common TO authenticated;
GRANT ALL ON common.job_notifications TO authenticated;
GRANT ALL ON common.user_preferences TO authenticated; 