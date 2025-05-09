#!/usr/bin/env node

/**
 * Run Job Notification Migration Script
 * 
 * This script applies the job notifications migration by executing the SQL file:
 * supabase/migrations/20250329_add_job_notifications.sql
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment or .env file');
  process.exit(1);
}

// Path to migration file
const migrationFilePath = path.join(
  __dirname, 
  '../supabase/migrations/20250329_add_job_notifications.sql'
);

// Check if migration file exists
if (!fs.existsSync(migrationFilePath)) {
  console.error(`Error: Migration file not found at ${migrationFilePath}`);
  process.exit(1);
}

console.log('Reading migration file...');
const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');

// Function to run the migration
async function runMigration() {
  try {
    console.log('Running job notifications migration...');
    
    // Use psql command with environment variables to connect to Supabase
    const command = `echo "${sqlContent}" | PGPASSWORD=${SUPABASE_SERVICE_KEY} psql ${SUPABASE_URL}`;
    
    // Execute the command
    execSync(command, { stdio: 'inherit' });
    
    console.log('Migration completed successfully!');
    
    // Add additional post-migration tasks if needed
    createSampleNotifications();
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Function to create some sample notifications for testing
function createSampleNotifications() {
  console.log('Creating sample notifications for testing...');
  
  try {
    // SQL to create sample notifications
    const sampleNotificationsSql = `
    -- Create sample notifications (will need to modify job_id values to match your database)
    INSERT INTO neta_ops.job_notifications (
      job_id, 
      user_id, 
      title, 
      message, 
      type, 
      is_read, 
      is_dismissed, 
      metadata
    )
    SELECT 
      id as job_id,
      NULL as user_id, -- global notification
      'Job Status Updated' as title,
      'Job "' || title || '" status has been set to ' || status as message,
      'status_change' as type,
      FALSE as is_read,
      FALSE as is_dismissed,
      jsonb_build_object('previous_status', 'pending', 'new_status', status) as metadata
    FROM neta_ops.jobs
    ORDER BY created_at DESC
    LIMIT 5; -- Create notifications for 5 most recent jobs
    `;
    
    const sampleCommand = `echo "${sampleNotificationsSql}" | PGPASSWORD=${SUPABASE_SERVICE_KEY} psql ${SUPABASE_URL}`;
    
    execSync(sampleCommand, { stdio: 'inherit' });
    
    console.log('Sample notifications created!');
    
  } catch (error) {
    console.error('Error creating sample notifications:', error);
    // Don't exit, as the main migration was successful
  }
}

// Run the migration
runMigration(); 