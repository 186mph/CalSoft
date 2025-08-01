-- Fix user_preferences table and permissions
-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS common;

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.user_preferences (
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

-- Enable RLS
ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their preferences" ON common.user_preferences;
DROP POLICY IF EXISTS "Admins can view all preferences" ON common.user_preferences;

-- Create policies
CREATE POLICY "Users can manage their preferences"
    ON common.user_preferences
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT ALL ON common.user_preferences TO authenticated;
GRANT USAGE ON SCHEMA common TO authenticated;

-- Create job_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS common.job_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for job_notifications
ALTER TABLE common.job_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view their notifications" ON common.job_notifications;
DROP POLICY IF EXISTS "Allow users to update their notifications" ON common.job_notifications;

-- Create policies for job_notifications
CREATE POLICY "Allow authenticated users to view their notifications"
    ON common.job_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Allow users to update their notifications"
    ON common.job_notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to insert their notifications"
    ON common.job_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON common.job_notifications TO authenticated; 