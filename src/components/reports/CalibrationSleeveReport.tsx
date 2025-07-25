import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import { toast } from 'react-hot-toast';
import { getNextAssetId, createCalibrationAsset } from '../../lib/services/assetService';
import html2pdf from 'html2pdf.js';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const CALIBRATION_SLEEVE_TABLE = 'calibration_sleeve_reports' as const;
const SCHEMA = 'lab_ops' as const;
const ASSETS_TABLE = 'lab_assets' as const;

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
  
  // Sleeve Information
  sleeveData: {
    assetId: string;
    manufacturer: string;
    class: string;
    colorInside: string;
    size: string;
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

// Class options
const classOptions = ["2", "3", "4"];

// Size options
const sizeOptions = ["Sm", "Rg", "Lg", "XL"];

// Manufacturer options
const manufacturerOptions = ["Salisbury", "Novax", "Chance", "White Rubber"];

// Color options
const colorOptions = ["Black", "Red", "Yellow", "Orange"];

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

export default function CalibrationSleeveReport() {
  const { id: jobId, reportId: urlReportId } = useParams<{ id: string; reportId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!urlReportId);
  const [reportId, setReportId] = useState<string | null>(urlReportId || null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Check URL parameters for return navigation
  const searchParams = new URLSearchParams(location.search);
  const returnToReport = searchParams.get('returnToReport');
  const returnToReportType = searchParams.get('returnToReportType');
  const returnPath = searchParams.get('returnPath');

  // Function to handle back navigation
  const handleBackNavigation = () => {
    if (returnPath) {
      // Navigate to the specified return path (e.g., All Assets page)
      navigate(returnPath);
    } else if (returnToReport && returnToReportType === 'bucket-truck') {
      // Navigate back to the bucket truck report
      if (returnToReport === 'new') {
        navigate(`/jobs/${jobId}/calibration-bucket-truck`);
      } else {
        navigate(`/jobs/${jobId}/calibration-bucket-truck/${returnToReport}`);
      }
    } else {
      // Default navigation back to job
      navigate(`/jobs/${jobId}?tab=assets`);
    }
  };

  const [formData, setFormData] = useState<FormData>({
    customer: '', 
    address: '', 
    date: new Date().toISOString().split('T')[0], 
    technicians: '',
    jobNumber: '', 
    userName: '',
    customerId: '',
    customerIdForAsset: '',
    sleeveData: {
      assetId: '',
      manufacturer: '',
      class: '',
      colorInside: '',
      size: '',
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

  const handleSleeveDataChange = (field: keyof FormData['sleeveData'], value: string) => {
    setFormData(prev => ({
      ...prev,
      sleeveData: {
        ...prev.sleeveData,
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

  // Update Pass/Fail status in the Sleeve Data when overall status changes
  const updatePassFailStatus = (status: string) => {
    handleChange(null, 'status', status);
    handleSleeveDataChange('passFailStatus', status);
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
      return; 
    }

    try {
      setLoading(true);
      const { data: reportData, error: reportError } = await supabase
        .schema(SCHEMA)
        .from(CALIBRATION_SLEEVE_TABLE)
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
        console.log('Setting status to:', loadedStatus);
        setStatus(loadedStatus as 'PASS' | 'FAIL');
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

  const handleSave = async () => {
    if (!jobId || !user?.id) {
      toast.error('Missing job or user information');
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
      let assetIdToUse = formData.sleeveData.assetId;
      
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

      // Update the form data with the asset ID and ensure status is correct
      const reportData = {
        ...formData,
        sleeveData: {
          ...formData.sleeveData,
          assetId: assetIdToUse,
          passFailStatus: status
        },
        status: status
      };

      let savedReportId = reportId;

      // Save or update the report
      if (reportId) {
        console.log('Updating existing report:', reportId);
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_sleeve_reports')
          .update({
            report_info: reportData,
            updated_at: new Date().toISOString(),
            status: status
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
          .from('calibration_sleeve_reports')
          .insert({
            job_id: jobId,
            report_info: reportData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: user.id,
            status: status
          })
          .select('id')
          .single();

        if (error) throw error;
        savedReportId = data.id;
        console.log('New report created with ID:', savedReportId);
      }

      // Create asset record only for new reports
      if (savedReportId && !reportId) {
        const assetName = `Sleeve Report - ${formData.sleeveData.manufacturer || ''} - ${new Date().toLocaleDateString()}`;
        const assetUrl = `report:/jobs/${jobId}/calibration-sleeve/${savedReportId}`;

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
            // Pass the bucket truck report ID if created from within one
            returnToReport && returnToReport !== 'new' && returnToReportType === 'bucket-truck' 
              ? returnToReport 
              : undefined
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

  // Print function
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
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Rubber Insulating Sleeves Test Certificate</h2>
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
            <div style="margin-bottom: 8px;">${formData.sleeveData.assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData.manufacturer}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Class:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData.class}</div>
            
            <div style="margin-bottom: 6px;"><strong>Size:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData.size}</div>
            
            <div style="margin-bottom: 6px;"><strong>Color Inside:</strong></div>
            <div style="margin-bottom: 8px;">${formData.sleeveData.colorInside}</div>
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
          <div style="margin-top: 30px;">
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
      filename: `Sleeve_Report_${formData.sleeveData.assetId || 'New'}_${new Date().toISOString().split('T')[0]}.pdf`,
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

  // Sync the top-level status with the passFailStatus in form data
  useEffect(() => {
    handleSleeveDataChange('passFailStatus', status);
  }, [status]);

  // Sync URL parameter with state when URL changes
  useEffect(() => {
    setReportId(urlReportId || null);
    
    // If we're navigating to a new report (no urlReportId), clear the Asset ID
    if (!urlReportId) {
      setFormData(prev => ({
        ...prev,
        sleeveData: {
          ...prev.sleeveData,
          assetId: ''
        }
      }));
    }
  }, [urlReportId]);

  // Add an effect to generate the Asset ID on load for new reports
  useEffect(() => {
    // Only run for new reports (no reportId) after we have customer data
    if (!reportId && formData.customerIdForAsset && !formData.sleeveData.assetId) {
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
              sleeveData: {
                ...prev.sleeveData,
                assetId: nextAssetId
              }
            }));
          }
        } catch (error) {
          console.error('Error generating Asset ID on load:', error);
        }
      };
      
      generateAssetId();
    }
  }, [reportId, formData.customerIdForAsset]);

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
            {reportId ? 'Edit Sleeve Report' : 'New Sleeve Report'}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setStatus(status === 'PASS' ? 'FAIL' : 'PASS')}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {status}
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
          {reportId && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-[#339C5E] hover:bg-[#2d8a52] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#339C5E]"
            >
              Edit Report
            </button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={!isEditing}
              className="px-4 py-2 text-sm text-white bg-[#339C5E] hover:bg-[#2d8a52] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#339C5E]"
            >
              {loading ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Main Report Content - Wrapped in ref for printing */}
      <div ref={printRef} className="bg-white space-y-6 p-8 pb-16">
        {/* Sleeve Data */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Sleeve Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset ID</label>
              <input 
                type="text" 
                value={formData.sleeveData.assetId || "(Will be generated when saved)"}
                readOnly={true}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color cursor-not-allowed ${
                  formData.sleeveData.assetId 
                    ? 'bg-gray-100 dark:bg-dark-200 text-gray-900 dark:text-white font-medium' 
                    : 'bg-gray-50 dark:bg-dark-100 text-gray-600 dark:text-gray-300 italic'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
              <select
                value={formData.sleeveData.manufacturer}
                onChange={(e) => handleSleeveDataChange('manufacturer', e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
              <select
                value={formData.sleeveData.class}
                onChange={(e) => handleSleeveDataChange('class', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              >
                <option value="">Select Class</option>
                {classOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Size</label>
              <select
                value={formData.sleeveData.size}
                onChange={(e) => handleSleeveDataChange('size', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              >
                <option value="">Select Size</option>
                {sizeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color Inside</label>
              <select
                value={formData.sleeveData.colorInside}
                onChange={(e) => handleSleeveDataChange('colorInside', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              >
                <option value="">Select Color</option>
                {colorOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pass/Fail</label>
              <input 
                type="text" 
                value={formData.sleeveData.passFailStatus}
                readOnly
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 ${
                  formData.sleeveData.passFailStatus === 'PASS' 
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
      </div>
      
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