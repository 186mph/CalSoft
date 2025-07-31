import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import { toast } from 'react-hot-toast';
import { getNextAssetId, createCalibrationAsset } from '../../lib/services/assetService';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Plus, FileText, Upload, Trash2, Printer } from 'lucide-react';
import { getDivisionAccentClasses } from '../../lib/utils';
import { useDivision } from '../../App';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const CALIBRATION_DIGGER_TABLE = 'calibration_digger_reports' as const;
const SCHEMA = 'lab_ops' as const;
const ASSETS_TABLE = 'lab_assets' as const;

// Asset interface
interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  template_type?: 'MTS' | 'ATS' | null;
  asset_id?: string;
}

interface EnhancedAsset extends Asset {
  userAssetId?: string;
}

// Interface for form data structure
interface DOTInspectionComponent {
  status?: 'OK' | 'NEEDS_REPAIR';
  repairedDate?: string;
}

interface DOTInspection {
  motorCarrierOperator: string;
  address: string;
  cityStateZip: string;
  inspectorName: string;
  vehicleType: string;
  vehicleTypeOther: string;
  vehicleIdentification: string[];
  inspectorQualified: boolean;
  components: Record<string, DOTInspectionComponent>;
  additionalConditions: string;
  certified: boolean;
}

interface FormData {
  // Job Information
  customer: string;
  address: string;
  date: string;
  technicians: string;
  jobNumber: string;
  userName: string;
  customerId: string;
  customerIdForAsset?: string;
  
  // Digger Information
  diggerData: {
    assetId: string;
    serialNumber: string;
    diggerNumber: string;
    year: string;
    model: string;
    numberOfPlatforms: string;
    platformHeight: string;
    manufacturer: string;
    materialHandling: string;
    designVoltage: string;
    qualificationVoltage: string;
    lowerBoomReading: string;
    upperBoomReading: string;
    linerType: string;
    linerPassFailStatus: string;
    passFailStatus: string;
  };
  
  // DOT Inspection
  dotInspection: DOTInspection;
  
  // Test Equipment
  testEquipment: {
    name: string;
    serialNumber: string;
    ampId: string;
  };
  
  // Comments
  comments: string;
  status: string;
}

interface CustomerData {
  id?: string;
  company_id?: string;
  name?: string;
  company_name?: string;
  address?: string;
}

interface JobInfo {
  job_number: string;
  customer_id: string;
  title: string;
  customers: CustomerData;
}

interface DiggerTestHistory {
  id: string;
  digger_report_id: string;
  test_result: 'PASS' | 'FAIL';
  tested_by: string;
  test_notes?: string;
  test_date: string;
  created_at: string;
}

interface TestHistoryEntry {
  id: string;
  test_date: string;
  test_result: 'PASS' | 'FAIL';
  tested_by_email: string;
  test_notes?: string;
}

// Options for dropdowns
const materialHandlingOptions = ["Yes", "No", "NA"];
const designVoltageOptions = ["46 kVAC", "86 kVAC", "345 kVAC", "500 kV", "69 kV", "NA"];
const qualificationVoltageOptions = ["46 kVAC", "86 kVAC", "69 kVAC", "69 kV", "16 kV", "NA"];
const linerTypeOptions = ["Single", "Double", "NA"];

