const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vdxprdihmbqomwqfldpo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHByZGlobWJxb213cWZsZHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2OTYwMjUsImV4cCI6MjA1OTI3MjAyNX0.FVCSHH1dXvamJuqBivroot@Surface7:/mnt/c/Users/samge/OneDrive/Desktop/Active-Website-Software#';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  console.log('=== Testing Database Queries ===');
  
  // Test 1: lab_ops.lab_customers
  console.log('\n1. Testing lab_ops.lab_customers...');
  try {
    const { data, error } = await supabase
      .schema('lab_ops')
      .from('lab_customers')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success! Found lab customers:', data?.length || 0);
      data?.forEach(customer => {
        console.log(`  - ${customer.company_name || customer.name} (ID: ${customer.id})`);
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
  
  // Test 2: common.customers
  console.log('\n2. Testing common.customers...');
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('customers')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success! Found common customers:', data?.length || 0);
      data?.forEach(customer => {
        console.log(`  - ${customer.company_name || customer.name} (ID: ${customer.id})`);
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
  
  // Test 3: Check current user
  console.log('\n3. Testing current user...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth Error:', error);
    } else {
      console.log('Current user:', user ? user.email : 'Not authenticated');
    }
  } catch (err) {
    console.error('Auth Exception:', err);
  }
}

testQueries().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 