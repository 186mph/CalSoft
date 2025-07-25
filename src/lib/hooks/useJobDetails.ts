import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';

interface CustomerData {
  id: string;
  name: string;
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface JobDetails {
  id: string;
  title: string;
  job_number: string;
  description?: string;
  status: string;
  start_date?: string;
  due_date?: string;
  budget?: number;
  priority?: string;
  division?: string;
  customer?: {
    id: string;
    name: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  formattedCustomerName?: string;
}

export function useJobDetails(jobId: string | undefined) {
  console.log("useJobDetails: Hook initializing", { jobId });
  
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  console.log("useJobDetails: Current state", {
    hasJobDetails: !!jobDetails,
    loading,
    hasError: !!error,
    jobId,
    hasUser: !!user
  });

  useEffect(() => {
    console.log("useJobDetails: useEffect triggered", { jobId, hasUser: !!user });
    
    if (!jobId || !user) {
      console.log("useJobDetails: Missing jobId or user, skipping fetch");
      return;
    }

    async function fetchJobDetails() {
      try {
        console.log(`useJobDetails: Fetching job details for jobId=${jobId}`);
        setLoading(true);
        setError(null);

        // First try to fetch from lab_ops.lab_jobs
        let { data: jobData, error: labJobError } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select(`
            id,
            title,
            job_number,
            description,
            status,
            start_date,
            due_date,
            budget,
            priority,
            customer_id,
            division
          `)
          .eq('id', jobId)
          .single();

        // If not found in lab_jobs, try neta_ops.jobs
        if (labJobError) {
          console.log('Job not found in lab_ops.lab_jobs, trying neta_ops.jobs');
          const { data: netaJobData, error: netaJobError } = await supabase
            .schema('neta_ops')
            .from('jobs')
            .select(`
              id,
              title,
              job_number,
              description,
              status,
              start_date,
              due_date,
              budget,
              priority,
              customer_id,
              division
            `)
            .eq('id', jobId)
            .single();

          if (netaJobError) {
            console.error(`useJobDetails: Error fetching job data from both schemas:`, { labJobError, netaJobError });
            throw netaJobError;
          }
          jobData = netaJobData;
        }

        if (!jobData) {
          throw new Error('No job data found');
        }

        console.log(`useJobDetails: Job data fetched:`, jobData);

        if (!jobData.customer_id) {
          console.warn(`useJobDetails: No customer_id found for job ${jobId}`);
        }

        // Now fetch the customer data directly
        let customerData: CustomerData | null = null;
        if (jobData.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select(`
              id,
              name,
              company_name,
              address,
              phone,
              email
            `)
            .eq('id', jobData.customer_id)
            .single();

          if (customerError) {
            console.error(`useJobDetails: Error fetching customer data: ${customerError.message}`);
          } else {
            customerData = customer;
            console.log(`useJobDetails: Customer data fetched:`, customerData);
          }
        }
        
        // Create the formatted customer name with robust fallbacks
        let formattedCustomerName = '';
        if (customerData) {
          if (customerData.company_name) {
            formattedCustomerName = customerData.company_name;
          } else {
            formattedCustomerName = 'No Company Name';
          }
        }
        
        if (!formattedCustomerName) {
          console.warn(`useJobDetails: Unable to create formatted customer name for job ${jobId}`);
        }
        
        console.log(`useJobDetails: Formatted customer name: "${formattedCustomerName}"`);
        
        const jobDetailsData: JobDetails = {
          id: jobData.id,
          title: jobData.title || '',
          job_number: jobData.job_number || `JOB-${jobData.id.substring(0, 6)}`, // Fallback if job_number not available
          description: jobData.description,
          status: jobData.status || 'pending',
          start_date: jobData.start_date,
          due_date: jobData.due_date,
          budget: jobData.budget,
          priority: jobData.priority || 'medium',
          division: jobData.division,
          customer: customerData ? {
            id: customerData.id,
            name: customerData.name,
            company_name: customerData.company_name,
            address: customerData.address,
            phone: customerData.phone,
            email: customerData.email
          } : undefined,
          formattedCustomerName
        };
        
        console.log(`useJobDetails: Setting job details:`, jobDetailsData);
        setJobDetails(jobDetailsData);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch job details'));
      } finally {
        setLoading(false);
      }
    }

    fetchJobDetails();
  }, [jobId, user]);

  /**
   * Get formatted customer and job information suitable for report forms
   * This provides consistent formatting with fallbacks for missing data
   */
  const getFormattedInfoForReports = () => {
    if (!jobDetails) return null;
    
    // Add debug log for customer info
    console.log("getFormattedInfoForReports - jobDetails:", {
      id: jobDetails.id,
      hasCustomer: !!jobDetails.customer,
      formattedName: jobDetails.formattedCustomerName,
      customerName: jobDetails.customer?.name,
      companyName: jobDetails.customer?.company_name,
      address: jobDetails.customer?.address,
      jobNumber: jobDetails.job_number
    });
    
    // Build customer name with additional fallbacks
    let customerName = jobDetails.formattedCustomerName;
    if (!customerName && jobDetails.customer) {
      if (jobDetails.customer.company_name) {
        customerName = jobDetails.customer.company_name;
      } else {
        customerName = 'No Company Name';
      }
    }
    
    // Default customer name instead of "Customer information not available"
    const defaultCustomerName = "Customer (Job #" + (jobDetails.job_number || jobDetails.id.substring(0, 8)) + ")";
    
    return {
      customer: customerName || defaultCustomerName,
      address: jobDetails.customer?.address || 'No address provided',
      jobNumber: jobDetails.job_number || `JOB-${jobDetails.id.substring(0, 6)}`,
      title: jobDetails.title || 'Untitled Job'
    };
  };

  return { jobDetails, loading, error, getFormattedInfoForReports };
} 