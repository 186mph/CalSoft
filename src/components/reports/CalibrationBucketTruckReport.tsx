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
import { Plus, FileText, Upload, Trash2 } from 'lucide-react';
import { getDivisionAccentClasses } from '../../lib/utils';
import { useDivision } from '../../App';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const CALIBRATION_BUCKET_TRUCK_TABLE = 'calibration_bucket_truck_reports' as const;
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
  
  // Bucket Truck Information
  bucketTruckData: {
    assetId: string;
    serialNumber: string;
    truckNumber: string;
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

// Add these interfaces at the top of the file with the other interfaces
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

// Manufacturer options
const manufacturerOptions = ["Altec", "Terex", "Versalift", "NY-CONN", "SDP"];

// Material Handling options
const materialHandlingOptions = ["Yes", "No", "NA"];

// Design Voltage options
const designVoltageOptions = ["46 kVAC", "86 kVAC", "345 kVAC", "500 kV", "69 kV", "NA"];

// Qualification Voltage options
const qualificationVoltageOptions = ["46 kVAC", "86 kVAC", "69 kVAC", "69 kV", "16 kV", "NA"];

// Liner Type options
const linerTypeOptions = ["Single", "Double", "NA"];

export default function CalibrationBucketTruckReport() {
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
    bucketTruckData: {
      assetId: '',
      serialNumber: '',
      truckNumber: '',
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
    testEquipment: { 
      name: '', 
      serialNumber: '', 
      ampId: '' 
    },
    comments: '', 
    status: 'PASS'
  });
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [linerStatus, setLinerStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { division } = useDivision();
  const accentClasses = getDivisionAccentClasses(division);

  // Default assets that are always available
  const defaultAssets: Asset[] = [
    {
      id: 'calibration-gloves',
      name: 'Glove Report',
      file_url: `report:/jobs/${jobId}/calibration-gloves?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-sleeve',
      name: 'Sleeve Report',
      file_url: `report:/jobs/${jobId}/calibration-sleeve?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-blanket',
      name: 'Blanket Report',
      file_url: `report:/jobs/${jobId}/calibration-blanket?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-line-hose',
      name: 'Line Hose Report',
      file_url: `report:/jobs/${jobId}/calibration-line-hose?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-hotstick',
      name: 'Hotstick Report',
      file_url: `report:/jobs/${jobId}/calibration-hotstick?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-ground-cable',
      name: 'Ground Cable Report',
      file_url: `report:/jobs/${jobId}/calibration-ground-cable?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-bucket-truck',
      name: 'Bucket Truck Report',
      file_url: `report:/jobs/${jobId}/calibration-bucket-truck?returnToAssets=true`,
      created_at: new Date().toISOString(),
    }
  ];

  const handleChange = (section: keyof FormData | null, field: string, value: any) => {
    setFormData(prev => {
      if (section) {
        const currentSection = prev[section];
        if (typeof currentSection !== 'object' || currentSection === null) return prev;
        return { ...prev, [section]: { ...(currentSection as object), [field]: value } };
      } else {
        if (!(field in prev)) return prev;
        return { ...prev, [field]: value };
      }
    });
  };

  const handleBucketTruckDataChange = (field: keyof FormData['bucketTruckData'], value: string) => {
    setFormData(prev => ({
      ...prev,
      bucketTruckData: {
        ...prev.bucketTruckData,
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

  // Update Pass/Fail status in the Bucket Truck Data when overall status changes
  const updatePassFailStatus = (newStatus: string) => {
    setStatus(newStatus as 'PASS' | 'FAIL');
    handleChange(null, 'status', newStatus);
    handleBucketTruckDataChange('passFailStatus', newStatus);
  };

  // Update Liner Pass/Fail status
  const updateLinerStatus = (newLinerStatus: string) => {
    setLinerStatus(newLinerStatus as 'PASS' | 'FAIL');
    handleBucketTruckDataChange('linerPassFailStatus', newLinerStatus);
  };

  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      console.log('Loading job info for job ID:', jobId);
      
      // Step 1: Get basic job data first
      const { data: jobInfo, error: jobError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('job_number, customer_id, title')
        .eq('id', jobId)
        .single();

      if (jobError) {
        console.error('Error fetching basic job info:', jobError);
        throw jobError;
      }

      console.log('Basic job info retrieved:', jobInfo);

      if (!jobInfo?.customer_id) {
        console.error('No customer_id found in job data');
        throw new Error('No customer ID found for this job');
      }

      // Step 2: Try to get customer data from lab_customers table
      let customerData: CustomerData | null = null;
      let customerIdForAssetGen = '1'; // Default value
      
      try {
        // First try with schema
        console.log('Trying to fetch lab customer with schema...');
        const { data: labCustomer, error: labCustomerError } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .select('id, company_id, name, company_name, address')
          .eq('id', jobInfo.customer_id)
          .maybeSingle();

        if (labCustomerError) {
          console.warn('Error fetching lab customer with schema, trying without schema:', labCustomerError);
          
          // Try without schema
          const { data: labCustomerNoSchema, error: labCustomerNoSchemaError } = await supabase
            .from('lab_customers')
            .select('id, company_id, name, company_name, address')
            .eq('id', jobInfo.customer_id)
            .maybeSingle();
            
          if (labCustomerNoSchemaError) {
            console.warn('Error fetching lab customer without schema:', labCustomerNoSchemaError);
          } else if (labCustomerNoSchema) {
            console.log('Found lab customer without schema:', labCustomerNoSchema);
            customerData = labCustomerNoSchema as CustomerData;
            
            // If we have a company_id, use it for asset generation
            if (labCustomerNoSchema.company_id) {
              customerIdForAssetGen = labCustomerNoSchema.company_id;
              console.log('Using company_id from lab customer for asset generation:', customerIdForAssetGen);
            }
          }
        } else if (labCustomer) {
          console.log('Found lab customer with schema:', labCustomer);
          customerData = labCustomer as CustomerData;
          
          // If we have a company_id, use it for asset generation
          if (labCustomer.company_id) {
            customerIdForAssetGen = labCustomer.company_id;
            console.log('Using company_id from lab customer for asset generation:', customerIdForAssetGen);
          }
        } else {
          console.log('No lab customer found for ID:', jobInfo.customer_id);
        }
      } catch (error) {
        console.warn('Error in lab customer fetch, will try fallback:', error);
      }

      // Step 3: If lab_customer not found, try common.customers as fallback
      if (!customerData) {
        try {
          const { data: commonCustomer, error: commonCustomerError } = await supabase
            .from('customers') // Try without schema first
            .select('id, company_id, name, company_name, address')
            .eq('id', jobInfo.customer_id)
            .maybeSingle();

          if (!commonCustomerError && commonCustomer) {
            console.log('Found common customer as fallback:', commonCustomer);
            customerData = commonCustomer as CustomerData;
            
            // If we have a company_id, use it for asset generation
            if (commonCustomer.company_id) {
              customerIdForAssetGen = commonCustomer.company_id;
              console.log('Using company_id from common customer for asset generation:', customerIdForAssetGen);
            }
          } else {
            console.log('No common customer found either, using defaults');
          }
        } catch (error) {
          console.warn('Error in common customer fallback:', error);
        }
      }

      // Update form data with job and customer info - with fallbacks for everything
      setFormData(prevData => ({
        ...prevData,
        customer: customerData?.company_name || customerData?.name || 'Unknown Customer',
        address: customerData?.address || '',
        jobNumber: jobInfo.job_number || '',
        customerId: jobInfo.customer_id || '',
        customerIdForAsset: customerIdForAssetGen // Store the company_id or default
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
      console.log('No reportId found - setting isEditing to true for new report');
      return; 
    }

    try {
      setLoading(true);
      console.log('Loading existing report with ID:', reportId);
      const { data: reportData, error: reportError } = await supabase
        .schema(SCHEMA)
        .from(CALIBRATION_BUCKET_TRUCK_TABLE)
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      if (reportData) {
        console.log('Loaded report data:', reportData);
        setFormData(prev => ({
          ...prev,
          ...reportData.report_info,
          status: reportData.report_info.status || reportData.status || 'PASS'
        }));
        
        // Set the status from the loaded data
        const loadedStatus = reportData.report_info.status || reportData.status || 'PASS';
        const loadedLinerStatus = reportData.report_info.bucketTruckData?.linerPassFailStatus || 'PASS';
        console.log('Setting status to:', loadedStatus);
        console.log('Setting liner status to:', loadedLinerStatus);
        setStatus(loadedStatus as 'PASS' | 'FAIL');
        setLinerStatus(loadedLinerStatus as 'PASS' | 'FAIL');
        
        // Only set editing to false for existing reports
        setIsEditing(false);
        console.log('Existing report loaded - setting isEditing to false');
      }
    } catch (error) {
      const err = error as SupabaseError;
      console.error('Error loading report:', err);
      toast.error(`Failed to load report: ${err.message}`);
      
      // If loading fails and this is a new report, ensure we stay in edit mode
      if (!reportId) {
        setIsEditing(true);
        console.log('Error loading but no reportId - setting isEditing to true');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('handleSave called!', { 
      jobId, 
      userId: user?.id, 
      isEditing, 
      reportId,
      status: status,
      linerStatus: linerStatus,
      formDataStatus: formData.bucketTruckData.passFailStatus,
      formDataLinerStatus: formData.bucketTruckData.linerPassFailStatus
    });
    
    if (!jobId || !user?.id) {
      toast.error('Missing job or user information');
      return;
    }

    if (!isEditing) {
      console.log('Cannot save: not in editing mode');
      toast.error('Cannot save: report is not in editing mode');
      return;
    }

    setLoading(true);

    try {
      // Make sure we have a valid customerIdForAsset, defaulting to '1' if not available
      // Use any stored value, or extract it from customerId if possible
      let idForAssetGeneration = formData.customerIdForAsset || '1';
      
      // If it's a UUID (contains hyphens), use '1' as default
      if (idForAssetGeneration.includes('-')) {
        console.log('Customer ID appears to be a UUID, using default "1" instead');
        idForAssetGeneration = '1';
      }
      
      console.log('Starting save process with:', {
        customerId: formData.customerId,
        customerIdForAsset: idForAssetGeneration
      });

      // For new reports, only generate an asset ID at save time
      let assetIdToUse = formData.bucketTruckData.assetId;
      
      if (!reportId && !assetIdToUse) {
        try {
          console.log('Generating Asset ID for new report');
          const nextAssetId = await getNextAssetId(idForAssetGeneration);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            assetIdToUse = nextAssetId;
          } else {
            console.error('Failed to generate Asset ID');
          }
        } catch (error) {
          console.error('Error generating Asset ID:', error);
        }
      }

      // Update the form data with the asset ID if we have one
      const reportData = {
        ...formData,
        bucketTruckData: {
          ...formData.bucketTruckData,
          assetId: assetIdToUse
        }
      };

      let savedReportId = reportId;

      // Save or update the report
      if (reportId) {
        console.log('Updating existing report:', reportId);
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .update({
            report_info: reportData,
            updated_at: new Date().toISOString(),
            status: reportData.bucketTruckData.passFailStatus
          })
          .eq('id', reportId)
          .select('id')
          .single();

        if (error) throw error;
        savedReportId = data.id;
      } else {
        console.log('Creating new report');
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .insert({
            job_id: jobId,
            report_info: reportData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: user.id,
            status: reportData.bucketTruckData.passFailStatus
          })
          .select('id')
          .single();

        if (error) throw error;
        savedReportId = data.id;
        console.log('New report created with ID:', savedReportId);
      }

      // Create asset record only for new reports
      if (savedReportId && !reportId) {
        const assetName = `Bucket Truck Report - ${formData.bucketTruckData.manufacturer || ''} - ${new Date().toLocaleDateString()}`;
        const assetUrl = `report:/jobs/${jobId}/calibration-bucket-truck/${savedReportId}`;

        console.log('Creating asset record with name:', assetName);
        console.log('Asset URL:', assetUrl);

        try {
          const assetResult = await createCalibrationAsset(
            jobId,
            formData.customerId,  // UUID for database relations
            assetName,
            assetUrl,
            user.id,
            idForAssetGeneration,  // Pass the numeric ID for asset generation
            // Don't pass parent report ID for bucket truck itself since it's the main report
            undefined
          );

          if (!assetResult) {
            console.error('Failed to create asset, but report was saved');
            toast.error('Report saved, but there was an issue creating the asset record');
          } else {
            console.log('Asset created successfully:', assetResult);
          }
        } catch (assetError) {
          console.error('Error creating asset:', assetError);
          toast.error('Report saved, but there was an issue creating the asset record');
        }
      }

      setLoading(false);
      toast.success(reportId ? 'Report updated!' : 'Report saved!');

      // Only exit edit mode and update reportId when saving a new report
      if (!reportId && savedReportId) {
        setIsEditing(false);
        setReportId(savedReportId);
      }

      // Don't navigate away automatically - let user click back button when ready
    } catch (error: any) {
      console.error('Failed to save report:', error);
      setLoading(false);
      toast.error(`Error: ${error.message || 'Failed to save report'}`);
    }
  };

  const handlePrint = async () => {
    console.log('Print button clicked!');
    
    // Create a custom PDF layout
    const pdfContent = document.createElement('div');
    pdfContent.innerHTML = `
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
            <div style="margin-bottom: 8px;">${formData.customer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Model:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.model}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.serialNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Year:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.year}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Liner Status:</strong></div>
            <div style="margin-bottom: 8px; color: ${formData.bucketTruckData.linerPassFailStatus === 'PASS' ? 'green' : 'red'};">${formData.bucketTruckData.linerPassFailStatus}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Voltage:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.qualificationVoltage}</div>
            
            <div style="margin-bottom: 6px;"><strong>Upper Boom Reading:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.upperBoomReading}</div>
            
            <div style="margin-bottom: 6px;"><strong>Lower Boom Reading:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.lowerBoomReading}</div>
            
            <div style="margin-bottom: 6px;"><strong>Liner Type:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.linerType}</div>
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
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment.serialNumber || 'M010164'}</td>
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
          <div style="margin-top: 10px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;

    console.log('Starting PDF generation with custom layout...');

    const options = {
      margin: 0.5,
      filename: `Bucket_Truck_Report_${formData.bucketTruckData.assetId || 'New'}_${new Date().toISOString().split('T')[0]}.pdf`,
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

    try {
      console.log('Calling html2pdf with custom content...');
      await html2pdf().from(pdfContent).set(options).save();
      console.log('PDF generated successfully');
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  useEffect(() => { 
    const fetchData = async () => { 
      await loadJobInfo(); 
      await loadReport(); 
    }; 
    fetchData(); 
  }, [jobId, reportId]);

  // Debug state values
  useEffect(() => {
    console.log('State Debug:', { 
      isEditing, 
      urlReportId, 
      reportId, 
      loading, 
      jobId,
      hasUser: !!user?.id 
    });
  }, [isEditing, urlReportId, reportId, loading, jobId, user]);

  // Ensure new reports start in edit mode
  useEffect(() => {
    if (!urlReportId && !reportId && !loading) {
      console.log('Ensuring new report starts in edit mode');
      setIsEditing(true);
    }
  }, [urlReportId, reportId, loading]);

  // Sync the top-level status with the passFailStatus in form data
  useEffect(() => {
    handleBucketTruckDataChange('passFailStatus', status);
  }, [status]);

  // Sync the liner status with the linerPassFailStatus in form data
  useEffect(() => {
    handleBucketTruckDataChange('linerPassFailStatus', linerStatus);
  }, [linerStatus]);

  // Sync status state variables when form data changes (for loaded reports)
  useEffect(() => {
    if (formData.bucketTruckData.passFailStatus && formData.bucketTruckData.passFailStatus !== status) {
      setStatus(formData.bucketTruckData.passFailStatus as 'PASS' | 'FAIL');
    }
    if (formData.bucketTruckData.linerPassFailStatus && formData.bucketTruckData.linerPassFailStatus !== linerStatus) {
      setLinerStatus(formData.bucketTruckData.linerPassFailStatus as 'PASS' | 'FAIL');
    }
  }, [formData.bucketTruckData.passFailStatus, formData.bucketTruckData.linerPassFailStatus]);

  // Sync URL parameter with state when URL changes
  useEffect(() => {
    setReportId(urlReportId || null);
    
    // Don't clear the Asset ID for new reports - let the generation logic handle it
  }, [urlReportId]);

  // Add an effect to generate the Asset ID on load for new reports
  useEffect(() => {
    // Only run for new reports (no reportId) after we have customer data
    if (!urlReportId && formData.customerIdForAsset && !formData.bucketTruckData.assetId) {
      console.log('Triggering Asset ID generation - customerIdForAsset:', formData.customerIdForAsset);
      const generateAssetId = async () => {
        try {
          // Ensure we have a string value for the customer ID
          const customerIdForAssetGen = formData.customerIdForAsset || '1';
          console.log('Generating Asset ID on form load for:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          } else {
            console.log('Failed to generate Asset ID - nextAssetId is null/undefined');
          }
        } catch (error) {
          console.error('Error generating Asset ID on load:', error);
        }
      };
      
      generateAssetId();
    } else {
      console.log('Asset ID generation skipped:', {
        urlReportId,
        customerIdForAsset: formData.customerIdForAsset,
        currentAssetId: formData.bucketTruckData.assetId
      });
    }
  }, [urlReportId, formData.customerIdForAsset, formData.bucketTruckData.assetId]);

  // Additional effect to generate Asset ID when customer data becomes available
  useEffect(() => {
    // Generate Asset ID for new reports when customer data is loaded
    if (!urlReportId && formData.customerId && !formData.bucketTruckData.assetId) {
      console.log('Triggering Asset ID generation - customerId:', formData.customerId);
      const generateAssetId = async () => {
        try {
          const customerIdForAssetGen = formData.customerId || '1';
          console.log('Generating Asset ID after customer data load for:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          } else {
            console.log('Failed to generate Asset ID - nextAssetId is null/undefined');
          }
        } catch (error) {
          console.error('Error generating Asset ID after customer load:', error);
        }
      };
      
      generateAssetId();
    } else {
      console.log('Asset ID generation (customer) skipped:', {
        urlReportId,
        customerId: formData.customerId,
        currentAssetId: formData.bucketTruckData.assetId
      });
    }
  }, [urlReportId, formData.customerId, formData.bucketTruckData.assetId]);

  // Fallback effect to generate Asset ID if it's still missing after a delay
  useEffect(() => {
    if (!urlReportId && !formData.bucketTruckData.assetId) {
      const timer = setTimeout(() => {
        console.log('Fallback Asset ID generation triggered');
        const generateAssetId = async () => {
          try {
            // Use a default customer ID if none is available
            const customerIdForAssetGen = formData.customerId || formData.customerIdForAsset || '1';
            console.log('Fallback generating Asset ID for:', customerIdForAssetGen);
            const nextAssetId = await getNextAssetId(customerIdForAssetGen);
            
            if (nextAssetId) {
              console.log('Fallback generated Asset ID:', nextAssetId);
              setFormData(prev => ({
                ...prev,
                bucketTruckData: {
                  ...prev.bucketTruckData,
                  assetId: nextAssetId
                }
              }));
            }
          } catch (error) {
            console.error('Error in fallback Asset ID generation:', error);
          }
        };
        
        generateAssetId();
      }, 1000); // Wait 1 second for customer data to load
      
      return () => clearTimeout(timer);
    }
  }, [urlReportId, formData.bucketTruckData.assetId, formData.customerId, formData.customerIdForAsset]);

  // Asset management effects and functions
  useEffect(() => {
    if (jobId) {
      fetchJobAssets();
    }
  }, [jobId, reportId]);

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

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter report templates based on search
  const filteredReportTemplates = reportSearchQuery.trim() === '' 
    ? defaultAssets.filter(asset => 
        !['calibration-gloves', 'calibration-sleeve', 'calibration-bucket-truck'].includes(asset.id)
      )
    : defaultAssets.filter(asset => 
        asset.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) &&
        !['calibration-gloves', 'calibration-sleeve', 'calibration-bucket-truck'].includes(asset.id)
      );

  // Fetch job assets function - only for this specific bucket truck report
  async function fetchJobAssets() {
    if (!jobId) return;
    
    try {
      console.log(`Fetching assets for Bucket Truck Report ${urlReportId || 'new'}`);
      
      // For calibration jobs, fetch assets linked to this specific bucket truck report
      let query = supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('*')
        .eq('job_id', jobId)
        .is('deleted_at', null); // Exclude soft-deleted assets
      
      // If we have a reportId, only show assets linked to this specific report
      if (urlReportId) {
        query = query.eq('report_id', urlReportId);
      } else {
        // For new reports, don't show any assets yet
        setJobAssets([]);
        setFilteredJobAssets([]);
        return;
      }
        
      const { data, error } = await query;
        
      if (error) {
        console.error('Error fetching bucket truck report assets:', error);
        throw error;
      }
      
      const assetsData = data || [];
      console.log(`Retrieved ${assetsData.length} bucket truck report assets:`, assetsData);
      
      // Transform the assets
      const transformedAssets: Asset[] = [];
      
      for (const asset of assetsData) {
        transformedAssets.push({
          id: asset.id,
          name: asset.name,
          file_url: asset.file_url,
          created_at: asset.created_at,
          asset_id: asset.asset_id
        });
      }
      
      // Process the assets to add userAssetId
      const enhancedAssets: EnhancedAsset[] = await Promise.all(
        transformedAssets.map(async (asset: Asset): Promise<EnhancedAsset> => {
          let userAssetId = '';
          
          // Use asset_id if available
          if (asset.asset_id) {
            userAssetId = asset.asset_id;
          }
          
          return {
            ...asset,
            userAssetId
          };
        })
      );
      
      setJobAssets(enhancedAssets);
      setFilteredJobAssets(enhancedAssets);
      
    } catch (error) {
      console.error('Error fetching bucket truck report assets:', error);
    }
  }

  // Handle file change for asset upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle file upload for adding a new asset
  const handleFileUpload = async () => {
    if (!jobId) {
      toast.error('Job ID is missing');
      return;
    }

    // For document uploads
    if (!selectedFile || !newAssetName.trim()) {
      toast.error('Please provide a file and asset name');
      return;
    }

    // If this is a new report, save it first to get a reportId
    if (!urlReportId) {
      toast.error('Please save the report first before adding assets');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `job-assets/${jobId}/${fileName}`;

      setUploadProgress(10);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      setUploadProgress(70);

      // 2. Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 2.5. Generate Asset ID for the uploaded document
      const customerIdForAsset = formData.customerId || formData.customerIdForAsset || '1';
      console.log('Generating Asset ID for uploaded document, customer:', customerIdForAsset);
      const generatedAssetId = await getNextAssetId(customerIdForAsset);
      console.log('Generated Asset ID for document:', generatedAssetId);

      // 3. Create asset record in lab_assets linked to both job and this specific report
      const { data: assetData, error: assetError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .insert({
          name: newAssetName,
          file_url: publicUrl,
          job_id: jobId,
          report_id: urlReportId, // Link to this specific bucket truck report
          user_id: user?.id,
          asset_id: generatedAssetId, // Add the generated Asset ID
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (assetError) throw assetError;

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
    if (!assetToDelete || !jobId) {
      toast.error('Unable to delete asset');
      return;
    }

    try {
      console.log('Deleting asset:', assetToDelete);
      
      // For calibration division, soft delete by setting deleted_at timestamp
      const { error: deleteError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assetToDelete.id);

      if (deleteError) {
        console.error('Error deleting lab asset:', deleteError);
        throw deleteError;
      }
      
      // If this is a document (not a report), also delete the file from storage
      if (!assetToDelete.file_url.startsWith('report:')) {
        const url = new URL(assetToDelete.file_url);
        const filePath = url.pathname.substring(url.pathname.indexOf('assets/') + 7);
        
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('assets')
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
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

  // Get report edit path function
  const getReportEditPath = (asset: Asset) => {
    const urlContent = asset.file_url.split(':/')[1];
    const pathSegments = urlContent.split('/');

    if (pathSegments[0] !== 'jobs' || !pathSegments[1] || !pathSegments[2]) {
      return `/jobs/${jobId}`;
    }

    const jobIdSegment = pathSegments[1];
    let reportNameSlug = pathSegments[2];
    const reportIdFromUrl = pathSegments[3];

    if (reportNameSlug.includes('?')) {
      reportNameSlug = reportNameSlug.split('?')[0];
    }
    
    const reportPathMap: { [key: string]: string } = {
      'calibration-gloves': 'calibration-gloves',
      'calibration-sleeve': 'calibration-sleeve',
      'calibration-blanket': 'calibration-blanket',
      'calibration-line-hose': 'calibration-line-hose',
      'calibration-hotstick': 'calibration-hotstick',
      'calibration-ground-cable': 'calibration-ground-cable',
      'calibration-bucket-truck': 'calibration-bucket-truck'
    };

    const mappedReportName = reportPathMap[reportNameSlug];
    if (!mappedReportName) {
      return `/jobs/${jobId}`;
    }

    const isTemplate = defaultAssets.some(da => da.id === asset.id && da.file_url.startsWith('report:'));

    if (isTemplate) {
      return `/jobs/${jobIdSegment}/${mappedReportName}`;
    } else if (reportIdFromUrl) {
      return `/jobs/${jobIdSegment}/${mappedReportName}/${reportIdFromUrl}`;
    } else {
      return `/jobs/${jobIdSegment}/${mappedReportName}`;
    }
  };

  // Initial load effect - generate Asset ID immediately for new reports
  useEffect(() => {
    const initializeNewReport = async () => {
      // For new reports, generate Asset ID immediately
      if (!urlReportId && !formData.bucketTruckData.assetId) {
        console.log('Initializing new bucket truck report - generating Asset ID immediately');
        try {
          // Use customer ID if available, otherwise use default
          const customerIdForAssetGen = formData.customerId || formData.customerIdForAsset || '1';
          console.log('Generating Asset ID immediately for customer:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Immediately generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          }
        } catch (error) {
          console.error('Error generating Asset ID immediately:', error);
        }
      }
    };

    initializeNewReport();
  }, []); // Run only once when component mounts

  if (loading) return <div className="p-4">Loading Report Data...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBackNavigation}
            className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 min-w-[20px] flex-shrink-0 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {urlReportId ? 'Edit Bucket Truck Report' : 'New Bucket Truck Report'}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (isEditing) {
                updatePassFailStatus(status === 'PASS' ? 'FAIL' : 'PASS');
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            Truck: {status}
          </button>
          <button
            onClick={() => {
              if (isEditing) {
                updateLinerStatus(linerStatus === 'PASS' ? 'FAIL' : 'PASS');
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              linerStatus === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            Liner: {linerStatus}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14H4v-3h1v3zm7 2v-2H8v2h4zm0-4h1v-3h-1v3z" clipRule="evenodd" />
            </svg>
            Print PDF
          </button>
          {urlReportId && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-[#339C5E] hover:bg-[#2d8a52] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#339C5E]"
            >
              Edit Report
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate(`/jobs/${jobId}/calibration-bucket-truck`)}
                className={`${accentClasses.bg} ${accentClasses.bgHover} text-white font-medium px-3 py-2 rounded-md flex items-center justify-center`}
                title="Create New Bucket Truck Report"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => {
                  console.log('Save button clicked!', { 
                    isEditing, 
                    urlReportId, 
                    loading, 
                    hasJobId: !!jobId,
                    hasUserId: !!user?.id,
                    status: status,
                    formDataStatus: formData.bucketTruckData.passFailStatus
                  });
                  if (isEditing) {
                    handleSave();
                  } else {
                    console.log('Save button clicked but not in editing mode');
                  }
                }} 
                disabled={!isEditing || loading}
                className={`px-4 py-2 text-sm text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !isEditing || loading
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#339C5E] hover:bg-[#2d8a52] focus:ring-[#339C5E]'
                }`}
                title={
                  loading ? 'Saving in progress...' :
                  !isEditing ? 'Button is disabled - not in editing mode' : 
                  'Click to save report'
                }
              >
                {loading ? 'Saving...' : urlReportId ? 'Update Report' : 'Save Report'} 
                {!isEditing && ' (DISABLED)'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bucket Truck Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Bucket Truck Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset ID</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.assetId || "(Will be generated when saved)"}
              readOnly={true}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color cursor-not-allowed ${
                formData.bucketTruckData.assetId 
                  ? 'bg-gray-100 dark:bg-dark-200 text-gray-900 dark:text-white font-medium' 
                  : 'bg-gray-50 dark:bg-dark-100 text-gray-600 dark:text-gray-300 italic'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.serialNumber}
              onChange={(e) => handleBucketTruckDataChange('serialNumber', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Truck #</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.truckNumber}
              onChange={(e) => handleBucketTruckDataChange('truckNumber', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.year}
              onChange={(e) => handleBucketTruckDataChange('year', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.model}
              onChange={(e) => handleBucketTruckDataChange('model', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300"># of Platforms</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.numberOfPlatforms}
              onChange={(e) => handleBucketTruckDataChange('numberOfPlatforms', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Height</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.platformHeight}
              onChange={(e) => handleBucketTruckDataChange('platformHeight', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
            <select
              value={formData.bucketTruckData.manufacturer}
              onChange={(e) => handleBucketTruckDataChange('manufacturer', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Manufacturer</option>
              {manufacturerOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Material Handling</label>
            <select
              value={formData.bucketTruckData.materialHandling}
              onChange={(e) => handleBucketTruckDataChange('materialHandling', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Material Handling</option>
              {materialHandlingOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Design Voltage</label>
            <select
              value={formData.bucketTruckData.designVoltage}
              onChange={(e) => handleBucketTruckDataChange('designVoltage', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Design Voltage</option>
              {designVoltageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qualification Voltage</label>
            <select
              value={formData.bucketTruckData.qualificationVoltage}
              onChange={(e) => handleBucketTruckDataChange('qualificationVoltage', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Qualification Voltage</option>
              {qualificationVoltageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lower Boom Reading</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.lowerBoomReading}
              onChange={(e) => handleBucketTruckDataChange('lowerBoomReading', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upper Boom Reading</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.upperBoomReading}
              onChange={(e) => handleBucketTruckDataChange('upperBoomReading', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Liner Type</label>
            <select
              value={formData.bucketTruckData.linerType}
              onChange={(e) => handleBucketTruckDataChange('linerType', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Liner Type</option>
              {linerTypeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Liner Pass/Fail</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.linerPassFailStatus}
              readOnly
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 ${
                formData.bucketTruckData.linerPassFailStatus === 'PASS' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              } shadow-sm focus:border-accent-color focus:ring-accent-color font-medium`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Truck Pass/Fail</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.passFailStatus}
              readOnly
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 ${
                formData.bucketTruckData.passFailStatus === 'PASS' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              } shadow-sm focus:border-accent-color focus:ring-accent-color font-medium`}
            />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Comments
        </h2>
        <textarea
          value={formData.comments}
          onChange={(e) => handleChange(null, 'comments', e.target.value)}
          rows={4}
          readOnly={!isEditing}
          className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>
      
      {/* Assets Section */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Bucket Truck Assets</h2>
          <div className="flex space-x-2 relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 ${accentClasses.bg} ${accentClasses.bgHover} text-white px-4 py-2 rounded-md`}
            >
              <Plus className="h-5 w-5 min-w-[20px] flex-shrink-0" />
              Add Asset
            </button>
            
            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-12 w-96 bg-white dark:bg-dark-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 z-50">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-2 bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
                  />
                  
                  {/* Calibration Division Reports */}
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                      Calibration Reports
                    </div>
                    {filteredReportTemplates.map((template) => (
                      <Link 
                        key={template.id}
                        to={`/jobs/${jobId}/${template.id.replace('calibration-', 'calibration-')}?returnToReport=${urlReportId || 'new'}&returnToReportType=bucket-truck`}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                          <span className="truncate">{template.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Document Upload Option */}
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
                  Assets and documents that have been linked to this bucket truck report
                </CardDescription>
              </div>
              <div className="w-1/3">
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-[#339C5E]/30 focus:border-[#339C5E] rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors duration-200"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobAssets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No assets have been linked to this bucket truck report yet.</p>
              </div>
            ) : filteredJobAssets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No matching assets found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredJobAssets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {asset.userAssetId || asset.asset_id || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {asset.name}
                      </TableCell>
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
                              to={getReportEditPath(asset)}
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
      
      <style>{`
         .input-field { @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .input-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .select-field { @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .select-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .textarea-field { @apply block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .textarea-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .radio-input { @apply focus:ring-accent-color h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700; }
         .radio-label { @apply ml-2 block text-sm text-gray-700 dark:text-gray-300; }
       `}</style>
    </div>
  );
} 