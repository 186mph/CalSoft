import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Read environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and anon key must be provided.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('Checking if user_preferences table exists...');
    
    // Try to query the user_preferences table
    const { data, error } = await supabase
      .schema('common')
      .from('user_preferences')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ user_preferences table error:', error.message);
      console.log('Error code:', error.code);
      
      if (error.code === '42P01') {
        console.log('Table does not exist. You need to create it manually in the Supabase dashboard.');
        console.log('Go to your Supabase dashboard > SQL Editor and run:');
        console.log(`
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

ALTER TABLE common.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their preferences"
    ON common.user_preferences
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT ALL ON common.user_preferences TO authenticated;
        `);
      }
    } else {
      console.log('✅ user_preferences table exists and is accessible');
    }
    
    console.log('\nChecking if job_notifications table exists...');
    
    // Try to query the job_notifications table
    const { data: notifData, error: notifError } = await supabase
      .schema('common')
      .from('job_notifications')
      .select('*')
      .limit(1);
    
    if (notifError) {
      console.log('❌ job_notifications table error:', notifError.message);
      console.log('Error code:', notifError.code);
    } else {
      console.log('✅ job_notifications table exists and is accessible');
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables(); 