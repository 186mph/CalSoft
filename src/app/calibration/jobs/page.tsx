'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Trash2, Eye, Clock, Plus, Pencil, ChevronDown, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/Separator';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CalibrationJobButton } from '@/components/jobs/CalibrationJobButton';
import { toast } from 'react-hot-toast';

interface Customer {
  company_name?: string;
  name: string;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  start_date: string;
  due_date: string;
  budget: number;
  customer_id: string;
  created_at: string;
  customers: Customer;
  division: string;
  notes?: string;
  equipment_types?: string[];
  technicians?: string[];
  comment_count?: number;
}

// Normalize historical calibration job numbers to 1YYXXX (strip any stray zeros in the middle)
const formatLabJobNumber = (n?: string): string => {
  if (!n) return '';
  const digits = String(n).replace(/[^0-9]/g, '');
  
  // Handle the specific pattern 1YY0XXX -> 1YYXXX (7 digits with extra zero)
  if (/^1\d{2}0\d{3}$/.test(digits)) {
    const prefix = digits.slice(0, 3);
    const seq = digits.slice(-3);
    return `${prefix}${seq}`;
  }
  
  // Handle 6-digit numbers that are already correct (1YYXXX)
  if (/^1\d{2}\d{3}$/.test(digits)) {
    return digits; // Return as-is, no formatting needed
  }
  
  // Handle other patterns that start with 1YY (fallback)
  if (/^1\d{2}\d{3,}$/.test(digits)) {
    const prefix = digits.slice(0, 3);
    const seq = digits.slice(-3).padStart(3, '0');
    return `${prefix}${seq}`;
  }
  
  return n;
};

