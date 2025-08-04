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

// Add these interfaces after the existing interfaces
interface SleeveTestHistory {
  id: string;
  sleeve_report_id: string;
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

export default function CalibrationSleeveReport() {
  const { id: jobId, reportId: urlReportId } = useParams<{ id: string; reportId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(true); // Always start in edit mode
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
  const [isEditMode, setIsEditMode] = useState<boolean>(!reportId);
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
  const [loadingTestHistory, setLoadingTestHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveEnabled = true;

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

  // Auto-save function
  const autoSave = async (data: FormData) => {
    if (!autoSaveEnabled || !isEditing || !jobId || !user?.id) return;
    
    // Skip auto-save if this is a new report and we don't have essential data
    if (!reportId && (!data.sleeveData.assetId || !data.customer)) return;
    
    // Prevent excessive saves by checking if data actually changed
    const currentDataString = JSON.stringify(data);
    if (currentDataString === lastSavedData) return;
    
    try {
      setIsAutoSaving(true);
      console.log('Auto-saving sleeve report...');
      
      // Use the existing handleSave logic but without user feedback
      const reportData = {
        job_id: jobId,
        report_info: data,
        status: data.status,
        user_id: user.id
      };

      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema(SCHEMA)
          .from(CALIBRATION_SLEEVE_TABLE)
          .update(reportData)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema(SCHEMA)
          .from(CALIBRATION_SLEEVE_TABLE)
          .insert(reportData)
          .select()
          .single();

        if (result.data) {
          setReportId(result.data.id);
          
          // Create asset record only for new reports
          const assetName = `Sleeve Report - ${data.sleeveData.manufacturer || ''} - ${new Date().toLocaleDateString()}`;
          const assetUrl = `report:/jobs/${jobId}/calibration-sleeve/${result.data.id}`;

          console.log('Auto-save: Creating asset record with name:', assetName);
          console.log('Auto-save: Asset URL:', assetUrl);

          try {
            // Use the same asset creation function as handleSave
            const assetResult = await createCalibrationAsset(
              jobId,
              data.customerId,  // UUID for database relations
              assetName,
              assetUrl,
              user.id,
              data.customerIdForAsset || '1',  // Pass the numeric ID for asset generation
              // Pass the bucket truck report ID if created from within one
              returnToReport && returnToReport !== 'new' && returnToReportType === 'bucket-truck' 
                ? returnToReport 
                : undefined
            );

            if (!assetResult) {
              console.error('Auto-save: Failed to create asset, but report was saved');
            } else {
              console.log('Auto-save: Asset created successfully:', assetResult);
            }
          } catch (assetError) {
            console.error('Auto-save: Error creating asset:', assetError);
          }
        }
      }

      if (result.error) throw result.error;
      
      setLastSavedData(currentDataString);
      console.log('Auto-save completed successfully');
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show error toast for auto-save failures to avoid spam
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(formData);
    }, 1000); // Auto-save after 1 second of no changes

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isEditing, jobId, user?.id, reportId]);

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
      console.log('Setting form data with customerIdForAsset:', customerIdForAssetGen);
      setFormData(prevData => ({
        ...prevData,
        customer: customerData?.company_name || customerData?.name || 'Unknown Customer',
        address: customerData?.address || '',
        jobNumber: jobInfo.job_number || '',
        customerId: jobInfo.customer_id || '',
        customerIdForAsset: customerIdForAssetGen // Store the company_id or default
      }));
      console.log('Form data updated, customerIdForAsset should trigger useEffect');

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
        // Keep editing enabled - reports are always editable
        setIsEditing(true);
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
    if (!jobId || !user?.id || !isEditMode) return null;

