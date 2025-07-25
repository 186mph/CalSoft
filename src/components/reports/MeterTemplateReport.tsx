import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import { toast } from 'react-hot-toast';
import { getNextAssetId, createCalibrationAsset } from '../../lib/services/assetService';
import html2pdf from 'html2pdf.js';
import { getDivisionAccentClasses } from '../../lib/utils';
import { useDivision } from '../../App';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constants
const METER_TEMPLATE_TABLE = 'meter_template_reports' as const;
const SCHEMA = 'lab_ops' as const;
const ASSETS_TABLE = 'lab_assets' as const;

// Interface for table row data
interface TableRow {
  id: string;
  calibratorOutput: string;
  minimum: string;
  maximum: string;
  reading: string;
  passFail: 'PASS' | 'FAIL' | '';
}

// Interface for table data
interface MeterTable {
  id: string;
  title: string;
  accuracy: string; // percentage value for this table
  dgCt: string; // dg/ct value for this table
  rows: TableRow[];
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
  
  // Meter Information
  meterName: string;
  manufacturer: string;
  serialNumber: string;
  meterType: string;
  assetId: string; // automated asset ID
  
  // Dynamic Tables
  tables: MeterTable[];
  
  // Comments
  comments: string;
  status: string;
}

// Add these interfaces
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

