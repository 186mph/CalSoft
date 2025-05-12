import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, ChevronDown, Plus, Paperclip, X, FileEdit, Pencil, Upload, FileText, Package, Trash2, ClipboardCheck } from 'lucide-react';
import { supabase, isConnectionError } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useJobDetails } from '../../lib/hooks';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import { reportImportService } from '../../services/reportImport';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Alert, AlertDescription } from '../ui/Alert';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';
import JobSurveys from './JobSurveys';
import ResourceAllocationManager from './ResourceAllocationManager';
import JobCostTracking from './JobCostTracking';
import JobProfitabilityAnalysis from './JobProfitabilityAnalysis';
import { JobNotifications } from './JobNotifications';
import { SLAManagement } from './SLAManagement';
import { ReportApprovalWorkflow } from '../reports/ReportApprovalWorkflow';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  job_number: string | null;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  customer_id: string;
  division?: string | null;
  customers: {
    id: string;
    name: string;
    company_name?: string | null;
    address?: string | null;
  };
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_primary: boolean;
}

interface Customer {
  id: string;
  name: string;
  company_name: string;
}

interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  template_type?: 'MTS' | 'ATS' | null;
}

interface RelatedOpportunity {
  id: string;
  quote_number: string;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { jobDetails } = useJobDetails(id);
  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobAssets, setJobAssets] = useState<Asset[]>([]);
  const [filteredJobAssets, setFilteredJobAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [opportunity, setOpportunity] = useState<RelatedOpportunity | null>(null);
  const [isStatusEditing, setIsStatusEditing] = useState(false);
  const [isPriorityEditing, setIsPriorityEditing] = useState(false);
  const [isDueDateEditing, setIsDueDateEditing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempDueDate, setTempDueDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTab, setCurrentTab] = useState('details');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('document');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  // Default assets that are always available
  const defaultAssets: Asset[] = [
    {
      id: 'switchgear-inspection-report',
      name: '1-Switchgear, Switchboard, Panelboard Inspection & Test Report ATS 21',
      file_url: `report:/jobs/${id}/switchgear-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'panelboard-inspection-report',
      name: '1-Panelboard Inspection & Test Report ATS 21',
      file_url: `report:/jobs/${id}/panelboard-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'dry-type-transformer-test',
      name: '2-Dry Type Xfmr. Visual, Mechanical, Insulation Resistance Test ATS 21',
      file_url: `report:/jobs/${id}/dry-type-transformer?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'large-dry-type-transformer-test',
      name: '2-Large Dry Type Xfmr. Visual, Mechanical, Insulation Resistance Test ATS 21',
      file_url: `report:/jobs/${id}/large-dry-type-transformer?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'liquid-filled-transformer-test',
      name: '2-Liquid Filled Xfmr. Visual, Mechanical, Insulation Resistance Test ATS 21',
      file_url: `report:/jobs/${id}/liquid-filled-transformer?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'oil-inspection-report',
      name: '2-Oil Xfmr. Inspection and Test ATS 21',
      file_url: `report:/jobs/${id}/oil-inspection?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-cable-test-12sets',
      name: '3-Low Voltage Cable Test ATS 12 sets',
      file_url: `report:/jobs/${id}/low-voltage-cable-test-12sets?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-cable-test-20sets',
      name: '3-Low Voltage Cable Test ATS 20 sets',
      file_url: `report:/jobs/${id}/low-voltage-cable-test-20sets?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'medium-voltage-vlf-tan-delta',
      name: '4-Medium Voltage Cable VLF Tan Delta Test ATS',
      file_url: `report:/jobs/${id}/medium-voltage-vlf-tan-delta?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'medium-voltage-vlf',
      name: '4-Medium Voltage Cable VLF Test ATS',
      file_url: `report:/jobs/${id}/medium-voltage-vlf?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'medium-voltage-cable-vlf-test',
      name: '4-Medium Voltage Cable VLF Test With Tan Delta ATS',
      file_url: `report:/jobs/${id}/medium-voltage-cable-vlf-test?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'metal-enclosed-busway',
      name: '5-Metal Enclosed Busway ATS',
      file_url: `report:/jobs/${id}/metal-enclosed-busway?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-switch-multi-device-test',
      name: '6-Low Voltage Switch - Multi-Device TEST',
      file_url: `report:/jobs/${id}/low-voltage-switch-multi-device-test?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-switch-report',
      name: '6-Low Voltage Switch ATS',
      file_url: `report:/jobs/${id}/low-voltage-switch-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'mv-switch-oil-report',
      name: '7-Medium Voltage Way Switch (OIL) Report ATS 21',
      file_url: `report:/jobs/${id}/medium-voltage-switch-oil-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-circuit-breaker-electronic-trip-unit-ats',
      name: '8-Low Voltage Circuit Breaker Electronic Trip Unit ATS - Secondary Injection',
      file_url: `report:/jobs/${id}/low-voltage-circuit-breaker-electronic-trip-ats-secondary-injection-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-circuit-breaker-electronic-trip-ats-primary-injection',
      name: '8-Low Voltage Circuit Breaker Electronic Trip Unit ATS - Primary Injection',
      file_url: `report:/jobs/${id}/low-voltage-circuit-breaker-electronic-trip-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-circuit-breaker-thermal-magnetic-ats',
      name: '8-Low Voltage Circuit Breaker Thermal-Magnetic ATS',
      file_url: `report:/jobs/${id}/low-voltage-circuit-breaker-thermal-magnetic-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'low-voltage-panelboard-small-breaker-report',
      name: '8-Low Voltage Panelboard Small Breaker Test ATS (up to 60 individual breakers)',
      file_url: `report:/jobs/${id}/low-voltage-panelboard-small-breaker-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    }
  ];

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    // Add event listener only if dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Check for tab query parameter and update the active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'assets', 'surveys', 'sla'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (user && id) {
      // If we have job details from the hook, use them
      if (jobDetails) {
        // Create a compatible job object from jobDetails
        const jobFromDetails: Job = {
          id: jobDetails.id,
          customer_id: jobDetails.customer?.id || '',
          title: jobDetails.title,
          description: jobDetails.description || '',
          status: jobDetails.status,
          priority: jobDetails.priority || 'medium',
          job_number: jobDetails.job_number,
          start_date: jobDetails.start_date || null,
          due_date: jobDetails.due_date || null,
          budget: jobDetails.budget || null,
          division: (jobDetails as any).division || null,
          customers: jobDetails.customer ? {
            id: jobDetails.customer.id,
            name: jobDetails.customer.name,
            company_name: jobDetails.customer.company_name,
            address: (jobDetails.customer as any).address,
          } : {
            id: '',
            name: '',
            company_name: null,
          }
        };
        
        setJob(jobFromDetails);
        
        if (jobDetails.customer) {
          setCustomer({
            id: jobDetails.customer.id,
            name: jobDetails.customer.name,
            company_name: jobDetails.customer.company_name || '',
          });
        }
        
        // Still need to fetch contacts
        fetchContacts(jobDetails.customer?.id);
        setLoading(false);
      } else {
        // Fallback to original fetching
        // fetchJobDetails(); 
      }
      
      // These fetches might still be needed if useJobDetails doesn't cover them
      fetchAssets(); 
      fetchJobAssets();
      
      // Fetch related opportunity if exists
      const fetchRelatedOpportunity = async () => {
        const opportunityData = await fetchOpportunityForJob(id); 
        setOpportunity(opportunityData);
      };
      
      fetchRelatedOpportunity();
    }
  }, [user, id, jobDetails]); // Depend on jobDetails from the hook

  useEffect(() => {
    if (job && !editFormData) {
      console.log('Setting edit form data with dates:', { 
        start_date: job.start_date, 
        due_date: job.due_date 
      });
      
      // Use normalized dates when initializing edit form
      setEditFormData({
        ...job,
        start_date: normalizeDate(job.start_date),
        due_date: normalizeDate(job.due_date)
      });
    }
  }, [job]);

  // Helper function to normalize date format
  function normalizeDate(dateString: string | null) {
    if (!dateString) return '';
    // Convert to YYYY-MM-DD for input elements
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date normalization error:', error);
      return '';
    }
  }

  useEffect(() => {
    // Filter job assets when search query changes
    if (searchQuery.trim() === '') {
      setFilteredJobAssets(jobAssets);
    } else {
      const filtered = jobAssets.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobAssets(filtered);
    }
  }, [searchQuery, jobAssets]);

  // Filter report templates based on search
  const filteredReportTemplates = reportSearchQuery.trim() === '' 
    ? defaultAssets 
    : defaultAssets.filter(asset => 
        asset.name.toLowerCase().includes(reportSearchQuery.toLowerCase())
      );

  async function fetchAssets() {
    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  }

  async function fetchJobAssets() {
    if (!id) return;
    try {
      // 1. Fetch asset IDs associated with the job
      const { data: jobAssetLinks, error: linksError } = await supabase
        .schema('neta_ops')
        .from('job_assets')
        .select('asset_id')
        .eq('job_id', id);

      if (linksError) {
        console.error('Error fetching job asset links:', linksError);
        throw linksError;
      }

      if (!jobAssetLinks || jobAssetLinks.length === 0) {
        setJobAssets([]);
        setFilteredJobAssets([]);
        return;
      }

      const assetIds = jobAssetLinks.map(link => link.asset_id);

      // 2. Fetch the details of those assets
      const { data: assetsData, error: assetsError } = await supabase
        .schema('neta_ops')
        .from('assets')
        .select('id, name, file_url, created_at')
        .in('id', assetIds);

      if (assetsError) {
        console.error('Error fetching linked assets:', assetsError);
        throw assetsError;
      }

      setJobAssets(assetsData || []);
      setFilteredJobAssets(assetsData || []);
    } catch (error) {
      console.error('Error fetching job assets:', error);
    }
  }

  async function fetchContacts(customerId?: string) {
    if (!customerId) {
      setContacts([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .schema('common') // Add schema
        .from('contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false }); // Order by primary contact first

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  }

  async function fetchOpportunityForJob(jobId: string) {
    if (!jobId) return null;
    try {
      const { data, error } = await supabase
        .schema('business') // Add schema
        .from('opportunities')
        .select('id, quote_number') // Removed division
        .eq('job_id', jobId)
        .maybeSingle(); // Use maybeSingle as there might not be a linked opportunity

      if (error) {
        console.error('Error fetching related opportunity:', error);
        return null;
      }
      return data as RelatedOpportunity | null;
    } catch (error) {
      console.error('Catch block: Error fetching related opportunity:', error);
      return null;
    }
  }

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  // Handle file change for asset upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle file upload for adding a new asset
  const handleFileUpload = async () => {
    if (!id) {
      toast.error('Job ID is missing');
      return;
    }

    // If a report template is selected
    if (selectedAssetType !== 'document') {
      const selectedReport = defaultAssets.find(asset => asset.id === selectedAssetType);
      if (selectedReport) {
        // Navigate to the report page
        navigate(selectedReport.file_url.replace('report:', ''));
        return;
      }
    }

    // For document uploads
    if (!selectedFile || !newAssetName.trim()) {
      toast.error('Please provide a file and asset name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `job-assets/${id}/${fileName}`;

      // Set progress to show activity
      setUploadProgress(10);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      // Update progress after upload
      setUploadProgress(70);

      // 2. Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Create asset record in database
      const { data: assetData, error: assetError } = await supabase
        .schema('neta_ops')
        .from('assets')
        .insert({
          name: newAssetName,
          file_url: publicUrl,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (assetError) throw assetError;
      
      // Update progress
      setUploadProgress(90);

      // 4. Create job-asset link
      const { error: linkError } = await supabase
        .schema('neta_ops')
        .from('job_assets')
        .insert({
          job_id: id,
          asset_id: assetData.id,
        });

      if (linkError) throw linkError;
      
      // Complete progress
      setUploadProgress(100);

      // 5. Update the UI
      fetchAssets();
      fetchJobAssets();
      
      // 6. Reset form
      setSelectedFile(null);
      setNewAssetName('');
      setSelectedAssetType('document');
      setIsDropdownOpen(false);
      setShowUploadDialog(false);
      toast.success('Asset added successfully');
    } catch (error) {
      console.error('Error uploading asset:', error);
      toast.error('Failed to upload asset. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500); // Reset after a delay to show completion
    }
  };

  // Handle delete asset function
  const handleDeleteAsset = async () => {
    if (!assetToDelete || !id) {
      toast.error('Unable to delete asset');
      return;
    }

    try {
      // 1. Remove the job-asset link
      const { error: linkError } = await supabase
        .schema('neta_ops')
        .from('job_assets')
        .delete()
        .eq('job_id', id)
        .eq('asset_id', assetToDelete.id);

      if (linkError) throw linkError;

      // 2. If this is a document (not a report), delete the asset record and file
      if (!assetToDelete.file_url.startsWith('report:')) {
        // Get the storage file path from the URL
        const url = new URL(assetToDelete.file_url);
        const filePath = url.pathname.substring(url.pathname.indexOf('assets/') + 7);
        
        if (filePath) {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('assets')
            .remove([filePath]);
            
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }

        // Delete asset record
        const { error: assetError } = await supabase
          .schema('neta_ops')
          .from('assets')
          .delete()
          .eq('id', assetToDelete.id);

        if (assetError) throw assetError;
      }

      // 3. Refresh the UI
      fetchJobAssets();
      
      // 4. Reset state and notify user
      setAssetToDelete(null);
      setShowDeleteConfirm(false);
      toast.success('Asset removed successfully');
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset. Please try again.');
    }
  };

  // All other functions and handlers...

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Button 
          variant="ghost"
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5 min-w-[20px] flex-shrink-0" />
          Back to Jobs
        </Button>
        <div className="flex gap-2 items-center">
          {/* Add JobNotifications component */}
          {id && <JobNotifications jobId={id} />}
          
          <Button 
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Pencil className="h-5 w-5 min-w-[20px] flex-shrink-0" />
            Edit Job
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-150 shadow">
        {isEditing ? (
          <div className="px-6 py-4">
            <form onSubmit={(e) => { e.preventDefault(); /* handleEditSubmit(); */ }} className="space-y-4">
              {/* Edit form fields would go here */}
            </form>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Job #{job.job_number || 'Pending'}
                  </p>
                </div>
                {/* Additional job header details would go here */}
                    </div>
              {/* Additional job overview content would go here */}
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="px-6">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button 
                    onClick={() => handleTabChange('overview')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-[#f26722] text-[#f26722]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Overview
                    </button>
                  <button
                    onClick={() => handleTabChange('assets')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'assets'
                        ? 'border-b-2 border-[#f26722] text-[#f26722]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Assets
                  </button>
                  <button
                    onClick={() => handleTabChange('reports')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'reports'
                        ? 'border-b-2 border-[#f26722] text-[#f26722]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <ClipboardCheck className="h-5 w-5 min-w-[20px] flex-shrink-0 inline-block mr-1" />
                    Reports
                  </button>
                  <button
                    onClick={() => handleTabChange('surveys')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'surveys'
                        ? 'border-b-2 border-[#f26722] text-[#f26722]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Surveys
                  </button>
                  <button
                    onClick={() => handleTabChange('sla')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'sla'
                        ? 'border-b-2 border-[#f26722] text-[#f26722]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    SLA Tracking
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    {/* Overview content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Job details and other overview information */}
                    </div>
                  </div>
                )}
                
                {activeTab === 'assets' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Job Assets & Reports</h3>
                      <div className="flex space-x-2 relative" ref={dropdownRef}>
                        <Button 
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                          Add Asset
                        </Button>
                        
                        {isDropdownOpen && (
                          <div className="absolute right-0 top-10 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Upload Document
                              </div>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                  setShowUploadDialog(true);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center">
                                  <Upload className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                  Upload File
                                </div>
                              </button>
                              
                              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                              
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Create Report
                              </div>
                              
                              <div className="px-4 py-2">
                                <Input
                                  placeholder="Search reports..."
                                  value={reportSearchQuery}
                                  onChange={(e) => setReportSearchQuery(e.target.value)}
                                  className="w-full mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              
                              <div className="max-h-60 overflow-y-auto">
                                {filteredReportTemplates.length === 0 ? (
                                  <div className="px-4 py-2 text-sm text-gray-500">
                                    No matching reports found
                                  </div>
                                ) : (
                                  <>
                                    {/* ATS Reports Section */}
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                      ATS Reports
                                    </div>
                                    {filteredReportTemplates
                                      .filter(asset => asset.template_type === 'ATS')
                                      .map((asset) => (
                                        <Link 
                                          key={asset.id}
                                          to={asset.file_url.replace('report:', '')}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          onClick={() => setIsDropdownOpen(false)}
                                        >
                                          <div className="flex items-center">
                                            <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                            <span className="truncate">{asset.name}</span>
                                          </div>
                                        </Link>
                                      ))}
                                    
                                    {/* MTS Reports Section */}
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                      MTS Reports
                                    </div>
                                    {filteredReportTemplates
                                      .filter(asset => asset.template_type === 'MTS')
                                      .map((asset) => (
                                        <Link 
                                          key={asset.id}
                                          to={asset.file_url.replace('report:', '')}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          onClick={() => setIsDropdownOpen(false)}
                                        >
                                          <div className="flex items-center">
                                            <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                            <span className="truncate">{asset.name}</span>
                                          </div>
                                        </Link>
                                      ))}
                                    
                                    {/* Other Reports (if any without specific template_type) */}
                                    {filteredReportTemplates.some(asset => !asset.template_type) && (
                                      <>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                          Other Reports
                                        </div>
                                        {filteredReportTemplates
                                          .filter(asset => !asset.template_type)
                                          .map((asset) => (
                                            <Link 
                                              key={asset.id}
                                              to={asset.file_url.replace('report:', '')}
                                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                              onClick={() => setIsDropdownOpen(false)}
                                            >
                                              <div className="flex items-center">
                                                <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                                <span className="truncate">{asset.name}</span>
                                              </div>
                                            </Link>
                                          ))}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Linked assets section */}
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between">
                          <div>
                            <CardTitle>Linked Assets</CardTitle>
                            <CardDescription>
                              Assets and documents that have been linked to this job
                            </CardDescription>
                          </div>
                          <div className="w-1/3">
                            <Input
                              placeholder="Search assets..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {jobAssets.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p>No assets have been linked to this job yet.</p>
                          </div>
                        ) : filteredJobAssets.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p>No matching assets found</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Asset Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date Added</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredJobAssets.map((asset) => (
                                <TableRow key={asset.id}>
                                  <TableCell className="font-medium">{asset.name}</TableCell>
                                  <TableCell>
                                    {asset.template_type ? (
                                      <Badge>{asset.template_type}</Badge>
                                    ) : (
                                      'Document'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(asset.created_at), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      {asset.file_url.startsWith('report:') ? (
                                        <Link 
                                          to={`${asset.file_url.replace('report:', '')}${asset.file_url.includes('?') ? '&' : '?'}returnToAssets=true`} 
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          Open Report
                                        </Link>
                                      ) : (
                                        <a 
                                          href={asset.file_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          View
                                        </a>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssetToDelete(asset);
                                          setShowDeleteConfirm(true);
                                        }}
                                      >
                                        <Trash2 className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'reports' && job && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Technical Reports</CardTitle>
                        <CardDescription>
                          Review and approve technical reports for this job
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ReportApprovalWorkflow 
                          division={job.division || undefined} 
                          jobId={job.id}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'surveys' && job && (
                  <JobSurveys 
                    jobId={job.id} 
                    customerId={job.customer_id} 
                    contacts={contacts}
                  />
                )}
                
                {activeTab === 'sla' && job && (
                  <SLAManagement 
                    jobId={job.id} 
                    jobDetails={job}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Upload file dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to associate with this job.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="document-name" className="text-sm font-medium">Document Name</label>
              <Input
                id="document-name"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Technical Documentation"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="document-file" className="text-sm font-medium">Select File</label>
              <Input
                id="document-file"
                type="file"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center">{uploadProgress}% Uploaded</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleFileUpload}
              disabled={isUploading || !selectedFile || !newAssetName.trim()}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this {assetToDelete?.file_url.startsWith('report:') ? 'report' : 'document'} from the job?
            </DialogDescription>
          </DialogHeader>
          
          {assetToDelete && (
            <div className="py-4">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <FileText className="h-5 w-5 min-w-[20px] flex-shrink-0 text-gray-500 mr-2" />
                <span className="font-medium">{assetToDelete.name}</span>
              </div>
              
              {assetToDelete.file_url.startsWith('report:') ? (
                <p className="mt-2 text-sm text-gray-500">
                  This will only remove the link between the report and this job. The report will still be accessible from its direct URL.
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete this document from the system.
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setAssetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAsset}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}