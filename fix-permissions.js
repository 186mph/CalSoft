import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
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

async function fixPermissions() {
  try {
    console.log('Reading SQL fix file...');
    const sql = fs.readFileSync('./fix-user-preferences.sql', 'utf8');
    
    console.log('Applying SQL fix...');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: statement.trim() + ';' 
          });
          
          if (error) {
            console.warn(`Warning: Error executing statement: ${error.message}`);
            console.warn(`Statement: ${statement.substring(0, 100)}...`);
          } else {
            console.log('✓ Statement executed successfully');
          }
        } catch (err) {
          console.warn(`Warning: Error executing statement: ${err.message}`);
        }
      }
    }
    
    console.log('SQL fix completed!');
  } catch (error) {
    console.error('Error applying SQL fix:', error);
  }
}

fixPermissions(); 