export default function MeterTemplateReport() {
  console.log('🔧 CALIBRATION METER: Component is loading!');
  
  const { id: jobId, reportId: urlReportId, templateId: urlTemplateId } = useParams<{ 
    id?: string; 
    reportId?: string; 
    templateId?: string; 
  }>();
  
  console.log('🔧 CALIBRATION METER: URL params:', { jobId, urlReportId, urlTemplateId });
  console.log('🔧 CALIBRATION METER: Current window location:', window.location.href);
  console.log('🔧 CALIBRATION METER: useParams result:', useParams());
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!urlReportId);
  const [reportId, setReportId] = useState<string | null>(urlReportId || null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { division } = useDivision();
  const accentClasses = getDivisionAccentClasses(division);

  // Check URL parameters for return navigation and template loading
  const searchParams = new URLSearchParams(location.search);
  const returnPath = searchParams.get('returnPath');
  // Template ID can come from URL path (editing template) or query parameter (using template for new report)
  const templateId = urlTemplateId || searchParams.get('templateId');
  const isEditingTemplate = !!urlTemplateId; // True when editing a template directly

  // Function to handle back navigation
  const handleBackNavigation = () => {
    if (returnPath) {
      navigate(returnPath);
    } else if (isEditingTemplate) {
      // When editing a template, go back to the dashboard
      navigate('/dashboard');
    } else {
      navigate(`/jobs/${jobId}?tab=assets`);
    }
  };

  // Generate unique ID for new rows/tables
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Create default table row
  const createDefaultRow = (): TableRow => ({
    id: generateId(),
    calibratorOutput: '',
    minimum: '',
    maximum: '',
    reading: '',
    passFail: ''
  });

  // Create default table
  const createDefaultTable = (): MeterTable => ({
    id: generateId(),
    title: '',
    accuracy: '',
    dgCt: '',
    rows: [
      createDefaultRow(),
      createDefaultRow(),
      createDefaultRow(),
      createDefaultRow()
    ]
  });

  const [formData, setFormData] = useState<FormData>({
    customer: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    technicians: '',
    jobNumber: '',
    userName: '',
    customerId: '',
    customerIdForAsset: '',
    meterName: '',
    manufacturer: '',
    serialNumber: '',
    meterType: '',
    assetId: '',
    tables: [createDefaultTable()], // Start with one default table
    comments: '', 
    status: 'PASS'
  });
  
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [customerId, setCustomerId] = useState<string>(''); // Store customer ID separately

  // Calculate minimum and maximum values based on calibrator output, accuracy, and dg/ct
  const calculateMinMax = (calibratorOutput: string, accuracy: string, dgCt: string) => {
    const output = parseFloat(calibratorOutput);
    const acc = parseFloat(accuracy);
    const dgCtVal = parseFloat(dgCt);
    
    if (isNaN(output) || isNaN(acc) || isNaN(dgCtVal)) {
      return { minimum: '', maximum: '' };
    }
    
    // Calculate the base accuracy value
    const accuracyValue = output * acc / 100;
    // Add dg/ct to the accuracy value (not to the final result)
    const adjustedAccuracy = accuracyValue + dgCtVal;
    
    // Formula: Minimum = Calibrator Output - (Accuracy + dg/ct)
    // Formula: Maximum = Calibrator Output + (Accuracy + dg/ct)  
    const minimum = output - adjustedAccuracy;
    const maximum = output + adjustedAccuracy;
    
    return {
      minimum: minimum.toFixed(4),
      maximum: maximum.toFixed(4)
    };
  };

  // Calculate pass/fail based on reading vs min/max
  const calculatePassFail = (reading: string, minimum: string, maximum: string): 'PASS' | 'FAIL' | '' => {
    const readingVal = parseFloat(reading);
    const minVal = parseFloat(minimum);
    const maxVal = parseFloat(maximum);
    
    if (isNaN(readingVal) || isNaN(minVal) || isNaN(maxVal)) {
      return '';
    }
    
    return (readingVal >= minVal && readingVal <= maxVal) ? 'PASS' : 'FAIL';
  };

  // Handle changes to form fields
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle table title change
  const handleTableTitleChange = (tableId: string, title: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId ? { ...table, title } : table
      )
    }));
  };

  // Handle table accuracy/dgCt change
  const handleTableConfigChange = (tableId: string, field: 'accuracy' | 'dgCt', value: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.map(table => {
        if (table.id === tableId) {
          const updatedTable = { ...table, [field]: value };
          
          // Recalculate all min/max values in this table when accuracy or dgCt changes
          if (updatedTable.accuracy && updatedTable.dgCt) {
            updatedTable.rows = updatedTable.rows.map(row => {
              if (row.calibratorOutput) {
                const { minimum, maximum } = calculateMinMax(row.calibratorOutput, updatedTable.accuracy, updatedTable.dgCt);
                const passFail = row.reading ? calculatePassFail(row.reading, minimum, maximum) : '';
                return { ...row, minimum, maximum, passFail };
              }
              return row;
            });
          }
          
          return updatedTable;
        }
        return table;
      })
    }));
  };

  // Handle cell value change
  const handleCellChange = (tableId: string, rowId: string, field: keyof TableRow, value: string) => {
    setFormData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id === tableId) {
          const updatedRows = table.rows.map(row => {
            if (row.id === rowId) {
              const updatedRow = { ...row, [field]: value };
              
              // Auto-calculate min/max when calibrator output changes
              if (field === 'calibratorOutput' && value) {
                const { minimum, maximum } = calculateMinMax(value, table.accuracy, table.dgCt);
                updatedRow.minimum = minimum;
                updatedRow.maximum = maximum;
                
                // Recalculate pass/fail if reading exists
                if (updatedRow.reading) {
                  updatedRow.passFail = calculatePassFail(updatedRow.reading, minimum, maximum);
                }
              }
              
              // Auto-calculate pass/fail when reading changes
              if (field === 'reading' && value && updatedRow.minimum && updatedRow.maximum) {
                updatedRow.passFail = calculatePassFail(value, updatedRow.minimum, updatedRow.maximum);
              }
              
              return updatedRow;
            }
            return row;
          });
          return { ...table, rows: updatedRows };
        }
        return table;
      });
      
      return { ...prev, tables: updatedTables };
    });
  };



  // Add new table
  const addTable = () => {
    setFormData(prev => ({
      ...prev,
      tables: [...prev.tables, createDefaultTable()]
    }));
  };

  // Remove table
  const removeTable = (tableId: string) => {
    if (formData.tables.length <= 1) {
      toast.error('Cannot remove the last table');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId)
    }));
  };

  // Add row to table
  const addRow = (tableId: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId 
          ? { ...table, rows: [...table.rows, createDefaultRow()] }
          : table
      )
    }));
  };

  // Remove row from table
  const removeRow = (tableId: string, rowId: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.map(table => {
        if (table.id === tableId && table.rows.length > 1) {
          return { ...table, rows: table.rows.filter(row => row.id !== rowId) };
        }
        return table;
      })
    }));
  };

  const loadJobInfo = async () => {
    if (!jobId) {
      console.log('🔧 CALIBRATION METER: No jobId provided, skipping job info load');
      return;
    }

    try {
      setLoading(true);
      console.log('🔧 CALIBRATION METER: Loading job info for job ID:', jobId);
      
      // Step 1: Get basic calibration job data from lab_jobs
      console.log('🔧 CALIBRATION METER: Querying lab_ops.lab_jobs...');
      const { data: jobInfo, error: jobError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('job_number, customer_id, title')
        .eq('id', jobId)
        .single();

      console.log('🔧 CALIBRATION METER: Lab job query result:', { jobInfo, jobError });

      if (jobError) {
        console.error('🔧 CALIBRATION METER: Error fetching calibration job info:', jobError);
        throw jobError;
      }

      if (!jobInfo?.customer_id) {
        console.error('🔧 CALIBRATION METER: No customer_id found in calibration job data');
        throw new Error('No customer ID found for this calibration job');
      }

      console.log('🔧 CALIBRATION METER: Job info retrieved:', jobInfo);

      // Step 2: Get customer data from lab_customers table first
      let customerData: CustomerData | null = null;
      let customerIdForAssetGen = '1'; // Default value
      
      try {
        console.log('🔧 CALIBRATION METER: Trying to fetch lab customer for ID:', jobInfo.customer_id);
        const { data: labCustomer, error: labCustomerError } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .select('id, company_id, name, company_name, address')
          .eq('id', jobInfo.customer_id)
          .maybeSingle();

        console.log('🔧 CALIBRATION METER: Lab customer query result:', { labCustomer, labCustomerError });

        if (!labCustomerError && labCustomer) {
          console.log('🔧 CALIBRATION METER: ✅ Found lab customer:', labCustomer);
          customerData = labCustomer as CustomerData;
          
          if (labCustomer.company_id) {
            customerIdForAssetGen = labCustomer.company_id;
            console.log('🔧 CALIBRATION METER: Using company_id for asset generation:', customerIdForAssetGen);
          }
        } else {
          console.log('🔧 CALIBRATION METER: ❌ Lab customer not found, trying fallback...');
        }
      } catch (error) {
        console.warn('🔧 CALIBRATION METER: Error fetching lab customer:', error);
      }

      // Step 3: If lab_customer not found, try common.customers as fallback
      if (!customerData) {
        try {
          console.log('🔧 CALIBRATION METER: Trying common.customers fallback...');
          const { data: commonCustomer, error: commonCustomerError } = await supabase
            .schema('common')
            .from('customers')
            .select('id, company_id, name, company_name, address')
            .eq('id', jobInfo.customer_id)
            .maybeSingle();

          console.log('🔧 CALIBRATION METER: Common customer query result:', { commonCustomer, commonCustomerError });

          if (!commonCustomerError && commonCustomer) {
            console.log('🔧 CALIBRATION METER: ✅ Found common customer:', commonCustomer);
            customerData = commonCustomer as CustomerData;
            
            if (commonCustomer.company_id) {
              customerIdForAssetGen = commonCustomer.company_id;
              console.log('🔧 CALIBRATION METER: Using company_id from common customer:', customerIdForAssetGen);
            }
          } else {
            console.log('🔧 CALIBRATION METER: ❌ No customer found in either table');
          }
        } catch (error) {
          console.warn('🔧 CALIBRATION METER: Error in common customer fallback:', error);
        }
      }

      // Update form data with job and customer info
      const updatedData = {
        customer: customerData?.company_name || customerData?.name || 'Unknown Customer',
        address: customerData?.address || '',
        jobNumber: jobInfo.job_number || '',
        customerId: jobInfo.customer_id || '',
        customerIdForAsset: customerIdForAssetGen,
        date: new Date().toISOString().split('T')[0],
        technicians: '',
        userName: user?.email || ''
      };
      
      console.log('🔧 CALIBRATION METER: Final form data update:', updatedData);
      console.log('🔧 CALIBRATION METER: Customer name will be:', updatedData.customer);
      console.log('🔧 CALIBRATION METER: Job number will be:', updatedData.jobNumber);
      
      setFormData(prev => ({
        ...prev,
        ...updatedData
      }));

      // Set the separate customerId state for asset generation
      setCustomerId(customerIdForAssetGen);
      console.log('🔧 CALIBRATION METER: Set customer ID for asset generation:', customerIdForAssetGen);

    } catch (error) {
      const err = error as SupabaseError;
      console.error('🔧 CALIBRATION METER: ERROR loading job info:', err);
      setError(`Failed to load calibration job information: ${err.message}`);
      toast.error(`Failed to load calibration job information: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      console.log('Loading template with ID:', templateId);

      const { data, error } = await supabase
        .schema(SCHEMA)
        .from(METER_TEMPLATE_TABLE)
        .select('*')
        .eq('id', templateId)
        .eq('status', 'TEMPLATE')
        .single();

      if (error) throw error;

      if (data && data.report_info) {
        console.log('Template data loaded:', data.report_info);
        const templateData = data.report_info as any; // Template data may have additional properties
        
        console.log('About to merge template with existing formData');
        
        // Load template data but preserve job information and clear certain fields for new report
        setFormData(prev => {
          console.log('Current formData before merge:', prev);
          console.log('Template data to merge:', templateData);
          
          const mergedData = {
            ...prev, // Preserve existing data (including job info)
            ...templateData, // Apply template data
            // Preserve job information that shouldn't be overwritten by template
            customer: prev.customer || templateData.customer || '',
            address: prev.address || templateData.address || '',
            jobNumber: prev.jobNumber || templateData.jobNumber || '',
            customerId: prev.customerId || templateData.customerId || '',
            customerIdForAsset: prev.customerIdForAsset || templateData.customerIdForAsset || '',
            // Clear fields that should be fresh for new reports
            assetId: '', // Will be generated for new report
            serialNumber: '', // User should enter new serial number
            tables: templateData.tables?.map(table => ({
              ...table,
              rows: table.rows?.map(row => ({
                ...row,
                reading: '', // Clear reading values
                passFail: '' // Clear pass/fail status
              })) || []
            })) || []
          };
          
          console.log('Final merged data:', mergedData);
          return mergedData;
        });
        
        console.log('FormData updated with template + job info');
        
        setStatus('PASS'); // Default status for new report
        setIsEditing(true); // Start in edit mode for template-based reports
        toast.success(`Template "${templateData.templateName || templateData.meterName}" loaded successfully!`);
      }
    } catch (error) {
      const err = error as SupabaseError;
      console.error('Error loading template:', err);
      toast.error(`Failed to load template: ${err.message}`);
    }
  };

  const loadReport = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      console.log('Loading report with ID:', reportId);

      const { data, error } = await supabase
        .schema(SCHEMA)
        .from(METER_TEMPLATE_TABLE)
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      if (data && data.report_info) {
        console.log('Report data loaded:', data.report_info);
        setFormData(data.report_info);
        setStatus(data.status || 'PASS');
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

  const handleSaveTemplate = async () => {
    if (!formData.meterName.trim()) {
      toast.error('Please enter a meter name to save as template');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    console.log('Starting template save process...');
    console.log('User ID:', user.id);
    console.log('Meter Name:', formData.meterName);
    console.log('Form Data:', formData);

    setLoading(true);

    try {
      // Create template data by excluding asset ID, serial #, and reading values
      const templateData = {
        ...formData,
        assetId: '', // Remove asset ID
        serialNumber: '', // Remove serial number
        tables: formData.tables.map(table => ({
          ...table,
          rows: table.rows.map(row => ({
            ...row,
            reading: '', // Clear reading values
            passFail: '' // Clear pass/fail status
          }))
        })),
        // Add template metadata
        isTemplate: true,
        templateName: formData.meterName
      };

      console.log('Template data prepared:', templateData);
      console.log('Saving template with name:', formData.meterName);
      console.log('Using schema:', SCHEMA);
      console.log('Using table:', METER_TEMPLATE_TABLE);

      let data, error;

      if (isEditingTemplate && templateId) {
        // Update existing template
        console.log('Updating existing template with ID:', templateId);
        const updateData = {
          report_info: templateData,
          template_name: formData.meterName,
          updated_at: new Date().toISOString()
        };

        const result = await supabase
          .schema(SCHEMA)
          .from(METER_TEMPLATE_TABLE)
          .update(updateData)
          .eq('id', templateId)
          .select('id')
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Create new template
        console.log('Creating new template');
        const insertData = {
          report_info: templateData,
          user_id: user.id,
          status: 'TEMPLATE',
          is_template: true, // Required by check constraint
          template_name: formData.meterName, // Required by check constraint
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
          // Note: job_id will be null for templates (allowed by schema)
        };

        const result = await supabase
          .schema(SCHEMA)
          .from(METER_TEMPLATE_TABLE)
          .insert(insertData)
          .select('id')
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Template save error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      console.log('Template saved successfully with ID:', data.id);
      
      setLoading(false);
      const action = isEditingTemplate ? 'updated' : 'saved';
      toast.success(`Template "${formData.meterName}" ${action} successfully!`);
      
      // Reload templates to verify
      await loadTemplates();

    } catch (error: any) {
      console.error('Failed to save template:', error);
      setLoading(false);
      toast.error(`Error saving template: ${error.message || 'Failed to save template'}`);
    }
  };

  const handleSave = async () => {
    if (!jobId || !user?.id) {
      toast.error('Missing job or user information');
      return;
    }

    if (!formData.meterName.trim()) {
      toast.error('Please enter a meter name');
      return;
    }

    setLoading(true);

    try {
      // Make sure we have a valid customerIdForAsset
      let idForAssetGeneration = customerId || '1';
      
      if (idForAssetGeneration.includes('-')) {
        console.log('Customer ID appears to be a UUID, using default "1" instead');
        idForAssetGeneration = '1';
      }
      
      console.log('Starting save process with:', {
        customerId: customerId,
        customerIdForAsset: idForAssetGeneration,
        status: status,
        meterName: formData.meterName
      });

      // For new reports, generate an asset ID at save time
      let assetIdToUse = formData.assetId;
      
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

      // Update the form data with the current status and asset ID
      const reportData = {
        ...formData,
        assetId: assetIdToUse,
        status: status
      };

      let savedReportId = reportId;

      // Save or update the report
      if (reportId) {
        console.log('Updating existing report:', reportId, 'with status:', status);
        const { data, error } = await supabase
          .schema(SCHEMA)
          .from(METER_TEMPLATE_TABLE)
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
        console.log('Creating new report with status:', status);
        const { data, error } = await supabase
          .schema(SCHEMA)
          .from(METER_TEMPLATE_TABLE)
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
        const assetName = `Meter Report - ${formData.meterName} - ${new Date().toLocaleDateString()}`;
        const assetUrl = `report:/jobs/${jobId}/meter-template/${savedReportId}`;

        console.log('Creating asset record with name:', assetName);
        console.log('Asset URL:', assetUrl);

        try {
          const assetResult = await createCalibrationAsset(
            jobId,
            customerId,
            assetName,
            assetUrl,
            user.id,
            idForAssetGeneration
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
        // Update form data with the generated asset ID
        if (assetIdToUse && !formData.assetId) {
          setFormData(prev => ({ ...prev, assetId: assetIdToUse }));
        }
      }

    } catch (error: any) {
      console.error('Failed to save report:', error);
      setLoading(false);
      toast.error(`Error: ${error.message || 'Failed to save report'}`);
    }
  };

  // Print function
  const handlePrint = async () => {
    console.log('🖨️ CALIBRATION METER PDF: Print button clicked!');
    console.log('🖨️ CALIBRATION METER PDF: Current formData:', formData);
    console.log('🖨️ CALIBRATION METER PDF: jobId:', jobId);
    console.log('🖨️ CALIBRATION METER PDF: Customer field value:', formData.customer);
    console.log('🖨️ CALIBRATION METER PDF: Job Number field value:', formData.jobNumber);
    console.log('🖨️ CALIBRATION METER PDF: Will PDF show customer as:', formData.customer || '[Customer Name]');
    console.log('🖨️ CALIBRATION METER PDF: Will PDF show job number as:', formData.jobNumber || '[Project Number]');
    
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
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Meter Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer || '[Customer Name]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber || '[Project Number]'}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Meter Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.meterName}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${new Date().toISOString().split('T')[0]}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial Number:</strong></div>
            <div style="margin-bottom: 8px;">${formData.serialNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Meter Type:</strong></div>
            <div style="margin-bottom: 8px;">${formData.meterType}</div>
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
      filename: `Meter_Report_${formData.assetId || 'New'}_${new Date().toISOString().split('T')[0]}.pdf`,
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

  // Generate asset ID for new reports
  useEffect(() => {
    const generateAssetIdForNewReport = async () => {
      if (!reportId && jobId && customerId && !formData.assetId) {
        try {
          console.log('Generating Asset ID for new report');
          const nextAssetId = await getNextAssetId(customerId || '1');
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            setFormData(prev => ({ ...prev, assetId: nextAssetId }));
          }
        } catch (error) {
          console.error('Error generating Asset ID:', error);
        }
      }
    };

    if (customerId && !reportId) {
      generateAssetIdForNewReport();
    }
  }, [customerId, reportId, jobId, formData.assetId]);

  // Load available templates for debugging
  const loadTemplates = async () => {
    try {
      console.log('Loading meter templates...');
      
      const { data, error } = await supabase
        .schema(SCHEMA)
        .from(METER_TEMPLATE_TABLE)
        .select('id, report_info, status, created_at')
        .eq('status', 'TEMPLATE')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading templates:', error);
        return [];
      }

      console.log('Templates found:', data?.length || 0);
      data?.forEach(template => {
        const reportInfo = template.report_info as any;
        console.log(`- Template: ${reportInfo?.templateName || reportInfo?.meterName || 'Unnamed'} (ID: ${template.id})`);
      });
      
      return data || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => { 
      console.log('🔧 CALIBRATION METER: fetchData called with:', { jobId, reportId, templateId, isEditingTemplate });
      
      try {
        // Load job info FIRST if we have a jobId (when creating reports from templates)
        if (jobId) {
          console.log('🔧 CALIBRATION METER: Loading job info first...');
          await loadJobInfo();
          console.log('🔧 CALIBRATION METER: Job info loading completed');
          // Small delay to ensure state update completes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (reportId) {
          // Loading existing report
          console.log('🔧 CALIBRATION METER: Loading existing report...');
          await loadReport();
        } else if (templateId) {
          // Loading template (either for new report or editing template)
          // IMPORTANT: This runs AFTER job info is loaded
          console.log('🔧 CALIBRATION METER: Template ID found in URL:', templateId);
          console.log('🔧 CALIBRATION METER: Loading template AFTER job info...');
          await loadTemplate(templateId);
          console.log('🔧 CALIBRATION METER: Template loading completed');
          
          // When editing a template, make sure we're in edit mode
          if (isEditingTemplate) {
            setIsEditing(true);
          }
        }
        
        // Load templates for debugging
        await loadTemplates();
      } catch (error) {
        console.error('🔧 CALIBRATION METER: Error in fetchData:', error);
      }
    };
    
    // Run if we have a user and either a jobId (for reports) or templateId (for template editing)
    if (user && (jobId || templateId)) {
      fetchData();
    }
  }, [jobId, reportId, templateId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#339C5E]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="text-xl mb-4">Error loading report</p>
          <p>{error}</p>
          <button 
            onClick={() => navigate(`/jobs/${jobId}`)}
            className="mt-4 px-4 py-2 bg-[#339C5E] text-white rounded-md hover:bg-[#2d8a52]"
          >
            Return to Job
          </button>
        </div>
      </div>
    );
  }

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
            {reportId ? 'Edit Meter Template Report' : 'New Meter Template Report'}
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
            <>
              <button 
                onClick={handleSaveTemplate} 
                disabled={!isEditing}
                className={`px-4 py-2 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 ${!isEditing ? 'hidden' : ''}`}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
              <button 
                onClick={handleSave} 
                disabled={!isEditing}
                className={`px-4 py-2 rounded-md text-white font-medium bg-[#339C5E] hover:bg-[#2d8a52] ${!isEditing ? 'hidden' : ''}`}
              >
                {loading ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Report Content */}
      <div ref={printRef} className="bg-white space-y-6 p-8 pb-16">


        {/* Meter Information */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Meter Information</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meter Name *</label>
              <input 
                type="text" 
                value={formData.meterName}
                onChange={(e) => handleChange('meterName', e.target.value)}
                readOnly={!isEditing}
                placeholder="Enter meter name"
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
              <input 
                type="text" 
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                readOnly={!isEditing}
                placeholder="Enter manufacturer"
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial #</label>
              <input 
                type="text" 
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                readOnly={!isEditing}
                placeholder="Enter serial number"
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meter Type</label>
              <input 
                type="text" 
                value={formData.meterType}
                onChange={(e) => handleChange('meterType', e.target.value)}
                readOnly={!isEditing}
                placeholder="Enter meter type"
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset ID</label>
              <input 
                type="text" 
                value={formData.assetId || "(Generating...)"}
                readOnly={true}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm cursor-not-allowed ${
                  formData.assetId 
                    ? 'bg-gray-100 dark:bg-dark-200 text-gray-900 dark:text-white font-medium' 
                    : 'bg-gray-50 dark:bg-dark-100 text-gray-600 dark:text-gray-300 italic'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Dynamic Tables */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Data Tables</h2>
            {isEditing && (
              <button
                onClick={addTable}
                className="flex items-center gap-2 px-4 py-2 bg-[#339C5E] text-white rounded-md hover:bg-[#2d8a52] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Table
              </button>
            )}
          </div>

          {formData.tables.map((table, tableIndex) => (
            <div key={table.id} className="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {/* Table Title */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1 mr-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Table {tableIndex + 1} Title
                  </label>
                  <input
                    type="text"
                    value={table.title}
                    onChange={(e) => handleTableTitleChange(table.id, e.target.value)}
                    readOnly={!isEditing}
                    placeholder="Enter table title"
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
                {isEditing && formData.tables.length > 1 && (
                  <button
                    onClick={() => removeTable(table.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Table
                  </button>
                )}
              </div>

              {/* Table Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Accuracy (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={table.accuracy}
                    onChange={(e) => handleTableConfigChange(table.id, 'accuracy', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="0.00"
                    className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">dg/ct</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={table.dgCt}
                    onChange={(e) => handleTableConfigChange(table.id, 'dgCt', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="0.0000"
                    className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-dark-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Calibrator Output
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Minimum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Maximum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Reading
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Pass/Fail
                      </th>
                      {isEditing && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                    {table.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.calibratorOutput}
                            onChange={(e) => handleCellChange(table.id, row.id, 'calibratorOutput', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={row.minimum}
                            readOnly
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={row.maximum}
                            readOnly
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.reading}
                            onChange={(e) => handleCellChange(table.id, row.id, 'reading', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            row.passFail === 'PASS' 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : row.passFail === 'FAIL'
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {row.passFail || '-'}
                          </span>
                        </td>
                        {isEditing && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {table.rows.length > 1 && (
                              <button
                                onClick={() => removeRow(table.id, row.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button */}
              {isEditing && (
                <div className="mt-4">
                  <button
                    onClick={() => addRow(table.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#339C5E] text-white rounded-md hover:bg-[#2d8a52] transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Row
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comments */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Comments
          </h2>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange('comments', e.target.value)}
            rows={4}
            readOnly={!isEditing}
            placeholder="Enter any additional comments or notes..."
            className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#339C5E] focus:ring-[#339C5E] text-gray-900 dark:text-white dark:bg-dark-100 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          />
        </div>
      </div>
    </div>
  );
} 