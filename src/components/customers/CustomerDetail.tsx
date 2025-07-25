import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Briefcase, Mail, Phone, MapPin, Calendar, Tag, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { format } from 'date-fns';
import { Dialog } from '@headlessui/react';
import { Customer, CustomerCategory, getCustomerById, updateCustomer, getCategories } from '../../services/customerService';
import CustomerDocumentManagement from './CustomerDocumentManagement';
import CustomerInteractions from './CustomerInteractions';
import CustomerHealthMonitoring from './CustomerHealth';
import { toast } from '../../components/ui/toast';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_primary: boolean;
}

interface Job {
  id: string;
  title: string;
  status: string;
  due_date: string;
  budget: number;
  priority: string;
}

interface CustomerFormData {
  // Define the structure of your customer form data
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_primary: boolean;
  customer_id: string;
}

const initialFormData: CustomerFormData = {
  // Initialize your customer form data
};

const initialContactFormData: ContactFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  is_primary: false,
  customer_id: '',
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>(initialContactFormData);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [contactsExpanded, setContactsExpanded] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchCustomerData();
    }
  }, [user, id]);

  async function fetchCustomerData() {
    try {
      // Fetch customer details using the service
      const customerData = await getCustomerById(id!);
      setCustomer(customerData);

      // Set the selected category from the customer data
      setSelectedCategoryId(customerData.category_id || null);

      // Fetch categories
      const categoriesData = await getCategories();
      setCategories(categoriesData);

      // Fetch related contacts
      const { data: contactsData, error: contactsError } = await supabase
        .schema('common')
        .from('contacts')
        .select('*')
        .eq('customer_id', id)
        .order('is_primary', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch related jobs
      const { data: jobsData, error: jobsError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAddContact() {
    if (customer) {
      setContactFormData({
        ...initialContactFormData,
        customer_id: customer.id,
      });
      setIsContactFormOpen(true);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !customer) return;

    try {
      // Add the new contact
      const { error } = await supabase
        .schema('common')
        .from('contacts')
        .insert([{ ...contactFormData, user_id: user.id }]);

      if (error) throw error;

      // Close the form and reset
      setIsContactFormOpen(false);
      setContactFormData(initialContactFormData);
      
      // Refresh the contacts list
      fetchCustomerData();
      toast({
        title: 'Success',
        description: 'Contact added successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact',
        variant: 'destructive',
      });
    }
  }

  function handleContactClick(contact: Contact) {
    // In a real implementation, this would navigate to the contact details page or open a modal
    // For now, we'll just show an alert with the contact details
    alert(`Contact Details:
Name: ${contact.first_name} ${contact.last_name}
Email: ${contact.email}
Phone: ${contact.phone || 'Not provided'}
Position: ${contact.position || 'Not provided'}
${contact.is_primary ? '(Primary Contact)' : ''}
    `);
  }

  async function handleCategoryChange(categoryId: string | null) {
    if (!id) return;
    
    try {
      await updateCustomer(id, { category_id: categoryId });
      setSelectedCategoryId(categoryId);
      setIsCategorySelectOpen(false);
      fetchCustomerData();
    } catch (error) {
      console.error('Error updating customer category:', error);
    }
  }

  function getCategoryById(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId) || null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Customer not found</div>
      </div>
    );
  }

  const category = getCategoryById(customer.category_id);

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-accent-color" />
              <h1 className="ml-3 text-2xl font-semibold text-gray-900 dark:text-white">
                {customer.company_name || 'No Company Name'}
              </h1>
            </div>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            customer.status === 'active' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {customer.status}
          </span>
        </div>

        {/* Customer Information and Contacts in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Customer Information Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <Tag className="h-4 w-4 text-gray-400 mr-2" />
                    Category
                  </h3>
                  <button
                    onClick={() => setIsCategorySelectOpen(true)}
                    className="text-sm text-accent-color hover:text-accent-color/80"
                  >
                    Change
                  </button>
                </div>
                <div className="mt-2">
                  {category ? (
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No category assigned
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-accent-color mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white">{customer.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-accent-color mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-white">{customer.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-accent-color mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                  <p className="text-sm text-gray-900 dark:text-white">{customer.address || '-'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-accent-color mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {format(new Date(customer.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Contacts</h2>
                <button
                  onClick={handleAddContact}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                Add
                </button>
            </div>
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg"
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                      {contact.first_name?.charAt(0) || 'C'}
                    </span>
                  </div>
                      <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Primary
                            </span>
                          )}
                        </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Left tackle</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</p>
                      </div>
                    </div>
              ))}
              {contacts.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No contacts found
                </p>
              )}
              <div className="mt-2 text-right">
                <Link to="#" className="text-sm font-medium text-accent-color hover:text-accent-color/90">
                  View All Contacts
              </Link>
            </div>
          </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <a
              href="#overview"
              className={`${
                activeTab === 'overview'
                  ? 'border-accent-color text-accent-color'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('overview');
              }}
            >
              Overview
            </a>
            <a
              href="#jobs"
              className={`${
                activeTab === 'jobs'
                  ? 'border-accent-color text-accent-color'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('jobs');
              }}
            >
              Jobs
            </a>
            <a
              href="#documents"
              className={`${
                activeTab === 'documents'
                  ? 'border-accent-color text-accent-color'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('documents');
              }}
            >
              Documents
            </a>
            <a
              href="#interactions"
              className={`${
                activeTab === 'interactions'
                  ? 'border-accent-color text-accent-color'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('interactions');
              }}
            >
              Interactions
            </a>
            <a
              href="#health"
              className={`${
                activeTab === 'health'
                  ? 'border-accent-color text-accent-color'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('health');
              }}
            >
              Health
            </a>
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Jobs section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Jobs</h2>
                    <Link
                      to="#jobs"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('jobs');
                      }}
                      className="text-sm font-medium text-accent-color hover:text-accent-color/90 dark:text-accent-color dark:hover:text-accent-color/90"
                    >
                      View all jobs
                    </Link>
            </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {jobs.slice(0, 2).map((job) => (
                    <Link 
                      key={job.id} 
                      to={`/jobs/${job.id}`}
                      className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Briefcase className="h-5 w-5 text-accent-color" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{job.title}</p>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {job.status}
                              </span>
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                job.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {job.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ${job.budget?.toLocaleString() || '-'}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Due: {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : 'Not set'}
                      </div>
                    </Link>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                      No jobs found
                    </p>
                  )}
                </div>
              </div>

              {/* Two-column layout for Contacts and Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contacts section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Key Contacts</h2>
                      <button
                        onClick={handleAddContact}
                        className="inline-flex items-center text-sm font-medium text-accent-color hover:text-accent-color/90"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add contact
                      </button>
            </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {contacts.slice(0, 2).map((contact) => (
                      <div 
                        key={contact.id} 
                        className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                            {contact.first_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            {contact.first_name} {contact.last_name}
                            {contact.is_primary && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Primary
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.position || 'No position'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</p>
                        </div>
                      </div>
                    ))}
                    {contacts.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        No contacts found
                      </p>
                    )}
                    {contacts.length > 2 && (
                      <div className="pt-2 text-center">
                        <button
                          onClick={() => setContactsExpanded(prevState => !prevState)}
                          className="inline-flex items-center text-sm font-medium text-accent-color hover:text-accent-color/90"
                        >
                          {contactsExpanded ? 'View fewer contacts' : `View all ${contacts.length} contacts`}
                        </button>
                      </div>
                    )}
                    {contactsExpanded && contacts.length > 2 && (
                      <div className="pt-2 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        {contacts.slice(2).map((contact) => (
                          <div 
                            key={contact.id} 
                            className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg"
                            onClick={() => handleContactClick(contact)}
                          >
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                                {contact.first_name?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                {contact.first_name} {contact.last_name}
                                {contact.is_primary && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Primary
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{contact.position || 'No position'}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Documents</h2>
                      <Link
                        to="#documents"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('documents');
                        }}
                        className="text-sm font-medium text-accent-color hover:text-accent-color/90 dark:text-accent-color dark:hover:text-accent-color/90"
                      >
                        View all documents
                      </Link>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* This is a placeholder - we would fetch actual documents in a real implementation */}
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
            <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Contract_2023.pdf</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Added on Apr 05, 2023</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Quarterly_Report.xlsx</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Added on Mar 10, 2023</p>
                        </div>
                      </div>
                      <div className="pt-2 text-center">
                        <Link
                          to="#documents"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('documents');
                          }}
                          className="inline-flex items-center text-sm font-medium text-accent-color hover:text-accent-color/90"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Upload document
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-column layout for Interactions and Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Interactions section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Interactions</h2>
                      <Link
                        to="#interactions"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('interactions');
                        }}
                        className="text-sm font-medium text-accent-color hover:text-accent-color/90 dark:text-accent-color dark:hover:text-accent-color/90"
                      >
                        View all interactions
                      </Link>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* This is a placeholder - we would fetch actual interactions in a real implementation */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="relative">
                          <div className="h-8 w-8 rounded-full bg-accent-color/10 flex items-center justify-center">
                            <Phone className="h-4 w-4 text-accent-color" />
                          </div>
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-white dark:border-gray-800"></span>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Phone Call</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apr 10, 2023 at 2:30 PM</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Discussed upcoming project requirements</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="relative">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                          </div>
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-white dark:border-gray-800"></span>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apr 8, 2023 at 11:15 AM</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Sent invoice and project timeline</p>
                        </div>
                      </div>
                      <div className="pt-2 text-center">
                        <Link
                          to="#interactions"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('interactions');
                          }}
                          className="inline-flex items-center text-sm font-medium text-accent-color hover:text-accent-color/90"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add interaction
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health metrics section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Customer Health Dashboard</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex flex-col items-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Overall Health</div>
                      <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-2">
                        <span className="text-white text-2xl font-bold">85</span>
                      </div>
                      <div className="font-medium text-green-600 dark:text-green-400">Good</div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
                      <div className="flex items-end mt-1">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">85%</div>
                        <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 5%</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
                      <div className="flex items-end mt-1">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">92%</div>
                        <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 3%</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: "92%" }}></div>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Response Time</div>
                      <div className="flex items-end mt-1">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">78%</div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 ml-2 mb-1">▼ 2%</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: "78%" }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2">
                      Generate Health Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">All Jobs</h2>
                  <Link
                    to="/jobs/new"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map((job) => (
                  <Link 
                    key={job.id} 
                    to={`/jobs/${job.id}`}
                    className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Briefcase className="h-5 w-5 text-accent-color" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{job.title}</p>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              job.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {job.status}
                            </span>
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              job.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {job.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ${job.budget?.toLocaleString() || '-'}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Due: {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : 'Not set'}
                    </div>
                  </Link>
                ))}
                {jobs.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                    No jobs found
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Customer Documents</h2>
                </div>
              </div>
              <CustomerDocumentManagement customerId={customer.id} />
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Interactions</h2>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Log Interaction
                </button>
              </div>
              
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Recent Activity</h3>
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">12 interactions</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Response Time</h3>
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">4.2 hours</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Average response time</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Primary Contact</h3>
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                        {contacts.find(c => c.is_primary)?.first_name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {contacts.find(c => c.is_primary)?.first_name} {contacts.find(c => c.is_primary)?.last_name || 'No primary contact'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {contacts.find(c => c.is_primary)?.position || ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button className="px-4 py-2 text-sm font-medium text-accent-color border-b-2 border-accent-color">
                  All Interactions
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Calls
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Emails
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Meetings
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Notes
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute top-0 left-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex items-start relative">
                    <div className="absolute top-0 left-0 h-12 w-12 flex items-center justify-center z-10">
                      <div className="h-8 w-8 rounded-full bg-accent-color/10 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <Phone className="h-4 w-4 text-accent-color" />
                      </div>
                    </div>
                    <div className="ml-16 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 w-full">
                      <div className="flex justify-between items-start">
            <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Phone Call with Steve Spellburg</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apr 10, 2023 at 2:30 PM | 15 minutes</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Completed
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Discussed upcoming project requirements and timeline adjustments. Client requested additional information about the new service offerings.
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Logged by: Sarah Johnson</p>
                        <div className="flex space-x-2">
                          <button className="text-sm text-accent-color hover:text-accent-color/80">Edit</button>
                          <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute top-0 left-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex items-start relative">
                    <div className="absolute top-0 left-0 h-12 w-12 flex items-center justify-center z-10">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <Mail className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      </div>
                    </div>
                    <div className="ml-16 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email - Proposal Follow-up</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apr 8, 2023 at 11:15 AM</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Sent
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Sent follow-up email with revised proposal and updated pricing details. Attached the Q2 service options document as requested in our previous call.
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Logged by: Michael Chen</p>
                        <div className="flex space-x-2">
                          <button className="text-sm text-accent-color hover:text-accent-color/80">Edit</button>
                          <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute top-0 left-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex items-start relative">
                    <div className="absolute top-0 left-0 h-12 w-12 flex items-center justify-center z-10">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-700 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-16 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Meeting - Quarterly Review</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mar 24, 2023 at 10:00 AM | 60 minutes</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Completed
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Conducted Q1 performance review meeting. Client expressed satisfaction with current progress and approved next phase of the project. Discussed potential expansion of services in Q3.
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Logged by: David Wilson</p>
                        <div className="flex space-x-2">
                          <button className="text-sm text-accent-color hover:text-accent-color/80">Edit</button>
                          <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="flex items-start relative">
                    <div className="absolute top-0 left-0 h-12 w-12 flex items-center justify-center z-10">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-700 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-16 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Note - Contract Amendment</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mar 15, 2023 at 3:45 PM</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                          Note
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Client requested amendments to section 3.2 of the contract regarding payment terms. Legal team is reviewing and will provide updated document by end of week.
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Logged by: Jennifer Lee</p>
                        <div className="flex space-x-2">
                          <button className="text-sm text-accent-color hover:text-accent-color/80">Edit</button>
                          <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 4 of 12 interactions
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm border border-accent-color bg-accent-color text-white rounded">
                    1
                  </button>
                  <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    2
                  </button>
                  <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    Next
                  </button>
                </div>
              </div>
              
              <CustomerInteractions customerId={customer.id} contacts={contacts} className="hidden" />
            </div>
          )}

          {activeTab === 'health' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Customer Health Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex flex-col items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Overall Health</div>
                  <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-2">
                    <span className="text-white text-2xl font-bold">85</span>
                  </div>
                  <div className="font-medium text-green-600 dark:text-green-400">Good</div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
                  <div className="flex items-end mt-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">85%</div>
                    <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 5%</div>
                  </div>
                  <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
                  <div className="flex items-end mt-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">92%</div>
                    <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 3%</div>
                  </div>
                  <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "92%" }}></div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Response Time</div>
                  <div className="flex items-end mt-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">78%</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 ml-2 mb-1">▼ 2%</div>
                  </div>
                  <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: "78%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2">
                  Generate Health Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Form Dialog */}
      <Dialog open={isContactFormOpen} onClose={() => setIsContactFormOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded bg-white dark:bg-dark-150 p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Add New Contact for {customer?.company_name}
              </Dialog.Title>
              <button onClick={() => setIsContactFormOpen(false)} className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-white">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  required
                  value={contactFormData.first_name}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-white">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  required
                  value={contactFormData.last_name}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-white">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  id="position"
                  value={contactFormData.position}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, position: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent-color focus:border-accent-color dark:bg-dark-100 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_primary"
                  id="is_primary"
                  checked={contactFormData.is_primary}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="h-4 w-4 text-accent-color focus:ring-accent-color border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-700 dark:text-white">
                  Primary Contact
                </label>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="submit"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                >
                  Add Contact
                </button>
                <button
                  type="button"
                  onClick={() => setIsContactFormOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-100 px-4 py-2 text-base font-medium text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Category Selection Dialog */}
      <Dialog open={isCategorySelectOpen} onClose={() => setIsCategorySelectOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Change Category
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setIsCategorySelectOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`w-full text-left py-2 px-3 rounded-md flex items-center ${
                  selectedCategoryId === null
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  No Category
                </span>
              </button>
              
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`w-full text-left py-2 px-3 rounded-md flex items-center ${
                    selectedCategoryId === category.id
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <Link
                to="/sales-dashboard/customer-categories"
                className="text-sm text-accent-color hover:text-accent-color/80"
              >
                Manage Categories
              </Link>
              <button
                type="button"
                onClick={() => setIsCategorySelectOpen(false)}
                className="inline-flex justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}