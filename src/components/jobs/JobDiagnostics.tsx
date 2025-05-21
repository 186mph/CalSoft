import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { ArrowLeft, Database, RefreshCw } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  company_name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface Job {
  id: string;
  customer_id: string;
  title: string;
  job_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function JobDiagnostics() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [diagnosticOutput, setDiagnosticOutput] = useState<string[]>([]);

  useEffect(() => {
    if (user && jobId) {
      runDiagnostics();
    }
  }, [user, jobId]);

  async function runDiagnostics() {
    setLoading(true);
    setError(null);
    setDiagnosticOutput([]);
    
    try {
      // Log start of diagnostics
      log(`Starting diagnostics for job ID: ${jobId}`);
      
      // 1. Check if the job exists
      const { data: jobData, error: jobError } = await supabase
        .from('neta_ops.jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (jobError) {
        log(`❌ Error fetching job: ${jobError.message}`);
        setError(`Could not find job with ID: ${jobId}`);
        return;
      }
      
      setJob(jobData);
      log(`✓ Found job: ${jobData.title} (${jobData.job_number || 'No job number'})`);
      
      // 2. Check if the customer_id is valid
      if (!jobData.customer_id) {
        log(`❌ Job has no customer_id associated with it`);
        setError('This job has no customer associated with it');
        return;
      }
      
      log(`Checking customer ID: ${jobData.customer_id}`);
      
      // 3. Fetch the customer
      const { data: customerData, error: customerError } = await supabase
        .schema('common')
        .from('customers')
        .select('*')
        .eq('id', jobData.customer_id)
        .single();
      
      if (customerError) {
        log(`❌ Error fetching customer: ${customerError.message}`);
        setError(`Could not find customer with ID: ${jobData.customer_id}`);
        return;
      }
      
      setCustomer(customerData);
      log(`✓ Found customer: ${customerData.name} ${customerData.company_name ? `(${customerData.company_name})` : ''}`);
      
      // 4. Check customer data completeness
      const missingFields: string[] = [];
      if (!customerData.name) missingFields.push('name');
      if (!customerData.company_name) log(`ℹ️ No company name specified (optional)`);
      if (!customerData.address) missingFields.push('address');
      if (!customerData.phone) missingFields.push('phone');
      if (!customerData.email) missingFields.push('email');
      
      if (missingFields.length > 0) {
        log(`⚠️ Customer is missing some recommended fields: ${missingFields.join(', ')}`);
      } else {
        log(`✓ Customer data appears to be complete`);
      }
      
      // Additional check: Verify if customer data is being correctly loaded through useJobDetails hook
      try {
        log(`Testing customer data retrieval through useJobDetails hook...`);
        const { data: jobData, error: jobFetchError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select(`
            id,
            title,
            job_number,
            description,
            status,
            customers:customer_id(
              id,
              name,
              company_name,
              address,
              phone,
              email
            )
          `)
          .eq('id', jobId)
          .single();
          
        if (jobFetchError) {
          log(`❌ Error testing useJobDetails data flow: ${jobFetchError.message}`);
        } else if (jobData) {
          const hookCustomerData = jobData.customers?.[0];
          if (hookCustomerData) {
            log(`✓ useJobDetails hook should receive customer data: ${hookCustomerData.name}${hookCustomerData.company_name ? ` (${hookCustomerData.company_name})` : ''}`);
          } else {
            log(`❌ useJobDetails hook is not receiving customer data. This may cause display issues.`);
          }
        }
      } catch (err) {
        log(`❌ Error testing useJobDetails data flow: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      // 5. Check job number
      if (!jobData.job_number) {
        log(`⚠️ Job is missing a job number. This should be auto-generated.`);
      } else {
        log(`✓ Job has job number: ${jobData.job_number}`);
      }
      
      log('Diagnostics completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      log(`❌ Unexpected error: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }
  
  async function fixJobNumber() {
    if (!job) return;
    
    setRefreshing(true);
    log('Attempting to fix missing job number...');
    
    try {
      // Generate a simple job number format using timestamp if none exists
      if (!job.job_number) {
        const timestamp = Date.now().toString().slice(-6);
        const newJobNumber = `JOB-${timestamp}`;
        
        const { error } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .update({ job_number: newJobNumber })
          .eq('id', job.id);
        
        if (error) {
          log(`❌ Failed to update job number: ${error.message}`);
          throw error;
        }
        
        log(`✓ Successfully set job number to: ${newJobNumber}`);
        setJob({...job, job_number: newJobNumber});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      log(`❌ Error: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  }
  
  async function fixJobCustomerRelationship() {
    if (!job || !customer) return;
    
    setRefreshing(true);
    log('Attempting to repair job-customer relationship...');
    
    try {
      // Update the job with the customer_id to ensure relationship is correct
      const { error } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .update({ customer_id: customer.id })
        .eq('id', job.id);
      
      if (error) {
        log(`❌ Failed to update job-customer relationship: ${error.message}`);
        throw error;
      }
      
      log(`✓ Successfully updated job-customer relationship`);
      
      // Refresh the job data
      runDiagnostics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      log(`❌ Error: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  }
  
  function log(message: string) {
    setDiagnosticOutput(prev => [...prev, message]);
  }
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/jobs/${jobId}`)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Job
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Job Diagnostics</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Running diagnostics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(`/jobs/${jobId}`)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Job
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Job Diagnostics</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Job Information</h2>
            {job && (
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{job.title}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Job Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.job_number || (
                      <span className="text-amber-500 font-medium">Missing</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">{job.status}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{job.customer_id}</dd>
                </div>
              </dl>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-200 mb-4">
            <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
            {customer ? (
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company_name || 'Not specified'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.email || 'Not specified'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.phone || 'Not specified'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.address || 'Not specified'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-red-500 mt-2">Customer information not available</p>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={runDiagnostics}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Diagnostics
            </button>
            
            {job && !job.job_number && (
              <button
                onClick={fixJobNumber}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400"
              >
                Fix Missing Job Number
              </button>
            )}
            
            {job && customer && (
              <button
                onClick={fixJobCustomerRelationship}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
              >
                Repair Customer Relationship
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-black rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <div className="flex items-center">
            <Database className="h-4 w-4 text-green-400 mr-2" />
            <h3 className="text-sm font-medium text-white">Diagnostic Log</h3>
          </div>
          {error && <span className="text-xs px-2 py-1 rounded-full bg-red-900 text-red-300">Error Detected</span>}
        </div>
        <div className="p-4 max-h-96 overflow-y-auto bg-gray-900">
          <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
            {diagnosticOutput.map((line, index) => (
              <div key={index} className="py-1">
                {line}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
} 