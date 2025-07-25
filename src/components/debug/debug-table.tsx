import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

const DebugTableCheck: React.FC = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const checkTables = async () => {
    setLoading(true);
    setMessage('Checking tables...');
    
    try {
      // Test customers table
      console.log('Checking customers table...');
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact' });
        
      if (customersError) {
        console.error('Customers table error:', customersError);
        setMessage(`Customers table error: ${customersError.message}`);
        return;
      }
      
      console.log('Customers data:', customersData);
      setMessage(`Found ${customersData?.length || 0} customers`);
      
      // Test jobs table
      console.log('Checking jobs table...');
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' });
        
      if (jobsError) {
        console.error('Jobs table error:', jobsError);
        setMessage(prev => `${prev}\nJobs table error: ${jobsError.message}`);
        return;
      }
      
      console.log('Jobs data:', jobsData);
      setMessage(prev => `${prev}\nFound ${jobsData?.length || 0} jobs`);
    } catch (error: any) {
      console.error('Error checking tables:', error);
      setMessage(`Error checking tables: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const checkTableStructure = async () => {
    setLoading(true);
    setMessage('Checking table structure...');
    
    try {
      // Try a direct approach - check what fields we can query
      const { data: testData, error: testError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
        
      if (testError) {
        console.error('Error checking structure:', testError);
        setMessage(`Error checking structure: ${testError.message}`);
        return;
      }
      
      console.log('Sample customer data:', testData);
      if (testData && testData.length > 0) {
        const columns = Object.keys(testData[0]);
        setMessage(`Available columns in customers table: ${columns.join(', ')}`);
      } else {
        // If no data, just try to create a minimal record to see what fields are accepted
        const { error: insertError } = await supabase
          .from('customers')
          .insert([{ name: 'Test for schema' }]);
          
        if (insertError) {
          console.error('Insert test error:', insertError);
          
          if (insertError.message.includes('violates not-null constraint')) {
            // Try to parse the error message to get the required column
            const match = insertError.message.match(/column "([^"]+)"/);
            if (match && match[1]) {
              setMessage(`Required field missing: ${match[1]}`);
            } else {
              setMessage(`Insert error: ${insertError.message}`);
            }
          } else {
            setMessage(`Insert error: ${insertError.message}`);
          }
        } else {
          setMessage('Successfully created test record with only name field');
        }
      }
      
      // Also check jobs table structure
      const { data: jobsTestData, error: jobsTestError } = await supabase
        .from('jobs')
        .select('*')
        .limit(1);
        
      if (jobsTestError) {
        console.error('Error checking jobs structure:', jobsTestError);
        setMessage(prev => `${prev}\n\nError checking jobs structure: ${jobsTestError.message}`);
      } else if (jobsTestData && jobsTestData.length > 0) {
        const jobColumns = Object.keys(jobsTestData[0]);
        setMessage(prev => `${prev}\n\nAvailable columns in jobs table: ${jobColumns.join(', ')}`);
      } else {
        setMessage(prev => `${prev}\n\nNo job data found to inspect columns`);
      }
    } catch (error: any) {
      console.error('Error checking table structure:', error);
      setMessage(`Error checking table structure: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const createTestData = async () => {
    if (!user) {
      setMessage('You must be logged in to create test data');
      return;
    }
    
    setLoading(true);
    setMessage('Creating test data...');
    
    try {
      // Create test customer with minimal fields
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{ 
          name: 'Test Customer', 
          company_name: 'Test Company',
          // No status field to avoid the error
          user_id: user.id
        }])
        .select()
        .single();
        
      if (customerError) {
        console.error('Customer creation error:', customerError);
        setMessage(`Error creating test customer: ${customerError.message}`);
        return;
      }
      
      setMessage(`Created test customer with ID: ${customer.id}`);
      
      // Create test job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([{
          customer_id: customer.id,
          title: 'Test Job',
          description: 'This is a test job',
          status: 'pending',
          division: 'north_alabama',
          job_number: `TEST-${Date.now()}`,
          user_id: user.id
        }])
        .select()
        .single();
        
      if (jobError) {
        console.error('Job creation error:', jobError);
        setMessage(prev => `${prev}\nError creating test job: ${jobError.message}`);
        return;
      }
      
      setMessage(prev => `${prev}\nCreated test job with ID: ${job.id}`);
    } catch (error: any) {
      console.error('Error creating test data:', error);
      setMessage(`Error creating test data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const checkUserPermissions = async () => {
    setLoading(true);
    setMessage('Checking user permissions...');
    
    try {
      // Get current user info
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        setMessage(`Error getting user: ${userError.message}`);
        return;
      }
      
      const currentUser = userData.user;
      console.log('Current user:', currentUser);
      
      // Display user info
      setMessage(`
User ID: ${currentUser.id}
Email: ${currentUser.email}
Role: ${currentUser.user_metadata?.role || 'No role'}
      `);
      
      // Check if user has admin capabilities
      if (currentUser.user_metadata?.role === 'Admin') {
        setMessage(prev => `${prev}\n\nYou have the Admin role.`);
      } else {
        setMessage(prev => `${prev}\n\nYou do NOT have the Admin role.`);
      }
      
      // Try a direct SQL role check query
      try {
        // Try to temporarily make ourselves an admin to test permissions
        const { data: roleData, error: roleError } = await supabase.rpc('make_user_admin', {
          target_email: currentUser.email
        });
        
        if (roleError) {
          console.error('Error calling make_user_admin:', roleError);
          setMessage(prev => `${prev}\n\nCould not set admin role: ${roleError.message}`);
        } else {
          setMessage(prev => `${prev}\n\nAdmin role function executed. Sign out and back in to apply changes.`);
        }
      } catch (roleErr: any) {
        console.error('Error in admin role check:', roleErr);
        setMessage(prev => `${prev}\n\nError checking admin role: ${roleErr.message}`);
      }
    } catch (error: any) {
      console.error('Error checking permissions:', error);
      setMessage(`Error checking permissions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const trySimpleInsert = async () => {
    setLoading(true);
    setMessage('Trying simple insert with user_id...');
    
    try {
      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        setMessage('No user ID found. Please log in.');
        return;
      }
      
      // Try a simple insert with user_id matching the authenticated user
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: 'Test Customer RLS',
          user_id: userId
        }])
        .select()
        .single();
        
      if (customerError) {
        console.error('Simple insert error:', customerError);
        setMessage(`Error in simple insert: ${customerError.message}`);
        
        // Try to explain the RLS issue
        if (customerError.message.includes('violates row-level security policy')) {
          setMessage(prev => `${prev}\n\nThe RLS policy likely requires that:
1. The user_id field matches your auth.uid() (your user ID)
2. You are making the request as an authenticated user
3. You may need additional permissions or be in a specific role

Try logging out and back in, or ask an admin to update your permissions.`);
        }
      } else {
        setMessage(`Successfully created a customer with ID: ${customer.id}`);
        setMessage(prev => `${prev}\n\nYou can now create records with your user_id: ${userId}`);
      }
    } catch (error: any) {
      console.error('Error in simple insert:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const tryBasicInsert = async () => {
    setLoading(true);
    setMessage('Trying basic insert (no user_id)...');
    
    try {
      // Try the simplest possible insert
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: 'Basic Test Customer',
          company_name: 'Basic Test Company'
          // No user_id or other fields
        }])
        .select()
        .single();
        
      if (customerError) {
        console.error('Basic insert error:', customerError);
        setMessage(`Error in basic insert: ${customerError.message}`);
      } else {
        setMessage(`Successfully created a basic customer with ID: ${customer.id}`);
        
        // Try to create a job linked to this customer
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert([{
            customer_id: customer.id,
            title: 'Basic Test Job',
            status: 'pending'
            // Minimal required fields only
          }])
          .select()
          .single();
          
        if (jobError) {
          console.error('Basic job insert error:', jobError);
          setMessage(prev => `${prev}\n\nError creating basic job: ${jobError.message}`);
        } else {
          setMessage(prev => `${prev}\n\nSuccessfully created a basic job with ID: ${job.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error in basic insert:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Debug Tool</h1>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button 
            onClick={checkTables}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Check Tables
          </button>
          
          <button 
            onClick={checkTableStructure}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Check Table Structure
          </button>
          
          <button 
            onClick={createTestData}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Create Test Data
          </button>
          
          <button 
            onClick={checkUserPermissions}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
          >
            Check User Permissions
          </button>
          
          <button 
            onClick={trySimpleInsert}
            disabled={loading}
            className="px-4 py-2 bg-pink-500 text-white rounded disabled:opacity-50"
          >
            Try Simple Insert
          </button>
          
          <button 
            onClick={tryBasicInsert}
            disabled={loading}
            className="px-4 py-2 bg-teal-500 text-white rounded disabled:opacity-50"
          >
            Try Basic Insert
          </button>
        </div>
        
        <div className="p-4 bg-gray-100 rounded min-h-[100px] whitespace-pre-wrap">
          {loading ? 'Loading...' : message || 'No data yet. Click one of the buttons above.'}
        </div>
      </div>
    </div>
  );
};

export default DebugTableCheck; 