export default function CalibrationJobsPage() {
  console.log('🔧 CalibrationJobsPage: Component rendered with updated text');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'calibration' | 'armadillo'>('calibration');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [labCustomersExists, setLabCustomersExists] = useState<boolean | null>(null);
  

  
  // Edit job states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Job | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const equipmentDropdownRef = useRef<HTMLDivElement>(null);
  const [updatingStatusJobId, setUpdatingStatusJobId] = useState<string | null>(null);

  // Technician states
  const [technicians, setTechnicians] = useState<Array<{id: string; email: string; name: string; user_metadata?: any}>>([]);
  const [isTechnicianDropdownOpen, setIsTechnicianDropdownOpen] = useState(false);
  const technicianDropdownRef = useRef<HTMLDivElement>(null);

  // Completion confirmation prompt state
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ jobId: string; status: string } | null>(null);

  // Redirect to portal if user is not authenticated
  useEffect(() => {
    // Only redirect if user is not authenticated, allow all authenticated users
    if (!user) {
      navigate('/portal');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
      }
    };

    checkUser();
  }, []);

  // Check if lab_customers table exists on first load
  useEffect(() => {
    const checkLabCustomersTable = async () => {
      try {
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .select('id')
          .limit(1);
        
        // If we get data or a different error (not 406), the table exists
        setLabCustomersExists(!error || !error.message.includes('relation') && !error.message.includes('does not exist'));
      } catch (err) {
        // Table doesn't exist
        setLabCustomersExists(false);
      }
    };

    if (labCustomersExists === null) {
      checkLabCustomersTable();
    }
  }, [labCustomersExists]);

  // Fetch lab jobs specific to the Calibration and Armadillo divisions
  useEffect(() => {
    // Defer heavy fetch to next tick so first render paints quickly
    const id = window.setTimeout(() => {
      fetchJobs(activeFilter);
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshTrigger, activeFilter, statusFilter]);


  // Handle clicking outside the equipment dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target as Node)) {
        setIsEquipmentDropdownOpen(false);
      }
      if (technicianDropdownRef.current && !technicianDropdownRef.current.contains(event.target as Node)) {
        setIsTechnicianDropdownOpen(false);
      }
    }
    
    if (isEquipmentDropdownOpen || isTechnicianDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEquipmentDropdownOpen, isTechnicianDropdownOpen]);

  // Fetch technicians when component mounts or filter changes
  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchTechnicians();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeFilter]);
  const fetchJobs = async (filter: 'calibration' | 'armadillo' = 'calibration') => {
    try {
      setLoading(true);

      // Query lab_ops.lab_jobs without nested customer join to avoid schema issues
      let query = supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('id, job_number, title, description, status, priority, start_date, due_date, budget, customer_id, created_at, division, notes')
        .eq('division', filter)
        .order('created_at', { ascending: false });

      const { data: jobData, error: jobError } = await query;

      if (jobError) {
        console.error('Error fetching lab jobs:', jobError);
        return;
      }




      // Fetch customers separately for each job
      const jobsWithCustomers = await Promise.all((jobData || []).map(async (job) => {
        if (!job.customer_id) {
          return { ...job, customers: { name: '', company_name: '' } as Customer };
        }
        
        try {
          // Try both lab_ops.lab_customers and common.customers with better error handling
          let customerData: Customer | null = null;
          
          // First try lab_ops.lab_customers (if we know table exists or haven't checked yet)
          if (labCustomersExists !== false) {
            try {
            const labCustomerResult = await supabase
              .schema('lab_ops')
              .from('lab_customers')
              .select('company_name, name')
              .eq('id', job.customer_id)
              .single();

            if (labCustomerResult.data && !labCustomerResult.error) {
              customerData = labCustomerResult.data as Customer;
              console.log(`✓ Found customer in lab_ops.lab_customers for job ${job.id}`);
              }
            } catch (labError) {
              // Lab customers table might not exist or other error, continue to common.customers
              console.log(`Lab customers query failed for job ${job.id}, trying common.customers`);
            }
          }
          
          // If lab customer not found, try common.customers
          if (!customerData) {
            try {
            const commonCustomerResult = await supabase
              .schema('common')
              .from('customers')
              .select('company_name, name')
              .eq('id', job.customer_id)
              .single();

            if (commonCustomerResult.data && !commonCustomerResult.error) {
              customerData = commonCustomerResult.data as Customer;
              console.log(`✓ Found customer in common.customers for job ${job.id}`);
            } else {
                console.warn(`⚠️ Customer ${job.customer_id} not found in common.customers for job ${job.id}`);
              }
            } catch (commonError) {
              console.warn(`⚠️ Error fetching customer ${job.customer_id} from common.customers:`, commonError);
            }
          }

          if (customerData) {
            return {
              ...job,
              customers: customerData as Customer
            };
          } else {
            return { ...job, customers: { name: 'Unknown Customer', company_name: '' } as Customer };
          }
        } catch (err) {
          console.warn(`Error fetching customer for job ${job.id}:`, err);
          return { ...job, customers: { name: 'Unknown Customer', company_name: '' } as Customer };
        }
      }));


      // Fetch comment counts for each job
      const jobsWithComments = await Promise.all(jobsWithCustomers.map(async (job) => {
        try {
          const { count, error: countError } = await supabase
            .schema("lab_ops")
            .from("job_comments")
            .select("*", { count: "exact", head: true })
            .eq("job_id", job.id);

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
      // Apply status filtering
      const filteredJobs = statusFilter === 'all' 
        ? jobsWithComments 
        : jobsWithComments.filter(job => job.status === statusFilter);

      setJobs(filteredJobs);
    } catch (err) {
      console.error('Error in fetchJobs:', err);
    } finally {
      setLoading(false);
    }
  };



  const handleJobCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editFormData) return;
    const { name, value } = e.target;
    setEditFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

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
  const handleEquipmentTypeToggle = (equipmentType: string) => {
    setEditFormData(prev => {
      if (!prev) return null;
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
  };

  // Get display text for equipment types
  const getEquipmentTypesDisplay = () => {
    if (!editFormData?.equipment_types || editFormData.equipment_types.length === 0) {
      return 'Select equipment types...';
    }
    if (editFormData.equipment_types.length === 1) {
      return editFormData.equipment_types[0];
    }
    return `${editFormData.equipment_types.length} types selected`;
  };

  // Fetch technicians from auth.users or admin API
  const fetchTechnicians = async () => {
    try {
      console.log('[CalibrationJobsPage] Fetching technicians from common.profiles...');
      // Use application profiles table instead of auth or admin endpoints (client-safe)
      const { data, error } = await supabase
        .schema('common')
        .from('profiles')
        .select('id, email, name, division, role')
        .eq('role', 'Lab Technician')
        .order('name', { ascending: true });

      if (error) {
        console.error('[CalibrationJobsPage] Error fetching technicians from profiles:', error);
        setTechnicians([]);
        return;
      }

      const formattedUsers = (data || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        name: u.name || u.email || '',
        user_metadata: { division: u.division, role: u.role, name: u.name }
      }));

      const filteredUsers = activeFilter
        ? formattedUsers.filter(u => u.user_metadata?.division === activeFilter)
        : formattedUsers;

      console.log('[CalibrationJobsPage] Technicians loaded:', filteredUsers.length);
      setTechnicians(filteredUsers);
    } catch (err) {
      console.error('[CalibrationJobsPage] Exception in fetchTechnicians:', err);
      setTechnicians([]);
    }
  };

  // Handle technician toggle
  const handleTechnicianToggle = (technicianId: string) => {
    if (!editFormData) return;
    
    const currentTechnicians = editFormData.technicians || [];
    const updatedTechnicians = currentTechnicians.includes(technicianId)
      ? currentTechnicians.filter(id => id !== technicianId)
      : [...currentTechnicians, technicianId];
    
    setEditFormData(prev => prev ? { ...prev, technicians: updatedTechnicians } : null);
  };

  // Handle select all technicians
  const handleSelectAllTechnicians = () => {
    if (!editFormData) return;
    
    const allTechnicianIds = technicians.map(tech => tech.id);
    const currentTechnicians = editFormData.technicians || [];
    
    const updatedTechnicians = currentTechnicians.length === allTechnicianIds.length
      ? [] // If all are selected, deselect all
      : allTechnicianIds; // Otherwise, select all
    
    setEditFormData(prev => prev ? { ...prev, technicians: updatedTechnicians } : null);
  };

  // Get technicians display text
  const getTechniciansDisplay = () => {
    if (!editFormData?.technicians || editFormData.technicians.length === 0) {
      return 'Select technicians...';
    }
    
    if (editFormData.technicians.length === technicians.length) {
      return 'All technicians selected';
    }
    
    const selectedTechnicians = technicians.filter(tech => 
      editFormData.technicians?.includes(tech.id)
    );
    
    if (selectedTechnicians.length <= 2) {
      return selectedTechnicians.map(tech => tech.name || tech.email).join(', ');
    }
    
    return `${selectedTechnicians.length} technicians selected`;
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .update({
          title: editFormData.title,
          description: editFormData.description,
          status: editFormData.status,
          priority: editFormData.priority,
          start_date: editFormData.start_date || null,
          due_date: editFormData.due_date || null,
          budget: editFormData.budget ? parseFloat(editFormData.budget.toString()) : null,
          notes: editFormData.notes || null,
          equipment_types: editFormData.equipment_types || null,
          technicians: editFormData.technicians || null,
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      setIsEditing(false);
      setEditFormData(null);
      toast.success('Job updated successfully!');
      
      // Refresh the jobs list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle starting edit mode
  const handleStartEdit = (job: Job) => {
    setEditFormData(job);
    setIsEditing(true);
  };

  // Handle status update for individual jobs
  const handleJobStatusChange = async (jobId: string, newStatus: string, currentStatus: string) => {
    // If changing to completed, show confirmation prompt
    if (newStatus === "completed") {
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
      const { error } = await supabase
        .schema("lab_ops")
        .from("lab_jobs")
        .update({ status: newStatus })
        .eq("id", jobId);

      if (error) throw error;

      // Update local jobs state
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));

      toast.success("Status updated successfully!");
    } catch (error) {
      console.error("Error updating job status:", error);
      toast.error("Failed to update status");
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

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleDeleteJob = async (job: Job) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${job.title}" (Job #${formatLabJobNumber(job.job_number)})?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      // Delete the job from the appropriate schema based on division
      const { error } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      toast.success(`Job "${job.title}" has been deleted successfully`);
      
      // Refresh the jobs list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job. Please try again.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
            Projects
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {loading ? 'Loading...' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} found${statusFilter !== 'all' ? ` (${statusFilter} status)` : ''}`}
            </p>
        </div>
        
        {/* Quick Stats */}
        {!loading && jobs.length > 0 && (
          <div className="flex space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg text-blue-600">
                {jobs.filter(job => job.division === 'calibration').length}
              </div>
              <div className="text-gray-500">Calibration</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-green-600">
                {jobs.filter(job => job.division === 'armadillo').length}
              </div>
              <div className="text-gray-500">Armadillo</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-yellow-600">
                {jobs.filter(job => job.status === 'pending').length}
              </div>
              <div className="text-gray-500">Pending</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Job Creation Section */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="px-8 pb-8 pt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Create New Project
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Start a new calibration or armadillo project for lab operations. Projects will be automatically assigned unique project numbers.
              </p>
            </div>
            <div className="flex space-x-4">
              <CalibrationJobButton 
                onJobCreated={handleJobCreated}
                buttonText="New Project"
                division="calibration"
              />
              <CalibrationJobButton 
                onJobCreated={handleJobCreated}
                buttonText="New Armadillo Project"
                division="armadillo"
              />
            </div>
          </div>
          
          {/* Quick info about job types */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#339C5E] rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Projects:</strong> Equipment calibration and testing services
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Armadillo Projects:</strong> Specialized armadillo division services
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filter Controls */}
      <div className="mb-6">
        <div className="space-y-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap gap-4 items-center">
          <button 
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:ring-offset-2 font-medium" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh Projects
          </button>
          
            {/* Division Tab Interface */}
          <div className="flex items-center gap-2">
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === 'calibration' 
                  ? 'bg-[#339C5E] text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
                onClick={() => {
                  setActiveFilter('calibration');
                  setStatusFilter('all');
                }}
            >
              Projects
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === 'armadillo' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
                onClick={() => {
                  setActiveFilter('armadillo');
                  setStatusFilter('all');
                }}
            >
              Armadillo Jobs
              </button>
            </div>
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
      
      {/* Jobs List */}
      <Card className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeFilter === 'calibration' ? 'Projects' : 'Armadillo Jobs'}
          </h2>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mb-4 text-gray-500 dark:text-gray-400">
              No lab jobs found. Create a new job to get started.
            </div>
            <CalibrationJobButton 
              onJobCreated={handleJobCreated}
              buttonText="Create Your First Lab Job"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {jobs.map(job => (
              <div key={job.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatLabJobNumber(job.job_number)}
                      </div>
                      <select
                        value={job.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleJobStatusChange(job.id, e.target.value, job.status);
                        }}
                        disabled={updatingStatusJobId === job.id}
                        className={`ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#339C5E] min-w-[100px] ${
                          updatingStatusJobId === job.id ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="ready-to-bill">Ready To Bill</option>
                      </select>
                      <Badge className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {job.division.charAt(0).toUpperCase() + job.division.slice(1)}
                      </Badge>
                      {job.priority && (
                        <Badge className="ml-2 bg-[#339C5E] text-white">
                          {job.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {job.customers?.company_name || job.customers?.name || 'Unknown Customer'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Start: {formatDate(job.start_date)}</span>
                      <span className="mx-2">•</span>
                      <span>Due: {formatDate(job.due_date)}</span>
                      {job.budget && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Budget: ${job.budget.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:ring-offset-2"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button 
                      className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:ring-offset-2"
                      onClick={() => handleStartEdit(job)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center border-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 text-red-600"
                      onClick={() => handleDeleteJob(job)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Project Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          
          {editFormData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <Input
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditInputChange}
                    placeholder="Enter job title"
                    required
                    className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                  />
                </div>

                {/* Job Number field - read-only */}
                {editFormData.job_number && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Number</label>
                    <Input
                      value={formatLabJobNumber(editFormData.job_number)}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed !border-gray-300 dark:!border-gray-600"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    name="description"
                    value={editFormData.description || ''}
                    onChange={handleEditInputChange}
                    placeholder="Enter job description"
                    rows={3}
                    className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    name="start_date"
                    type="date"
                    value={editFormData.start_date || ''}
                    onChange={handleEditInputChange}
                    className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <Input
                    name="due_date"
                    type="date"
                    value={editFormData.due_date || ''}
                    onChange={handleEditInputChange}
                    className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:border-[#339C5E] dark:bg-dark-100 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="ready-to-bill">Ready To Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    name="priority"
                    value={editFormData.priority || '7-day'}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:border-[#339C5E] dark:bg-dark-100 dark:text-white"
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


                {/* Equipment Types field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Equipment Types</label>
                  <div className="relative" ref={equipmentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen)}
                      className="w-full px-3 py-2 text-left bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:border-[#339C5E] hover:border-[#339C5E] dark:text-white"
                    >
                      <span className={(editFormData?.equipment_types?.length || 0) === 0 ? "text-gray-500" : ""}>
                        {getEquipmentTypesDisplay()}
                      </span>
                      <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isEquipmentDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {isEquipmentDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-150 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {equipmentTypes.map(equipmentType => (
                          <label
                            key={equipmentType}
                            className="flex items-center px-3 py-2 hover:bg-[#339C5E] hover:text-white cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={editFormData?.equipment_types?.includes(equipmentType) || false}
                              onChange={() => handleEquipmentTypeToggle(equipmentType)}
                              className="mr-2 text-[#339C5E] focus:ring-[#339C5E] border-gray-300 rounded"
                            />
                            <span className="text-sm">{equipmentType}</span>
                          </label>
                        ))}
                        {(editFormData?.equipment_types?.length || 0) > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                            <button
                              type="button"
                              onClick={() => setEditFormData(prev => prev ? { ...prev, equipment_types: [] } : null)}
                              className="text-xs text-gray-500 hover:text-[#339C5E] transition-colors"
                            >
                              Clear all selections
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Technicians field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Technicians</label>
                  <div className="relative" ref={technicianDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsTechnicianDropdownOpen(!isTechnicianDropdownOpen)}
                      className="w-full px-3 py-2 text-left bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:border-[#339C5E] hover:border-[#339C5E] dark:text-white"
                    >
                      <span className={(editFormData?.technicians?.length || 0) === 0 ? "text-gray-500" : ""}>
                        {getTechniciansDisplay()}
                      </span>
                      <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isTechnicianDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {isTechnicianDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-150 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {technicians.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No technicians available
                          </div>
                        ) : (
                          <>
                            {/* Select All option */}
                            <label className="flex items-center px-3 py-2 hover:bg-[#339C5E] hover:text-white cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-600">
                              <input
                                type="checkbox"
                                checked={technicians.length > 0 && technicians.every(tech => editFormData?.technicians?.includes(tech.id))}
                                onChange={handleSelectAllTechnicians}
                                className="mr-2 text-[#339C5E] focus:ring-[#339C5E] border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium">Select All</span>
                            </label>
                            
                            {/* Individual technicians */}
                            {technicians.map(technician => (
                              <label
                                key={technician.id}
                                className="flex items-center px-3 py-2 hover:bg-[#339C5E] hover:text-white cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={editFormData?.technicians?.includes(technician.id) || false}
                                  onChange={() => handleTechnicianToggle(technician.id)}
                                  className="mr-2 text-[#339C5E] focus:ring-[#339C5E] border-gray-300 rounded"
                                />
                                <span className="text-sm">{technician.name || technician.email}</span>
                              </label>
                            ))}
                          </>
                        )}
                        {(editFormData?.technicians?.length || 0) > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                            <button
                              type="button"
                              onClick={() => setEditFormData(prev => prev ? { ...prev, technicians: [] } : null)}
                              className="text-xs text-gray-500 hover:text-[#339C5E] transition-colors"
                            >
                              Clear all selections
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea
                    name="notes"
                    value={editFormData.notes || ''}
                    onChange={handleEditInputChange}
                    placeholder="Additional notes or special requirements..."
                    rows={3}
                    className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#339C5E] hover:bg-[#2d8a54] text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Dialog */}
      <Dialog open={showCompletionPrompt} onOpenChange={setShowCompletionPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Job Confirmation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
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
          
          <DialogFooter>
            <button
              onClick={handleCompletionCancel}
              className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handleCompletionConfirm}
              className="px-4 py-2 bg-[#339C5E] hover:bg-[#2d8751] text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-[#339C5E] focus:ring-offset-2 transition-colors"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 