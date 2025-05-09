import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Award, X, ChevronDown, Pencil, Save, Trash2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Opportunity, OpportunityFormData } from '../../lib/types/index';
import EstimateSheet from '../estimates/EstimateSheet';
import { Button } from '@/components/ui/Button';
import { useJobDetails } from '../../lib/hooks/useJobDetails';
import { DivisionAnalyticsDialog } from '../analytics/DivisionAnalyticsDialog';
import { SupabaseClient } from '@supabase/supabase-js';

interface Customer {
  id: string;
  name: string;
  company_name: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  company_name?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  customer_id: string;
}

interface OpportunityWithCustomer extends Opportunity {
  customers: CustomerInfo | null;
}

const initialFormData: OpportunityFormData = {
  customer_id: '',
  contact_id: null,
  title: '',
  description: '',
  status: 'awareness',
  expected_value: '',
  probability: '0',
  expected_close_date: '',
  notes: '',
  sales_person: '',
  amp_division: ''
};

// Add this utility function to handle date formatting consistently
function formatDateSafe(dateString: string | null | undefined): string {
  if (!dateString) return 'Not specified';
  
  // For YYYY-MM-DD format strings, parse them in a timezone-safe way
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Split the date parts and construct a new date
    const [year, month, day] = dateString.split('-').map(Number);
    // Note: month is 0-indexed in JavaScript Date
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  }
  
  // For ISO strings or other formats, use a different approach
  // Add 12 hours to avoid timezone day boundary issues
  const date = new Date(dateString);
  date.setHours(12, 0, 0, 0);
  return format(date, 'MMM d, yyyy');
}

