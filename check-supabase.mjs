// Simple Supabase diagnostic script (ESM format)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Get values from .env file (without requiring dotenv)
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

// Configure Supabase client
const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://vdxprdihmbqomwqfldpo.supabase.co';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHByZGlobWJxb213cWZsZHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2OTYwMjUsImV4cCI6MjA1OTI3MjAyNX0.FVCSHH1dXvamJuqBivAqC4LPbOm5SqQ1gmh2zKlgXPo';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key:', supabaseKey.substring(0, 15) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabase() {
  console.log('Running Supabase diagnostic checks...');
  
  // Test 1: Basic connection
  try {
    console.log('\n--- Test 1: Basic Connection ---');
    const { data, error } = await supabase.from('_dummy_nonexistent_table').select().limit(1);
    
    if (error && error.code === 'PGRST116') {
      // This is actually good - it means we can connect but the table doesn't exist
      console.log('✅ Basic connection successful (expected error about nonexistent table)');
    } else if (error) {
      console.log('❌ Connection error:', error);
    } else {
      console.log('✅ Connected successfully');
    }
  } catch (err) {
    console.log('❌ Connection failed:', err);
  }
  
  // Test 2: Check available schemas
  try {
    console.log('\n--- Test 2: Available Schemas ---');
    const { data, error } = await supabase.rpc('get_schema_names');
    
    if (error) {
      console.log('❌ Error fetching schemas:', error);
      // Try a different approach to get schema info
      console.log('Trying alternative approach...');
      const { data: tables, error: tablesError } = await supabase.from('pg_catalog.pg_tables').select('schemaname').eq('tableowner', 'postgres');
      
      if (tablesError) {
        console.log('❌ Alternative approach failed:', tablesError);
      } else {
        const schemas = [...new Set(tables.map(t => t.schemaname))];
        console.log('Schemas found (alternative method):', schemas);
      }
    } else {
      console.log('✅ Available schemas:', data);
    }
  } catch (err) {
    console.log('❌ Schema check failed:', err);
  }
  
  // Test 3: Check for 'common' schema
  try {
    console.log('\n--- Test 3: Check for "common" schema ---');
    const { data, error } = await supabase.schema('common').from('customers').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Table "common.customers" does not exist');
      } else {
        console.log('❌ Error accessing common.customers:', error);
      }
    } else {
      console.log('✅ common.customers exists, count query result:', data);
    }
  } catch (err) {
    console.log('❌ common schema check failed:', err);
  }
  
  // Test 4: Check for public schema customers
  try {
    console.log('\n--- Test 4: Check for "public" schema customers ---');
    const { data, error } = await supabase.from('customers').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Table "public.customers" does not exist');
      } else {
        console.log('❌ Error accessing public.customers:', error);
      }
    } else {
      console.log('✅ public.customers exists, count query result:', data);
    }
  } catch (err) {
    console.log('❌ public schema check failed:', err);
  }
}

checkSupabase().catch(err => {
  console.error('Unhandled error in diagnostic script:', err);
}); 