// Script to add a test customer (ESM format)
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

async function addTestCustomer() {
  console.log('Adding test customer...');
  
  try {
    // We know from diagnostics that common schema is valid and has a customers table
    const { data, error } = await supabase
      .schema('common')
      .from('customers')
      .insert([{
        name: 'Test Customer',
        company_name: 'Test Company ' + new Date().toISOString(),
        email: 'test@example.com',
        phone: '555-123-4567',
        address: '123 Test St, Test City, TS 12345',
        status: 'active'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding customer to common schema:', error);
      return;
    }
    
    console.log('Customer added successfully:', data);
    
    // Verify we can retrieve the customer
    const { data: customers, error: getError } = await supabase
      .schema('common')
      .from('customers')
      .select('*');
      
    if (getError) {
      console.error('Error getting customers:', getError);
    } else {
      console.log(`Successfully retrieved ${customers.length} customers from common schema:`);
      console.log(customers);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addTestCustomer(); 