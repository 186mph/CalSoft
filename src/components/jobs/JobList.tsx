import React, { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, MapPin, Calendar, ChevronRight, ChevronDown, Building, User, Globe, Users, MessageCircle } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { supabase, isConnectionError } from '@/lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { useDivision } from '../../App';
import { JobNotifications } from './JobNotifications';
import { Database } from '@/types/supabase'; // Assuming this is the correct path to your generated types
import { toast } from 'react-hot-toast';
import { getDivisionAccentClasses } from '../../lib/utils';

// Helper function to determine if the division is lab-related
const isLabDivision = (div: string | null | undefined): boolean => {
  if (!div) return false;
  const lowerDiv = div.toLowerCase();
  return ['calibration', 'armadillo', 'lab'].includes(lowerDiv);
};

interface Job {
  id: string;
  customer_id: string | null; 
  title: string;
  status: string;
  start_date: string | null; 
  due_date: string | null; 
  budget: number | null; 
  amount_paid?: number | null; 
  priority: string;
  job_number: string | null; 
  division?: string | null;
  description?: string | null;
  user_id?: string | null;
  notes?: string | null;
  job_type?: string | null;
  portal_type?: string | null;
  equipment_types?: string[] | null;
  created_at?: string;
  updated_at?: string;
  comment_count?: number;
  customers?: { 
    id: string;
    name: string;
    company_name: string;
  } | null; 
}

interface Customer {
  id: string;
  name: string;
  company_name: string;
}

interface JobFormData {
  customer_id: string; 
  title: string;
  description: string;
  status: string;
  start_date: string;
  due_date: string;
  budget: string; 
  priority: string;
  notes?: string;
  job_number?: string;
  equipment_types?: string[];
}

const initialFormData: JobFormData = {
  customer_id: '',
  title: '',
  description: '',
  status: 'pending',
  start_date: '',
  due_date: '',
  budget: '',
      priority: '7-day',
  notes: '',
  job_number: '',
  equipment_types: [],
};

