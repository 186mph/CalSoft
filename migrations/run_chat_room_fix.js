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

async function runSqlFile(filePath, description) {
  try {
    console.log(`Executing ${description}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error executing ${description}:`, error);
      return false;
    }
    
    console.log(`${description} executed successfully!`);
    return true;
  } catch (error) {
    console.error(`Error with ${description}:`, error);
    return false;
  }
}

async function fixChatRooms() {
  try {
    // Step 1: Remove duplicate chat rooms
    const step1 = await runSqlFile(
      './supabase/migrations/remove_duplicate_chat_rooms.sql',
      'remove duplicate chat rooms'
    );
    
    // Step 2: Fix the get_user_chat_rooms function
    const step2 = await runSqlFile(
      './supabase/migrations/fix_get_user_chat_rooms.sql',
      'fix get_user_chat_rooms function'
    );
    
    if (step1 && step2) {
      console.log('Chat room fixes completed successfully!');
    } else {
      console.log('Chat room fixes completed with some errors.');
    }
  } catch (error) {
    console.error('Error fixing chat rooms:', error);
  }
}

fixChatRooms(); 