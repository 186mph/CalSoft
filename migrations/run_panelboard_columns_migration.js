const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key must be provided in environment variables.');
  console.error('Make sure VITE_SUPABASE_URL and either VITE_SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Starting migration to add columns to panelboard_reports table...');
    
    // Read the SQL file
    const sql = fs.readFileSync('./add_panelboard_report_columns.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('add_panelboard_report_columns');
    
    if (error) {
      throw new Error(`Failed to run migration: ${error.message}`);
    }
    
    console.log('Migration completed successfully!');
    console.log('Added nameplate_data and test_equipment columns to panelboard_reports table');
    
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error.message);
    
    // If the function doesn't exist yet, try running the SQL directly
    if (error.message.includes('function "add_panelboard_report_columns" does not exist')) {
      console.log('Trying to execute SQL directly...');
      
      try {
        const sql = fs.readFileSync('./add_panelboard_report_columns.sql', 'utf8');
        const { error: sqlError } = await supabase.sql(sql);
        
        if (sqlError) {
          throw new Error(`Failed to run SQL: ${sqlError.message}`);
        }
        
        console.log('Migration completed successfully by direct SQL execution!');
        return { success: true };
      } catch (sqlError) {
        console.error('Direct SQL execution failed:', sqlError.message);
        return { success: false, error: sqlError };
      }
    }
    
    return { success: false, error };
  }
}

// Run the migration
runMigration()
  .then(result => {
    if (result.success) {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Migration script failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  }); 