    try {
      setIsSaving(true);
      let result;
      
      // Get the customer ID for asset generation
      const customerIdForAssetGen = formData.customerIdForAsset || '1';
      
      // For new reports, only generate an asset ID at save time
      let assetIdToUse = formData.sleeveData.assetId;
      
      if (!reportId && !assetIdToUse) {
        try {
          console.log('Generating Asset ID for new report');
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
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
      
      let savedReportId = reportId;
      
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('lab_ops')
          .from('calibration_sleeve_reports')
          .update({
            report_info: {
              ...formData,
              sleeveData: {
                ...formData.sleeveData,
                assetId: assetIdToUse // Use the pre-generated asset ID
              },
              status: status
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('lab_ops')
          .from('calibration_sleeve_reports')
          .insert({
            job_id: jobId,
            report_info: {
              ...formData,
              sleeveData: {
                ...formData.sleeveData,
                assetId: assetIdToUse // Use the pre-generated asset ID
              },
              status: status
            },
            user_id: user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        // Create asset entry for the report
        if (result.data) {
          const assetData = {
            name: `Sleeve Report - ${formData.sleeveData.manufacturer || formData.customer || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/calibration-sleeve/${result.data.id}`,
            job_id: jobId,
            user_id: user.id,
            asset_id: assetIdToUse // Add the asset ID to the asset record
          };

          const { data: assetResult, error: assetError } = await supabase
            .schema('lab_ops')
            .from('lab_assets')
            .insert(assetData)
            .select()
            .single();

          if (assetError) {
            console.error('Error creating asset:', assetError);
            // Don't throw error, just log it - the report was saved successfully
          } else {
            console.log('Asset created successfully:', assetResult);
          }
        }
      }

      if (result.error) throw result.error;
      savedReportId = result.data.id;

      // For new reports, set the report ID and exit edit mode
      if (!reportId && result.data) {
        setReportId(result.data.id);
        setIsEditMode(false);
      }

      // Return the saved report ID (no alert popup)
      return savedReportId;
      
      // Don't navigate away - let user stay on the report
    } catch (error: any) {
      console.error('Error saving report:', error);
      // Only show alert for actual errors, not successful saves
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
      return null;
    } finally {
      setIsSaving(false);
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

  // Test History functions
  const loadTestHistory = async (reportId: string) => {
    if (!reportId) return;
    
    try {
      setLoadingTestHistory(true);
      const { data, error } = await supabase
        .schema('lab_ops')
        .from('sleeve_test_history')
        .select(`
          id,
          test_date,
          test_result,
          tested_by,
          test_notes,
          created_at
        `)
        .eq('sleeve_report_id', reportId)
        .order('test_date', { ascending: false });

      if (error) throw error;

      if (data) {
        // For now, let's use a simpler approach - just show the user ID
        // We can improve this later when the profiles table is properly set up
        const historyWithNames: TestHistoryEntry[] = data.map(entry => ({
          id: entry.id,
          test_date: entry.test_date,
          test_result: entry.test_result,
          tested_by_email: `User ${entry.tested_by?.slice(0, 8)}...` || 'Unknown User',
          test_notes: entry.test_notes
        }));

        setTestHistory(historyWithNames);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
      setError(`Failed to load test history: ${(error as Error).message}`);
    } finally {
      setLoadingTestHistory(false);
    }
  };

  const addTestHistoryEntry = async (testResult: 'PASS' | 'FAIL', notes?: string, reportIdToUse?: string) => {
    const targetReportId = reportIdToUse || reportId;
    if (!targetReportId || !user?.id) {
      console.warn('Cannot add test history entry: missing reportId or user.id', { targetReportId, userId: user?.id });
      return;
    }

    try {
      console.log('Adding test history entry:', { targetReportId, testResult, userId: user.id, notes });
      
      const { data, error } = await supabase
        .schema('lab_ops')
        .from('sleeve_test_history')
        .insert({
          sleeve_report_id: targetReportId,
          test_result: testResult,
          tested_by: user.id,
          test_notes: notes || null
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding test history:', error);
        throw error;
      }

      console.log('Successfully added test history entry:', data);

      // Use the current user's email or a shortened user ID
      const userName = user.email || `User ${user.id.slice(0, 8)}...`;

      // Add the new entry to the local state immediately with the user's name
      const newEntry: TestHistoryEntry = {
        id: data.id,
        test_date: data.test_date,
        test_result: data.test_result,
        tested_by_email: userName, // Now displays the user's email or shortened ID
        test_notes: data.test_notes
      };

      setTestHistory(prev => [newEntry, ...prev]); // Add to the beginning of the list
    } catch (error) {
      console.error('Error adding test history entry:', error);
      setError(`Failed to add test history entry: ${(error as Error).message}`);
    }
  };

  useEffect(() => { 
    const loadReport = async () => {
      if (!reportId) {
        setLoading(false);
        setIsEditMode(true);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_sleeve_reports')
          .select('*')
          .eq('id', reportId)
          .single();
        
        if (error) throw error;
        
        if (data && data.report_info) {
          setFormData(prev => ({
            ...prev,
            ...data.report_info,
          }));
          
          if (data.report_info.status) {
            setStatus(data.report_info.status);
          }
          
          setIsEditMode(false);
        }

        // Load test history if report exists
        if (reportId) {
          await loadTestHistory(reportId);
        }
      } catch (error) {
        console.error('Error loading report:', error);
        setError(`Failed to load report: ${(error as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

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

  // Force asset ID generation on mount for new reports
  useEffect(() => {
    if (!reportId && !formData.sleeveData.assetId) {
      console.log('New report detected, will generate asset ID when customer data is available');
    }
  }, []);

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
          {/* Auto-save indicator */}
          {isAutoSaving && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
              Auto-saving...
            </div>
          )}
          <button
            onClick={async () => {
              setStatus('PASS');
              updatePassFailStatus('PASS');
              // Auto-save will handle the saving, just add test history entry
              if (reportId) {
                await addTestHistoryEntry('PASS', undefined, reportId);
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            PASS
          </button>
          <button
            onClick={async () => {
              setStatus('FAIL');
              updatePassFailStatus('FAIL');
              // Auto-save will handle the saving, just add test history entry
              if (reportId) {
                await addTestHistoryEntry('FAIL', undefined, reportId);
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'FAIL' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            FAIL
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
              <div className="flex space-x-2 mt-1">
                <button
                  onClick={async () => {
                    if (isEditing) {
                      setStatus('PASS');
                      updatePassFailStatus('PASS');
                      const savedReportId = await handleSave();
                      // Add test history entry after successful save
                      if (savedReportId) {
                        await addTestHistoryEntry('PASS', undefined, savedReportId);
                      }
                    }
                  }}
                  disabled={!isEditing}
                  className={`px-3 py-2 rounded-md text-white font-medium text-sm ${
                    formData.sleeveData.passFailStatus === 'PASS' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  PASS
                </button>
                <button
                  onClick={async () => {
                    if (isEditing) {
                      setStatus('FAIL');
                      updatePassFailStatus('FAIL');
                      const savedReportId = await handleSave();
                      // Add test history entry after successful save
                      if (savedReportId) {
                        await addTestHistoryEntry('FAIL', undefined, savedReportId);
                      }
                    }
                  }}
                  disabled={!isEditing}
                  className={`px-3 py-2 rounded-md text-white font-medium text-sm ${
                    formData.sleeveData.passFailStatus === 'FAIL' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  FAIL
                </button>
              </div>
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

        {/* Test History */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Test History
          </h2>
          {!reportId ? (
            <div className="text-center py-4">
              <div className="text-gray-500 dark:text-gray-400">Test history will appear here after saving the report</div>
            </div>
          ) : loadingTestHistory ? (
            <div className="text-center py-4">
              <div className="text-gray-500 dark:text-gray-400">Loading test history...</div>
            </div>
          ) : testHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Test Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tested By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                  {testHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(entry.test_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.test_result === 'PASS' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {entry.test_result}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {entry.tested_by_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {entry.test_notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-500 dark:text-gray-400">No test history available</div>
            </div>
          )}
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