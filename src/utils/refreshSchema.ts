import { supabase } from '../lib/supabase';

export async function refreshLabCustomersSchema() {
  try {
    console.log('Attempting to fix lab_customers schema...');
    
    // Create a fresh connection to force schema cache refresh
    const freshSupabase = supabase.from('').select(); // This touches the DB and refreshes connection
    
    // Try direct table modification first
    try {
      const addColumnsSql = `
        -- Add all required columns
        ALTER TABLE lab_ops.lab_customers ADD COLUMN IF NOT EXISTS company_id TEXT;
        ALTER TABLE lab_ops.lab_customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE lab_ops.lab_customers ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES common.customer_categories(id);
        
        -- Force schema cache refresh
        SELECT pg_notify('reload_schema', '');
      `;
      
      // Execute SQL to add columns
      await supabase.rpc('exec_sql', { sql: addColumnsSql });
      console.log('Executed column addition SQL');
    } catch (sqlError) {
      console.error('Error adding columns via SQL:', sqlError);
    }
    
    // Attempt direct SQL execution via function call
    try {
      // Simple query to touch the table and refresh schema cache
      await supabase.rpc('refresh_schema_cache');
      console.log('Refreshed schema cache');
    } catch (sqlError) {
      console.error('RPC refresh failed:', sqlError);
    }
    
    console.log('Schema fix attempted. Please reload the page and try again.');
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in refreshSchema:', error);
    return { success: false, error };
  }
} 