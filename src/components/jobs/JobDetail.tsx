import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, ChevronDown, Plus, Paperclip, X, FileEdit, Pencil, Upload, FileText, Package, Trash2, Printer, Eye, Download, Calendar, User, MapPin, Clipboard } from 'lucide-react';
import { supabase, isConnectionError } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import { reportImportService } from '../../services/reportImport';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import JobComments from './JobComments';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Alert, AlertDescription } from '../ui/Alert';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import ResourceAllocationManager from './ResourceAllocationManager';
import JobCostTracking from './JobCostTracking';
import JobProfitabilityAnalysis from './JobProfitabilityAnalysis';
import { JobNotifications } from './JobNotifications';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { DropdownMenuItem } from '../ui/DropdownMenu';
import { isLabDivision } from '@/lib/utils';
import { useDivision } from '../../App';
import { getDivisionAccentClasses } from '../../lib/utils';
import { Textarea } from '../ui/Textarea';

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
  notes?: string | null;
  equipment_types?: string[] | null;
  comment_count?: number;
  created_at?: string;
  updated_at?: string;
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
  asset_id?: string;  // Add this field for calibration assets
  pass_fail_status?: 'PASS' | 'FAIL' | null;
  job_id?: string | null;  // Job ID if asset is linked to a specific job
  source_table?: string;  // Source table for the asset
  is_master?: boolean;  // Whether this is a master asset
  original_job_id?: string;  // Original job ID for retesting
}

interface RelatedOpportunity {
  id: string;
  quote_number: string;
}

// Add an interface for the enhanced asset object with userAssetId
interface EnhancedAsset extends Asset {
  userAssetId?: string;
}

const reportRoutes = {
  'Panelboard Report': 'panelboard-report',
  'LV Switch Multi Device Test': 'low-voltage-switch-multi-device-test',
  'LV Breaker Electronic Trip ATS Report': 'low-voltage-circuit-breaker-electronic-trip-ats-report',
  '35-Automatic Transfer Switch ATS': 'automatic-transfer-switch-ats-report',
  '2-Large Dry Type Xfmr. Insp. & Test MTS 23': 'large-dry-type-transformer-mts-report',
  '2-Large Dry Type Xfmr. Visual, Mechanical, Insulation Resistance Test MTS': 'large-dry-type-xfmr-mts-report',
};