export default function JobList() {
  const { user } = useAuth();
  const { division } = useDivision();
  const accentClasses = getDivisionAccentClasses(division);
  const location = useLocation();
  const navigate = useNavigate();
  const { division: urlDivision } = useParams();
  const [searchParams] = useSearchParams();
  
  const divisionValue = urlDivision || division || searchParams.get('division');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const equipmentDropdownRef = useRef<HTMLDivElement>(null);
  const [updatingStatusJobId, setUpdatingStatusJobId] = useState<string | null>(null);
  
  // Completion confirmation prompt state
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ jobId: string; status: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchCustomers();
    }
  }, [user, divisionValue]);

  // Handle clicking outside the equipment dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target as Node)) {
        setIsEquipmentDropdownOpen(false);
      }
    }
    
    if (isEquipmentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEquipmentDropdownOpen]);

  async function fetchJobs() {
    setLoading(true);
    try {
      console.log('Fetching jobs for division:', divisionValue);
      const currentSchema = isLabDivision(divisionValue) ? 'lab_ops' : 'neta_ops';
      const currentTable = isLabDivision(divisionValue) ? 'lab_jobs' : 'jobs';

      console.log(`Using schema: ${currentSchema}, table: ${currentTable}`);

      let jobQuery = supabase
        .schema(currentSchema)
        .from(currentTable)
        .select('*') 
        .order('created_at', { ascending: false });

      if (divisionValue) {
        jobQuery = jobQuery.eq('division', divisionValue);
      }

      const { data: jobData, error: jobError } = await jobQuery;

      if (jobError) {
        console.error('Error fetching base job data:', jobError);
        if (isConnectionError(jobError)) {
          throw new Error('Unable to connect to the database. Please check your connection.');
        }
        throw jobError;
      }

      if (!jobData) {
        setJobs([]);
        return; 
      }

      const jobsWithCustomers = await Promise.all(jobData.map(async (job) => {
        if (!job.customer_id) {
          return { ...job, customers: null }; 
        }
        
        try {
          // Use lab_ops.lab_customers for lab divisions, common.customers for others
          const isLab = isLabDivision(divisionValue);
          const customerSchema = isLab ? 'lab_ops' : 'common';
          const customerTable = isLab ? 'lab_customers' : 'customers';
          
          const { data: customerData, error: customerError } = await supabase
            .schema(customerSchema)
            .from(customerTable)
            .select('id, name, company_name')
            .eq('id', job.customer_id)
            .single();

          if (customerError) {
            console.warn(`Error fetching customer for job ${job.id}:`, customerError);
            return { ...job, customers: null };
          }
          
          return { ...job, customers: customerData };
        } catch (err) {
           console.warn(`Error processing customer for job ${job.id}:`, err);
           return { ...job, customers: null };
        }
      }));

      // Fetch comment counts for each job
      const jobsWithComments = await Promise.all(jobsWithCustomers.map(async (job) => {
        try {
          const { count, error: countError } = await supabase
            .schema(currentSchema)
            .from('job_comments')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

          if (countError) {
            console.warn(`Error fetching comment count for job ${job.id}:`, countError);
            return { ...job, comment_count: 0 };
          }

          return { ...job, comment_count: count || 0 };
        } catch (err) {
          console.warn(`Error processing comment count for job ${job.id}:`, err);
          return { ...job, comment_count: 0 };
        }
      }));

      setJobs(jobsWithComments as Job[]); // Cast to Job[]

    } catch (error) {
      console.error('Error in fetchJobs function:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      console.log('Fetching customers for division:', divisionValue);
      
      // Use lab_ops.lab_customers for lab divisions, common.customers for others
      const isLab = isLabDivision(divisionValue);
      const schema = isLab ? 'lab_ops' : 'common';
      const table = isLab ? 'lab_customers' : 'customers';
      
      console.log(`Using schema: ${schema}, table: ${table}`);
      
      const { data, error } = await supabase
        .schema(schema)
        .from(table)
        .select('id, name, company_name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        if (isConnectionError(error)) {
          throw new Error('Unable to connect to the database. Please check your connection.');
        }
        throw error;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    let payloadToLog: any = null; // For logging

    try {
      const currentSchema = isLabDivision(divisionValue) ? 'lab_ops' : 'neta_ops';
      const currentTable = isLabDivision(divisionValue) ? 'lab_jobs' : 'jobs';
      const activeDivision = divisionValue;

      console.log(`Saving job to schema: ${currentSchema}, table: ${currentTable} for division: ${activeDivision}`);

      let finalBudget: number | undefined;
      if (formData.budget) {
        const parsedBudget = parseFloat(formData.budget);
        if (!isNaN(parsedBudget)) {
          finalBudget = parsedBudget;
        }
      }
      
      if (activeDivision?.toLowerCase() === 'calibration' || activeDivision?.toLowerCase() === 'armadillo') {
        finalBudget = undefined; 
      }

      let result;
      
      if (currentSchema === 'lab_ops') {
        const labJobData: Database['lab_ops']['Tables']['lab_jobs']['Insert'] & { equipment_types?: string[] | null } = {
          title: formData.title,
          customer_id: formData.customer_id || null, 
          description: formData.description || undefined,
          status: formData.status || 'pending',
          priority: formData.priority || '7-day',
          start_date: formData.start_date || null, 
          due_date: formData.due_date || null,     
          notes: formData.notes || undefined,
          job_number: formData.job_number || null, 
          user_id: user.id,
          division: activeDivision,                
          budget: finalBudget === undefined ? null : finalBudget, 
          portal_type: 'lab',
          equipment_types: formData.equipment_types && formData.equipment_types.length > 0 ? formData.equipment_types : null,
        };
        payloadToLog = labJobData;

        result = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .insert(labJobData)
          .select('id')
          .single();

      } else { // neta_ops
        if (!formData.customer_id) {
            console.error('Customer ID is required for neta_ops jobs.');
            alert('Customer ID is required.');
            return; 
        }

        const netaJobData: Database['neta_ops']['Tables']['jobs']['Insert'] & { equipment_types?: string[] | null } = {
          title: formData.title,
          customer_id: formData.customer_id, // Must be string
          description: formData.description || undefined,
          status: formData.status || 'pending',
          priority: formData.priority || '7-day',
          start_date: formData.start_date || undefined,
          due_date: formData.due_date || undefined,
          notes: formData.notes || undefined,
          job_number: formData.job_number || undefined,
          user_id: user.id,
          division: activeDivision || undefined,
          budget: finalBudget, 
          portal_type: 'neta',
          equipment_types: formData.equipment_types && formData.equipment_types.length > 0 ? formData.equipment_types : null,
          // amount_paid is intentionally removed as it's not in the Insert type
        };
        payloadToLog = netaJobData;
        
        result = await supabase
          .schema('neta_ops')
          .from('jobs')
          .insert(netaJobData)
          .select('id')
          .single();
      }

      if (result.error) {
        console.error(`Error creating job in ${currentSchema}.${currentTable}:`, result.error);
        console.error('Payload sent for ' + currentSchema + ':', payloadToLog);
        throw result.error;
      }
      
      console.log(`Job created successfully in ${currentSchema}.${currentTable}:`, result.data);

      setIsOpen(false);
      setFormData(initialFormData);
      fetchJobs();
    } catch (error) {
      console.error('Caught error in handleSubmit:', error);
      // Log payloadToLog here as well if an error is caught after payload construction but before/during Supabase call
      if (payloadToLog) {
        console.error('Payload at time of error:', payloadToLog);
      }
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Equipment types options
  const equipmentTypes = [
    'Gloves',
    'Sleeves', 
    'Blankets',
    'Live-Line Tools',
    'Line Hose',
    'Ground Cables',
    'Meters',
    'Torques',
    'Bucket Trucks',
    'Diggers/Derek'
  ];

  // Handle equipment type selection
  function handleEquipmentTypeToggle(equipmentType: string) {
    setFormData(prev => {
      const currentTypes = prev.equipment_types || [];
      const isSelected = currentTypes.includes(equipmentType);
      
      if (isSelected) {
        return {
          ...prev,
          equipment_types: currentTypes.filter(type => type !== equipmentType)
        };
      } else {
        return {
          ...prev,
          equipment_types: [...currentTypes, equipmentType]
        };
      }
    });
  }

  // Get display text for equipment types
  function getEquipmentTypesDisplay() {
    if (!formData.equipment_types || formData.equipment_types.length === 0) {
      return 'Select equipment types...';
    }
    if (formData.equipment_types.length === 1) {
      return formData.equipment_types[0];
    }
    return `${formData.equipment_types.length} types selected`;
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  async function handleDelete() {
    if (!jobToDelete || !user) return;
    
    const jobBeingDeleted = jobs.find(j => j.id === jobToDelete);
    const schemaToDeleteFrom = isLabDivision(jobBeingDeleted?.division) ? 'lab_ops' : 'neta_ops';
    const tableToDeleteFrom = isLabDivision(jobBeingDeleted?.division) ? 'lab_jobs' : 'jobs';

    try {
      // First, find and update any opportunities that reference this job (assuming opportunities are only linked to neta_ops.jobs)
      // If opportunities can also be linked to lab_ops.lab_jobs, this logic needs adjustment.
      if (schemaToDeleteFrom === 'neta_ops') {
        const { error: opportunityUpdateError } = await supabase
          .schema('business') // Assuming opportunities are in 'business' schema
          .from('opportunities')
          .update({ job_id: null })
          .eq('job_id', jobToDelete);

        if (opportunityUpdateError) {
          console.error('Error updating opportunity references:', opportunityUpdateError);
          // Decide if this should throw and stop deletion or just warn
        }
      }

      // Now delete the job itself
      const { error } = await supabase
        .schema(schemaToDeleteFrom)
        .from(tableToDeleteFrom)
        .delete()
        .eq('id', jobToDelete);

      if (error) throw error;

      fetchJobs();
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job. Please try again.');
    }
  }

  // Handle status update for individual jobs
  const handleJobStatusChange = async (jobId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return;

    // If changing to completed, show confirmation prompt
    if (newStatus === 'completed') {
      setPendingStatusChange({ jobId, status: newStatus });
      setShowCompletionPrompt(true);
      return;
    }

    // For other status changes, proceed normally
    await updateJobStatus(jobId, newStatus);
  };

  // Function to actually update the job status
  const updateJobStatus = async (jobId: string, newStatus: string) => {
    setUpdatingStatusJobId(jobId);
    
    try {
      const jobToUpdate = jobs.find(j => j.id === jobId);
      if (!jobToUpdate) return;

      // Determine schema and table based on job division
      const isLabJob = isLabDivision(jobToUpdate.division);
      const schema = isLabJob ? 'lab_ops' : 'neta_ops';
      const table = isLabJob ? 'lab_jobs' : 'jobs';

      const { error } = await supabase
        .schema(schema)
        .from(table)
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      // Update local jobs state
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));

      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatusJobId(null);
    }
  };

  // Handle completion confirmation
  const handleCompletionConfirm = async () => {
    if (pendingStatusChange) {
      await updateJobStatus(pendingStatusChange.jobId, pendingStatusChange.status);
    }
    setShowCompletionPrompt(false);
    setPendingStatusChange(null);
  };

  // Handle completion cancellation
  const handleCompletionCancel = () => {
    setShowCompletionPrompt(false);
    setPendingStatusChange(null);
  };

  function confirmDelete(jobId: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    setJobToDelete(jobId);
    setDeleteConfirmOpen(true);
  }

  function formatDivisionName(divisionValue: string | null): string {
    if (!divisionValue) return '';
    
    const divisionMap: { [key: string]: string } = {
      'north_alabama': 'North Alabama Division',
      'tennessee': 'Tennessee Division',
      'georgia': 'Georgia Division',
      'international': 'International Division',
      'Decatur': 'North Alabama Division (Decatur)',
      'calibration': 'Calibration Lab',
      'armadillo': 'Armadillo Lab',
      'lab': 'Lab Portal'
    };
    
    return divisionMap[divisionValue.toLowerCase()] || divisionValue;
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Jobs {formatDivisionName(divisionValue)}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            A list of all the jobs in the selected division.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <JobNotifications />
          
          {(divisionValue?.toLowerCase() === 'calibration' || divisionValue?.toLowerCase() === 'armadillo') && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className={`inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white ${accentClasses.bg} ${accentClasses.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentClasses.ring}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="-mx-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:-mx-6 md:mx-0 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50 dark:bg-dark-150">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">
                  Job #
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Title
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Customer
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Due Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Budget
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Division
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Priority
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-dark-150">
              {jobs.map((job) => (
                <tr 
                  key={job.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ease-in-out cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                    {job.job_number || 'Pending'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span>{job.title}</span>
                      {job.comment_count && job.comment_count > 0 && (
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-blue-500 ml-1">{job.comment_count}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {job.customers?.company_name || job.customers?.name || 'No customer'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <select
                      value={job.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleJobStatusChange(job.id, e.target.value, job.status);
                      }}
                      disabled={updatingStatusJobId === job.id}
                      className={`px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px] ${
                        updatingStatusJobId === job.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="ready-to-bill">Ready To Bill</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    ${job.budget?.toLocaleString() ?? 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDivisionName(job.division || null)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      job.priority === 'same-day' || job.priority === 'on-site' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' :
                      job.priority === '1-day' || job.priority === '2-day' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400' :
                      job.priority === '3-day' || job.priority === '5-day' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400' :
                      job.priority === '7-day' || job.priority === '14-day' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400' :
                      job.priority === '1-month' || job.priority === '6-month' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                    }`}>
                      {job.priority || 'Not set'}
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={(e) => confirmDelete(job.id, e)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-md w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">
              Delete Job
            </Dialog.Title>
            
            <p className="text-gray-700 dark:text-dark-300 mb-4">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-300 bg-white dark:bg-dark-100 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Job Creation Form Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-xl w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Job
            </Dialog.Title>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Customer *
                  </label>
                  <div className="mt-1">
                    <select
                      id="customer_id"
                      name="customer_id"
                      required
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    >
                      <option value="">Select a customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name || customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Title *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <div className="mt-1">
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <div className="mt-1">
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    >
                      <option value="7-day">7-Day</option>
                      <option value="3-day">3-Day</option>
                      <option value="2-day">2 day</option>
                      <option value="same-day">Same-Day</option>
                      <option value="on-site">On-Site</option>
                      <option value="1-month">1-Month</option>
                      <option value="1-day">1-Day</option>
                      <option value="14-day">14 Day</option>
                      <option value="6-month">6 - Month</option>
                      <option value="5-day">5-Day</option>
                    </select>
                  </div>
                </div>

                {/* Equipment Types field - only show for editing since we can't determine division during creation */}
                <div className="sm:col-span-2">
                  <label htmlFor="equipment_types" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Equipment Types
                  </label>
                  <div className="mt-1 relative" ref={equipmentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen)}
                      className="w-full px-3 py-2 text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-500 dark:text-white"
                    >
                      <span className={(formData.equipment_types?.length || 0) === 0 ? 'text-gray-500' : ''}>
                        {getEquipmentTypesDisplay()}
                      </span>
                      <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isEquipmentDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isEquipmentDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {equipmentTypes.map(equipmentType => (
                          <label
                            key={equipmentType}
                            className="flex items-center px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.equipment_types?.includes(equipmentType) || false}
                              onChange={() => handleEquipmentTypeToggle(equipmentType)}
                              className="mr-2 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm">{equipmentType}</span>
                          </label>
                        ))}
                        {(formData.equipment_types?.length || 0) > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, equipment_types: [] }))}
                              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              Clear all selections
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="start_date"
                      id="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="due_date"
                      id="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div>

                {/* Budget field visibility: always hidden if division is calibration or armadillo */}
                {!(divisionValue?.toLowerCase() === 'calibration' || divisionValue?.toLowerCase() === 'armadillo') && (
                  <div className="sm:col-span-1">
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Budget
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="budget"
                        id="budget"
                        step="0.01"
                        value={formData.budget}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>
                )}

                {/* Optional notes field */}
                 <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div>
                
                {/* Optional Job Number field - if it can be manually entered */}
                {/* <div className="sm:col-span-1">
                  <label htmlFor="job_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Number (Optional)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="job_number"
                      id="job_number"
                      value={formData.job_number}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </div>
                </div> */}

              </div>

              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>

      {/* Completion Confirmation Dialog */}
      <Dialog
        open={showCompletionPrompt}
        onClose={handleCompletionCancel}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-md w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={handleCompletionCancel}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Complete Job Confirmation
            </Dialog.Title>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Confirm reports have been received by customer
                </p>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mark if order is shipped or picked up
                </p>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  If shipped: must provide tracking number
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none"
                onClick={handleCompletionCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none"
                onClick={handleCompletionConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}