export default function CalibrationDiggerReport() {
  const { id: jobId, reportId: urlReportId } = useParams<{ id: string; reportId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debug URL parameters
  console.log('URL Parameters Debug:', { 
    jobId, 
    urlReportId, 
    pathname: location.pathname,
    search: location.search 
  });

  // Check URL parameters for return navigation
  const searchParams = new URLSearchParams(location.search);
  const returnPath = searchParams.get('returnPath');

  // Handle back navigation
  const handleBackNavigation = () => {
    if (returnPath) {
      // Navigate to the specified return path (e.g., All Assets page)
      navigate(returnPath);
    } else {
      // Default navigation back to job
      navigate(`/jobs/${jobId}?tab=assets`);
    }
  };

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!urlReportId);
  const [reportId, setReportId] = useState<string | null>(urlReportId || null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [linerStatus, setLinerStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
  
  // Asset management state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobAssets, setJobAssets] = useState<EnhancedAsset[]>([]);
  const [filteredJobAssets, setFilteredJobAssets] = useState<EnhancedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<EnhancedAsset | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    customer: '', 
    address: '', 
    date: new Date().toISOString().split('T')[0], 
    technicians: '',
    jobNumber: '', 
    userName: '',
    customerId: '',
    customerIdForAsset: '',
    diggerData: {
      assetId: '',
      serialNumber: '',
      diggerNumber: '',
      year: '',
      model: '',
      numberOfPlatforms: '',
      platformHeight: '',
      manufacturer: '',
      materialHandling: '',
      designVoltage: '',
      qualificationVoltage: '',
      lowerBoomReading: '',
      upperBoomReading: '',
      linerType: '',
      linerPassFailStatus: 'PASS',
      passFailStatus: 'PASS'
    },
    dotInspection: {
      motorCarrierOperator: '',
      address: '',
      cityStateZip: '',
      inspectorName: '',
      vehicleType: '',
      vehicleTypeOther: '',
      vehicleIdentification: [],
      inspectorQualified: false,
      components: {},
      additionalConditions: '',
      certified: false
    },
    testEquipment: { 
      name: '', 
      serialNumber: '', 
      ampId: '' 
    },
    comments: '',
    status: 'PASS'
  });

  // Basic handlers
  const handleChange = (section: keyof FormData | null, field: string, value: any) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, any>),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleDiggerDataChange = (field: keyof FormData['diggerData'], value: string) => {
    setFormData(prev => ({
      ...prev,
      diggerData: {
        ...prev.diggerData,
        [field]: value
      }
    }));
  };

  const handleTestEquipmentChange = (field: keyof FormData['testEquipment'], value: string) => {
    setFormData(prev => ({
      ...prev,
      testEquipment: {
        ...prev.testEquipment,
        [field]: value
      }
    }));
  };

  const updatePassFailStatus = (newStatus: string) => {
    setStatus(newStatus as 'PASS' | 'FAIL');
    handleDiggerDataChange('passFailStatus', newStatus);
  };

  const updateLinerStatus = (newLinerStatus: string) => {
    setLinerStatus(newLinerStatus as 'PASS' | 'FAIL');
    handleDiggerDataChange('linerPassFailStatus', newLinerStatus);
  };

  // DOT Inspection handlers
  const handleDOTInspectionChange = (field: keyof DOTInspection, value: any) => {
    setFormData(prev => ({
      ...prev,
      dotInspection: {
        ...prev.dotInspection,
        [field]: value
      }
    }));
  };

  const handleDOTComponentChange = (sectionIndex: number, itemIndex: number, field: 'OK' | 'NEEDS_REPAIR' | 'repairedDate', value: any) => {
    setFormData(prev => {
      const key = `${sectionIndex}-${itemIndex}`;
      const currentComponent = prev.dotInspection.components[key] || {};
      
      let updatedComponent;
      if (field === 'repairedDate') {
        updatedComponent = { ...currentComponent, repairedDate: value };
      } else {
        // For OK or NEEDS_REPAIR, we need to handle mutual exclusivity
        if (value) {
          updatedComponent = { ...currentComponent, status: field };
        } else {
          updatedComponent = { ...currentComponent, status: undefined };
        }
      }

      return {
        ...prev,
        dotInspection: {
          ...prev.dotInspection,
          components: {
            ...prev.dotInspection.components,
            [key]: updatedComponent
          }
        }
      };
    });
  };

  // Basic save function
  const handleSave = async () => {
    if (!jobId || !user?.id) {
      toast.error('Missing job or user information');
      return null;
    }

    try {
      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema(SCHEMA)
          .from(CALIBRATION_DIGGER_TABLE)
          .update({
            report_info: {
              ...formData,
              diggerData: {
                ...formData.diggerData,
                passFailStatus: status,
                linerPassFailStatus: linerStatus
              }
            },
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema(SCHEMA)
          .from(CALIBRATION_DIGGER_TABLE)
          .insert({
            job_id: jobId,
            user_id: user.id,
            report_info: {
              ...formData,
              diggerData: {
                ...formData.diggerData,
                passFailStatus: status,
                linerPassFailStatus: linerStatus
              }
            },
            status: status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (result.data) {
          setReportId(result.data.id);
        }
      }

      if (result.error) throw result.error;
      
      toast.success(`Digger report ${reportId ? 'updated' : 'saved'} successfully!`);
      return result.data?.id;
    } catch (error: any) {
      console.error('Error saving digger report:', error);
      toast.error(`Failed to save digger report: ${error?.message || 'Unknown error'}`);
      return null;
    }
  };

  // Basic load functions
  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      const { data: jobInfo, error: jobError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          job_number,
          customer_id,
          title,
          customers (
            id,
            company_id,
            name,
            company_name,
            address
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      const customerData = jobInfo.customers as CustomerData;
      let customerIdForAssetGen = jobInfo.customer_id;

      // Try to get company_id for asset generation
      if (customerData?.company_id) {
        customerIdForAssetGen = customerData.company_id;
      } else {
        // Fallback to common schema
        try {
          const { data: commonCustomer } = await supabase
            .schema('common')
            .from('customers')
            .select('company_id')
            .eq('id', jobInfo.customer_id)
            .single();

          if (commonCustomer?.company_id) {
            customerIdForAssetGen = commonCustomer.company_id;
          }
        } catch (error) {
          console.warn('Error in common customer fallback:', error);
        }
      }

      setFormData(prevData => ({
        ...prevData,
        customer: customerData?.company_name || customerData?.name || 'Unknown Customer',
        address: customerData?.address || '',
        jobNumber: jobInfo.job_number || '',
        customerId: jobInfo.customer_id || '',
        customerIdForAsset: customerIdForAssetGen
      }));

    } catch (error) {
      console.error('Error loading job info:', error);
      setError('Failed to load job information');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    if (!reportId) { 
      setLoading(false); 
      setIsEditing(true); 
      return; 
    }

    try {
      setLoading(true);
      const { data: reportData, error: reportError } = await supabase
        .schema(SCHEMA)
        .from(CALIBRATION_DIGGER_TABLE)
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      if (reportData) {
        setFormData(prev => ({
          ...prev,
          ...reportData.report_info,
          status: reportData.report_info.status || reportData.status || 'PASS'
        }));
        
        const loadedStatus = reportData.report_info.status || reportData.status || 'PASS';
        const loadedLinerStatus = reportData.report_info.diggerData?.linerPassFailStatus || 'PASS';
        setStatus(loadedStatus as 'PASS' | 'FAIL');
        setLinerStatus(loadedLinerStatus as 'PASS' | 'FAIL');
        setIsEditing(false);
      }
    } catch (error) {
      const err = error as SupabaseError;
      console.error('Error loading report:', err);
      toast.error(`Failed to load report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadJobInfo();
    if (reportId) {
      loadReport();
    }
  }, [jobId, reportId]);

  // Basic render
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-lg">Loading Digger Report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex justify-center">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Digger Report
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleBackNavigation}
              className="px-4 py-2 text-sm text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-200"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm text-white bg-[#f26722] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26722] ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e55611]'}`}
            >
              Save Report
            </button>
          </div>
        </div>

        {/* Basic form structure */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Digger Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Digger Number</label>
              <input 
                type="text" 
                value={formData.diggerData.diggerNumber}
                onChange={(e) => handleDiggerDataChange('diggerNumber', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input 
                type="text" 
                value={formData.diggerData.serialNumber}
                onChange={(e) => handleDiggerDataChange('serialNumber', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Status section */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Test Status
          </h2>
          
          <div className="flex gap-4">
            <button
              onClick={() => updatePassFailStatus('PASS')}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                status === 'PASS'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              PASS
            </button>
            <button
              onClick={() => updatePassFailStatus('FAIL')}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                status === 'FAIL'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              FAIL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 