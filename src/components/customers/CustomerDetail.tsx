import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Briefcase, Mail, Phone, MapPin, Calendar, Tag, Plus, X, Eye, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { format } from 'date-fns';
import { Dialog } from '@headlessui/react';
import { Customer, CustomerCategory, getCustomerById, updateCustomer, getCategories } from '../../services/customerService';
import CustomerDocumentManagement from './CustomerDocumentManagement';
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

interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  asset_id?: string;
  job_id: string;
  job_number?: string;
  job_title?: string;
  pass_fail_status?: 'PASS' | 'FAIL' | null;
}



interface Job {
  id: string;
  title: string;
  status: string;
  due_date: string;
  budget: number;
  priority: string;
  created_at: string;
  division?: string;
}

interface CustomerFormData {
  // Define the structure of your customer form data
}

const initialFormData: CustomerFormData = {
  // Initialize your customer form data
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Job filter states for calibration division
  const [divisionFilter, setDivisionFilter] = useState<'calibration' | 'armadillo'>('calibration');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  useEffect(() => {
    if (user && id) {
      fetchCustomerData();
    }
  }, [user, id]);

  // Apply job filters for calibration division
  const applyJobFilters = (jobsToFilter: Job[]) => {
    if (!location.pathname.startsWith('/calibration')) {
      setFilteredJobs(jobsToFilter);
      return;
    }

    let filtered = jobsToFilter;

    // Filter by division (handle missing division field)
    filtered = filtered.filter(job => (job.division || 'calibration') === divisionFilter);

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  };

  // Effect to reapply filters when filter states change
  useEffect(() => {
    if (location.pathname.startsWith('/calibration')) {
      applyJobFilters(jobs);
    }
  }, [divisionFilter, statusFilter, jobs, location.pathname]);

  // Function to fetch pass/fail status for assets
  const fetchPassFailStatus = async (assets: Asset[]): Promise<Asset[]> => {
    return Promise.all(
      assets.map(async (asset) => {
        try {
          if (!asset.file_url.startsWith('report:')) {
            return { ...asset, pass_fail_status: null };
          }

          const urlParts = asset.file_url.split('/');
          const reportSlug = urlParts[3]?.split('?')[0];
          
          if (!reportSlug) {
            return { ...asset, pass_fail_status: null };
          }

          // Map report slugs to table names
          const reportTableMap: { [key: string]: string } = {
            'calibration-gloves': 'calibration_gloves_reports',
            'calibration-sleeve': 'calibration_sleeve_reports',
            'calibration-blanket': 'calibration_blanket_reports',
            'calibration-line-hose': 'calibration_line_hose_reports',
            'calibration-hotstick': 'calibration_hotstick_reports',
            'calibration-ground-cable': 'calibration_ground_cable_reports',
            'calibration-bucket-truck': 'calibration_bucket_truck_reports',
            'meter-template': 'meter_template_reports'
          };

          const tableName = reportTableMap[reportSlug];
          if (!tableName) {
            return { ...asset, pass_fail_status: null };
          }

          const reportId = urlParts[4]?.split('?')[0];
          if (!reportId) {
            return { ...asset, pass_fail_status: null };
          }

          const { data: reportData } = await supabase
            .schema('lab_ops')
            .from(tableName)
            .select('status')
            .eq('id', reportId)
            .single();

          return { ...asset, pass_fail_status: reportData?.status || null };
        } catch (err) {
          return { ...asset, pass_fail_status: null };
        }
      })
    );
  };

  // Function to fetch assets for this customer
  const fetchCustomerAssets = async () => {
    if (!location.pathname.startsWith('/calibration') || !id) return;

    setAssetsLoading(true);
    try {
      console.log('🔍 [CustomerDetail] Fetching assets for customer:', id);
      
      // First get all jobs for this customer
      const { data: customerJobs, error: jobsError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('id, job_number, title')
        .eq('customer_id', id);

      if (jobsError) {
        console.error('Error fetching customer jobs for assets:', jobsError);
        return;
      }

      if (!customerJobs || customerJobs.length === 0) {
        console.log('No jobs found for customer, no assets to show');
        setAssets([]);
        return;
      }

      const jobIds = customerJobs.map(job => job.id);
      console.log('🔍 [CustomerDetail] Found job IDs for customer:', jobIds);

      // Fetch assets for these jobs
      const { data: assetsData, error: assetsError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('*')
        .in('job_id', jobIds)
        .is('deleted_at', null) // Only active assets
        .order('created_at', { ascending: false });

      if (assetsError) {
        console.error('Error fetching customer assets:', assetsError);
        return;
      }

      if (!assetsData || assetsData.length === 0) {
        console.log('No assets found for customer jobs');
        setAssets([]);
        return;
      }

      // Create job lookup map
      const jobLookup = customerJobs.reduce((acc, job) => {
        acc[job.id] = job;
        return acc;
      }, {} as Record<string, any>);

      // Transform assets with job information
      const transformedAssets: Asset[] = assetsData.map((item: any) => {
        const jobInfo = jobLookup[item.job_id];
        return {
          id: item.id,
          name: item.name,
          file_url: item.file_url,
          created_at: item.created_at,
          asset_id: item.asset_id,
          job_id: item.job_id || '',
          job_number: jobInfo?.job_number || '',
          job_title: jobInfo?.title || ''
        };
      });

      console.log('🔍 [CustomerDetail] Found assets for customer:', transformedAssets.length);

      // Fetch pass/fail status
      const assetsWithStatus = await fetchPassFailStatus(transformedAssets);
      setAssets(assetsWithStatus);

    } catch (error) {
      console.error('Error fetching customer assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

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

      // Fetch contacts that have this customer selected
      console.log('🔍 [CustomerDetail] Fetching contacts for customer ID:', id);
      console.log('🔍 [CustomerDetail] Is calibration division:', location.pathname.startsWith('/calibration'));
      
      // First, let's check all contacts to debug the issue
      const { data: allContacts, error: allContactsError } = await supabase
        .schema('common')
        .from('contacts')
        .select('id, customer_id, first_name, last_name');

      if (!allContactsError) {
        console.log('🔍 [CustomerDetail] All contacts in system:', allContacts);
        const matchingContacts = allContacts?.filter(c => c.customer_id === id) || [];
        console.log('🔍 [CustomerDetail] Contacts that should match customer ID', id, ':', matchingContacts);
      }
      
      const { data: contactsData, error: contactsError } = await supabase
        .schema('common')
        .from('contacts')
        .select('*')
        .eq('customer_id', id)
        .order('is_primary', { ascending: false });

      if (contactsError) {
        console.error('🚨 [CustomerDetail] Error fetching contacts:', contactsError);
        setContacts([]);
      } else {
        console.log('🔍 [CustomerDetail] Found contacts for customer ID', id, ':', contactsData);
        setContacts(contactsData || []);
      }

 

      // Fetch related jobs from both schemas for calibration division
      let allJobs: Job[] = [];
      
      if (location.pathname.startsWith('/calibration')) {
        // For calibration division, fetch from lab_ops.lab_jobs
        const { data: labJobsData, error: labJobsError } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (labJobsError) {
          console.error('Error fetching lab jobs:', labJobsError);
        } else {
          allJobs = [...allJobs, ...(labJobsData || [])];
        }
      } else {
        // For other divisions, fetch from neta_ops.jobs
        const { data: jobsData, error: jobsError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });

        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
        } else {
          allJobs = [...allJobs, ...(jobsData || [])];
        }
      }

      // Sort all jobs by created_at descending
      allJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setJobs(allJobs);
      
      // Initialize filtered jobs for calibration division
      if (location.pathname.startsWith('/calibration')) {
        applyJobFilters(allJobs);
        // Also fetch assets for calibration division
        fetchCustomerAssets();
      }
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

  // Helper function to get simplified report type from asset
  const getSimplifiedReportType = (asset: Asset): string => {
    if (!asset.file_url.startsWith('report:')) {
      return 'Document';
    }
    
    const urlParts = asset.file_url.split('/');
    const reportSlug = urlParts[3]?.split('?')[0];
    
    const reportTypeMap: { [key: string]: string } = {
      'calibration-gloves': 'Glove',
      'calibration-sleeve': 'Sleeve', 
      'calibration-blanket': 'Blanket',
      'calibration-line-hose': 'Line Hose',
      'calibration-hotstick': 'Hotstick',
      'calibration-ground-cable': 'Ground Cable',
      'calibration-bucket-truck': 'Bucket Truck',
      'meter-template': 'Meter'
    };

    return reportTypeMap[reportSlug] || 'Unknown';
  };

  // Helper function to get report edit path
  const getReportEditPath = (asset: Asset): string => {
    if (!asset.file_url.startsWith('report:')) {
      return asset.file_url;
    }
    
    const urlParts = asset.file_url.split('/');
    const reportSlug = urlParts[3]?.split('?')[0];
    const reportId = urlParts[4]?.split('?')[0];
    
    return `/jobs/${asset.job_id}/${reportSlug}/${reportId}`;
  };

  function getCategoryById(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId) || null;
  }

  // Check if we're in the calibration division
  const isCalibrationDivision = () => {
    return location.pathname.startsWith('/calibration');
  };

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

        {/* Customer Information and Contacts */}
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
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-4">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                        {contact.first_name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.is_primary && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Primary
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400 w-16">Position:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.position || 'Not specified'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400 w-16">Email:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.email || 'Not provided'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400 w-16">Phone:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.phone || 'Not provided'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400 w-16">Primary:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.is_primary ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">No contacts found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    This customer doesn't have any contacts assigned yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Hide all tabs except overview for calibration division */}
        {!isCalibrationDivision() && (
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
        )}

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Jobs section - Hide for calibration division */}
              {!isCalibrationDivision() && (
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
              )}

              {/* Documents section - Hide for calibration division */}
              {!isCalibrationDivision() && (
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
              )}

              {/* Two-column layout for Interactions and Health - Hide for calibration division */}
              {!isCalibrationDivision() && (
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
              )}

              {/* Jobs section for calibration division - Show all jobs */}
              {isCalibrationDivision() && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">All Jobs</h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                        {statusFilter !== 'all' && ` (${statusFilter} status)`}
                      </span>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="space-y-4">
                      {/* Division Filter Tabs */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Division:</span>
                        <button 
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            divisionFilter === 'calibration' 
                              ? 'bg-[#339C5E] text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => {
                            setDivisionFilter('calibration');
                            setStatusFilter('all');
                          }}
                        >
                          Calibration Jobs
                        </button>
                        <button 
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            divisionFilter === 'armadillo' 
                              ? 'bg-gray-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => {
                            setDivisionFilter('armadillo');
                            setStatusFilter('all');
                          }}
                        >
                          Armadillo Jobs
                        </button>
                      </div>

                      {/* Status Filter Tabs */}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-2">Filter by Status:</span>
                        <button 
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            statusFilter === 'all' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => setStatusFilter('all')}
                        >
                          All
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            statusFilter === 'pending' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => setStatusFilter('pending')}
                        >
                          Pending
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            statusFilter === 'in-progress' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => setStatusFilter('in-progress')}
                        >
                          In Progress
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            statusFilter === 'ready-to-bill' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => setStatusFilter('ready-to-bill')}
                        >
                          Ready To Bill
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            statusFilter === 'completed' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600'
                          }`}
                          onClick={() => setStatusFilter('completed')}
                        >
                          Completed
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => (
                        <Link 
                          key={job.id} 
                          to={`/jobs/${job.id}`}
                          className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Briefcase className="h-5 w-5 text-[#339C5E]" />
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
                      ))
                    ) : (
                      <div className="p-6">
                        <div className="text-center py-8">
                          <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                            <Briefcase className="h-6 w-6" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">No jobs found</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {statusFilter === 'all' && jobs.length === 0 
                              ? "This customer doesn't have any jobs yet." 
                              : statusFilter !== 'all' && filteredJobs.length === 0 && jobs.length > 0
                              ? `No ${statusFilter} jobs found. Try a different filter.`
                              : `No ${divisionFilter} jobs found for this customer.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assets section for calibration division */}
              {isCalibrationDivision() && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Customer Assets</h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {assetsLoading ? 'Loading...' : `${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      All calibration assets created for this customer across all jobs
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {assetsLoading ? (
                      <div className="p-6 text-center">
                        <div className="text-gray-500 dark:text-gray-400">Loading assets...</div>
                      </div>
                    ) : assets.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Asset ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Report Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Job Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Pass/Fail
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Created Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {asset.asset_id || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {getSimplifiedReportType(asset)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                <Link 
                                  to={`/jobs/${asset.job_id}`}
                                  className="text-[#339C5E] hover:text-[#2d8a54] hover:underline"
                                >
                                  {asset.job_number || '-'}
                                </Link>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {asset.pass_fail_status ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      asset.pass_fail_status === 'PASS'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                    }`}
                                  >
                                    {asset.pass_fail_status}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {format(new Date(asset.created_at), 'MMM d, yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end space-x-3">
                                  {asset.file_url.startsWith('report:') ? (
                                    <Link 
                                      to={getReportEditPath(asset)}
                                      className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="ml-1">View</span>
                                    </Link>
                                  ) : (
                                    <a 
                                      href={asset.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="ml-1">View</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6">
                        <div className="text-center py-8">
                          <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                            <Package className="h-6 w-6" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">No assets found</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            This customer doesn't have any calibration assets yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jobs' && !isCalibrationDivision() && (
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

          {activeTab === 'documents' && !isCalibrationDivision() && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Customer Documents</h2>
                </div>
              </div>
              <CustomerDocumentManagement customerId={customer.id} />
            </div>
          )}

          {activeTab === 'interactions' && !isCalibrationDivision() && (
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
                        C
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        No primary contact
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        -
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
              

            </div>
          )}

          {activeTab === 'health' && !isCalibrationDivision() && (
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