const JobDetail = React.memo(function JobDetail() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { division } = useDivision();
  const location = useLocation();
  
  // Check if edit mode is requested via query parameter
  const searchParams = new URLSearchParams(location.search);
  const shouldEdit = searchParams.get('edit') === 'true';

  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunity, setOpportunity] = useState<RelatedOpportunity | null>(null);
  const [jobAssets, setJobAssets] = useState<EnhancedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isEditing, setIsEditing] = useState(shouldEdit); // Initialize with shouldEdit
  const [editFormData, setEditFormData] = useState<Job | null>(null);


  // State management
  const [filteredJobAssets, setFilteredJobAssets] = useState<EnhancedAsset[]>([]);
  const [newAssetName, setNewAssetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isStatusEditing, setIsStatusEditing] = useState(false);
  const [isPriorityEditing, setIsPriorityEditing] = useState(false);
  const [isDueDateEditing, setIsDueDateEditing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('assets');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const equipmentDropdownRef = useRef<HTMLDivElement>(null);
  const [currentTab, setCurrentTab] = useState('details');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('document');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<EnhancedAsset | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isLabJob, setIsLabJob] = useState(false);

  // New filter states
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Missing state variables
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [assets, setAssets] = useState<{id: any; assets: any;}[]>([]);
  const [existingAssets, setExistingAssets] = useState<Asset[]>([]);
  

  const [isSearchingAssets, setIsSearchingAssets] = useState(false);

  // Meter Report states
  const [meterReportSearchQuery, setMeterReportSearchQuery] = useState<string>('');
  const [existingMeterReports, setExistingMeterReports] = useState<Asset[]>([]);

  // Default assets that are always available
  const defaultAssets: Asset[] = [
    {
      id: 'switchgear-panelboard-mts',
      name: '1-Switchgear, Switchboard, Panelboard Inspection & Test Report MTS',
      file_url: `report:/jobs/${id}/switchgear-panelboard-mts-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'MTS'
    },
    {
      id: 'large-dry-type-transformer-mts-report',
      name: '2-Large Dry Type Xfmr. Inspection and Test MTS 23',
      file_url: `report:/jobs/${id}/large-dry-type-transformer-mts-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'MTS'
    },
    {
      id: 'large-dry-type-xfmr-mts-report',
      name: '2-Large Dry Type Xfmr. Visual, Mechanical, Insulation Resistance Test MTS',
      file_url: `report:/jobs/${id}/large-dry-type-xfmr-mts-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'MTS'
    },
    {
      id: 'liquid-xfmr-visual-mts-report',
      name: '2-Liquid Filled Xfmr. Visual, Mechanical, Insulation Resistance Test MTS',
      file_url: `report:/jobs/${id}/liquid-xfmr-visual-mts-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'MTS'
    },
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
    },
    {
      id: 'medium-voltage-circuit-breaker-report',
      name: '9-Medium Voltage Circuit Breaker Test Report ATS',
      file_url: `report:/jobs/${id}/medium-voltage-circuit-breaker-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'current-transformer-test-ats-report',
      name: '12-Current Transformer Test ATS (partial, single CT)',
      file_url: `report:/jobs/${id}/current-transformer-test-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'new-current-transformer-test-ats-report',
      name: '12-Current Transformer Test ATS',
      file_url: `report:/jobs/${id}/12-current-transformer-test-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'automatic-transfer-switch-ats-report',
      name: '35-Automatic Transfer Switch ATS',
      file_url: `report:/jobs/${id}/automatic-transfer-switch-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    },
    {
      id: 'two-small-dry-typer-xfmr-ats-report',
      name: '2-Small Dry Typer Xfmr. Inspection and Test ATS',
      file_url: `report:/jobs/${id}/two-small-dry-typer-xfmr-ats-report?returnToAssets=true`,
      created_at: new Date().toISOString(),
      template_type: 'ATS'
    }
  ];

  // Add missing state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to fetch pass/fail status for assets from calibration report tables
  const fetchPassFailStatusForJobAssets = async (assets: Asset[]): Promise<Asset[]> => {
    const assetsWithStatus = await Promise.all(
      assets.map(async (asset) => {
        try {
          // Extract report type from file_url to determine which table to query
          if (!asset.file_url.startsWith('report:')) {
            return { ...asset, pass_fail_status: null };
          }

          const urlParts = asset.file_url.split('/');
          const reportSlug = urlParts[3]?.split('?')[0];
          
          if (!reportSlug) {
            return { ...asset, pass_fail_status: null };
          }

          // Map report slugs to table names and status paths
          const reportTableMap: { [key: string]: { table: string; statusPath: string } } = {
            'calibration-gloves': { table: 'calibration_gloves_reports', statusPath: 'status' },
            'calibration-sleeve': { table: 'calibration_sleeve_reports', statusPath: 'status' },
            'calibration-blanket': { table: 'calibration_blanket_reports', statusPath: 'status' },
            'calibration-line-hose': { table: 'calibration_line_hose_reports', statusPath: 'status' },
            'calibration-hotstick': { table: 'calibration_hotstick_reports', statusPath: 'status' },
            'calibration-ground-cable': { table: 'calibration_ground_cable_reports', statusPath: 'status' },
            'calibration-bucket-truck': { table: 'calibration_bucket_truck_reports', statusPath: 'status' },
  'calibration-digger': { table: 'calibration_digger_reports', statusPath: 'status' },
            'meter-template': { table: 'meter_template_reports', statusPath: 'status' }
          };

          const reportConfig = reportTableMap[reportSlug];
          if (!reportConfig) {
            return { ...asset, pass_fail_status: null };
          }

          // Extract reportId from the URL
          const reportId = urlParts[4];
          if (!reportId) {
            return { ...asset, pass_fail_status: null };
          }

          // Query the specific calibration report table
          const { data, error } = await supabase
            .schema('lab_ops')
            .from(reportConfig.table)
            .select(reportConfig.statusPath)
            .eq('id', reportId)
            .single();

          if (error) {
            console.error(`Error fetching pass/fail status from ${reportConfig.table}:`, error);
            return { ...asset, pass_fail_status: null };
          }

          const passFailStatus = data?.[reportConfig.statusPath];

          // Ensure we only return valid pass/fail status values
          const validStatus: 'PASS' | 'FAIL' | null = 
            passFailStatus === 'PASS' ? 'PASS' : 
            passFailStatus === 'FAIL' ? 'FAIL' : null;

          return { 
            ...asset, 
            pass_fail_status: validStatus 
          };
        } catch (error) {
          console.error('Error fetching pass/fail status for asset:', asset.id, error);
          return { ...asset, pass_fail_status: null };
        }
      })
    );

    return assetsWithStatus;
  };

  // Helper function to handle form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !id) return;

    setIsSubmitting(true);
    try {
      // Determine which schema and table to use based on job division
      const isLabJob = job?.division?.toLowerCase() === 'calibration' || job?.division?.toLowerCase() === 'armadillo';
      const schema = isLabJob ? 'lab_ops' : 'neta_ops';
      const table = isLabJob ? 'lab_jobs' : 'jobs';

      const { error } = await supabase
        .schema(schema)
        .from(table)
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
        })
        .eq('id', id);

      if (error) throw error;

      // Update local job state
      setJob(prev => prev ? { ...prev, ...editFormData } : null);
      setIsEditing(false);
      toast.success('Job updated successfully!');
      
      // Refresh job details to get latest data
      fetchJobDetails();
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status updating state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Completion confirmation prompt state
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  // Handle status update
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (!job || !id || newStatus === job.status) return;

    // If changing to completed, show confirmation prompt
    if (newStatus === 'completed') {
      setPendingStatusChange(newStatus);
      setShowCompletionPrompt(true);
      // Reset dropdown to current status until confirmed
      e.target.value = job.status;
      return;
    }

    // For other status changes, proceed normally
    await updateJobStatus(newStatus);
  };

  // Function to actually update the job status
  const updateJobStatus = async (newStatus: string) => {
    if (!job || !id) return;

    setIsUpdatingStatus(true);

    try {
      // Determine which schema and table to use based on job division
      const isLabJob = job?.division?.toLowerCase() === 'calibration' || job?.division?.toLowerCase() === 'armadillo';
      const schema = isLabJob ? 'lab_ops' : 'neta_ops';
      const table = isLabJob ? 'lab_jobs' : 'jobs';

      const { error } = await supabase
        .schema(schema)
        .from(table)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local job state immediately for real-time UI feedback
      setJob(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle completion confirmation
  const handleCompletionConfirm = async () => {
    if (pendingStatusChange) {
      await updateJobStatus(pendingStatusChange);
    }
    setShowCompletionPrompt(false);
    setPendingStatusChange(null);
  };

  // Handle completion cancellation
  const handleCompletionCancel = () => {
    setShowCompletionPrompt(false);
    setPendingStatusChange(null);
  };

  // Load job details on component mount
  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  // Load assets when job is loaded
  useEffect(() => {
    if (job) {
      fetchJobAssets();
      // Fetch meter reports if this is a calibration job
      if (job.division?.toLowerCase() === 'calibration') {
        fetchMeterReports();
      }
    }
  }, [job]);



  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target as Node)) {
        setIsEquipmentDropdownOpen(false);
      }
    }
    
    // Add event listener only if any dropdown is open
    if (isDropdownOpen || isEquipmentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isEquipmentDropdownOpen]);

  // Check for tab query parameter and update the active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview,assets,surveys,sla'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

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

  // Load additional data when job is loaded
  useEffect(() => {
    if (job && user) {
      // Fetch contacts for the customer
      if (job.customer_id) {
        fetchContacts(job.customer_id);
      }
      
      // Set customer data
      if (job.customers) {
        setCustomer({
          id: job.customers.id,
          name: job.customers.name,
          company_name: job.customers.company_name || '',
        });
      }
      
      // Fetch related opportunity
      const fetchRelatedOpportunity = async () => {
        const opportunityData = await fetchOpportunityForJob(job.id); 
        setOpportunity(opportunityData);
      };
      
      fetchRelatedOpportunity();
      
      // Fetch general assets - commented out due to type conflicts, fetchJobAssets handles this
      // fetchAssets();
    }
  }, [job, user]);

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
    // Filter job assets when search query or filters change
    let filtered = jobAssets;

    // Search filter - search across multiple attributes
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(asset => {
        const searchTerm = searchQuery.toLowerCase();
        
        // Get the simplified report type for searching
        const getSimplifiedReportType = (asset: Asset) => {
          console.log('🔧 getSimplifiedReportType called with asset:', asset);
          console.log('🔧 Asset file_url:', asset.file_url);
          console.log('🔧 Does file_url start with report:?', asset.file_url.startsWith('report:'));
          
          if (asset.file_url.startsWith('report:')) {
            // Extract report type from URL
            // URL format: report:/jobs/jobId/reportSlug/reportId
            const urlParts = asset.file_url.split('/');
            const reportSlug = urlParts[3]; // reportSlug is at index 3, not 2
            
            console.log('🔧 URL parts:', urlParts, 'Report slug:', reportSlug);
            
            if (reportSlug) {
              // Clean query parameters from reportSlug if present
              const cleanReportSlug = reportSlug.split('?')[0];
              
              const reportTypeMap: { [key: string]: string } = {
                'calibration-gloves': 'Glove',
                'calibration-sleeve': 'Sleeve',
                'calibration-blanket': 'Blanket',
                'calibration-line-hose': 'Line Hose',
                'calibration-hotstick': 'Hotstick',
                'calibration-ground-cable': 'Ground Cable',
                'calibration-bucket-truck': 'Bucket Truck',
                'calibration-digger': 'Digger',
                'meter-template': 'Meter',
                'panelboard-report': 'Panelboard',
                'low-voltage-switch-multi-device-test': 'LV Switch',
                'low-voltage-circuit-breaker-electronic-trip-ats-report': 'LV Circuit Breaker',
                'automatic-transfer-switch-ats-report': 'ATS',
                'large-dry-type-transformer-mts-report': 'Large Transformer',
                'large-dry-type-transformer-ats-report': 'Large Transformer'
              };
              
              const reportType = reportTypeMap[cleanReportSlug] || 'Report';
              console.log('🔧 Determined report type:', reportType);
              return reportType;
            }
          }
          
          // For non-report documents, extract a simplified name from the asset name
          console.log(' Returning Document for non-report asset');
          return 'Document';
        };

        const reportType = getSimplifiedReportType(asset);
        const assetId = asset.userAssetId || asset.asset_id || '';
        
        return (
          asset.name.toLowerCase().includes(searchTerm) ||
          reportType.toLowerCase().includes(searchTerm) ||
          assetId.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Report type filter
    if (reportTypeFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const getSimplifiedReportType = (asset: Asset) => {
          console.log('🔧 getSimplifiedReportType called with asset:', asset);
          console.log('🔧 Asset file_url:', asset.file_url);
          console.log('🔧 Does file_url start with report:?', asset.file_url.startsWith('report:'));
          
          if (asset.file_url.startsWith('report:')) {
            // Extract report type from URL
            // URL format: report:/jobs/jobId/reportSlug/reportId
            const urlParts = asset.file_url.split('/');
            const reportSlug = urlParts[3]; // reportSlug is at index 3, not 2
            
            console.log('🔧 URL parts:', urlParts, 'Report slug:', reportSlug);
            
            if (reportSlug) {
              // Clean query parameters from reportSlug if present
              const cleanReportSlug = reportSlug.split('?')[0];
              
              const reportTypeMap: { [key: string]: string } = {
                'calibration-gloves': 'Glove',
                'calibration-sleeve': 'Sleeve',
                'calibration-blanket': 'Blanket',
                'calibration-line-hose': 'Line Hose',
                'calibration-hotstick': 'Hotstick',
                'calibration-ground-cable': 'Ground Cable',
                'calibration-bucket-truck': 'Bucket Truck',
                'calibration-digger': 'Digger',
                'meter-template': 'Meter',
                'panelboard-report': 'Panelboard',
                'low-voltage-switch-multi-device-test': 'LV Switch',
                'low-voltage-circuit-breaker-electronic-trip-ats-report': 'LV Circuit Breaker',
                'automatic-transfer-switch-ats-report': 'ATS',
                'large-dry-type-transformer-mts-report': 'Large Transformer',
                'large-dry-type-transformer-ats-report': 'Large Transformer'
              };
              
              const reportType = reportTypeMap[cleanReportSlug] || 'Report';
              console.log('🔧 Determined report type:', reportType);
              return reportType;
            }
          }
          
          // For non-report documents, extract a simplified name from the asset name
          console.log('🔧 Returning Document for non-report asset');
          return 'Document';
        };

        return getSimplifiedReportType(asset) === reportTypeFilter;
      });
    }

    // Date filter
    if (selectedDate !== '') {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
      
      filtered = filtered.filter(asset => {
        const assetDate = new Date(asset.created_at);
        assetDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
        return assetDate >= filterDate;
      });
    }

    setFilteredJobAssets(filtered);
  }, [searchQuery, jobAssets, reportTypeFilter, selectedDate, statusFilter]);

  // Filter report templates based on search
  const filteredReportTemplates = reportSearchQuery.trim() === '' 
    ? defaultAssets 
    : defaultAssets.filter(asset => 
        asset.name.toLowerCase().includes(reportSearchQuery.toLowerCase())
      );

  // Fetch job assets
  const fetchAssets = async () => {
    if (!id) return;

    try {
      let assetsData: {id: any; assets: any;}[] = [];

      if (isLabJob) {
        // Fetch from lab_ops schema
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('job_assets')
          .select(`
            id,
            lab_assets:asset_id(*)
          `)
          .eq('job_id', id);

        if (error) throw error;
        
        // Transform the data to match expected format
        assetsData = data?.map(item => ({
          id: item.id,
          assets: Array.isArray(item.lab_assets) ? item.lab_assets[0] : item.lab_assets
        })) || [];
      } else {
        // Fetch from neta_ops schema (existing logic)
        const { data, error } = await supabase
          .schema('neta_ops')
          .from('job_assets')
          .select(`
            id,
            assets:asset_id(*)
          `)
          .eq('job_id', id);

        if (error) throw error;
        
        // Transform the data to match expected format
        assetsData = data?.map(item => ({
          id: item.id,
          assets: Array.isArray(item.assets) ? item.assets[0] : item.assets
        })) || [];
      }

      setAssets(assetsData);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      // Don't set error state for assets, just log it
    }
  };

  async function fetchJobAssets() {
    if (!id) return;
    
    try {
      // Use the isLabJob state that was set in fetchJobDetails
      const isCalibration = isLabJob;
      
      // Select the appropriate schema and table based on job division
      let assetsData: any[] = [];
      
      if (isCalibration) {
        // For calibration jobs, fetch directly from lab_assets
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('lab_assets')
          .select('*')
          .eq('job_id', id)
          .is('deleted_at', null); // Exclude soft-deleted assets
          
        if (error) {
          console.error('Error fetching calibration assets:', error);
          throw error;
        }
        
        assetsData = data || [];
      } else {
        // For other divisions, use job_assets with nested assets
        const { data, error } = await supabase
          .schema('neta_ops')
          .from('job_assets')
          .select(`
            asset_id,
            assets:asset_id(*)
          `)
          .eq('job_id', id);
          
        if (error) {
          console.error('Error fetching regular job assets:', error);
          throw error;
        }
        
        assetsData = data || [];
      }
      
      // Transform the assets based on division
      const transformedAssets: Asset[] = [];
      
      if (isCalibration) {
        // Lab_ops assets are already in the right format
        for (const asset of assetsData) {
          const transformedAsset = {
            id: asset.id,
            name: asset.name,
            file_url: asset.file_url,
            created_at: asset.created_at,
            asset_id: asset.asset_id // Include the asset_id for calibration assets
          };
          transformedAssets.push(transformedAsset);
        }
      } else {
        // Transform neta_ops nested assets
        for (const item of assetsData) {
          if (item.assets) {
            transformedAssets.push({
              id: item.assets.id,
              name: item.assets.name,
              file_url: item.assets.file_url,
              created_at: item.assets.created_at,
              template_type: item.assets.template_type
            });
          }
        }
      }
      

      
      // Further process the assets to add userAssetId
      const enhancedAssets: EnhancedAsset[] = await Promise.all(
        transformedAssets.map(async (asset: Asset): Promise<EnhancedAsset> => {
          let userAssetId = '';
          if (isCalibration) {
            // For calibration assets, use asset_id if available
            if (asset.asset_id) {
              userAssetId = asset.asset_id;
            }
            
            // For all calibration reports, try to extract assetId from the report
            if (asset.file_url && asset.file_url.startsWith('report:') && !userAssetId) {
              // Extract report type and ID from URL
              const urlParts = asset.file_url.split('/');
              const reportSlug = urlParts[3];
              const reportId = urlParts[4];
              
              if (reportSlug && reportId) {
                console.log(`Extracting Asset ID from ${reportSlug} report ${reportId}`);
                try {
                  // Map report slug to table name
                  const reportTableMap: { [key: string]: string } = {
                    'calibration-gloves': 'calibration_gloves_reports',
                    'calibration-sleeve': 'calibration_sleeve_reports',
                    'calibration-blanket': 'calibration_blanket_reports',
                    'calibration-line-hose': 'calibration_line_hose_reports',
                    'calibration-hotstick': 'calibration_hotstick_reports',
                    'calibration-ground-cable': 'calibration_ground_cable_reports',
                    'calibration-bucket-truck': 'calibration_bucket_truck_reports',
                    'calibration-digger': 'calibration_digger_reports'
                  };
                  
                  const tableName = reportTableMap[reportSlug];
                  if (tableName) {
                    const { data: reportData, error: reportError } = await supabase
                      .schema('lab_ops')
                      .from(tableName)
                      .select('report_info')
                      .eq('id', reportId)
                      .single();
                      
                    if (!reportError && reportData?.report_info) {
                      // Try different possible paths for assetId
                      const possiblePaths = [
                        'assetId',
                        'gloveData.assetId',
                        'bucketTruckData.assetId',
                        'bucketTruckData.truckNumber',
                        'bucketTruckData.serialNumber'
                      ];
                      
                      for (const path of possiblePaths) {
                        const value = path.split('.').reduce((obj, key) => obj?.[key], reportData.report_info);
                        if (value) {
                          userAssetId = value;
                          console.log(`Found Asset ID in ${reportSlug} report: ${userAssetId}`);
                          break;
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching ${reportSlug} report data:`, error);
                }
              }
            }
          }
          
          return {
            ...asset,
            userAssetId
          };
        })
      );
      

      
      // Fetch pass/fail status for calibration assets
      const assetsWithStatus = await fetchPassFailStatusForJobAssets(enhancedAssets);
      
      console.log('Assets with status:', assetsWithStatus);
      
      setJobAssets(assetsWithStatus);
      setFilteredJobAssets(assetsWithStatus);
      
      console.log('🔧 Job assets state set:', assetsWithStatus.length, 'assets');
      
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
    try {
      // Check if opportunities table exists first
      const { data, error } = await supabase
        .schema('common')
        .from('opportunities')
        .select('id, quote_number')
        .eq('job_id', jobId)
        .single();

      if (error) {
        // If table doesn't exist or other error, just return null gracefully
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // No opportunity found or table doesn't exist, which is fine
          return null;
        }
        // Log other errors but don't throw
        console.warn('Error fetching opportunity for job (non-critical):', error);
        return null;
      }

      return data;
    } catch (error) {
      // Catch any other errors and return null gracefully
      console.warn('Error fetching opportunity for job (non-critical):', error);
      return null;
    }
  }

  // Fetch existing meter template reports and templates
  async function fetchMeterReports() {
    if (!id) return;
    
    try {
      // Fetch existing meter template reports for this job
      const { data: jobMeterReports, error: jobError } = await supabase
        .schema('lab_ops')
        .from('meter_template_reports')
        .select('id, report_info, created_at, status')
        .eq('job_id', id)
        .order('created_at', { ascending: false });

      if (jobError) throw jobError;

      // Fetch meter templates (not tied to any specific job)
      const { data: meterTemplates, error: templateError } = await supabase
        .schema('lab_ops')
        .from('meter_template_reports')
        .select('id, report_info, created_at, status')
        .eq('status', 'TEMPLATE')
        .order('created_at', { ascending: false });

      if (templateError) throw templateError;

      console.log('Job meter reports found:', jobMeterReports?.length || 0);
      console.log('Meter templates found:', meterTemplates?.length || 0);

      // Convert job reports to Asset format
      const jobMeterAssets: Asset[] = (jobMeterReports || []).map(report => ({
        id: `meter-report-${report.id}`,
        name: `Meter Report - ${report.report_info?.meterName || 'Unnamed'}`,
        file_url: `report:/jobs/${id}/meter-template/${report.id}`,
        created_at: report.created_at,
        pass_fail_status: report.status === 'PASS' ? 'PASS' : 'FAIL',
        type: 'report'
      }));

      // Convert templates to Asset format
      const templateAssets: Asset[] = (meterTemplates || []).map(template => {
        const reportInfo = template.report_info as any;
        const templateName = reportInfo?.templateName || reportInfo?.meterName || 'Unnamed Template';
        return {
          id: `meter-template-${template.id}`,
          name: templateName,
          file_url: `template:/meter-template/${template.id}`, // Different URL scheme for templates
          created_at: template.created_at,
          pass_fail_status: null, // Templates don't have pass/fail status
          type: 'template'
        };
      });

      // Only show templates in the dropdown (not job reports)
      setExistingMeterReports(templateAssets);
      
      // Only add job reports to main assets list (not templates)
      setJobAssets(prevAssets => {
        // Remove any existing meter reports to avoid duplicates
        const filteredAssets = prevAssets.filter(asset => !asset.id.startsWith('meter-report-'));
        // Add the new job meter reports (not templates)
        return [...filteredAssets, ...jobMeterAssets];
      });
    } catch (error) {
      console.error('Error fetching meter reports:', error);
      setExistingMeterReports([]);
    }
  }

  // Function to search for existing assets across all jobs and master assets
  const searchExistingAssets = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setExistingAssets([]);
      return;
    }

    try {
      const allAssets: Asset[] = [];

      if (job?.division?.toLowerCase() === 'calibration') {
        // First, search for calibration master assets in lab_ops.lab_assets
        try {
          const { data: masterAssets, error: masterError } = await supabase
            .schema('lab_ops')
            .from('lab_assets')
            .select(`
              id,
              name,
              asset_id,
              created_at
            `)
            .or(`name.ilike.%${searchTerm}%,asset_id.ilike.%${searchTerm}%`)
            .limit(10);

          if (!masterError && masterAssets) {
            console.log(`🔍 Found ${masterAssets.length} calibration master assets`);
            const calibrationMasterAssets = masterAssets.map(item => ({
              id: item.id,
              name: `🔧 ${item.name} (Asset ID: ${item.asset_id || 'N/A'})`,
              file_url: `calibration:/master-assets/${item.id}`,
              created_at: item.created_at,
              pass_fail_status: null,
              job_id: null,
              source_table: 'lab_assets',
              is_master: true,
              asset_id: item.asset_id
            }));
            allAssets.push(...calibrationMasterAssets);
          } else {
            console.log(`🔍 Error searching calibration master assets:`, masterError);
          }
        } catch (error) {
          console.log(`🔍 Error searching calibration master assets:`, error);
        }

        // Then search calibration reports from lab_ops schema (if accessible)
        const calibrationTables = [
          'calibration_gloves_reports',
          'calibration_hotstick_reports',
          'calibration_ground_cable_reports',
          'calibration_sleeve_reports',
          'calibration_blanket_reports',
          'calibration_line_hose_reports',
          'calibration_bucket_truck_reports',
          'calibration_digger_reports',
          'calibration_meter_reports'
        ];

        for (const table of calibrationTables) {
          try {
            const { data, error } = await supabase
              .schema('lab_ops')
              .from(table)
              .select(`
                id,
                job_id,
                report_info,
                created_at
              `)
              .or(`report_info->>'customer'.ilike.%${searchTerm}%,report_info->'bucketTruckData'->>'truckNumber'.ilike.%${searchTerm}%,report_info->'bucketTruckData'->>'serialNumber'.ilike.%${searchTerm}%,report_info->'bucketTruckData'->>'manufacturer'.ilike.%${searchTerm}%,report_info->>'assetId'.ilike.%${searchTerm}%`)
              .limit(10);

            if (!error && data) {
              console.log(`🔍 Found ${data.length} assets in ${table}`);
              const tableAssets = data
                .filter(item => {
                  // Filter out reports that are already linked to the current job
                  if (item.job_id === id) {
                    return false;
                  }
                  
                  // Extract asset ID from report_info
                  const assetId = item.report_info?.assetId || 
                                 item.report_info?.gloveData?.assetId || 
                                 item.report_info?.bucketTruckData?.assetId ||
                                 item.report_info?.bucketTruckData?.truckNumber ||
                                 item.report_info?.bucketTruckData?.serialNumber;
                  
                  // Check if we already have a master asset with this asset ID
                  const hasMasterAsset = allAssets.some(asset => 
                    asset.is_master && asset.asset_id === assetId
                  );
                  
                  // Only include if we don't have a master asset with this ID
                  return !hasMasterAsset;
                })
                .map(item => {
                  const assetId = item.report_info?.assetId || 
                                 item.report_info?.gloveData?.assetId || 
                                 item.report_info?.bucketTruckData?.assetId ||
                                 item.report_info?.bucketTruckData?.truckNumber ||
                                 item.report_info?.bucketTruckData?.serialNumber;
                  
                  return {
                    id: `${table}-${item.id}`,
                    name: `${getReportTypeName(table)} Report - ${assetId || 'Unknown Asset'}`,
                    file_url: `report:/jobs/${item.job_id}/${getReportRoute(table)}/${item.id}`,
                    created_at: item.created_at,
                    pass_fail_status: item.report_info?.status || null,
                    job_id: item.job_id,
                    source_table: table,
                    is_master: false,
                    asset_id: assetId,
                    original_job_id: item.job_id
                  };
                });
              allAssets.push(...tableAssets);
            } else {
              // Only log permission errors once, not for every table
              if ((error as any)?.code === '42501') {
                console.log(`🔍 Permission denied for ${table} (expected for calibration division)`);
              } else {
                console.log(`🔍 Error searching ${table}:`, error);
              }
            }
          } catch (error) {
            // Only log unexpected errors
            if ((error as any)?.code !== '42501') {
              console.error(`Error searching ${table}:`, error);
            }
          }
        }

        // For calibration division, we only want calibration-specific assets
        // No need to search neta_ops assets as they are for other divisions
      } else {
        // Search other division assets (MTS/ATS reports) from neta_ops schema
        const { data, error } = await supabase
          .schema('neta_ops')
          .from('assets')
          .select(`
            id,
            name,
            file_url,
            created_at
          `)
          .or(`name.ilike.%${searchTerm}%,file_url.ilike.%${searchTerm}%`)
          .limit(10);

        if (!error && data) {
          console.log(`🔍 Found ${data.length} neta_ops assets`);
          const netaAssets = data.map(item => ({
            ...item,
            pass_fail_status: null,
            job_id: null,
            asset_id: item.id,
            source_table: 'neta_ops_assets',
            is_master: false
          }));
          allAssets.push(...netaAssets);
        } else {
          console.log(`🔍 Error searching neta_ops assets:`, error);
        }
      }

      console.log(`🔍 Final assets found: ${allAssets.length}`);
      setExistingAssets(allAssets);
    } catch (error) {
      console.error('Error searching existing assets:', error);
      setExistingAssets([]);
    }
  };

  // Helper function to get report type name
  const getReportTypeName = (table: string): string => {
    const typeMap: { [key: string]: string } = {
      'calibration_gloves_reports': 'Glove Report',
      'calibration_sleeve_reports': 'Sleeve Report',
      'calibration_blanket_reports': 'Blanket Report',
      'calibration_line_hose_reports': 'Line Hose Report',
      'calibration_hotstick_reports': 'Hotstick Report',
      'calibration_ground_cable_reports': 'Ground Cable Report',
      'calibration_bucket_truck_reports': 'Bucket Truck Report',
      'calibration_digger_reports': 'Digger Report'
    };
    return typeMap[table] || 'Report';
  };

  // Helper function to get report route
  const getReportRoute = (table: string): string => {
    const routeMap: { [key: string]: string } = {
      'calibration_gloves_reports': 'calibration-gloves',
      'calibration_sleeve_reports': 'calibration-sleeve',
      'calibration_blanket_reports': 'calibration-blanket',
      'calibration_line_hose_reports': 'calibration-line-hose',
      'calibration_hotstick_reports': 'calibration-hotstick',
      'calibration_ground_cable_reports': 'calibration-ground-cable',
      'calibration_bucket_truck_reports': 'calibration-bucket-truck',
      'calibration_digger_reports': 'calibration-digger'
    };
    return routeMap[table] || 'report';
  };

  // Function to retest an existing asset (create new report based on existing one)
  const retestAsset = async (asset: Asset) => {
    if (!id || !user?.id) {
      console.error('Missing job ID or user ID');
      return;
    }

    try {
      console.log('🔧 Retesting asset:', asset);

      // Determine the report type from the source table
      const reportType = asset.source_table?.replace('calibration_', '').replace('_reports', '');
      
      if (!reportType) {
        toast.error('Could not determine report type for retesting');
        return;
      }

      // Navigate to the appropriate report creation page for retesting
      const reportRoute = getReportRoute(asset.source_table || '');
      const retestUrl = `/jobs/${id}/${reportRoute}?retest=true&originalAssetId=${asset.id}&originalJobId=${asset.original_job_id || asset.job_id}`;
      
      console.log('🔧 Navigating to retest URL:', retestUrl);
      
      // Close dropdown and navigate
      setIsDropdownOpen(false);
      navigate(retestUrl);

    } catch (error) {
      console.error('Error initiating retest:', error);
      toast.error(`Failed to initiate retest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to link an existing asset to the current project
  const testAsset = async (asset: Asset) => {
    if (!id || !user?.id) {
      console.error('Missing job ID or user ID');
      return;
    }

    try {


      // For calibration division, handle testing
      if (job?.division?.toLowerCase() === 'calibration') {
        // For calibration, we need to create a new report entry with the existing data and set it to PASS
        if (asset.source_table && asset.source_table.includes('calibration_')) {
          // This is an existing calibration report - we need to copy it to the current job and set to PASS
          const reportType = asset.source_table.replace('calibration_', '').replace('_reports', '');
          
          // Fetch the original report data
          const { data: originalReport, error: fetchError } = await supabase
            .schema('lab_ops')
            .from(asset.source_table)
            .select('*')
            .eq('id', asset.id.replace(`${asset.source_table}-`, ''))
            .single();

          if (fetchError) {
            console.error('Error fetching original report:', fetchError);
            throw fetchError;
          }

          // Check if the original report has any actual data
          const hasData = originalReport.report_info && 
            Object.keys(originalReport.report_info).length > 0 &&
            (originalReport.report_info.customer || 
             originalReport.report_info.gloveData?.assetId ||
             originalReport.report_info.bucketTruckData?.truckNumber);

          if (!hasData) {
            console.log('⚠️ Original report has no data, skipping copy');
            toast.error('This report has no data to copy. Please select a report with actual information.');
            return;
          }

          // Create a new report entry for the current job with the original data and PASS status
          const newReportData = {
            ...originalReport,
            id: undefined, // Let Supabase generate a new ID
            job_id: id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'PASS', // Set to PASS by default for retested assets
            report_info: {
              ...originalReport.report_info,
              status: 'PASS' // Set to PASS by default for retested assets
            }
          };

          const { data: newReport, error: insertError } = await supabase
            .schema('lab_ops')
            .from(asset.source_table)
            .insert(newReportData)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating new report:', insertError);
            throw insertError;
          }

          console.log('✅ Calibration report successfully tested and copied to current job with PASS status');
          
          // Create a lab_assets entry so it appears in the asset list
          const assetId = originalReport.report_info?.assetId || originalReport.report_info?.gloveData?.assetId || originalReport.report_info?.bucketTruckData?.assetId || originalReport.report_info?.bucketTruckData?.truckNumber || originalReport.report_info?.bucketTruckData?.serialNumber || 'Unknown';
          const labAssetData = {
            name: `${getReportTypeName(asset.source_table)} Report - ${assetId}`,
            file_url: `report:/jobs/${id}/${getReportRoute(asset.source_table)}/${newReport.id}`,
            job_id: id,
            asset_id: assetId,
            report_id: newReport.id,
            created_at: new Date().toISOString()
          };

          console.log('🔧 Creating lab asset entry with data:', labAssetData);
          console.log('🔧 File URL being created:', labAssetData.file_url);

          const { data: labAssetResult, error: labAssetError } = await supabase
            .schema('lab_ops')
            .from('lab_assets')
            .insert(labAssetData)
            .select()
            .single();

          if (labAssetError) {
            console.error('Error creating lab asset entry:', labAssetError);
            // Don't throw error here as the main operation succeeded
          } else {
            console.log('✅ Lab asset entry created successfully:', labAssetResult);
          }
          
                           // Record the testing in asset testing history (optional - don't fail if table doesn't exist)
                 try {
                   const historyData = {
                     asset_id: newReport.id,
                     job_id: id,
                     test_date: new Date().toISOString(),
                     test_type: 'calibration_retest',
                     test_performed_by: user.id,
                     pass_fail_status: 'PASS',
                     notes: `Asset retested from original job ${asset.original_job_id || 'unknown'}`,
                     condition_rating: 8, // Default good condition for retested assets
                     test_standards: 'Calibration retest',
                     created_by: user.id
                   };

                   const { error: historyError } = await supabase
                     .schema('lab_ops')
                     .from('asset_testing_history')
                     .insert(historyData);

                   if (historyError) {
                     console.log('Note: Could not record testing history (table may not exist):', historyError);
                   }
                 } catch (error) {
                   console.log('Note: Testing history recording failed (table may not exist):', error);
                 }
          
          // Refresh the assets list
          await fetchJobAssets();
          
          // Close dropdown and show success message
          setIsDropdownOpen(false);
          toast.success(`Asset "${asset.name}" has been tested and added to this project with PASS status.`);
          
          return;
        } else if (asset.is_master) {
          // This is a master asset - we need to create a new report entry first
          // Extract asset ID from the master asset name
          const assetId = asset.asset_id || asset.name.split('Asset ID: ')[1]?.split(')')[0] || 'Unknown';
          
          // Create a new report entry for this master asset
          // We'll create it in the calibration_gloves_reports table as a default
          const newReportData = {
            job_id: id,
            report_info: {
              assetId: assetId,
              customer: 'Master Asset',
              status: 'PASS'
            },
            status: 'PASS',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newReport, error: insertError } = await supabase
            .schema('lab_ops')
            .from('calibration_gloves_reports')
            .insert(newReportData)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating new report for master asset:', insertError);
            throw insertError;
          }

          console.log('✅ New report created for master asset:', newReport);

          // Create a lab_assets entry that points to the new report
          const assetData = {
            name: `Glove Report - ${assetId}`,
            file_url: `report:/jobs/${id}/calibration-gloves/${newReport.id}`,
            job_id: id,
            asset_id: assetId,
            report_id: newReport.id,
            created_at: new Date().toISOString()
          };

          const { data: labAssetResult, error: labAssetError } = await supabase
            .schema('lab_ops')
            .from('lab_assets')
            .insert(assetData)
            .select()
            .single();

          if (labAssetError) {
            console.error('Error creating lab asset entry:', labAssetError);
            throw labAssetError;
          }

          console.log('✅ Lab asset entry created successfully:', labAssetResult);
          
                           // Record the testing in asset testing history (optional - don't fail if table doesn't exist)
                 try {
                   const historyData = {
                     asset_id: newReport.id,
                     job_id: id,
                     test_date: new Date().toISOString(),
                     test_type: 'master_asset_link',
                     test_performed_by: user.id,
                     pass_fail_status: 'PASS',
                     notes: `Master asset linked to project`,
                     condition_rating: 8, // Default good condition for master assets
                     test_standards: 'Master asset link',
                     created_by: user.id
                   };

                   const { error: historyError } = await supabase
                     .schema('lab_ops')
                     .from('asset_testing_history')
                     .insert(historyData);

                   if (historyError) {
                     console.log('Note: Could not record testing history (table may not exist):', historyError);
                   }
                 } catch (error) {
                   console.log('Note: Testing history recording failed (table may not exist):', error);
                 }
          
          // Refresh the assets list
          await fetchJobAssets();
          
          // Close dropdown and show success message
          setIsDropdownOpen(false);
          toast.success(`Asset "${asset.name}" has been tested and linked to this project.`);
          
          return;
        }
      } else {
        // For non-calibration divisions, use the existing linkAssetToProject logic
        await linkAssetToProject(asset);
      }

    } catch (error) {
      console.error('Error testing asset:', error);
      toast.error(`Failed to test asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const linkAssetToProject = async (asset: Asset) => {
    if (!id || !user?.id) {
      console.error('Missing job ID or user ID');
      return;
    }

    try {
      console.log('🔧 Linking asset to project:', asset);

      // For calibration division, handle differently
      if (job?.division?.toLowerCase() === 'calibration') {
        // For calibration, we need to create a new report entry with the existing data
        if (asset.source_table && asset.source_table.includes('calibration_')) {
          // This is an existing calibration report - we need to copy it to the current job
          const reportType = asset.source_table.replace('calibration_', '').replace('_reports', '');
          
          // Fetch the original report data
          const { data: originalReport, error: fetchError } = await supabase
            .schema('lab_ops')
            .from(asset.source_table)
            .select('*')
            .eq('id', asset.id.replace(`${asset.source_table}-`, ''))
            .single();

          if (fetchError) {
            console.error('Error fetching original report:', fetchError);
            throw fetchError;
          }

          // Check if the original report has any actual data
          const hasData = originalReport.report_info && 
            Object.keys(originalReport.report_info).length > 0 &&
            (originalReport.report_info.customer || 
             originalReport.report_info.gloveData?.assetId ||
             originalReport.report_info.bucketTruckData?.truckNumber);

          if (!hasData) {
            console.log('⚠️ Original report has no data, skipping copy');
            toast.error('This report has no data to copy. Please select a report with actual information.');
            return;
          }

          // Create a new report entry for the current job with the original data
          const newReportData = {
            ...originalReport,
            id: undefined, // Let Supabase generate a new ID
            job_id: id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Ensure we preserve all the original report_info data
          if (originalReport.report_info) {
            newReportData.report_info = {
              ...originalReport.report_info,
              // Keep the original status but update any job-specific fields if needed
              status: originalReport.report_info.status || 'PASS'
            };
          }

          const { data: newReport, error: insertError } = await supabase
            .schema('lab_ops')
            .from(asset.source_table)
            .insert(newReportData)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating new report:', insertError);
            throw insertError;
          }

          console.log('✅ Calibration report successfully copied to current job');
          
          // Debug: Log the copied data
          console.log('🔧 Original report data:', originalReport);
          console.log('🔧 New report data:', newReport);
          console.log('🔧 Report info being copied:', originalReport.report_info);
          
          // Debug: Check if the report_info has the expected structure
          if (originalReport.report_info) {
            console.log('🔧 Report info structure check:');
            console.log('  - Has gloveData:', !!originalReport.report_info.gloveData);
            console.log('  - Has customer:', !!originalReport.report_info.customer);
            console.log('  - Has assetId:', !!originalReport.report_info.assetId);
            console.log('  - Has testEquipment:', !!originalReport.report_info.testEquipment);
            console.log('  - Full report_info keys:', Object.keys(originalReport.report_info));
          }
          
          // Refresh the assets list
          await fetchJobAssets();
          
          // Close dropdown and show success message
          setIsDropdownOpen(false);
          toast.success(`Asset "${asset.name}" has been linked to this project with all data copied.`);
          
          return;
        } else if (asset.is_master) {
          // This is a master asset - create a new lab_assets entry
          const assetData = {
            name: asset.name,
            file_url: asset.file_url,
            job_id: id,
            asset_id: asset.asset_id || null,
            created_at: new Date().toISOString()
          };

          const { data: newAsset, error: assetError } = await supabase
            .schema('lab_ops')
            .from('lab_assets')
            .insert(assetData)
            .select()
            .single();

          if (assetError) {
            console.error('Error creating lab asset:', assetError);
            throw assetError;
          }

          console.log('✅ Master asset successfully linked to project');
          
          // Refresh the assets list
          await fetchJobAssets();
          
          // Close dropdown and show success message
          setIsDropdownOpen(false);
          toast.success(`Asset "${asset.name}" has been linked to this project.`);
          
          return;
        }
      } else {
        // For non-calibration divisions, use the existing logic
        // For neta_ops, use the job_assets junction table for many-to-many relationship
        // First, check if asset already exists in neta_ops.assets
        let assetId = asset.asset_id;
        
        if (!assetId) {
          // Create asset entry in neta_ops.assets
          const assetData = {
            name: asset.name,
            file_url: asset.file_url,
            user_id: user.id,
            created_at: new Date().toISOString()
          };

          const { data: newAsset, error: assetError } = await supabase
            .schema('neta_ops')
            .from('assets')
            .insert(assetData)
            .select()
            .single();

          if (assetError) {
            console.error('Error creating asset:', assetError);
            throw assetError;
          }
          
          assetId = newAsset.id;
        }

        // Link asset to the current job using job_assets junction table
        const { error: linkError } = await supabase
          .schema('neta_ops')
          .from('job_assets')
          .insert({
            job_id: id,
            asset_id: assetId,
            user_id: user.id
          });

        if (linkError) {
          console.error('Error linking asset to job:', linkError);
          throw linkError;
        }

        console.log('✅ Asset successfully linked to project via job_assets');
        
        // Refresh the assets list
        await fetchJobAssets();
        
        // Close dropdown and show success message
        setIsDropdownOpen(false);
        toast.success(`Asset "${asset.name}" has been linked to this project.`);
      }

    } catch (error) {
      console.error('Error linking asset to project:', error);
      toast.error(`Failed to link asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
      // Check job division first to determine which schema to use
      const { data: jobData, error: jobError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select('division')
        .eq('id', id)
        .single();

      // If not found in neta_ops, check lab_ops
      let useLabSchema = false;
      if (jobError || !jobData) {
        const { data: labJobData, error: labJobError } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select('division')
          .eq('id', id)
          .single();

        if (!labJobError && labJobData) {
          useLabSchema = isLabDivision(labJobData.division);
        }
      } else {
        useLabSchema = isLabDivision(jobData.division);
      }

      // Use appropriate schema
      const schema = useLabSchema ? 'lab_ops' : 'neta_ops';
      const assetsTable = useLabSchema ? 'lab_assets' : 'assets';
      const jobAssetsTable = useLabSchema ? null : 'job_assets';

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
      let assetId;
      if (useLabSchema) {
        // For lab_ops, directly link the asset to the job
        const { data: assetData, error: assetError } = await supabase
          .schema(schema)
          .from(assetsTable)
          .insert({
            name: newAssetName,
            file_url: publicUrl,
            job_id: id, // Direct link to job
            user_id: user?.id,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (assetError) throw assetError;
        assetId = assetData.id;
      } else {
        // For neta_ops, use the junction table pattern
        const { data: assetData, error: assetError } = await supabase
          .schema(schema)
          .from(assetsTable)
          .insert({
            name: newAssetName,
            file_url: publicUrl,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (assetError) throw assetError;
        assetId = assetData.id;

        // 4. Link asset to job
        const { error: linkError } = await supabase
          .schema(schema)
          .from('job_assets')
          .insert({
            job_id: id,
            asset_id: assetId,
            user_id: user?.id,
          });

        if (linkError) throw linkError;
      }

      setUploadProgress(100);
      toast.success('Asset added successfully!');
      
      // Reset form
      setNewAssetName('');
      setSelectedFile(null);
      setShowUploadDialog(false);
      
      // Refresh job assets
      fetchJobAssets();
    } catch (error) {
      console.error('Error uploading asset:', error);
      toast.error('Failed to upload asset');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete asset function
  const handleDeleteAsset = async () => {
    if (!assetToDelete || !id) {
      toast.error('Unable to delete asset');
      return;
    }

    try {
      console.log('Deleting asset:', assetToDelete);
      
      // Check if this is a calibration division job by directly checking the job table
      const { data: jobData, error: jobError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('id, division')
        .eq('id', id)
        .single();
        
      const isCalibration = jobData?.division?.toLowerCase() === 'calibration';
      
      if (isCalibration) {
        // For calibration division, soft delete by setting deleted_at timestamp
        console.log('Soft deleting calibration asset with ID:', assetToDelete.id);
        
        const { error: deleteError } = await supabase
          .schema('lab_ops')
          .from('lab_assets')
          .update({ 
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', assetToDelete.id);

        if (deleteError) {
          console.error('Error soft deleting lab asset:', deleteError);
          throw deleteError;
        }
        
        console.log('Successfully soft deleted calibration asset');
      } else {
        // For other divisions, delete from the junction table
        const { error: linkError } = await supabase
          .schema('neta_ops')
          .from('job_assets')
          .delete()
          .eq('job_id', id)
          .eq('asset_id', assetToDelete.id);

        if (linkError) {
          console.error('Error deleting job-asset link:', linkError);
          throw linkError;
        }

        // If this is a document (not a report), delete the asset record and file
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

          if (assetError) {
            console.error('Error deleting asset record:', assetError);
            throw assetError;
          }
        }
      }

      // Refresh the UI
      fetchJobAssets();
      
      // Reset state and notify user
      setShowDeleteConfirm(false);
      setAssetToDelete(null);
      toast.success('Asset deleted successfully');
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const getReportEditPath = (asset: Asset) => {
    console.log('🔧 getReportEditPath called with asset:', asset);
    console.log('🔧 Asset file_url:', asset.file_url);
    
    const urlContent = asset.file_url.split(':/')[1];
    console.log('🔧 URL content after split:', urlContent);
    
    const pathSegments = urlContent.split('/');
    console.log('🔧 Path segments:', pathSegments);

    if (pathSegments[0] !== 'jobs' || !pathSegments[1] || !pathSegments[2]) {
      console.error('Unexpected asset.file_url format for report path:', asset.file_url, 'Expected format like "report:/jobs/JOB_ID/report-slug..."');
      return `/jobs/${id}`; // Fallback to current job detail page
    }

    const jobIdSegment = pathSegments[1]; // This is the job ID from the asset's URL
    let reportNameSlug = pathSegments[2];
    const reportIdFromUrl = pathSegments[3]; // This might be an actual ID or undefined

    // Only log in development and when there are actual issues
    if (process.env.NODE_ENV === 'development' && !reportIdFromUrl) {
      console.log('🔧 Job ID segment:', jobIdSegment);
      console.log('🔧 Report name slug:', reportNameSlug);
      console.log('🔧 Report ID from URL:', reportIdFromUrl);
    }

    // Clean query parameters from reportNameSlug if it's the last significant path part before query
    if (reportNameSlug.includes('?')) {
      reportNameSlug = reportNameSlug.split('?')[0];
    }
    
    // Comprehensive map of report slugs to their route segments
    // Keys should match the slug in defaultAssets.file_url (e.g., 'panelboard-report')
    // Values should be the route segment used in App.tsx (usually the same)
    const reportPathMap: { [key: string]: string } = {
      'panelboard-report': 'panelboard-report',
      'low-voltage-switch-multi-device-test': 'low-voltage-switch-multi-device-test',
      'low-voltage-circuit-breaker-electronic-trip-ats-report': 'low-voltage-circuit-breaker-electronic-trip-ats-report',
      'automatic-transfer-switch-ats-report': 'automatic-transfer-switch-ats-report',
      'large-dry-type-transformer-mts-report': 'large-dry-type-transformer-mts-report',
      'large-dry-type-xfmr-mts-report': 'large-dry-type-xfmr-mts-report',
      'switchgear-panelboard-mts-report': 'switchgear-panelboard-mts-report',
      'liquid-xfmr-visual-mts-report': 'liquid-xfmr-visual-mts-report',
      'switchgear-report': 'switchgear-report',
      'dry-type-transformer': 'dry-type-transformer',
      'large-dry-type-transformer': 'large-dry-type-transformer', // Added based on App.tsx routes
      'liquid-filled-transformer': 'liquid-filled-transformer',
      'oil-inspection': 'oil-inspection',
      'low-voltage-cable-test-12sets': 'low-voltage-cable-test-12sets',
      'low-voltage-cable-test-20sets': 'low-voltage-cable-test-20sets',
      'medium-voltage-vlf-tan-delta': 'medium-voltage-vlf-tan-delta',
      'medium-voltage-vlf': 'medium-voltage-vlf',
      'medium-voltage-cable-vlf-test': 'medium-voltage-cable-vlf-test',
      'metal-enclosed-busway': 'metal-enclosed-busway',
      'low-voltage-switch-report': 'low-voltage-switch-report',
      'medium-voltage-switch-oil-report': 'medium-voltage-switch-oil-report',
      'low-voltage-circuit-breaker-electronic-trip-ats-secondary-injection-report': 'low-voltage-circuit-breaker-electronic-trip-ats-secondary-injection-report',
      'low-voltage-circuit-breaker-thermal-magnetic-ats-report': 'low-voltage-circuit-breaker-thermal-magnetic-ats-report',
      'low-voltage-panelboard-small-breaker-report': 'low-voltage-panelboard-small-breaker-report',
      'medium-voltage-circuit-breaker-report': 'medium-voltage-circuit-breaker-report',
      'current-transformer-test-ats-report': 'current-transformer-test-ats-report',
      '12-current-transformer-test-ats-report': '12-current-transformer-test-ats-report',
      'oil-analysis-report': 'oil-analysis-report', // Added based on App.tsx routes
      'cable-hipot-test-report': 'cable-hipot-test-report', // Added based on App.tsx routes
      'relay-test-report': 'relay-test-report', // Added based on App.tsx routes
      'two-small-dry-typer-xfmr-ats-report': 'two-small-dry-typer-xfmr-ats-report',
      // All calibration reports
      'calibration-gloves': 'calibration-gloves',
      'calibration-sleeve': 'calibration-sleeve',
      'calibration-blanket': 'calibration-blanket',
      'calibration-line-hose': 'calibration-line-hose',
      'calibration-hotstick': 'calibration-hotstick',
      'calibration-ground-cable': 'calibration-ground-cable',
      'calibration-bucket-truck': 'calibration-bucket-truck',
  'calibration-digger': 'calibration-digger',
      'meter-template': 'meter-template'
      // ensure all slugs from defaultAssets and App.tsx routes are here
    };

    const mappedReportName = reportPathMap[reportNameSlug];

    if (!mappedReportName) {
      console.error('Unknown report type for path mapping. Slug:', reportNameSlug, 'Original URL:', asset.file_url, 'Asset ID:', asset.id);
      return `/jobs/${id}`; // Fallback
    }

    // Check if the asset is a template (for creating a new report) or an existing report.
    // Templates from defaultAssets typically won't have a reportId in their file_url path.
    // Existing assets (from jobAssets) will have a file_url like 'report:/jobs/JOB_ID/slug/REPORT_ID'.
    
    // A simple way to check if it's a template link: if asset.id is one of the predefined template IDs in defaultAssets
    const isTemplate = defaultAssets.some(da => da.id === asset.id && da.file_url.startsWith('report:'));

    if (isTemplate) {
      // For templates (new reports), navigate to the path without a reportId segment.
      // The jobIdSegment here is the current job's ID passed via the template literal in defaultAssets
      const path = `/jobs/${jobIdSegment}/${mappedReportName}`;
      console.log('🔧 Template path:', path);
      return path;
    } else if (reportIdFromUrl) {
      // For existing reports that have an ID in their URL structure.
      const path = `/jobs/${jobIdSegment}/${mappedReportName}/${reportIdFromUrl}`;
      console.log('🔧 Existing report path:', path);
      return path;
    } else {
      // Fallback for existing assets that might have a malformed URL or if it's a template missed by the above check.
      // This primarily targets new reports from templates.
      console.warn('Asset is not a template and has no reportId in URL, defaulting to new report path:', asset.file_url);
      const path = `/jobs/${jobIdSegment}/${mappedReportName}`;
      console.log('🔧 Fallback path:', path);
      return path;
    }
  };

  // Fetch job details
  const fetchJobDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Attempting to fetch job details for ID: ${id}`);

      // First, try to fetch from lab_ops.lab_jobs (for calibration/armadillo jobs)
      console.log('Trying lab_ops.lab_jobs first...');
      const { data: labJob, error: labError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Lab job query result:', { labJob, labError });

      // If we found a lab job and there's no error, use it
      if (labJob && !labError) {
        console.log('Found lab job:', labJob);
        
        // Fetch customer data separately
        let customerData = null;
        if (labJob.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .schema('lab_ops')
            .from('lab_customers')
            .select('*')
            .eq('id', labJob.customer_id)
            .single();
          
          if (!customerError && customer) {
            customerData = customer;
          }
        }
        
        // Transform the data to match the expected format
        const transformedJob = {
          ...labJob,
          customers: customerData
        };
        
        setJob(transformedJob);
        setIsLabJob(true);
        console.log('Set isLabJob to true');
        return;
      }

      // If not found in lab_ops (error code PGRST116 means "not found"), try neta_ops.jobs
      if (labError && labError.code === 'PGRST116') {
        console.log('Job not found in lab_ops, trying neta_ops...');
        
        const { data: netaJob, error: netaError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        console.log('NETA job query result:', { netaJob, netaError });

        if (netaError) {
          if (netaError.code === 'PGRST116') {
            console.log('Job not found in either schema');
            throw new Error('Job not found in either lab_ops or neta_ops');
          }
          console.log('NETA job query error:', netaError);
          throw netaError;
        }

        console.log('Found NETA job:', netaJob);
        
        // Fetch customer data separately
        let customerData = null;
        if (netaJob.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('*')
            .eq('id', netaJob.customer_id)
            .single();
          
          if (!customerError && customer) {
            customerData = customer;
          }
        }
        
        // Transform the data to match the expected format
        const transformedJob = {
          ...netaJob,
          customers: customerData
        };
        
        console.log('Transformed NETA job:', transformedJob);
        setJob(transformedJob);
        setIsLabJob(false);
        console.log('Set isLabJob to false');
        return;
      }

      // If there was a different error from lab_ops (not "not found"), throw it
      if (labError) {
        console.log('Lab job query had non-404 error:', labError);
        throw labError;
      }

    } catch (err: any) {
      console.error('Error fetching job details:', err);
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // Function to print all calibration reports in the job
  const handlePrintAll = async () => {
    console.log('Print All button clicked!');
    
    if (!job) {
      toast.error('Job information not available');
      return;
    }
      
    // Check division
    const divisionCheck = job.division?.toLowerCase() || '';
    if (!job.division || !['calibration', 'lab'].includes(divisionCheck)) {
        toast.error('Print All is only available for calibration division jobs');
        return;
      }

    // Filter for calibration reports
      const calibrationReports = jobAssets.filter(asset => {
      return asset.file_url.includes('calibration-');
      });

      if (calibrationReports.length === 0) {
        toast.error('No calibration reports found in this job');
        return;
      }

    console.log(`Found ${calibrationReports.length} calibration reports`);
    toast.loading('Generating combined PDF...');

    try {
      // Create a single PDF content container
      const pdfContent = document.createElement('div');
      let combinedHTML = '';

          // Map report types to table names
          const tableMap: { [key: string]: string } = {
            'calibration-gloves': 'calibration_gloves_reports',
            'calibration-sleeve': 'calibration_sleeve_reports', 
            'calibration-blanket': 'calibration_blanket_reports',
            'calibration-line-hose': 'calibration_line_hose_reports',
            'calibration-hotstick': 'calibration_hotstick_reports',
            'calibration-ground-cable': 'calibration_ground_cable_reports',
            'calibration-bucket-truck': 'calibration_bucket_truck_reports',
  'calibration-digger': 'calibration_digger_reports'
          };

      // Process each calibration report
      for (let i = 0; i < calibrationReports.length; i++) {
        const asset = calibrationReports[i];
        
        try {
          console.log(`Processing report ${i + 1}/${calibrationReports.length}: ${asset.name}`);
          
          // Extract report type and ID from file_url
          const urlParts = asset.file_url.split('/');
          const reportType = urlParts[urlParts.length - 2]; // e.g., 'calibration-gloves'
          const reportId = urlParts[urlParts.length - 1];

          const tableName = tableMap[reportType];
          if (!tableName) {
            console.log(`No table mapping found for report type: ${reportType}`);
            continue;
          }
          
          // Fetch report data
          const { data: reportData, error } = await supabase
            .schema('lab_ops')
            .from(tableName)
            .select('*')
            .eq('id', reportId)
            .single();

          if (error || !reportData) {
            console.error(`Error fetching report data for ${reportType}:`, error);
            continue;
          }
          
          console.log(`Successfully fetched report data for ${reportType}`);
          
          // Generate HTML for this report using the same method as individual reports
          const reportHTML = generateReportHTML(reportType, reportData.report_info, reportData.status);
          
          if (reportHTML && reportHTML.length > 100) {
            // Add page break before each report except the first
          if (i > 0) {
              combinedHTML += '<div style="page-break-before: always;"></div>';
            }
            combinedHTML += reportHTML;
          }
          
        } catch (error) {
          console.error(`Error processing report ${asset.name}:`, error);
        }
      }

      if (!combinedHTML) {
        toast.dismiss();
        toast.error('No reports could be processed');
        return;
      }

      // Set the combined HTML content
      pdfContent.innerHTML = combinedHTML;

      console.log(`Combined HTML length: ${combinedHTML.length}`);
      console.log('Starting PDF generation with combined content...');

      // Use exact same options as individual reports
      const options = {
        margin: 0.5,
        filename: `All_Calibration_Reports_Job_${job.job_number || id}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait'
        }
      };

      // Generate PDF using exact same method as individual reports
      console.log('Calling html2pdf with combined content...');
      await html2pdf().from(pdfContent).set(options).save();
      console.log('PDF generated successfully');
      
      toast.dismiss();
      toast.success(`PDF generated successfully with ${calibrationReports.length} reports!`);

    } catch (error) {
      console.error('Error generating combined PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate combined PDF');
    }
  };

  // Function to generate a packing slip for the project
  const generatePackingSlip = async () => {
    if (!job || !jobAssets.length) {
      toast.error('No assets to include in packing slip');
      return;
    }

    try {
      console.log('[JobDetail] Generating packing slip...');

      // Count report types
      const reportCounts: { [key: string]: number } = {};
      
      console.log('[JobDetail] jobAssets for packing slip:', jobAssets);
      console.log('[JobDetail] jobAssets length:', jobAssets.length);
      
      jobAssets.forEach((asset, index) => {
        console.log(`[JobDetail] Processing asset ${index + 1}:`, {
          id: asset.id,
          name: asset.name,
          file_url: asset.file_url,
          startsWithReport: asset.file_url.startsWith('report:')
        });
        
        if (asset.file_url.startsWith('report:')) {
          // Extract report type from URL
          const urlParts = asset.file_url.split('/');
          console.log('[JobDetail] URL parts:', urlParts);
          
          const reportSlug = urlParts[3];
          console.log('[JobDetail] Report slug:', reportSlug);
          
          if (reportSlug) {
            const cleanReportSlug = reportSlug.split('?')[0];
            console.log('[JobDetail] Clean report slug:', cleanReportSlug);
            
            // Map report slugs to readable names
            const reportTypeMap: { [key: string]: string } = {
              'calibration-gloves': 'pairs of Gloves',
              'calibration-sleeve': 'Sleeves',
              'calibration-blanket': 'Blankets',
              'calibration-line-hose': 'Line Hoses',
              'calibration-hotstick': 'Hotsticks',
              'calibration-ground-cable': 'Ground Cables',
              'calibration-bucket-truck': 'Bucket Truck Reports',
              'calibration-digger': 'Digger Reports',
              'meter-template': 'Meter Reports',
              'panelboard-report': 'Panelboard Reports',
              'low-voltage-switch-multi-device-test': 'LV Switch Reports',
              'low-voltage-circuit-breaker-electronic-trip-ats-report': 'LV Circuit Breaker Reports',
              'automatic-transfer-switch-ats-report': 'ATS Reports',
              'large-dry-type-transformer-mts-report': 'Large Transformer Reports',
              'large-dry-type-transformer-ats-report': 'Large Transformer Reports'
            };
            
            const reportType = reportTypeMap[cleanReportSlug] || 'Document';
            reportCounts[reportType] = (reportCounts[reportType] || 0) + 1;
            console.log('[JobDetail] Added report type:', reportType, 'Count:', reportCounts[reportType]);
          }
        } else {
          // For non-report documents
          reportCounts['Document'] = (reportCounts['Document'] || 0) + 1;
          console.log('[JobDetail] Added Document, Count:', reportCounts['Document']);
        }
      });
      
      console.log('[JobDetail] Final reportCounts:', reportCounts);
      console.log('[JobDetail] Object.entries(reportCounts):', Object.entries(reportCounts));

      // If no report counts were found, create a simple list of all assets
      if (Object.keys(reportCounts).length === 0) {
        console.log('[JobDetail] No report counts found, creating simple asset list');
        jobAssets.forEach((asset, index) => {
          const assetName = asset.name || asset.id || 'Unknown Asset';
          reportCounts[assetName] = 1;
        });
        console.log('[JobDetail] Created simple asset list:', reportCounts);
      }

      // Create packing slip HTML
      const packingSlipHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Packing Slip - ${job.job_number || job.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: #ffffff;
            }
            .packing-slip {
              max-width: 800px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 2px solid #000;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
              color: #000;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
            .job-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding: 15px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 5px;
            }
            .job-info-left, .job-info-right {
              flex: 1;
            }
            .job-info h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
              font-weight: bold;
              color: #000;
            }
            .job-info p {
              margin: 5px 0;
              font-size: 14px;
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th {
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 14px;
              color: #000;
            }
            .items-table td {
              border: 1px solid #dee2e6;
              padding: 12px;
              font-size: 14px;
              color: #333;
            }
            .items-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .total-row {
              background-color: #e9ecef !important;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              border-top: 1px solid #000;
              padding-top: 10px;
              text-align: center;
            }
            .signature-box p {
              margin: 5px 0;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .packing-slip { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="packing-slip">
            <div class="header">
              <h1>PACKING SLIP</h1>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="job-info">
              <div class="job-info-left">
                <h3>Project Information</h3>
                <p><strong>Project Number:</strong> ${job.job_number || 'N/A'}</p>
                <p><strong>Customer:</strong> ${job.customers?.name || 'N/A'}</p>
                <p><strong>Company:</strong> ${job.customers?.company_name || 'N/A'}</p>
                <p><strong>Status:</strong> ${job.status}</p>
              </div>
              <div class="job-info-right">
                <h3>Contact Information</h3>
                <p><strong>Address:</strong> ${job.customers?.address || 'N/A'}</p>
                <p><strong>Created:</strong> ${job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Total Items:</strong> ${jobAssets.length}</p>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 10%;">#</th>
                  <th style="width: 60%;">Item Description</th>
                  <th style="width: 15%;">Quantity</th>
                  <th style="width: 15%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportCounts).length > 0 ? 
                  Object.entries(reportCounts).map(([reportType, count], index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${count} ${reportType}</td>
                      <td>${count}</td>
                      <td>Included</td>
                    </tr>
                  `).join('') : 
                  '<tr><td colspan="4" style="text-align: center; color: #666;">No reports found in this project</td></tr>'
                }
                <tr class="total-row">
                  <td colspan="2"><strong>Total Items</strong></td>
                  <td><strong>${Object.values(reportCounts).reduce((sum, count) => sum + count, 0)}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            
            <div class="signature-section">
              <div class="signature-box">
                <p>Prepared By</p>
                <p>_____________________</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
              </div>
              <div class="signature-box">
                <p>Received By</p>
                <p>_____________________</p>
                <p>Date: _______________</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This packing slip lists all reports and documents included in Project ${job.job_number || job.id}</p>
              <p>Please verify all items are present before signing</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log('[JobDetail] Generated packing slip HTML');

      // Create a temporary container and generate PDF
      const container = document.createElement('div');
      container.innerHTML = packingSlipHTML;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `packing_slip_${job.job_number || job.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      console.log('[JobDetail] Starting packing slip PDF generation...');
      await html2pdf().set(opt).from(container).save();
      
      console.log('[JobDetail] Packing slip PDF generation completed');
      document.body.removeChild(container);
      toast.success(`Successfully generated packing slip with ${Object.keys(reportCounts).length} item types`);

    } catch (error) {
      console.error('[JobDetail] Error in generatePackingSlip:', error);
      toast.error('Failed to generate packing slip');
    }
  };

  // Generate the exact same HTML as individual reports do in their handlePrint functions
  const generateReportHTML = (reportType: string, formData: any, status: string): string => {
    switch (reportType) {
      case 'calibration-gloves':
        return generateGlovesHTML(formData, status);
      case 'calibration-hotstick':
        return generateHotstickHTML(formData, status);
      case 'calibration-ground-cable':
        return generateGroundCableHTML(formData, status);
      case 'calibration-sleeve':
        return generateSleeveHTML(formData, status);
      case 'calibration-blanket':
        return generateBlanketHTML(formData, status);
      case 'calibration-line-hose':
        return generateLineHoseHTML(formData, status);
              case 'calibration-bucket-truck':
          return generateBucketTruckHTML(formData, status);
        case 'calibration-digger':
          return generateDiggerHTML(formData, status);
      case 'meter-template':
        return generateMeterHTML(formData, status);
      default:
        return `<div>Unknown report type: ${reportType}</div>`;
    }
  };

  // Exact same HTML generation as CalibrationGlovesReport.tsx
  const generateGlovesHTML = (formData: any, status: string): string => {
    console.log('generateGlovesHTML called with:', { formData, status });
    console.log('formData structure:', JSON.stringify(formData, null, 2));
    
    // Handle both direct database structure and formData structure
    const customer = formData.customer || '';
    const jobNumber = formData.jobNumber || '';
    const date = formData.date || '';
    const comments = formData.comments || '';
    
    // Handle glove data - it might be nested differently
    const gloveData = formData.gloveData || formData;
    const assetId = gloveData.assetId || '';
    const manufacturer = gloveData.manufacturer || '';
    const gloveClass = gloveData.class || '';
    const size = gloveData.size || '';
    const cuffType = gloveData.cuffType || '';
    const colorOutside = gloveData.colorOutside || '';
    const colorInside = gloveData.colorInside || '';
    
    // Handle test equipment
    const testEquipment = formData.testEquipment || {};
    const equipmentName = testEquipment.name || 'Hipotronics 880PL-A';
    const serialNumber = testEquipment.serialNumber || 'M010164';
    
    console.log('Extracted data:', { customer, jobNumber, assetId, manufacturer, gloveClass });
    
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Rubber Insulating Gloves Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${customer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${jobNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Class:</strong></div>
            <div style="margin-bottom: 8px;">${gloveClass}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Size:</strong></div>
            <div style="margin-bottom: 8px;">${size}</div>
            
            <div style="margin-bottom: 6px;"><strong>Cuff Type:</strong></div>
            <div style="margin-bottom: 8px;">${cuffType}</div>
            
            <div style="margin-bottom: 6px;"><strong>Color Outside:</strong></div>
            <div style="margin-bottom: 8px;">${colorOutside}</div>
            
            <div style="margin-bottom: 6px;"><strong>Color Inside:</strong></div>
            <div style="margin-bottom: 8px;">${colorInside}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${equipmentName}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${serialNumber}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  // Placeholder functions for other report types - will need to be filled in with exact HTML from each report
  const generateHotstickHTML = (formData: any, status: string): string => {
    console.log('generateHotstickHTML called with:', { formData, status });
    
    // Handle both direct database structure and formData structure
    const customer = formData.customer || '';
    const jobNumber = formData.jobNumber || '';
    const date = formData.date || '';
    const comments = formData.comments || '';
    
    // Handle hotstick data - it might be nested differently
    const hotstickData = formData.hotstickData || formData;
    const assetId = hotstickData.assetId || '';
    const manufacturer = hotstickData.manufacturer || '';
    const length = hotstickData.length || '';
    const type = hotstickData.type || '';
    const testVoltage = hotstickData.testVoltage || '';
    
    // Handle test equipment
    const testEquipment = formData.testEquipment || {};
    const equipmentName = testEquipment.name || 'Hipotronics 880PL-A';
    const serialNumber = testEquipment.serialNumber || 'M010164';
    
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Hotstick Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${customer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${jobNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Length:</strong></div>
            <div style="margin-bottom: 8px;">${length}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Type:</strong></div>
            <div style="margin-bottom: 8px;">${type}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Voltage:</strong></div>
            <div style="margin-bottom: 8px;">${testVoltage}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${equipmentName}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${serialNumber}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const generateGroundCableHTML = (formData: any, status: string): string => {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Ground Cable Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.groundCableData?.assetId || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Length:</strong></div>
            <div style="margin-bottom: 8px;">${formData.groundCableData?.length || ''}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Size:</strong></div>
            <div style="margin-bottom: 8px;">${formData.groundCableData?.size || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Resistance:</strong></div>
            <div style="margin-bottom: 8px;">${formData.groundCableData?.resistance || ''}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">Megger DLRO-H200</td>
                <td style="padding: 4px; border: 1px solid #ccc;">2300974</td>
                <td style="padding: 4px; border: 1px solid #ccc;">4/25/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">4/25/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const generateSleeveHTML = (formData: any, status: string): string => {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Rubber Insulating Sleeves Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData?.assetId || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData?.manufacturer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Class:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData?.class || ''}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Size:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData?.size || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Color Inside:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData?.colorInside || ''}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.serialNumber || 'M010164'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const generateBlanketHTML = (formData: any, status: string): string => {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Rubber Insulating Blankets Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.blanketData?.assetId || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.blanketData?.manufacturer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Class:</strong></div>
            <div style="margin-bottom: 8px;">${formData.blanketData?.class || ''}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Type:</strong></div>
            <div style="margin-bottom: 8px;">${formData.blanketData?.type || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Split/Solid:</strong></div>
            <div style="margin-bottom: 8px;">${formData.blanketData?.splitSolid || ''}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.serialNumber || 'M010164'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const generateLineHoseHTML = (formData: any, status: string): string => {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Line Hose Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.lineHoseData?.assetId || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.lineHoseData?.manufacturer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Class:</strong></div>
            <div style="margin-bottom: 8px;">${formData.lineHoseData?.class || ''}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date || ''}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.serialNumber || 'M010164'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const generateBucketTruckHTML = (formData: any, status: string): string => {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Bucket Truck Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.assetId || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.manufacturer || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Model:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.model || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.serialNumber || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Year:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.year || ''}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Liner Status:</strong></div>
            <div style="margin-bottom: 8px; color: ${formData.bucketTruckData?.linerPassFailStatus === 'PASS' ? 'green' : 'red'};">${formData.bucketTruckData?.linerPassFailStatus || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Voltage:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.qualificationVoltage || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Upper Boom Reading:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.upperBoomReading || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Lower Boom Reading:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.lowerBoomReading || ''}</div>
            
            <div style="margin-bottom: 6px;"><strong>Liner Type:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData?.linerType || ''}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment?.serialNumber || 'M010164'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  // Generate HTML for Digger Report
  const generateDiggerHTML = (formData: any, status: string): string => {
    console.log('generateDiggerHTML called with:', { formData, status });
    
    // Extract data from formData
    const customer = formData.customer || '';
    const jobNumber = formData.jobNumber || '';
    const date = formData.date || '';
    const comments = formData.comments || '';
    
    // Handle digger data - it might be nested differently
    const diggerData = formData.diggerData || formData;
    const assetId = diggerData.assetId || formData.assetId || '';
    const diggerNumber = diggerData.diggerNumber || formData.diggerNumber || '';
    const serialNumber = diggerData.serialNumber || formData.serialNumber || '';
    const manufacturer = diggerData.manufacturer || formData.manufacturer || '';
    const model = diggerData.model || formData.model || '';
    
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Digger Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${customer || '[Customer Name]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${jobNumber || '[Project Number]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Digger Number:</strong></div>
            <div style="margin-bottom: 8px;">${diggerNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${manufacturer}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial Number:</strong></div>
            <div style="margin-bottom: 8px;">${serialNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Model:</strong></div>
            <div style="margin-bottom: 8px;">${model}</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <p style="font-size: 11px; line-height: 1.3; margin: 0; color: #333;">${comments}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

  // Generate HTML for Meter Template Report
  const generateMeterHTML = (formData: any, status: string): string => {
    console.log('generateMeterHTML called with:', { formData, status });
    console.log('formData structure:', JSON.stringify(formData, null, 2));
    
    // Handle both direct database structure and formData structure
    const customer = formData.customer || '';
    const jobNumber = formData.jobNumber || '';
    const date = formData.date || '';
    const comments = formData.comments || '';
    
    // Handle meter data - it might be nested differently
    const meterData = formData.meterData || formData;
    const assetId = meterData.assetId || formData.assetId || '';
    const manufacturer = meterData.manufacturer || formData.manufacturer || '';
    const meterName = meterData.meterName || formData.meterName || '';
    const serialNumber = meterData.serialNumber || formData.serialNumber || '';
    const meterType = meterData.meterType || formData.meterType || '';
    
    console.log('Extracted data:', { customer, jobNumber, assetId, manufacturer, meterName });
    
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Meter Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${customer || '[Customer Name]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${jobNumber || '[Project Number]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Meter Name:</strong></div>
            <div style="margin-bottom: 8px;">${meterName}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial Number:</strong></div>
            <div style="margin-bottom: 8px;">${serialNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Meter Type:</strong></div>
            <div style="margin-bottom: 8px;">${meterType}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">Fluke 5520A</td>
                <td style="padding: 4px; border: 1px solid #ccc;">9480018</td>
                <td style="padding: 4px; border: 1px solid #ccc;">8/14/2024</td>
                <td style="padding: 4px; border: 1px solid #ccc;">8/14/2025</td>
              </tr>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">Fluke 8845A</td>
                <td style="padding: 4px; border: 1px solid #ccc;">5774006</td>
                <td style="padding: 4px; border: 1px solid #ccc;">12/6/2024</td>
                <td style="padding: 4px; border: 1px solid #ccc;">12/6/2025</td>
              </tr>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">RIE</td>
                <td style="padding: 4px; border: 1px solid #ccc;">1001138</td>
                <td style="padding: 4px; border: 1px solid #ccc;">12/15/2024</td>
                <td style="padding: 4px; border: 1px solid #ccc;">12/15/2025</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        ${comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 30px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;
  };

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
        {job?.division?.toLowerCase() === 'calibration' ? (
          <button
            onClick={() => {
              // Navigate to the appropriate jobs page based on division
              if (job?.division?.toLowerCase() === 'calibration') {
                navigate('/calibration/jobs');
              } else {
                navigate('/jobs');
              }
            }}
            className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2"
          >
            <ArrowLeft className="h-5 w-5 min-w-[20px] flex-shrink-0 mr-1" />
            Back
          </button>
        ) : (
        <Button 
          variant="ghost"
          onClick={() => {
            // Navigate to the appropriate jobs page based on division
            if (job?.division?.toLowerCase() === 'calibration') {
              navigate('/calibration/jobs');
            } else {
              navigate('/jobs');
            }
          }}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
        >
          <ArrowLeft className="h-5 w-5 min-w-[20px] flex-shrink-0" />
          Back
        </Button>
        )}
        <div className="flex gap-2 items-center">
          {/* Add JobNotifications component */}
          {id && <JobNotifications 
            jobId={id} 
            buttonClassName={
              job?.division?.toLowerCase() === 'calibration' 
                ? 'hover:bg-[#339C5E] hover:text-white' 
                : ''
            }
          />}
          
          <Button 
            onClick={() => {
              setEditFormData(job);
              setIsEditing(true);
            }}
            className={`flex items-center gap-2 ${
              job?.division?.toLowerCase() === 'calibration' 
                ? 'bg-[#339C5E] text-white hover:bg-[#2d8a54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#339C5E]' 
                : 'focus:outline-none'
            }`}
          >
            <Pencil className="h-5 w-5 min-w-[20px] flex-shrink-0" />
            Edit Job
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mb-8">
        <JobComments jobId={id || ''} jobDivision={job?.division || ''} />
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
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {job.title === 'Calibration Job' || job.title === 'calibration job' ? 'Project' : job.title}
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Job #{job.job_number || 'Pending'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={job.status}
                    onChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                    className={`px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] ${
                      isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="ready-to-bill">Ready To Bill</option>
                  </select>
                  <Badge className={`${
                    job.priority === 'high' ? 'bg-red-100 text-red-800' :
                    job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {job.priority} priority
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Number</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {job.job_number || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {job.customers?.company_name || job.customers?.name || 'Unknown Customer'}
                  </p>
                  {job.customers?.address && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {job.customers.address}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Division</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {job.division ? job.division.charAt(0).toUpperCase() + job.division.slice(1) : 'Not set'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {job.start_date ? format(new Date(job.start_date), 'MMM d, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {job.due_date ? format(new Date(job.due_date), 'MMM d, yyyy') : 'Not set'}
                  </p>
                </div>
                {job.budget && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      ${job.budget.toLocaleString()}
                    </p>
                  </div>
                )}

                {job.equipment_types && job.equipment_types.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipment Types</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {job.equipment_types.join(', ')}
                    </p>
                  </div>
                )}
              </div>
              
              {job.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.description}</p>
                </div>
              )}

              {job.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{job.notes}</p>
                </div>
              )}

              {(job.created_at || job.updated_at) && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamps</h3>
                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.created_at && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500">Created</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {format(new Date(job.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {job.updated_at && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500">Last Updated</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {format(new Date(job.updated_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="px-6">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleTabChange('assets')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'assets'
                        ? 'border-b-2 border-accent-color text-accent-color'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Assets
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'assets' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Job Assets & Reports</h3>
                      <div className="flex space-x-2 relative" ref={dropdownRef}>
                        {/* Original Add Asset button - hide for Calibration Division */}
                        {(!job?.division || job.division.toLowerCase() !== 'calibration') && (
                          <>
                            <Button 
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Add Asset
                            </Button>
                            
                            <Button 
                              onClick={() => window.open('https://www.ups.com/ship/single-page?tx=76889995418588601&loc=en_US', '_blank')}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white min-w-[120px] justify-center"
                              title="Open UPS shipping label in new tab"
                            >
                              <Package className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Print Label
                            </Button>
                            
                            <Button 
                              onClick={generatePackingSlip}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white min-w-[120px] justify-center"
                              title="Generate a packing slip listing all reports in this project"
                            >
                              <Package className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Packing Slip
                            </Button>
                          </>
                        )}
                        
                        {/* Combined Add Asset button for Calibration Division */}
                        {job?.division?.toLowerCase() === 'calibration' && (
                          <>
                            <Button 
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className={`flex items-center gap-2 ${job?.division?.toLowerCase() === 'calibration' ? 'bg-[#339C5E] hover:bg-[#2d8a54]' : 'bg-accent-color hover:bg-[#d94e00]'} text-white`}
                            >
                              <Plus className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Add Asset
                            </Button>
                            
                            <Button 
                              onClick={() => window.open('https://www.ups.com/ship/single-page?tx=76889995418588601&loc=en_US', '_blank')}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                              title="Open UPS shipping label in new tab"
                            >
                              <Package className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Print Label
                            </Button>
                            
                            <Button 
                              onClick={handlePrintAll}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                              title="Generate a combined PDF of all calibration reports in this job"
                            >
                              <Printer className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Print All
                            </Button>
                            
                            <Button 
                              onClick={generatePackingSlip}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                              title="Generate a packing slip listing all reports in this project"
                            >
                              <Package className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                              Packing Slip
                            </Button>
                          </>
                        )}
                        
                        {/* Dropdown menu */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-12 w-96 bg-white dark:bg-dark-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 z-50">
                            <div className="p-2">
                              <input
                                type="text"
                                placeholder="🔍 Search master assets, existing reports, asset IDs, customer names..."
                                value={reportSearchQuery}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setReportSearchQuery(value);
                                  setMeterReportSearchQuery(value);
                                  
                                  // For calibration division, search immediately as user types
                                  if (job?.division?.toLowerCase() === 'calibration') {
                                    if (value.trim().length >= 2) {
                                      searchExistingAssets(value);
                                    } else {
                                      setExistingAssets([]);
                                    }
                                  }
                                }}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-2 bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
                              />
                              
                              {/* Show different report templates based on division */}
                              {job?.division?.toLowerCase() === 'calibration' ? (
                                // Calibration Division Reports
                                <div className="py-1">
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                    Calibration Reports
                                  </div>
                                  <Link 
                                    to={`/jobs/${id}/calibration-gloves`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Glove Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-sleeve`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Sleeve Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-blanket`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Blanket Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-line-hose`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Line Hose Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-hotstick`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Hotstick Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-ground-cable`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Ground Cable Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-bucket-truck`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Bucket Truck Report</span>
                                    </div>
                                  </Link>
                                  <Link 
                                    to={`/jobs/${id}/calibration-digger`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Digger Report</span>
                                    </div>
                                  </Link>
                                  
                                  {/* Meter Reports Section */}
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                    Meter Reports
                                  </div>
                                  
                                  {/* New Meter Report */}
                                  <Link 
                                    to={`/jobs/${id}/meter-template`}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <div className="flex items-center">
                                      <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                      <span className="truncate">Meter Template</span>
                                    </div>
                                  </Link>
                                  
                                  {/* Existing Meter Reports */}
                                  {existingMeterReports.length > 0 && (
                                    <>
                                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                        Existing Meter Reports ({existingMeterReports.length})
                                      </div>
                                      {existingMeterReports
                                        .filter(report => 
                                          meterReportSearchQuery === '' || 
                                          report.name.toLowerCase().includes(meterReportSearchQuery.toLowerCase())
                                        )
                                        .map((report) => {
                                          // Handle templates differently from regular reports
                                          const isTemplate = report.file_url.startsWith('template:');
                                          const templateId = isTemplate ? report.id.replace('meter-template-', '') : null;
                                          
                                          if (isTemplate) {
                                            // For templates, make name clickable to use template, with edit icon
                                            return (
                                              <div key={report.id} className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <Link 
                                                  to={`/jobs/${id}/meter-template?templateId=${templateId}`}
                                                  className="flex-1 flex items-center"
                                                  onClick={() => setIsDropdownOpen(false)}
                                                >
                                                  <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                                  <span className="truncate">{report.name}</span>
                                                </Link>
                                                <div className="flex items-center ml-2">
                                                  <Link 
                                                    to={`/meter-template/${templateId}?returnPath=/jobs/${id}%3Ftab%3Dassets`}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    title="Edit Template"
                                                  >
                                                    <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                  </Link>
                                                </div>
                                              </div>
                                            );
                                          } else {
                                            // For regular reports, navigate to edit the existing report
                                            return (
                                              <Link 
                                                key={report.id}
                                                to={report.file_url.replace('report:', '')}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => setIsDropdownOpen(false)}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center">
                                                    <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                                    <span className="truncate">{report.name}</span>
                                                  </div>
                                                  <div className="flex items-center ml-2">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                      report.pass_fail_status === 'PASS' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                                    }`}>
                                                      {report.pass_fail_status}
                                                    </span>
                                                  </div>
                                                </div>
                                              </Link>
                                            );
                                          }
                                        })}
                                    </>
                                  )}
                                </div>
                              ) : (
                                // Original reports for other divisions
                                <>
                                  {/* MTS Reports Section */}
                                  {filteredReportTemplates.some(asset => asset.template_type === 'MTS') && (
                                    <>
                                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                        MTS Reports
                                      </div>
                                      {filteredReportTemplates
                                        .filter(asset => asset.template_type === 'MTS')
                                        .map((asset) => (
                                          <Link 
                                            key={asset.id}
                                            to={getReportEditPath(asset)}
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

                                  {/* ATS Reports Section */}
                                  {filteredReportTemplates.some(asset => asset.template_type === 'ATS') && (
                                    <>
                                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                        ATS Reports
                                      </div>
                                      {filteredReportTemplates
                                        .filter(asset => asset.template_type === 'ATS')
                                        .map((asset) => (
                                          <Link 
                                            key={asset.id}
                                            to={getReportEditPath(asset)}
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

                                  {/* Other Reports Section */}
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
                                            to={getReportEditPath(asset)}
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

                              {/* Existing Assets Section */}
                              {existingAssets.length > 0 && (
                                <>
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 mt-2">
                                    🎯 Master Assets & Existing Reports ({existingAssets.length})
                                  </div>
                                  {isSearchingAssets ? (
                                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                      Searching...
                                    </div>
                                  ) : (
                                    existingAssets.map((asset) => (
                                      <div 
                                        key={asset.id}
                                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      >
                                        <div className="flex items-center flex-1 min-w-0">
                                          <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="truncate">{asset.name}</div>
                                            {asset.asset_id && (
                                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                Asset ID: {asset.asset_id}
                                              </div>
                                            )}
                                            {asset.original_job_id && asset.original_job_id !== id && (
                                              <div className="text-xs text-orange-600 dark:text-orange-400 truncate">
                                                From Job: {asset.original_job_id}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center ml-2 space-x-2">
                                          {asset.pass_fail_status && (
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                              asset.pass_fail_status === 'PASS' 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                            }`}>
                                              {asset.pass_fail_status}
                                            </span>
                                          )}
                                          
                                          {/* Combined Test button for calibration division */}
                                          {job?.division?.toLowerCase() === 'calibration' ? (
                                            <button
                                              onClick={() => testAsset(asset)}
                                              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                              title={asset.is_master ? "Test and link this master asset to the current project" : "Test this asset and copy it to the current project with PASS status"}
                                            >
                                              Test
                                            </button>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => linkAssetToProject(asset)}
                                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                title={asset.is_master ? "Link this master asset to the current project" : "Link this asset to the current project"}
                                              >
                                                {asset.is_master ? 'Link' : 'Link'}
                                              </button>
                                              
                                              {/* View button for non-calibration divisions */}
                                              <Link 
                                                to={asset.file_url.replace('report:', '')}
                                                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                                                onClick={() => setIsDropdownOpen(false)}
                                                title="View this asset"
                                              >
                                                View
                                              </Link>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}

                              {/* Document Upload Option - available for all divisions */}
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 mt-2">
                                Upload Document
                              </div>
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  setShowUploadDialog(true);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <div className="flex items-center">
                                  <Upload className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                                  <span>Upload New Document</span>
                                </div>
                              </button>
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
                            <input
                              type="text"
                              placeholder="Search by Asset ID, report type, or name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-[#339C5E]/30 focus:border-[#339C5E] rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                        </div>
                        
                        {/* Filter Controls */}
                        <div className="flex flex-wrap gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Report Type:
                            </label>
                            <select
                              value={reportTypeFilter}
                              onChange={(e) => setReportTypeFilter(e.target.value)}
                              className={`px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 ${
                                job?.division?.toLowerCase() === 'calibration'
                                  ? 'focus:ring-[#339C5E]'
                                  : 'focus:ring-[#f26722]'
                              }`}
                            >
                              <option value="all">All Types</option>
                              <option value="Glove">Glove</option>
                              <option value="Sleeve">Sleeve</option>
                              <option value="Blanket">Blanket</option>
                              <option value="Line Hose">Line Hose</option>
                              <option value="Hotstick">Hotstick</option>
                              <option value="Ground Cable">Ground Cable</option>
                              <option value="Bucket Truck">Bucket Truck</option>
                              <option value="Meter Report">Meter Report</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Date:
                            </label>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className={`px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 ${
                                job?.division?.toLowerCase() === 'calibration'
                                  ? 'focus:ring-[#339C5E]'
                                  : 'focus:ring-[#f26722]'
                              }`}
                            />
                          </div>
                          
                          <button
                            onClick={() => {
                              setReportTypeFilter('all');
                              setSelectedDate('');
                              setStatusFilter('all');
                              setSearchQuery('');
                            }}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                          >
                            Reset Filters
                          </button>
                          
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            Showing {filteredJobAssets.length} of {jobAssets.length} assets
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {jobAssets.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p>No assets have been linked to this job yet.</p>
                          </div>
                        ) : filteredJobAssets.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="mb-2">
                              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium">No matching assets found</p>
                            </div>
                            <div className="text-sm space-y-1">
                              {searchQuery && (
                                <p>No assets match search term: <span className="font-medium">"{searchQuery}"</span></p>
                              )}
                              {(reportTypeFilter !== 'all' || selectedDate !== '') && (
                                <p>Try adjusting your filters or search terms</p>
                              )}
                              <p className="text-gray-400 dark:text-gray-500">
                                Search by Asset ID, report type, or document name
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Asset ID</TableHead>
                                <TableHead>Report Type</TableHead>
                                <TableHead>Pass/Fail</TableHead>
                                <TableHead>Date Tested</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredJobAssets.map((asset) => {
                                // Use the user-entered Asset ID if available (from glove reports)
                                const displayAssetId = (asset as any).userAssetId || asset.id;
                                
                                // Function to determine the simplified report type from the file_url
                                const getSimplifiedReportType = (asset: Asset) => {
                                  if (asset.file_url.startsWith('report:')) {
                                    // Extract report type from URL
                                    // URL format: report:/jobs/jobId/reportSlug/reportId
                                    const urlParts = asset.file_url.split('/');
                                    const reportSlug = urlParts[3]; // reportSlug is at index 3, not 2
                                    
                                    if (reportSlug) {
                                      // Clean query parameters from reportSlug if present
                                      const cleanReportSlug = reportSlug.split('?')[0];
                                      
                                      const reportTypeMap: { [key: string]: string } = {
                                        'calibration-gloves': 'Glove',
                                        'calibration-sleeve': 'Sleeve',
                                        'calibration-blanket': 'Blanket',
                                        'calibration-line-hose': 'Line Hose',
                                        'calibration-hotstick': 'Hotstick',
                                        'calibration-ground-cable': 'Ground Cable',
                                        'calibration-bucket-truck': 'Bucket Truck',
                                        'calibration-digger': 'Digger',
                                        'meter-template': 'Meter',
                                        'panelboard-report': 'Panelboard',
                                        'low-voltage-switch-multi-device-test': 'LV Switch',
                                        'low-voltage-circuit-breaker-electronic-trip-ats-report': 'LV Circuit Breaker',
                                        'automatic-transfer-switch-ats-report': 'ATS',
                                        'large-dry-type-transformer-mts-report': 'Large Transformer',
                                        'large-dry-type-transformer-ats-report': 'Large Transformer'
                                      };
                                      
                                      const reportType = reportTypeMap[cleanReportSlug] || 'Report';
                                      return reportType;
                                    }
                                  }
                                  
                                  // For non-report documents, extract a simplified name from the asset name
                                  return 'Document';
                                };
                                
                                return (
                                  <TableRow key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {/* Show userAssetId if available (highest priority) */}
                                      {asset.userAssetId || asset.asset_id || '-'}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                      {getSimplifiedReportType(asset)}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
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
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(asset.created_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        {asset.file_url.startsWith('report:') ? (
                                          <Link 
                                            to={getReportEditPath(asset)}
                                            className={
                                              job?.division?.toLowerCase() === 'calibration'
                                                ? "text-[#339C5E] hover:text-[#2d8a54] dark:text-[#339C5E] dark:hover:text-[#2d8a54]"
                                                : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            }
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
                                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
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
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setAssetToDelete(null);
              }}
              className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2"
            >
              Cancel
            </button>
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
      
      {/* Edit Job Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
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
                    className={`!border-gray-300 dark:!border-gray-600 ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                        : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                    }`}
                  />
                </div>

                {/* Job Number field - read-only */}
                {job?.job_number && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Number</label>
                    <Input
                      value={job.job_number}
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
                    className={`!border-gray-300 dark:!border-gray-600 ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                        : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    name="start_date"
                    type="date"
                    value={editFormData.start_date || ''}
                    onChange={handleEditInputChange}
                    className={`!border-gray-300 dark:!border-gray-600 ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                        : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <Input
                    name="due_date"
                    type="date"
                    value={editFormData.due_date || ''}
                    onChange={handleEditInputChange}
                    className={`!border-gray-300 dark:!border-gray-600 ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                        : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 dark:bg-dark-100 dark:text-white ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:ring-[#339C5E] focus:border-[#339C5E]'
                        : 'focus:ring-[#f26722] focus:border-[#f26722]'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    name="priority"
                    value={editFormData.priority}
                    onChange={handleEditInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 dark:bg-dark-100 dark:text-white ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:ring-[#339C5E] focus:border-[#339C5E]'
                        : 'focus:ring-[#f26722] focus:border-[#f26722]'
                    }`}
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

                {/* Equipment Types field - only for calibration division */}
                {job?.division?.toLowerCase() === 'calibration' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Equipment Types</label>
                  <div className="relative" ref={equipmentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen)}
                      className={`w-full px-3 py-2 text-left bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 hover:border-[#339C5E] dark:text-white ${
                        job?.division?.toLowerCase() === 'calibration' 
                          ? 'focus:ring-[#339C5E] focus:border-[#339C5E]'
                          : 'focus:ring-[#f26722] focus:border-[#f26722]'
                      }`}
                    >
                      <span className={(editFormData?.equipment_types?.length || 0) === 0 ? 'text-gray-500' : ''}>
                        {getEquipmentTypesDisplay()}
                      </span>
                      <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isEquipmentDropdownOpen ? 'rotate-180' : ''}`} />
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
                )}

                {/* Only show budget field for non-calibration/armadillo jobs */}
                {!(job?.division?.toLowerCase() === 'calibration' || job?.division?.toLowerCase() === 'armadillo') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Budget</label>
                    <Input
                      name="budget"
                      type="number"
                      step="0.01"
                      value={editFormData.budget || ''}
                      onChange={handleEditInputChange}
                      placeholder="0.00"
                      className={`!border-gray-300 dark:!border-gray-600 ${
                        job?.division?.toLowerCase() === 'calibration' 
                          ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                          : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                      }`}
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea
                    name="notes"
                    value={editFormData.notes || ''}
                    onChange={handleEditInputChange}
                    placeholder="Additional notes or special requirements..."
                    rows={3}
                    className={`!border-gray-300 dark:!border-gray-600 ${
                      job?.division?.toLowerCase() === 'calibration' 
                        ? 'focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]'
                        : 'focus:!ring-[#f26722] focus:!border-[#f26722] hover:!border-[#f26722]'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                {job?.division?.toLowerCase() === 'calibration' ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                    className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                >
                  Cancel
                </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${
                    job?.division?.toLowerCase() === 'calibration' 
                      ? 'bg-[#339C5E] hover:bg-[#2d8a54]' 
                      : 'bg-[#f26722] hover:bg-[#e55611]'
                  } text-white`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Prompt */}
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default JobDetail;