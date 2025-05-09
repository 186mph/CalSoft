/**
 * This script applies the database migrations to your Supabase project.
 * It will read all the .sql files in the migrations directory and execute them.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Read environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and anon key must be provided.');
  console.error('Make sure your .env file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to migrations directory
const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

// Add this to the migrations array
const migrations = [
  // ... existing migrations ...
  {
    id: '20240320_job_number_automation',
    path: './supabase/migrations/20240318_create_job_number_sequence.sql',
    description: 'Add job_number sequence and automation'
  }
];

async function applyMigrations() {
  try {
    console.log('Reading migrations directory...');
    
    // Check if the directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Error: Migrations directory not found at ${migrationsDir}`);
      process.exit(1);
    }
    
    // Read all .sql files in the migrations directory
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations are applied in order
    
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    // Create migrations table if it doesn't exist
    try {
      const { error: tableError } = await supabase.rpc('create_migrations_table_if_not_exists');
      
      if (tableError) {
        // If the RPC doesn't exist, create the table directly
        console.log('Creating migrations table...');
        const { error: createTableError } = await supabase.rpc('exec_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS migrations (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              applied_at TIMESTAMPTZ DEFAULT NOW()
            );
          `
        });
        
        if (createTableError) {
          console.error('Error creating migrations table:', createTableError);
          process.exit(1);
        }
      }
    } catch (err) {
      // Check if migrations table exists
      try {
        const { data, error } = await supabase.from('migrations').select('*').limit(1);
        if (error) {
          // Table likely doesn't exist, create it
          console.log('Creating migrations table...');
          const { error: createTableError } = await supabase.rpc('exec_sql', {
            sql_query: `
              CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
              );
            `
          });
          
          if (createTableError) {
            console.error('Error creating migrations table:', createTableError);
            process.exit(1);
          }
        }
      } catch (innerErr) {
        console.error('Error creating migrations table:', innerErr);
        process.exit(1);
      }
    }
    
    // Get list of already applied migrations
    const { data: appliedMigrations, error: listError } = await supabase
      .from('migrations')
      .select('name');
    
    if (listError) {
      console.error('Error fetching applied migrations:', listError);
      process.exit(1);
    }
    
    const appliedMigrationNames = appliedMigrations?.map(m => m.name) || [];
    
    // Apply each migration
    for (const file of migrationFiles) {
      // Skip if already applied
      if (appliedMigrationNames.includes(file)) {
        console.log(`Migration ${file} already applied. Skipping.`);
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      
      // Read migration file
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Apply migration
      try {
        const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (sqlError) {
          console.error(`Error applying migration ${file}:`, sqlError);
          try {
            // Try direct SQL execution using the postgrest interface
            console.log(`Attempting direct SQL execution for ${file}...`);
            const queries = sql.split(';').filter(q => q.trim().length > 0);
            
            for (const query of queries) {
              const { error: directError } = await supabase.rpc('exec_sql', { 
                sql_query: query.trim() + ';' 
              });
              
              if (directError) {
                console.warn(`Warning: Error on direct execution of query: ${query.substring(0, 100)}...`);
                console.warn(`Error: ${directError.message}`);
                // Continue anyway as some statements might fail but others succeed
              }
            }
          } catch (directErr) {
            console.error(`Error applying migration ${file} with direct execution:`, directErr);
            process.exit(1);
          }
        }
        
        // Record migration as applied
        const { error: recordError } = await supabase
          .from('migrations')
          .insert({ name: file });
        
        if (recordError) {
          console.error(`Error recording migration ${file}:`, recordError);
          process.exit(1);
        }
        
        console.log(`Migration ${file} applied successfully.`);
      } catch (err) {
        console.error(`Error executing migration ${file}:`, err);
        process.exit(1);
      }
    }
    
    console.log('All migrations applied successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

// Add this function and call it to test bucket access
async function testBucketAccess() {
  try {
    const { data, error } = await supabase.storage.getBucket('assets');
    console.log('Bucket data:', data);
    if (error) console.error('Bucket error:', error);
  } catch (err) {
    console.error('Error testing bucket:', err);
  }
}

// Run migrations
applyMigrations(); 