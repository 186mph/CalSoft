import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.');
  process.exit(1);
}

// Create Supabase client with anonymous key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runJobNumberMigration() {
  try {
    console.log('Running job number automation migration...');
    
    // Read migration file
    const sqlMigration = fs.readFileSync('./supabase/migrations/20240318_create_job_number_sequence.sql', 'utf8');
    
    // Run the migration using stored procedure (or try direct SQL if RPC doesn't exist)
    try {
      const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', {
        sql_string: sqlMigration
      });
      
      if (migrationError) {
        console.warn(`Warning: RPC call failed: ${migrationError.message}`);
        console.log('Attempting to execute SQL directly with multiple statements...');
        
        // Split the SQL into individual statements
        const statements = sqlMigration.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const stmt of statements) {
          console.log(`Executing: ${stmt.substring(0, 50)}...`);
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_string: stmt + ';'
          });
          
          if (error) {
            console.warn(`Warning: Statement execution failed: ${error.message}`);
          } else {
            console.log('Statement executed successfully');
          }
        }
        
        console.log('All statements processed');
      } else {
        console.log('Migration completed successfully');
        console.log('Result:', migrationResult);
      }
    } catch (rpcError) {
      console.error('Error executing RPC:', rpcError);
      throw new Error('Failed to execute SQL via RPC. You may need to run this migration manually.');
    }
    
    // Try to record migration in migrations table
    try {
      const { error: recordError } = await supabase
        .from('migrations')
        .insert({
          name: '20240320_job_number_automation',
          applied_at: new Date().toISOString()
        });
        
      if (recordError) {
        console.warn(`Warning: Failed to record migration in migrations table: ${recordError.message}`);
      } else {
        console.log('Migration recorded in migrations table');
      }
    } catch (recordError) {
      console.warn(`Warning: Failed to record migration: ${recordError.message}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runJobNumberMigration(); 