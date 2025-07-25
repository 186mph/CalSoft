import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { DivisionAnalyticsDialog } from '../analytics/DivisionAnalyticsDialog';

interface Customer {
  id: string;
  name: string;
  company_name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  customer_id?: string;
}

interface FormData {
  customer_id: string;
  contact_id: string;
  title: string;
  description: string;
  status: string;
  expected_value: string;
  probability: string;
  expected_close_date: string;
  notes: string;
  amp_division: string;
  sales_person: string;
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

const initialFormData: FormData = {
  customer_id: '',
  contact_id: '',
  title: '',
  description: '',
  status: 'awareness',
  expected_value: '',
  probability: '0',
  expected_close_date: '',
  notes: '',
  amp_division: '',
  sales_person: ''
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

export default function OpportunityList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showDivisionAnalytics, setShowDivisionAnalytics] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOpportunities();
      fetchCustomers();
    }
  }, [user]);

  useEffect(() => {
    if (formData.customer_id) {
      fetchContacts(formData.customer_id);
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (customers.length > 0) {
      const filtered = customers.filter(customer => {
        const searchTerm = customerSearch.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.company_name.toLowerCase().includes(searchTerm)
        );
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  async function fetchOpportunities() {
    setLoading(true);
    try {
      // 1. Fetch base opportunities from the 'business' schema
      const { data: opportunityData, error: opportunityError } = await supabase
        .schema('business')
        .from('opportunities')
        .select('*') // Select all opportunity fields
        .order('created_at', { ascending: false });

      if (opportunityError) throw opportunityError;
      
      if (!opportunityData) {
        setOpportunities([]);
        return; // No opportunities found
      }

      // 2. Fetch customer data for each opportunity from the 'common' schema
      const opportunitiesWithCustomers = await Promise.all(opportunityData.map(async (opportunity) => {
        if (!opportunity.customer_id) {
          return { ...opportunity, customers: null }; // Keep 'customers' key for consistency
        }

        try {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('id, name, company_name')
            .eq('id', opportunity.customer_id)
            .single();

          if (customerError) {
            console.warn(`Error fetching customer for opportunity ${opportunity.id}:`, customerError);
            return { ...opportunity, customers: null };
          }

          return { ...opportunity, customers: customerData };
        } catch (err) {
          console.warn(`Error processing customer for opportunity ${opportunity.id}:`, err);
          return { ...opportunity, customers: null };
        }
      }));

      setOpportunities(opportunitiesWithCustomers);

    } catch (error) {
      console.error('Error in fetchOpportunities function:', error);
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
    try {
      const { data, error } = await supabase
        .schema('common')
        .from('contacts')
        .select('id, first_name, last_name, customer_id')
        .eq('customer_id', customerId)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
      // Reset contact_id when customer changes
      setFormData(prev => ({ ...prev, contact_id: '' }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Form submitted');
    
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to create an opportunity');
      return;
    }

    try {
      // Check if the opportunities table exists in the correct schema
      const { data: tableCheck, error: tableError } = await supabase
        .schema('business') // Specify schema
        .from('opportunities')
        .select('count', { head: true, count: 'exact' }); // Use head:true for faster count check

      if (tableError) {
        console.error('Table check error:', tableError);
        // Check if the error specifically indicates the relation doesn't exist
        if (tableError.code === '42P01') {
             alert('The opportunities table is not properly set up in the business schema. Please contact support.');
        } else {
            alert('Error checking opportunities table setup. Please contact support.');
        }
        return;
      }
      
      // Log the count result (optional)
      // console.log('Table check count:', tableCheck?.count);

      console.log('Processing form data:', formData);
      
      // Validate required fields
      if (!formData.customer_id) {
        console.error('Missing customer');
        alert('Please select a customer');
        return;
      }
      
      // First check if the customer exists in the common schema
      const { data: customerData, error: customerError } = await supabase
        .schema('common') // Specify schema
        .from('customers')
        .select('id') // Explicitly select 'id' instead of using head:true
        .eq('id', formData.customer_id)
        .maybeSingle(); // Use maybeSingle to handle null without error

      // Add detailed logging for the customer check
      console.log('[handleSubmit] Customer Check:', {
          customerIdToCheck: formData.customer_id,
          customerDataResult: customerData, // Will be null if not found
          customerErrorResult: customerError
      });

      if (customerError) {
         console.error('Customer validation database error:', customerError);
         alert('Error validating customer. Please try again.');
         return;
      }
      if (!customerData) { // CustomerData will be null if not found
        console.error('Selected customer does not exist:', formData.customer_id);
        alert('Selected customer does not exist. Please refresh and try again.');
        return;
      }
      
      // Generate a fallback quote number in case the trigger fails
      const currentYear = new Date().getFullYear();
      const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const fallbackQuoteNumber = `Q${currentYear}-${randomNumber}`;
      
      // Create a new object with processed data
      const opportunityData = {
        customer_id: formData.customer_id,
        contact_id: formData.contact_id || null, // Ensure contact_id can be null
        title: formData.title || '',
        description: formData.description || '',
        status: formData.status || 'awareness',
        expected_value: formData.expected_value ? parseFloat(formData.expected_value) : null,
        probability: formData.probability ? parseInt(formData.probability) : 0, // Parse probability
        expected_close_date: formData.expected_close_date || null,
        notes: formData.notes || '',
        amp_division: formData.amp_division,
        sales_person: user.email, // Automatically set to the user's email
        user_id: user.id,
        quote_number: fallbackQuoteNumber
      };
      
      console.log('Sending to Supabase:', opportunityData);

      // Try to insert into the business schema
      const { data, error } = await supabase
        .schema('business') // Specify schema
        .from('opportunities')
        .insert(opportunityData)
        .select()
        .single();
      
      if (error) {
        console.error('Detailed Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        
        // Handle specific error cases
        if (error.code === '23505') { // Unique violation
          alert('A quote number conflict occurred. Please try again.');
        } else if (error.code === '23503') { // Foreign key violation
          alert('Invalid customer or contact selected. Please try again.');
        } else if (error.code === '42P01') { // Table does not exist
          alert('The opportunities table is not properly set up. Please contact support.');
        } else {
          alert(`Error creating opportunity: ${error.message || 'Unknown error'}`);
        }
        throw error;
      }

      console.log('Created opportunity:', data);
      alert('Opportunity created successfully!');
      setIsOpen(false);
      setFormData(initialFormData);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error creating opportunity:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error: error
      });
      
      // Try to get more specific error information
      let errorMessage = 'Database error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }
      
      alert(`Error creating opportunity: ${errorMessage}`);
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading...</div>;
  }

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-900">Opportunities</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-dark-400">
              A list of all opportunities and their key information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setFormData(initialFormData);
            }}
            className="inline-flex items-center justify-center rounded-md bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add opportunity
          </button>
        </div>

        <div className="bg-white dark:bg-dark-150 rounded-lg border border-gray-200 dark:border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-200">
              <thead className="bg-gray-50 dark:bg-dark-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Quote #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Opportunity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Division
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Close Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                    Probability
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-dark-200">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-dark-400">
                      No opportunities found. Click "Add Opportunity" to create one.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opportunity) => (
                    <tr
                      key={opportunity.id}
                      onClick={() => navigate(`/sales-dashboard/opportunities/${opportunity.id}`)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-900">
                          {opportunity.quote_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-900">
                          {opportunity.customers?.company_name || opportunity.customers?.name || 'Unknown Customer'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-dark-900">{opportunity.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            opportunity.status
                          )}`}
                        >
                          {formatStatus(opportunity.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-dark-900">
                          {opportunity.amp_division ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDivision(opportunity.amp_division);
                                setShowDivisionAnalytics(true);
                              }}
                              className="text-accent-color hover:text-accent-color/90 dark:text-accent-color dark:hover:text-accent-color/90"
                            >
                              {formatDivisionName(opportunity.amp_division)}
                            </button>
                          ) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-dark-900">
                          {opportunity.expected_value
                            ? `$${opportunity.expected_value.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-400">
                        {formatDateSafe(opportunity.expected_close_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-dark-900">
                          {opportunity.probability !== null && opportunity.probability !== undefined
                            ? `${opportunity.probability}%`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales-dashboard/opportunities/${opportunity.id}`);
                            }}
                            className="text-accent-color hover:text-accent-color/90 dark:text-accent-color dark:hover:text-accent-color/90"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Opportunity Modal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-md w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add New Opportunity
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Sales Person
                </label>
                <input
                  type="text"
                  name="sales_person"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-dark-200 focus:outline-none focus:ring-accent-color focus:border-accent-color dark:text-white cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Sales Stage
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
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
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Customer
                </label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
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
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Contact
                </label>
                <select
                  name="contact_id"
                  value={formData.contact_id}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
                  disabled={!formData.customer_id}
                >
                  <option value="" className="dark:bg-dark-100 dark:text-white">Select a contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id} className="dark:bg-dark-100 dark:text-white">
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Opportunity Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Opportunity Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">
                    Expected Value ($)
                  </label>
                  <input
                    type="number"
                    name="expected_value"
                    value={formData.expected_value}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    name="probability"
                    value={formData.probability}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Opportunity Date
                </label>
                <input
                  type="date"
                  name="expected_close_date"
                  value={formData.expected_close_date}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  AMP Division
                </label>
                <select
                  name="amp_division"
                  value={formData.amp_division}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                  required
                >
                  <option value="" className="dark:bg-dark-100 dark:text-white">Select a division</option>
                  <option value="north_alabama" className="dark:bg-dark-100 dark:text-white">North Alabama Division</option>
                  <option value="tennessee" className="dark:bg-dark-100 dark:text-white">Tennessee Division</option>
                  <option value="georgia" className="dark:bg-dark-100 dark:text-white">Georgia Division</option>
                  <option value="international" className="dark:bg-dark-100 dark:text-white">International Division</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-color border border-transparent rounded-md shadow-sm hover:bg-accent-color/90 focus:outline-none"
                >
                  Create
                </button>
              </div>
            </form>
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
    </>
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