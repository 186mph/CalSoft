import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Read environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and anon key must be provided.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSqlFile() {
  try {
    const sql = fs.readFileSync('./supabase/migrations/remove_duplicate_chat_rooms.sql', 'utf8');
    
    console.log('Executing SQL to remove duplicate chat rooms...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('Duplicate chat rooms removed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runSqlFile(); 