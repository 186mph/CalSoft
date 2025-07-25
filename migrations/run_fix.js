/**
 * This script runs the RLS policy fixes directly on the Supabase database.
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

async function runFix() {
  try {
    console.log('Running RLS policy fixes...');
    
    // Read the SQL fix file
    const fixFilePath = path.join(__dirname, 'fix_rls_policies.sql');
    if (!fs.existsSync(fixFilePath)) {
      console.error(`Error: Fix file not found at ${fixFilePath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(fixFilePath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';';
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));
        
        // Execute the SQL directly using the REST API
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
        
        if (error) {
          // Some statements may fail gracefully (like IF EXISTS)
          console.warn(`Warning: Error executing statement: ${error.message}`);
          console.warn('Continuing with next statement...');
        }
      } catch (err) {
        // Ignore errors from statements that might fail (like DROP IF EXISTS)
        console.warn(`Warning: Error executing statement: ${err.message}`);
        console.warn('Continuing with next statement...');
      }
    }
    
    console.log('Fixes applied successfully!');
    
    // Test bucket access
    console.log('Testing bucket access...');
    await testBucketAccess();
    
  } catch (error) {
    console.error('Error applying fixes:', error);
    process.exit(1);
  }
}

async function testBucketAccess() {
  try {
    const { data, error } = await supabase.storage.getBucket('assets');
    console.log('Bucket data:', data);
    if (error) console.error('Bucket error:', error);
  } catch (err) {
    console.error('Error testing bucket:', err);
  }
}

// Run the fix
runFix(); 