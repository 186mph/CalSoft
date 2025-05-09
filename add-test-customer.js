// Script to add a test customer
import { createClient } from '@supabase/supabase-js';

// Configure Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestCustomer() {
  console.log('Adding test customer...');
  
  // First check if we have access to the common schema
  try {
    const { data: schemas, error: schemaError } = await supabase.rpc('get_schemas');
    
    if (schemaError) {
      console.error('Error checking schemas:', schemaError);
      // Continue anyway - the RPC might not exist
    } else {
      console.log('Available schemas:', schemas);
    }
    
    // Create a test customer in the common schema
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
      
      // Try adding to public schema instead
      console.log('Attempting to add to public schema instead...');
      const { data: publicData, error: publicError } = await supabase
        .from('customers')
        .insert([{
          name: 'Test Customer (Public)',
          company_name: 'Test Company Public ' + new Date().toISOString(),
          email: 'test.public@example.com',
          phone: '555-123-4567',
          address: '123 Test St, Test City, TS 12345',
          status: 'active'
        }])
        .select()
        .single();
        
      if (publicError) {
        console.error('Error adding customer to public schema:', publicError);
        return;
      }
      
      console.log('Customer added to public schema:', publicData);
      return;
    }
    
    console.log('Customer added to common schema:', data);
    
    // Check if we can retrieve the customer
    const { data: customers, error: getError } = await supabase
      .schema('common')
      .from('customers')
      .select('*');
      
    if (getError) {
      console.error('Error getting customers:', getError);
    } else {
      console.log(`Successfully retrieved ${customers.length} customers from common schema`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the function
addTestCustomer(); 