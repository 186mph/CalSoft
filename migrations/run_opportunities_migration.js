import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('Running opportunities table migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250321_add_opportunities_table.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .replace(/--.*$/gm, '') // Remove comments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i+1}/${statements.length}...`);
      
      try {
        // Use direct SQL query
        const { error } = await supabase.rpc('exec_sql', { sql_string: statement });
        if (error) {
          console.error(`Error executing statement ${i+1}:`, error.message);
        } else {
          console.log(`Successfully executed statement ${i+1}`);
        }
      } catch (err) {
        console.error(`Exception on statement ${i+1}:`, err.message);
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
runMigration(); 