// Add this function after the imports but before the component definition
async function createJobManually(
  opportunity: any, 
  supabase: SupabaseClient<any, "common" | "public", any>, 
  userId: string
): Promise<string> {
  if (!opportunity) {
    throw new Error('Cannot create job: opportunity data is missing');
  }

  if (!opportunity.customer_id) {
    throw new Error('Cannot create job: customer_id is required');
  }
  
  if (!userId) {
    throw new Error('Cannot create job: user ID is missing');
  }
  
  // Determine if this is a NETA Technician job for Calibration, Armadillo, or Scavenger
  const isSpecialDivision = ['calibration', 'armadillo', 'scavenger'].includes(
    opportunity.amp_division?.toLowerCase()
  );
  
  // Set portal type based on division
  let portalType = 'neta'; // Default portal type
  if (opportunity.amp_division?.toLowerCase() === 'calibration' || 
      opportunity.amp_division?.toLowerCase() === 'armadillo') {
    portalType = 'lab';
  } else if (opportunity.amp_division?.toLowerCase() === 'scavenger') {
    portalType = 'scavenger';
  }

  // Get a unique job number from neta_ops schema
  const { data: maxJobNumber } = await supabase
    .schema('neta_ops')
    .from('jobs')
    .select('job_number')
    .order('job_number', { ascending: false })
    .limit(1);
  
  let nextJobNumber = 1000;
  if (maxJobNumber && maxJobNumber.length > 0) {
    const match = maxJobNumber[0].job_number.match(/\d+/);
    if (match) {
      nextJobNumber = parseInt(match[0]) + 1;
    }
  }
  
  // Create the job in neta_ops schema
  const { data: newJob, error: jobError } = await supabase
    .schema('neta_ops')
    .from('jobs')
    .insert({
      user_id: userId,
      customer_id: opportunity.customer_id,
      title: opportunity.title,
      description: opportunity.description,
      status: 'pending',
      start_date: new Date().toISOString().substring(0, 10),
      budget: opportunity.expected_value,
      notes: (opportunity.notes || '') + '\n\nConverted from opportunity: ' + opportunity.quote_number,
      job_number: 'JOB-' + nextJobNumber.toString().padStart(4, '0'),
      priority: 'medium',
      division: opportunity.amp_division === 'Decatur' ? 'north_alabama' : opportunity.amp_division,
      job_type: isSpecialDivision ? 'neta_technician' : 'standard',
      portal_type: portalType
    })
    .select()
    .single();
    
  if (jobError) {
    console.error('Manual job creation error:', jobError);
    throw new Error(`Manual job creation failed: ${jobError.message}`);
  }
  
  try {
    // First check if job_id column exists in business.opportunities
    const { error: checkError } = await supabase
      .schema('business')
      .from('opportunities')
      .select('job_id')
      .limit(1);
    
    if (checkError) {
      // Column doesn't exist - log warning but don't fail
      console.warn('Warning: job_id column not found in opportunities table:', checkError.message);
      console.warn('Job was created successfully but opportunity could not be linked to it.');
    } else {
      // Column exists, so update the opportunity in business schema
      const { error: updateError } = await supabase
        .schema('business')
        .from('opportunities')
        .update({ job_id: newJob.id })
        .eq('id', opportunity.id);
        
      if (updateError) {
        console.error('Opportunity update error:', updateError);
        // Don't throw, just log the error
        console.warn('Job was created successfully but opportunity could not be linked to it.');
      }
    }
  } catch (error) {
    console.error('Error updating opportunity:', error);
    // Don't throw, just log the error
    console.warn('Job was created successfully but opportunity could not be linked to it.');
  }
  
  return newJob.id;
}

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<OpportunityWithCustomer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<OpportunityFormData>(initialFormData);
  const [confirmAwardOpen, setConfirmAwardOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isStatusEditing, setIsStatusEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<OpportunityFormData>({
    customer_id: '',
    title: '',
    description: '',
    expected_value: '',
    status: 'awareness',
    expected_close_date: '',
    sales_person: '',
    notes: '',
    probability: '0',
    amp_division: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const { jobDetails } = useJobDetails(jobId || undefined);
  const [showDivisionAnalytics, setShowDivisionAnalytics] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  useEffect(() => {
    if (user && id) {
      fetchOpportunity();
      fetchCustomers();
    }
  }, [user, id]);

  useEffect(() => {
    if (opportunity) {
      setEditFormData({
        customer_id: opportunity.customer_id || '',
        title: opportunity.title || '',
        description: opportunity.description || '',
        expected_value: opportunity.expected_value?.toString() || '',
        status: opportunity.status || '',
        expected_close_date: opportunity.expected_close_date 
          ? opportunity.expected_close_date.substring(0, 10)
          : '',
        sales_person: opportunity.sales_person || '',
        notes: opportunity.notes || '',
        probability: opportunity.probability?.toString() || '0',
        amp_division: opportunity.amp_division || ''
      });
    }
  }, [opportunity]);

  async function fetchOpportunity() {
    setLoading(true);
    try {
      // Explicitly select columns to avoid implicit relationship lookups
      const opportunityColumns = 
        'id, created_at, updated_at, customer_id, contact_id, title, description, status, expected_value, probability, expected_close_date, quote_number, notes, job_id, awarded_date, sales_person, amp_division';
        
      const { data: opportunityData, error: opportunityError } = await supabase
        .schema('business')
        .from('opportunities')
        .select(opportunityColumns)
        .eq('id', id)
        .single<Opportunity>();

      if (opportunityError) throw opportunityError;
      if (!opportunityData) throw new Error('Opportunity not found');
      
      // Then fetch the customer data from common schema if we have a customer_id
      let customerInfo: CustomerInfo | null = null;
      if (opportunityData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .eq('id', opportunityData.customer_id)
          .single<CustomerInfo>();
          
        if (!customerError && customerData) {
          customerInfo = customerData;
        }
      }
      
      // Combine the data
      setOpportunity({
        ...opportunityData,
        customers: customerInfo
      });
      
      // Initialize form data for editing
      setFormData({
        customer_id: opportunityData.customer_id?.toString() || '',
        contact_id: opportunityData.contact_id?.toString() || '', 
        title: opportunityData.title || '',
        description: opportunityData.description || '',
        status: opportunityData.status,
        expected_value: opportunityData.expected_value?.toString() || '',
        probability: opportunityData.probability?.toString() || '0',
        expected_close_date: opportunityData.expected_close_date || '',
        notes: opportunityData.notes || '',
        sales_person: opportunityData.sales_person || '',
        amp_division: opportunityData.amp_division || ''
      });
         
      if (opportunityData.job_id) {
        setJobId(opportunityData.job_id.toString());
      }

    } catch (error) {
      console.error('Error fetching opportunity:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .schema('common')
        .from('customers')
        .select('id, name, company_name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }
  
  async function fetchContacts(customerId: string) {
    if (!customerId) {
      setContacts([]); // Ensure setContacts exists in component state
      return;
    }
    try {
      const { data, error } = await supabase
        .schema('common') 
        .from('contacts')
        .select('id, first_name, last_name, email, phone, customer_id') // Select all needed fields
        .eq('customer_id', customerId);

      if (error) throw error;
      
      // Transform the data to match the Contact interface
      const transformedContacts = (data || []).map(contact => ({
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email || '',
        phone: contact.phone,
        customer_id: contact.customer_id
      }));
      
      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]); // Set to empty array on error
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opportunity) return;
    setIsSubmitting(true);

    try {
      const expectedCloseDate = editFormData.expected_close_date
        ? new Date(editFormData.expected_close_date).toISOString()
        : null;

      console.log("Submitting with expected_close_date:", expectedCloseDate);

      const { error } = await supabase
        .schema('business')
        .from('opportunities')
        .update({
          customer_id: editFormData.customer_id,
          title: editFormData.title,
          description: editFormData.description,
          expected_value: editFormData.expected_value ? parseFloat(editFormData.expected_value) : null,
          status: editFormData.status,
          expected_close_date: expectedCloseDate,
          sales_person: editFormData.sales_person,
          notes: editFormData.notes,
          probability: editFormData.probability ? parseFloat(editFormData.probability) : 0,
          amp_division: editFormData.amp_division
        })
        .eq('id', opportunity.id)
        .select();

      if (error) throw error;

      setIsEditing(false);
      fetchOpportunity();
    } catch (error) {
      console.error('Error updating opportunity:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'awareness':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'interest':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'quote':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100';
      case 'decision':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'decision - forecasted win':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'decision - forecast lose':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'awarded':
        return 'bg-green-500 text-white dark:bg-green-600';
      case 'lost':
        return 'bg-red-500 text-white dark:bg-red-600';
      case 'no quote':
        return 'bg-gray-500 text-white dark:bg-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  }

  function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }

  const handleAwardOpportunity = async () => {
    if (!id || !user) return;

    try {
      // Check if opportunity has required fields
      if (!opportunity?.customer_id) {
        throw new Error('Opportunity is missing customer_id which is required for job creation');
      }

      // First update the status to 'awarded'
      const { error: statusError } = await supabase
        .schema('business')
        .from('opportunities')
        .update({ 
          status: 'awarded',
          awarded_date: new Date().toISOString()
        })
        .eq('id', id);

      if (statusError) {
        console.error('Status update error:', statusError);
        throw statusError;
      }
      
      // Add a longer delay to ensure the trigger has completed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch the updated opportunity explicitly selecting columns
      const opportunityColumns = 
        'id, created_at, updated_at, customer_id, contact_id, title, description, status, expected_value, probability, expected_close_date, quote_number, notes, job_id, awarded_date, sales_person, amp_division';

      const { data: opportunityData, error: opportunityError } = await supabase
        .schema('business')
        .from('opportunities')
        .select(opportunityColumns)
        .eq('id', id)
        .single();
      
      if (opportunityError) {
        console.error('Fetch error:', opportunityError);
        throw opportunityError;
      }
      
      if (!opportunityData) {
        throw new Error('No data returned after update');
      }

      // Fetch customer data separately
      let customerInfo: CustomerInfo | null = null;
      if (opportunityData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .eq('id', opportunityData.customer_id)
          .single<CustomerInfo>();

        if (!customerError && customerData) {
          customerInfo = customerData;
        }
      }

      const opportunityWithCustomer = {
        ...opportunityData,
        customers: customerInfo
      };
      
      // Update local state
      setOpportunity(opportunityWithCustomer);
      
      // If job_id was created by trigger, we're good
      if (opportunityData.job_id) {
        setJobId(opportunityData.job_id);
        setConfirmAwardOpen(false);
        return;
      }
      
      console.log('Database trigger did not create job_id, attempting manual job creation...');
      
      // Check for user again before calling
      if (!user) {
          throw new Error("User not authenticated for manual job creation.");
      }
      
      // Use the common function to create the job, passing user.id
      const newJobId = await createJobManually(opportunityData, supabase, user.id);
      setJobId(newJobId);
      
      // Update the opportunity in state
      setOpportunity(prev => 
        prev ? { ...prev, job_id: newJobId } as OpportunityWithCustomer : null
      );
      
      setConfirmAwardOpen(false);
    } catch (error) {
      console.error('Error awarding opportunity:', error);
      alert('Failed to award opportunity: ' + (error instanceof Error ? error.message : 'Please try again. If the problem persists, contact support.'));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !user) return;

    try {
      const { error } = await supabase
        .schema('business')
        .from('opportunities')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Special case for "awarded" status
      if (newStatus === 'awarded') {
        // Add a small delay to ensure the trigger has completed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch the updated opportunity explicitly selecting columns
        const opportunityColumns = 
          'id, created_at, updated_at, customer_id, contact_id, title, description, status, expected_value, probability, expected_close_date, quote_number, notes, job_id, awarded_date, sales_person, amp_division';

        const { data: opportunityData, error: opportunityError } = await supabase
          .schema('business')
          .from('opportunities')
          .select(opportunityColumns)
          .eq('id', id)
          .single();
        
        if (opportunityError) throw opportunityError;

        // Check if opportunityData exists before proceeding
        if (!opportunityData) {
          throw new Error('Opportunity data not found after status update.');
        }

        // Fetch customer data separately
        let customerInfo: CustomerInfo | null = null;
        if (opportunityData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('id, name, company_name')
            .eq('id', opportunityData.customer_id)
            .single<CustomerInfo>();

          if (!customerError && customerData) {
            customerInfo = customerData;
          }
        }

        const opportunityWithCustomer = {
          ...opportunityData,
          customers: customerInfo
        };
        
        setOpportunity(opportunityWithCustomer);
        
        // If job_id was created by trigger, we're good
        if (opportunityData && opportunityData.job_id) {
          setJobId(opportunityData.job_id);
          setIsStatusEditing(false);
          return;
        }
        
        console.log('Database trigger did not create job_id, attempting manual job creation...');
        
        // Check for user again before calling
        if (!user) {
            throw new Error("User not authenticated for manual job creation.");
        }
        
        // Use the common function to create the job, passing user.id
        const newJobId = await createJobManually(opportunityData, supabase, user.id);
        setJobId(newJobId);
        
        // Update the opportunity in state
        setOpportunity(prev => 
          prev ? { ...prev, job_id: newJobId } as OpportunityWithCustomer : null
        );
      } else {
        // Update the local state for non-awarded statuses
        setOpportunity(prev => 
          prev ? { ...prev, status: newStatus as any } : null
        );
      }
      
      setIsStatusEditing(false);
    } catch (error) {
      console.error('Error updating opportunity status:', error);
      alert('Failed to update opportunity status: ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!opportunity) {
    return <div>Opportunity not found</div>;
  }

  const customer = customers.find(c => c.id === opportunity.customer_id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="bg-white shadow-sm p-4 mb-6 dark:bg-dark-150 dark:border-b dark:border-dark-200">
        <Link to="/sales-dashboard/opportunities" className="text-gray-600 hover:text-gray-900 dark:text-dark-400 dark:hover:text-dark-900 flex items-center">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Opportunities
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-dark-200 shadow-md rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-dark-300">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-800">
                {opportunity.quote_number}: {opportunity.title}
              </h2>
            </div>
            <div className="flex space-x-2">
              {opportunity.status !== 'awarded' && opportunity.status !== 'lost' && (
                <button
                  onClick={() => setConfirmAwardOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                >
                  <Award className="h-4 w-4 mr-1" />
                  Award
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    if (opportunity) {
                      setEditFormData({
                        customer_id: opportunity.customer_id || '',
                        title: opportunity.title || '',
                        description: opportunity.description || '',
                        expected_value: opportunity.expected_value?.toString() || '',
                        status: opportunity.status || '',
                        expected_close_date: opportunity.expected_close_date 
                          ? opportunity.expected_close_date.substring(0, 10)
                          : '',
                        sales_person: opportunity.sales_person || '',
                        notes: opportunity.notes || '',
                        probability: opportunity.probability?.toString() || '0',
                        amp_division: opportunity.amp_division || ''
                      });
                    }
                  }}
                  className="px-4 py-2 bg-[#f26722] text-white rounded hover:bg-[#f26722]/90 transition-colors flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-white">
                    Customer
                  </label>
                  <select
                    id="customer_id"
                    name="customer_id"
                    value={editFormData.customer_id}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                  >
                    <option value="" className="dark:bg-dark-100 dark:text-white">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id} className="dark:bg-dark-100 dark:text-white">
                        {customer.company_name || customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-white">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={editFormData.title}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-white">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={editFormData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expected_value" className="block text-sm font-medium text-gray-700 dark:text-white">
                      Expected Value ($)
                    </label>
                    <input
                      type="number"
                      id="expected_value"
                      name="expected_value"
                      value={editFormData.expected_value}
                      onChange={handleInputChange}
                      className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="probability" className="block text-sm font-medium text-gray-700 dark:text-white">
                      Probability (%)
                    </label>
                    <input
                      type="number"
                      id="probability"
                      name="probability"
                      value={editFormData.probability}
                      onChange={handleInputChange}
                      className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-white">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={editFormData.status}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                    >
                      <option value="awareness" className="dark:bg-dark-100 dark:text-white">Awareness</option>
                      <option value="interest" className="dark:bg-dark-100 dark:text-white">Interest</option>
                      <option value="quote" className="dark:bg-dark-100 dark:text-white">Quote</option>
                      <option value="decision" className="dark:bg-dark-100 dark:text-white">Decision</option>
                      <option value="decision - forecasted win" className="dark:bg-dark-100 dark:text-white">Decision - Forecasted Win</option>
                      <option value="decision - forecast lose" className="dark:bg-dark-100 dark:text-white">Decision - Forecast Lose</option>
                      <option value="awarded" className="dark:bg-dark-100 dark:text-white">Awarded</option>
                      <option value="lost" className="dark:bg-dark-100 dark:text-white">Lost</option>
                      <option value="no quote" className="dark:bg-dark-100 dark:text-white">No Quote</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-700 dark:text-white">
                      Expected Close Date
                    </label>
                    <input
                      type="date"
                      id="expected_close_date"
                      name="expected_close_date"
                      value={editFormData.expected_close_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="amp_division" className="block text-sm font-medium text-gray-700 dark:text-white">
                    AMP Division
                  </label>
                  <select
                    id="amp_division"
                    name="amp_division"
                    value={editFormData.amp_division}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                  >
                    <option value="" className="dark:bg-dark-100 dark:text-white">Select a division</option>
                    <option value="north_alabama" className="dark:bg-dark-100 dark:text-white">North Alabama Division</option>
                    <option value="tennessee" className="dark:bg-dark-100 dark:text-white">Tennessee Division</option>
                    <option value="georgia" className="dark:bg-dark-100 dark:text-white">Georgia Division</option>
                    <option value="international" className="dark:bg-dark-100 dark:text-white">International Division</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-white">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={editFormData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#f26722] focus:border-[#f26722] dark:bg-dark-100 dark:text-white"
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#f26722] border border-transparent rounded-md shadow-sm hover:bg-[#f26722]/90 focus:outline-none"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-3">Opportunity Details</h3>
                  <div className="bg-white dark:bg-dark-100 shadow-sm rounded-md border border-gray-200 dark:border-dark-300 p-4">
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Quote Number</p>
                      <p className="text-gray-900 dark:text-dark-900">{opportunity.quote_number}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Customer</p>
                      <p className="text-gray-900 dark:text-dark-900">{customer?.company_name || customer?.name}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Title</p>
                      <p className="text-gray-900 dark:text-dark-900">{opportunity.title}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Description</p>
                      <p className="text-gray-900 dark:text-dark-900 whitespace-pre-line">{opportunity.description || 'No description'}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Status</p>
                      {isStatusEditing ? (
                        <div className="relative mt-1">
                          <select
                            value={opportunity.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="block w-full pl-3 pr-10 py-1 text-xs rounded-full appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 border border-gray-200"
                            autoFocus
                            onBlur={() => setIsStatusEditing(false)}
                          >
                            <option value="awareness">Awareness</option>
                            <option value="interest">Interest</option>
                            <option value="quote">Quote</option>
                            <option value="decision">Decision</option>
                            <option value="decision - forecasted win">Decision - Forecasted Win</option>
                            <option value="decision - forecast lose">Decision - Forecast Lose</option>
                            <option value="awarded">Awarded</option>
                            <option value="lost">Lost</option>
                            <option value="no quote">No Quote</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-500" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsStatusEditing(true)}
                          className="mt-1"
                        >
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(opportunity.status)}`}>
                            {formatStatus(opportunity.status)}
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">AMP Division</p>
                      <p className="text-gray-900 dark:text-dark-900">
                        {opportunity.amp_division ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (opportunity.amp_division) {
                                setSelectedDivision(opportunity.amp_division);
                                setShowDivisionAnalytics(true);
                              }
                            }}
                            className="text-[#f26722] hover:text-[#f26722]/90 dark:text-[#f26722] dark:hover:text-[#f26722]/90"
                          >
                            {formatDivisionName(opportunity.amp_division)}
                          </button>
                        ) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-3">Financial & Timeline</h3>
                  <div className="bg-white dark:bg-dark-100 shadow-sm rounded-md border border-gray-200 dark:border-dark-300 p-4">
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Expected Value</p>
                      <p className="text-gray-900 dark:text-dark-900">
                        {opportunity.expected_value
                          ? `$${opportunity.expected_value.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Probability</p>
                      <p className="text-gray-900 dark:text-dark-900">
                        {opportunity.probability !== null && opportunity.probability !== undefined
                          ? `${opportunity.probability}%`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-dark-400">Expected Close Date</p>
                      <p className="text-gray-900 dark:text-dark-900">
                        {opportunity.expected_close_date
                          ? formatDateSafe(opportunity.expected_close_date)
                          : 'Not specified'}
                      </p>
                    </div>
                    {opportunity.awarded_date && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 dark:text-dark-400">Awarded Date</p>
                        <p className="text-gray-900 dark:text-dark-900">
                          {formatDateSafe(opportunity.awarded_date)}
                        </p>
                      </div>
                    )}
                    {jobId && (
                      <div className="mt-6">
                        <Button 
                          variant="outline"
                          className="bg-[#f26722] text-white hover:bg-[#f26722]/90"
                          onClick={() => setShowJobDialog(true)}
                        >
                          View Associated Job
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {opportunity.notes && (
                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-3">Notes</h3>
                    <div className="bg-white dark:bg-dark-100 p-4 rounded-md">
                      <p className="text-gray-900 dark:text-dark-900 whitespace-pre-line">{opportunity.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Estimate Sheet section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-3">Estimate</h3>
                <div className="bg-white dark:bg-dark-100 p-4 rounded-md">
                  {id && <EstimateSheet opportunityId={id} />}
                </div>
              </div>
            </div>
          )}

          {/* Confirm Award Dialog */}
          <Dialog
            open={confirmAwardOpen}
            onClose={() => setConfirmAwardOpen(false)}
            className="fixed inset-0 z-10 overflow-y-auto"
          >
            <div className="flex items-center justify-center min-h-screen">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

              <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-md w-full mx-auto p-6 shadow-xl">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                    onClick={() => setConfirmAwardOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Award Opportunity
                </Dialog.Title>
                
                <p className="text-gray-700 dark:text-white mb-4">
                  Are you sure you want to mark this opportunity as awarded? This will create a new job record.
                </p>

                <div className="mt-5 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
                    onClick={() => setConfirmAwardOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#f26722] border border-transparent rounded-md shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2"
                    onClick={handleAwardOpportunity}
                  >
                    Confirm Award
                  </button>
                </div>
              </div>
            </div>
          </Dialog>

          {/* Job Details Dialog */}
          <Dialog
            open={showJobDialog}
            onClose={() => setShowJobDialog(false)}
            className="fixed inset-0 z-10 overflow-y-auto"
          >
            <div className="flex items-center justify-center min-h-screen">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

              <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-4xl w-full mx-auto p-6 shadow-xl">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowJobDialog(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">
                  Job Details
                </Dialog.Title>
                
                {jobDetails ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Title</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{jobDetails.title}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Number</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{jobDetails.job_number}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{jobDetails.status}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {jobDetails.customer?.company_name || jobDetails.customer?.name || 'No customer assigned'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {jobDetails.start_date ? formatDateSafe(jobDetails.start_date) : 'Not set'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {jobDetails.due_date ? formatDateSafe(jobDetails.due_date) : 'Not set'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        ${jobDetails.budget?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Division</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDivisionName(jobDetails.division || '')}
                      </p>
                    </div>

                    {jobDetails.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {jobDetails.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400">Loading job details...</p>
                  </div>
                )}
              </div>
            </div>
          </Dialog>

          {/* Division Analytics Dialog */}
          {selectedDivision && (
            <DivisionAnalyticsDialog
              division={selectedDivision}
              isOpen={showDivisionAnalytics}
              onClose={() => {
                setShowDivisionAnalytics(false);
                setSelectedDivision(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatDivisionName(division: string): string {
  const divisionMap: { [key: string]: string } = {
    'north_alabama': 'North Alabama Division',
    'tennessee': 'Tennessee Division',
    'georgia': 'Georgia Division',
    'international': 'International Division'
  };
  return divisionMap[division] || division;
} 