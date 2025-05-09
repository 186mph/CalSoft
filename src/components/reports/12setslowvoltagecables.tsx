import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { navigateAfterSave } from './ReportUtils';

// Types
interface CableTestData {
  customer: string;
  address: string;
  user: string;
  date: string;
  jobNumber: string;
  technicians: string;
  substation: string;
  eqptLocation: string;
  identifier: string;
  // Environmental data
  temperature: number;
  humidity: number;
  // Cable data
  testedFrom: string;
  manufacturer: string;
  conductorMaterial: string;
  insulationType: string;
  systemVoltage: string;
  ratedVoltage: string;
  length: string;
  // Inspections (7.3.1.A series)
  inspectionResults: Record<string, string>;
  // Test data
  testVoltage: string;
  testSets: TestSet[];
  // Equipment
  testEquipment: {
    megohmmeter: string;
    serialNumber: string;
    ampId: string;
    comments: string;
  };
}

interface TestSet {
  id: number;
  from: string;
  to: string;
  size: string;
  result: string;
  configuration: string; // Added this, might be useful later
  readings: {
    aToGround: string;
    bToGround: string;
    cToGround: string;
    nToGround: string;
    aToB: string;
    bToC: string;
    cToA: string;
    aToN: string;
    bToN: string;
    cToN: string;
    continuity: string; // Assuming continuity is a simple text field or dropdown
  };
  // Calculated values with temperature correction
  correctedReadings: {
    aToGround: string;
    bToGround: string;
    cToGround: string;
    nToGround: string;
    aToB: string;
    bToC: string;
    cToA: string;
    aToN: string;
    bToN: string;
    cToN: string;
    continuity: string; // Continuity likely doesn't need correction
  };
}

// Define a type for the customer data we expect
interface CustomerInfo {
  id: string;
  name: string | null;
  company_name: string | null;
  address: string | null;
}

// Constants (from the Excel file's Dropdowns sheet)
const INSPECTION_RESULTS_OPTIONS = [
  "Select One",
  "Satisfactory",
  "Unsatisfactory",
  "Cleaned",
  "See Comments",
  "Not Applicable"
];

const INSULATION_RESISTANCE_UNITS = [
  { value: "kΩ", label: "Kilo-Ohms" },
  { value: "MΩ", label: "Mega-Ohms" },
  { value: "GΩ", label: "Giga-Ohms" }
];

const TEST_VOLTAGES = ["250V", "500V", "1000V", "2500V", "5000V"];

const CABLE_SIZES = [
  "#18", "#16", "#12", "#10", "#8", "#6", "#4", "#2", "#1",
  "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "750", "1000"
];

const EVALUATION_RESULTS = ["PASS", "FAIL", "LIMITED SERVICE"];

// Temperature Conversion Data (from Temp Conv sheet)
// Reduced version for brevity, expand as needed
const TEMP_CONVERSION_DATA: { fahrenheit: number; celsius: number }[] = [
  // Generate a comprehensive temperature conversion table from -50°F to 230°F
  ...[...Array(281)].map((_, i) => {
    const fahrenheit = -50 + i;
    const celsius = (fahrenheit - 32) * 5 / 9;
    return { fahrenheit, celsius: parseFloat(celsius.toFixed(1)) };
  })
];

// Temperature Correction Factor Data (from TCF sheet)
// Reduced version for brevity, expand as needed
const TCF_DATA: { celsius: number; multiplier: number }[] = [
  { celsius: -24, multiplier: 0.054 },
  { celsius: -23, multiplier: 0.068 },
  { celsius: -22, multiplier: 0.082 },
  { celsius: -21, multiplier: 0.096 },
  { celsius: -20, multiplier: 0.11 },
  { celsius: -19, multiplier: 0.124 },
  { celsius: -18, multiplier: 0.138 },
  { celsius: -17, multiplier: 0.152 },
  { celsius: -16, multiplier: 0.166 },
  { celsius: -15, multiplier: 0.18 },
  { celsius: -14, multiplier: 0.194 },
  { celsius: -13, multiplier: 0.208 },
  { celsius: -12, multiplier: 0.222 },
  { celsius: -11, multiplier: 0.236 },
  { celsius: -10, multiplier: 0.25 },
  { celsius: -9, multiplier: 0.264 },
  { celsius: -8, multiplier: 0.278 },
  { celsius: -7, multiplier: 0.292 },
  { celsius: -6, multiplier: 0.306 },
  { celsius: -5, multiplier: 0.32 },
  { celsius: -4, multiplier: 0.336 },
  { celsius: -3, multiplier: 0.352 },
  { celsius: -2, multiplier: 0.368 },
  { celsius: -1, multiplier: 0.384 },
  { celsius: 0, multiplier: 0.4 },
  { celsius: 1, multiplier: 0.42 },
  { celsius: 2, multiplier: 0.44 },
  { celsius: 3, multiplier: 0.46 },
  { celsius: 4, multiplier: 0.48 },
  { celsius: 5, multiplier: 0.5 },
  { celsius: 6, multiplier: 0.526 },
  { celsius: 7, multiplier: 0.552 },
  { celsius: 8, multiplier: 0.578 },
  { celsius: 9, multiplier: 0.604 },
  { celsius: 10, multiplier: 0.63 },
  { celsius: 11, multiplier: 0.666 },
  { celsius: 12, multiplier: 0.702 },
  { celsius: 13, multiplier: 0.738 },
  { celsius: 14, multiplier: 0.774 },
  { celsius: 15, multiplier: 0.81 },
  { celsius: 16, multiplier: 0.848 },
  { celsius: 17, multiplier: 0.886 },
  { celsius: 18, multiplier: 0.924 },
  { celsius: 19, multiplier: 0.962 },
  { celsius: 20, multiplier: 1 },
  { celsius: 21, multiplier: 1.05 },
  { celsius: 22, multiplier: 1.1 },
  { celsius: 23, multiplier: 1.15 },
  { celsius: 24, multiplier: 1.2 },
  { celsius: 25, multiplier: 1.25 },
  { celsius: 26, multiplier: 1.316 },
  { celsius: 27, multiplier: 1.382 },
  { celsius: 28, multiplier: 1.448 },
  { celsius: 29, multiplier: 1.514 },
  { celsius: 30, multiplier: 1.58 },
  { celsius: 31, multiplier: 1.664 },
  { celsius: 32, multiplier: 1.748 },
  { celsius: 33, multiplier: 1.832 },
  { celsius: 34, multiplier: 1.872 },
  { celsius: 35, multiplier: 2 },
  { celsius: 36, multiplier: 2.1 },
  { celsius: 37, multiplier: 2.2 },
  { celsius: 38, multiplier: 2.3 },
  { celsius: 39, multiplier: 2.4 },
  { celsius: 40, multiplier: 2.5 },
  { celsius: 41, multiplier: 2.628 },
  { celsius: 42, multiplier: 2.756 },
  { celsius: 43, multiplier: 2.884 },
  { celsius: 44, multiplier: 3.012 },
  { celsius: 45, multiplier: 3.15 },
  { celsius: 46, multiplier: 3.316 },
  { celsius: 47, multiplier: 3.482 },
  { celsius: 48, multiplier: 3.648 },
  { celsius: 49, multiplier: 3.814 },
  { celsius: 50, multiplier: 3.98 },
  { celsius: 51, multiplier: 4.184 },
  { celsius: 52, multiplier: 4.388 },
  { celsius: 53, multiplier: 4.592 },
  { celsius: 54, multiplier: 4.796 },
  { celsius: 55, multiplier: 5 },
  { celsius: 56, multiplier: 5.26 },
  { celsius: 57, multiplier: 5.52 },
  { celsius: 58, multiplier: 5.78 },
  { celsius: 59, multiplier: 6.04 },
  { celsius: 60, multiplier: 6.3 },
  { celsius: 61, multiplier: 6.62 },
  { celsius: 62, multiplier: 6.94 },
  { celsius: 63, multiplier: 7.26 },
  { celsius: 64, multiplier: 7.58 },
  { celsius: 65, multiplier: 7.9 },
  { celsius: 66, multiplier: 8.32 },
  { celsius: 67, multiplier: 8.74 },
  { celsius: 68, multiplier: 9.16 },
  { celsius: 69, multiplier: 9.58 },
  { celsius: 70, multiplier: 10 },
  { celsius: 71, multiplier: 10.52 },
  { celsius: 72, multiplier: 11.04 },
  { celsius: 73, multiplier: 11.56 },
  { celsius: 74, multiplier: 12.08 },
  { celsius: 75, multiplier: 12.6 },
  { celsius: 76, multiplier: 13.24 },
  { celsius: 77, multiplier: 13.88 },
  { celsius: 78, multiplier: 14.52 },
  { celsius: 79, multiplier: 15.16 },
  { celsius: 80, multiplier: 15.8 },
  { celsius: 81, multiplier: 16.64 },
  { celsius: 82, multiplier: 17.48 },
  { celsius: 83, multiplier: 18.32 },
  { celsius: 84, multiplier: 19.16 },
  { celsius: 85, multiplier: 20 },
  { celsius: 86, multiplier: 21.04 },
  { celsius: 87, multiplier: 22.08 },
  { celsius: 88, multiplier: 23.12 },
  { celsius: 89, multiplier: 24.16 },
  { celsius: 90, multiplier: 25.2 },
  { celsius: 91, multiplier: 26.45 },
  { celsius: 92, multiplier: 27.7 },
  { celsius: 93, multiplier: 28.95 },
  { celsius: 94, multiplier: 30.2 },
  { celsius: 95, multiplier: 31.6 },
  { celsius: 96, multiplier: 33.28 },
  { celsius: 97, multiplier: 34.96 },
  { celsius: 98, multiplier: 36.64 },
  { celsius: 99, multiplier: 38.32 },
  { celsius: 100, multiplier: 40 },
  { celsius: 101, multiplier: 42.08 },
  { celsius: 102, multiplier: 44.16 },
  { celsius: 103, multiplier: 46.24 },
  { celsius: 104, multiplier: 48.32 },
  { celsius: 105, multiplier: 50.4 },
  { celsius: 106, multiplier: 52.96 },
  { celsius: 107, multiplier: 55.52 },
  { celsius: 108, multiplier: 58.08 },
  { celsius: 109, multiplier: 60.64 },
  { celsius: 110, multiplier: 63.2 }
];

// Utility functions with Linear Interpolation for better accuracy between table points
const convertFahrenheitToCelsius = (fahrenheit: number): number => {
  if (TEMP_CONVERSION_DATA.length === 0) return NaN; // Handle empty data case

  // Check boundaries
  if (fahrenheit <= TEMP_CONVERSION_DATA[0].fahrenheit) {
    return TEMP_CONVERSION_DATA[0].celsius;
  }
  if (fahrenheit >= TEMP_CONVERSION_DATA[TEMP_CONVERSION_DATA.length - 1].fahrenheit) {
    return TEMP_CONVERSION_DATA[TEMP_CONVERSION_DATA.length - 1].celsius;
  }

  // Find the bracket
  for (let i = 0; i < TEMP_CONVERSION_DATA.length - 1; i++) {
    const lower = TEMP_CONVERSION_DATA[i];
    const upper = TEMP_CONVERSION_DATA[i + 1];
    if (fahrenheit >= lower.fahrenheit && fahrenheit < upper.fahrenheit) {
      // Linear interpolation
      const proportion = (fahrenheit - lower.fahrenheit) / (upper.fahrenheit - lower.fahrenheit);
      const celsius = lower.celsius + proportion * (upper.celsius - lower.celsius);
      return parseFloat(celsius.toFixed(1)); // Return with one decimal place
    }
  }
  
  // Should not be reached if boundaries are checked, but fallback
  return TEMP_CONVERSION_DATA[TEMP_CONVERSION_DATA.length - 1].celsius; 
};

const getTCF = (celsius: number): number => {
   if (TCF_DATA.length === 0) return 1.0; // Handle empty data case

  // Check boundaries
  if (celsius <= TCF_DATA[0].celsius) {
    return TCF_DATA[0].multiplier;
  }
  if (celsius >= TCF_DATA[TCF_DATA.length - 1].celsius) {
    return TCF_DATA[TCF_DATA.length - 1].multiplier;
  }

  // Find the exact match first
  const exactMatch = TCF_DATA.find(data => data.celsius === celsius);
  if (exactMatch) {
    return exactMatch.multiplier; // Return exact value from table
  }

  // If no exact match, find the bracket
  for (let i = 0; i < TCF_DATA.length - 1; i++) {
    const lower = TCF_DATA[i];
    const upper = TCF_DATA[i + 1];
    if (celsius > lower.celsius && celsius < upper.celsius) {
      // Linear interpolation for TCF
      const proportion = (celsius - lower.celsius) / (upper.celsius - lower.celsius);
      const multiplier = lower.multiplier + proportion * (upper.multiplier - lower.multiplier);
      return multiplier; // Return without rounding
    }
  }
  
  // Fallback
  return TCF_DATA[TCF_DATA.length - 1].multiplier; 
};

const applyTCF = (reading: string, tcf: number): string => {
  // Replicates the formula from the Excel: 
  // IF(reading=">2200",">2200", IF(reading="N/A","N/A", IF(reading="","", reading*TCF)))
  const trimmedReading = reading.trim();
  if (trimmedReading === ">2200") return ">2200";
  if (trimmedReading.toUpperCase() === "N/A") return "N/A";
  if (trimmedReading === "") return "";
  
  const numericReading = parseFloat(trimmedReading);
  if (isNaN(numericReading)) return trimmedReading; // Keep non-numeric strings as is
  
  // Format to 2 decimal places, similar to Excel formatting
  return (numericReading * tcf).toFixed(2); 
};

// Main component
const TwelveSetsLowVoltageCableTestForm: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string, reportId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [isEditMode, setIsEditMode] = useState<boolean>(!reportId); // Edit mode enabled by default for new reports

  const [formData, setFormData] = useState<CableTestData>({
    customer: "",
    address: "",
    user: "",
    date: new Date().toISOString().split('T')[0],
    jobNumber: "",
    technicians: "",
    substation: "",
    eqptLocation: "",
    identifier: "",
    temperature: 76,
    humidity: 0,
    testedFrom: "",
    manufacturer: "",
    conductorMaterial: "",
    insulationType: "",
    systemVoltage: "",
    ratedVoltage: "",
    length: "",
    inspectionResults: {
      "7.3.1.A.1": "Select One",
      "7.3.1.A.2": "Select One",
      "7.3.1.A.3.1": "Select One",
      "7.3.1.A.4": "Select One",
    },
    testVoltage: "1000V",
    testSets: Array(12).fill(null).map((_, index) => ({
      id: index + 1,
      from: "",
      to: "",
      size: "",
      result: "",
      configuration: "",
      readings: {
        aToGround: "", bToGround: "", cToGround: "", nToGround: "",
        aToB: "", bToC: "", cToA: "",
        aToN: "", bToN: "", cToN: "",
        continuity: "",
      },
      correctedReadings: {
        aToGround: "", bToGround: "", cToGround: "", nToGround: "",
        aToB: "", bToC: "", cToA: "",
        aToN: "", bToN: "", cToN: "",
        continuity: "",
      }
    })),
    testEquipment: {
      megohmmeter: "",
      serialNumber: "",
      ampId: "",
      comments: ""
    },
  });

  // Load job information
  const loadJobInfo = async () => {
    if (!jobId) return;
    
    try {
      setLoading(true);
      // First fetch job data from neta_ops schema
      const { data: jobData, error: jobError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          title,
          job_number,
          customer_id
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      if (jobData) {
        // Then fetch customer data from common schema
        let customerName = '';
        let customerAddress = '';
        
        if (jobData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select(`
              name,
              company_name,
              address
            `)
            .eq('id', jobData.customer_id)
            .single();
            
          if (!customerError && customerData) {
            customerName = customerData.company_name || customerData.name || '';
            customerAddress = customerData.address || '';
          }
        }

        setFormData(prev => ({
          ...prev,
          jobNumber: jobData.job_number || '',
          customer: customerName,
          address: customerAddress,
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      setError(`Failed to load job info: ${(error as Error).message}`);
    } finally {
      if (!reportId) {
        setLoading(false);
      }
    }
  };

  // Add loadReport function to load existing report data
  const loadReport = async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      console.log(`Loading report with ID: ${reportId}`);
      
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('low_voltage_cable_test_12sets')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) {
        console.error('Error loading report:', error);
        throw error;
      }
      
      if (data && data.data) {
        console.log('Report data loaded successfully:', data.data);
        // Update form data with the loaded report data
        setFormData(prevData => ({
          ...prevData,
          ...data.data,
          // Ensure these don't get overwritten if they're already set
          customer: data.data.customer || prevData.customer,
          address: data.data.address || prevData.address,
          jobNumber: data.data.jobNumber || prevData.jobNumber
        }));
        
        // Set status based on data if available
        if (data.data.status) {
          setStatus(data.data.status);
        }
      } else {
        console.warn('No data found for report ID:', reportId);
      }
    } catch (error) {
      console.error('Error in loadReport:', error);
      setError(`Failed to load report: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load job information when component mounts
  useEffect(() => {
    if (jobId && user) {
      loadJobInfo();
    }
  }, [jobId, user]);
  
  // Load report data when reportId is available
  useEffect(() => {
    if (reportId && user) {
      loadReport();
    }
  }, [reportId, user]);

  // Derived values (calculations that follow the Excel formulas)
  const celsiusTemperature = convertFahrenheitToCelsius(formData.temperature);
  const tcf = getTCF(celsiusTemperature);

  // Recalculate corrected readings whenever temperature or *any* reading changes
  useEffect(() => {
    const updatedTestSets = formData.testSets.map(set => {
      const correctedReadings = {
        aToGround: applyTCF(set.readings.aToGround, tcf),
        bToGround: applyTCF(set.readings.bToGround, tcf),
        cToGround: applyTCF(set.readings.cToGround, tcf),
        nToGround: applyTCF(set.readings.nToGround, tcf),
        aToB: applyTCF(set.readings.aToB, tcf),
        bToC: applyTCF(set.readings.bToC, tcf),
        cToA: applyTCF(set.readings.cToA, tcf),
        aToN: applyTCF(set.readings.aToN, tcf),
        bToN: applyTCF(set.readings.bToN, tcf),
        cToN: applyTCF(set.readings.cToN, tcf),
        continuity: set.readings.continuity, // No TCF applied to continuity
      };
      
      // Only create a new object if readings actually changed to avoid unnecessary re-renders
      if (JSON.stringify(set.correctedReadings) !== JSON.stringify(correctedReadings)) {
        return { ...set, correctedReadings };
      }
      return set;
    });
    
    // Only update state if the testSets array content has actually changed
    if (JSON.stringify(formData.testSets) !== JSON.stringify(updatedTestSets)) {
        setFormData(prev => ({ ...prev, testSets: updatedTestSets }));
    }
  // Dependency array: watch temp and the stringified readings of all sets
  }, [formData.temperature, JSON.stringify(formData.testSets.map(s => s.readings))]); 

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const targetValue = (e.target as HTMLInputElement).type === 'number' 
                        ? (value === '' ? '' : parseFloat(value)) // Keep empty string or parse number
                        : value;

    setFormData(prev => ({ ...prev, [name]: targetValue }));
  };

  // Handle test reading changes
  const handleReadingChange = (setId: number, field: keyof TestSet['readings'], value: string) => {
    setFormData(prev => ({
      ...prev,
      testSets: prev.testSets.map(set => 
        set.id === setId 
          ? { ...set, readings: { ...set.readings, [field]: value } } 
          : set
      )
    }));
  };

  // Handle test set metadata changes (From, To, Size)
  const handleTestSetChange = (setId: number, field: keyof Pick<TestSet, 'from' | 'to' | 'size' | 'result'>, value: string) => {
     setFormData(prev => ({
       ...prev,
       testSets: prev.testSets.map(set => 
         set.id === setId 
           ? { ...set, [field]: value } 
           : set
       )
     }));
  };

  // Handle inspection result changes
  const handleInspectionChange = (section: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      inspectionResults: {
        ...prev.inspectionResults,
        [section]: value
      }
    }));
  };
  
  // Add Save/Update Handler
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
        // Log the schema and table name for debugging
        console.log('Attempting to save to schema: neta_ops, table: low_voltage_cable_test_12sets');
        
        // Structure the data to be saved (assuming a 'data' column)
        const reportPayload = {
            job_id: jobId,
            user_id: user?.id,
            data: formData // Store the entire form state
        };

        // Log the payload for debugging
        console.log('Payload:', reportPayload);

        let savedReportId = reportId;

        if (reportId) {
            // Update existing report
            const { error: updateError } = await supabase
                .schema('neta_ops')
                .from('low_voltage_cable_test_12sets')
                .update({ data: formData, updated_at: new Date() })
                .eq('id', reportId);
            if (updateError) {
                console.error('Update error details:', updateError);
                throw updateError;
            }
            console.log("Report updated successfully");
            
            // Show success message and navigate back to job details
            alert("Report saved successfully!");
            navigateAfterSave(navigate, jobId, location);
            return;
        } else {
            // Create new report
            // Try with direct SQL query if the regular way doesn't work
            try {
                console.log('Trying regular insert...');
                const { data: insertData, error: insertError } = await supabase
                    .schema('neta_ops')
                    .from('low_voltage_cable_test_12sets')
                    .insert(reportPayload)
                    .select('id')
                    .single();
                if (insertError) {
                    console.error('Insert error details:', insertError);
                    throw insertError;
                }
                savedReportId = insertData.id;
                console.log("Report created successfully with ID:", savedReportId);
                
                // Create an asset entry for the saved report
                const assetData = {
                    name: `Low Voltage Cable Test - ${formData.identifier || new Date().toLocaleDateString()}`,
                    file_url: `report:/jobs/${jobId}/low-voltage-cable-test-12sets/${savedReportId}`,
                    user_id: user?.id,
                    created_at: new Date().toISOString()
                };
                
                console.log('Creating asset entry:', assetData);
                const { data: assetResult, error: assetError } = await supabase
                    .schema('neta_ops')
                    .from('assets')
                    .insert(assetData)
                    .select('id')
                    .single();
                
                if (assetError) {
                    console.error('Error creating asset record:', assetError);
                    // Continue even if asset creation fails
                } else if (assetResult) {
                    console.log('Asset created with ID:', assetResult.id);
                    
                    // Link the asset to the job
                    const jobAssetData = {
                        job_id: jobId,
                        asset_id: assetResult.id,
                        user_id: user?.id
                    };
                    
                    console.log('Linking asset to job:', jobAssetData);
                    const { error: jobAssetError } = await supabase
                        .schema('neta_ops')
                        .from('job_assets')
                        .insert(jobAssetData);
                    
                    if (jobAssetError) {
                        console.error('Error linking asset to job:', jobAssetError);
                        // Continue even if linking fails
                    } else {
                        console.log('Asset successfully linked to job');
                    }
                }
                
                // Show success message and navigate back to job details
                alert("Report saved successfully!");
                navigateAfterSave(navigate, jobId, location);
                return;
            } catch (regularInsertError) {
                console.error('Regular insert failed, trying SQL query approach...');
                
                // Try to check if we have SELECT access at least
                const { data: checkData, error: checkError } = await supabase
                    .from('neta_ops.low_voltage_cable_test_12sets')
                    .select('id')
                    .limit(1);
                
                console.log('Check access result:', { data: checkData, error: checkError });
                
                // As a last resort, try saving to a table we know exists and we have access to
                console.log('Attempting to save to fallback table...');
                try {
                    // Try to save to a table that should exist and you have access to
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .schema('neta_ops')
                        .from('transformer_reports') // Try a known working table
                        .insert({
                            job_id: jobId,
                            user_id: user?.id,
                            data: { test: 'This is a fallback test', original_data: formData },
                            created_at: new Date(),
                            updated_at: new Date()
                        })
                        .select('id')
                        .single();
                        
                    console.log('Fallback save result:', { data: fallbackData, error: fallbackError });
                    
                    if (!fallbackError) {
                        alert("Fallback save successful. This indicates the low_voltage_cable_test_12sets table has permission issues.");
                        savedReportId = fallbackData.id;
                        
                        // Even with fallback, navigate back to job details
                        navigateAfterSave(navigate, jobId, location);
                        return;
                    }
                } catch (fallbackError) {
                    console.error('Even fallback save failed:', fallbackError);
                }
                
                throw regularInsertError; // Re-throw the original error
            }
        }

    } catch (err: any) {
        console.error("Error saving report:", err);
        setError(`Failed to save report: ${err.message}`);
        alert(`Error saving report: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Add these helper functions at the component level, before the return statement
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, currentPos: { row: number, col: number }) => {
    const { row, col } = currentPos;
    
    // Define the number of columns (From, To, Size, A-G, B-G, C-G, N-G, A-B, B-C, C-A, A-N, B-N, C-N, Cont., Results)
    const TOTAL_COLS = 15;
    const TOTAL_ROWS = 12; // Number of test sets

    // Prevent arrow keys from changing select values
    if (e.target instanceof HTMLSelectElement && 
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowRight':
        if (col < TOTAL_COLS - 1) {
          e.preventDefault();
          const nextElement = document.querySelector(`[data-position="${row}-${col + 1}"]`) as HTMLElement;
          nextElement?.focus();
        }
        break;
      case 'ArrowLeft':
        if (col > 0) {
          e.preventDefault();
          const prevElement = document.querySelector(`[data-position="${row}-${col - 1}"]`) as HTMLElement;
          prevElement?.focus();
        }
        break;
      case 'ArrowDown':
        if (row < TOTAL_ROWS - 1) {
          e.preventDefault();
          const nextElement = document.querySelector(`[data-position="${row + 1}-${col}"]`) as HTMLElement;
          nextElement?.focus();
        }
        break;
      case 'ArrowUp':
        if (row > 0) {
          e.preventDefault();
          const prevElement = document.querySelector(`[data-position="${row - 1}-${col}"]`) as HTMLElement;
          prevElement?.focus();
        }
        break;
      case 'Enter':
        // For dropdowns, don't navigate on Enter as it's used for selection
        if (!(e.target instanceof HTMLSelectElement)) {
          if (row < TOTAL_ROWS - 1) {
            e.preventDefault();
            const nextElement = document.querySelector(`[data-position="${row + 1}-${col}"]`) as HTMLElement;
            nextElement?.focus();
          }
        }
        break;
      case 'Tab':
        // Prevent default tab behavior if we're handling navigation
        if (!e.shiftKey && col < TOTAL_COLS - 1) {
          e.preventDefault();
          const nextElement = document.querySelector(`[data-position="${row}-${col + 1}"]`) as HTMLElement;
          nextElement?.focus();
        } else if (e.shiftKey && col > 0) {
          e.preventDefault();
          const prevElement = document.querySelector(`[data-position="${row}-${col - 1}"]`) as HTMLElement;
          prevElement?.focus();
        }
        break;
    }
  };

  // Render the header section with buttons
  const renderHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Low Voltage Cable Test (ATS up to 12 sets)
      </h1>
      <div className="flex gap-2">
        {/* Pass/Fail Button - Always visible, modifies state */}
        <button
          onClick={() => {
            if (isEditMode) { // Only allow state change if editing
              setStatus(status === 'PASS' ? 'FAIL' : 'PASS');
            }
          }}
          // Make it visually clear if not editable
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            status === 'PASS'
              ? 'bg-green-600 text-white focus:ring-green-500'
              : 'bg-red-600 text-white focus:ring-red-500'
          } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`} // Style change when not editing
        >
          {status === 'PASS' ? 'PASS' : 'FAIL'}
        </button>

        {/* Conditional Edit/Save Buttons */}
        {reportId && !isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Report
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!isEditMode} // Technically redundant due to conditional render, but good practice
            className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditMode ? 'hidden' : 'hover:bg-orange-700'}`} // Hide when not editing
          >
            Save Report
          </button>
        )}
      </div>
    </div>
  );

  // Loading and Error States
  if (loading) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading report data...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600 dark:text-red-400">Error: {error}</div>;
  }

  return (
    // Main container with padding and centered layout
    <div className="p-6 flex justify-center">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header with title and buttons */}
        {renderHeader()}
        
        {/* Update form input styles throughout the component */}
        <style>{`
          /* Reset light/dark mode styling to defaults */
          html:not(.dark) input, 
          html:not(.dark) select, 
          html:not(.dark) textarea, 
          html:not(.dark) .form-input, 
          html:not(.dark) .form-select, 
          html:not(.dark) .form-textarea {
            background-color: #ffffff !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }
          
          /* Readonly fields in view mode */
          input[readonly], textarea[readonly], select[disabled] {
            background-color: #f3f4f6 !important;
            color: #4b5563 !important;
            cursor: not-allowed;
            opacity: 0.7;
          }
          
          /* Ensure button text stays white in light mode */
          html:not(.dark) button.text-white {
            color: white !important;
          }
          
          html:not(.dark) input[readonly], 
          html:not(.dark) .form-input[readonly] {
            background-color: #f3f4f6 !important;
            color: #4b5563 !important;
          }
          
          html:not(.dark) *, 
          html:not(.dark) *::before, 
          html:not(.dark) *::after,
          html:not(.dark) h1, 
          html:not(.dark) h2, 
          html:not(.dark) h3, 
          html:not(.dark) h4, 
          html:not(.dark) h5, 
          html:not(.dark) h6, 
          html:not(.dark) p, 
          html:not(.dark) span, 
          html:not(.dark) div, 
          html:not(.dark) label, 
          html:not(.dark) th, 
          html:not(.dark) td {
            color: initial !important;
          }
          
          html:not(.dark) section {
            background-color: #ffffff !important;
          }
          
          html:not(.dark) thead tr, 
          html:not(.dark) tr.bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          /* Dark mode styling only applied when .dark class is present */
          html.dark input, 
          html.dark select, 
          html.dark textarea, 
          html.dark .form-input, 
          html.dark .form-select, 
          html.dark .form-textarea {
            background-color: #242424 !important;
            color: white !important;
            border-color: #4b5563 !important;
          }
          
          html.dark input[readonly], 
          html.dark .form-input[readonly],
          html.dark select[disabled],
          html.dark textarea[readonly] {
            background-color: #2a2a2a !important;
            color: #9ca3af !important;
            cursor: not-allowed;
            opacity: 0.7;
          }
          
          html.dark *, 
          html.dark *::before, 
          html.dark *::after {
            color: white !important;
          }
          
          html.dark h1, 
          html.dark h2, 
          html.dark h3, 
          html.dark h4, 
          html.dark h5, 
          html.dark h6, 
          html.dark p, 
          html.dark span, 
          html.dark div, 
          html.dark label, 
          html.dark th, 
          html.dark td {
            color: white !important;
          }
          
          html.dark section {
            background-color: #1a1a1a !important;
          }
          
          html.dark thead tr, 
          html.dark tr.bg-gray-50 {
            background-color: #2a2a2a !important;
          }
        `}</style>
        
        {/* Job Information Section - Uses dark:bg-dark-150 directly */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Column 1 */}
            <div>
              <div className="mb-4">
                <label htmlFor="customer" className="form-label inline-block w-32">Customer:</label>
                <input id="customer" name="customer" type="text" value={formData.customer} onChange={handleChange} 
                  className="form-input" readOnly={true} 
                  style={{ backgroundColor: 'var(--dark-input-bg, #242424)', color: 'var(--dark-text-primary, #ffffff)' }} />
              </div>
              <div className="mb-4">
                <label htmlFor="address" className="form-label inline-block w-32">Address:</label>
                <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} 
                  className="form-input" readOnly={true} 
                  style={{ backgroundColor: 'var(--dark-input-bg, #242424)', color: 'var(--dark-text-primary, #ffffff)' }} />
              </div>
              <div className="mb-4">
                <label htmlFor="user" className="form-label inline-block w-32">User:</label>
                <input id="user" name="user" type="text" value={formData.user} onChange={handleChange} className="form-input" readOnly={true} />
              </div>
              <div className="mb-4">
                <label htmlFor="date" className="form-label inline-block w-32">Date:</label>
                <input id="date" name="date" type="date" value={formData.date} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="identifier" className="form-label inline-block w-32">Identifier:</label>
                <input id="identifier" name="identifier" type="text" value={formData.identifier || ''} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
            </div>
            {/* Column 2 */}
            <div>
              <div className="mb-4">
                <label htmlFor="jobNumber" className="form-label inline-block w-32">Job #:</label>
                <input id="jobNumber" name="jobNumber" type="text" value={formData.jobNumber} onChange={handleChange} className="form-input" readOnly={true} />
              </div>
              <div className="mb-4">
                <label htmlFor="technicians" className="form-label inline-block w-32">Technicians:</label>
                <input id="technicians" name="technicians" type="text" value={formData.technicians} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4 flex items-center">
                <label htmlFor="temperature" className="form-label inline-block w-32">Temp:</label>
                <input 
                  id="temperature" 
                  name="temperature" 
                  type="number" 
                  value={formData.temperature} 
                  onChange={handleChange} 
                  className="form-input w-20"
                  readOnly={!isEditMode}
                />
                <span className="mx-2 text-gray-600 dark:text-gray-400">°F</span>
                <span className="mx-2 text-gray-600 dark:text-gray-400">{celsiusTemperature.toFixed(0)}</span>
                <span className="text-gray-600 dark:text-gray-400">°C</span>
                <span className="mx-5 text-gray-600 dark:text-gray-400">TCF</span>
                <span className="font-medium text-gray-900 dark:text-white">{tcf}</span>
              </div>
              <div className="mb-4">
                <label htmlFor="humidity" className="form-label inline-block w-32">Humidity:</label>
                <input 
                  id="humidity" 
                  name="humidity" 
                  type="number" 
                  value={formData.humidity} 
                  onChange={handleChange} 
                  className="form-input w-20"
                  readOnly={!isEditMode}
                />
                <span className="ml-2 text-gray-600 dark:text-gray-400">%</span>
              </div>
              <div className="mb-4">
                <label htmlFor="substation" className="form-label inline-block w-32">Substation:</label>
                <input id="substation" name="substation" type="text" value={formData.substation} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="eqptLocation" className="form-label inline-block w-32">Eqpt. Location:</label>
                <input id="eqptLocation" name="eqptLocation" type="text" value={formData.eqptLocation} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
            </div>
          </div>
        </section>
        
        {/* Cable Data Section */}
        <section aria-labelledby="cable-data-heading" className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 id="cable-data-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Cable Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Column 1 */}
            <div>
              <div className="mb-4">
                <label htmlFor="testedFrom" className="form-label inline-block w-32">Tested From:</label>
                <input id="testedFrom" name="testedFrom" type="text" value={formData.testedFrom} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="manufacturer" className="form-label inline-block w-32">Manufacturer:</label>
                <input id="manufacturer" name="manufacturer" type="text" value={formData.manufacturer} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="conductorMaterial" className="form-label inline-block w-32">Conductor Material:</label>
                <input id="conductorMaterial" name="conductorMaterial" type="text" value={formData.conductorMaterial} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="insulationType" className="form-label inline-block w-32">Insulation Type:</label>
                <input id="insulationType" name="insulationType" type="text" value={formData.insulationType} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
            </div>
            {/* Column 2 */}
            <div>
              <div className="mb-4">
                <label htmlFor="systemVoltage" className="form-label inline-block w-32">System Voltage:</label>
                <input id="systemVoltage" name="systemVoltage" type="text" value={formData.systemVoltage} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="ratedVoltage" className="form-label inline-block w-32">Rated Voltage:</label>
                <input id="ratedVoltage" name="ratedVoltage" type="text" value={formData.ratedVoltage} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
              <div className="mb-4">
                <label htmlFor="length" className="form-label inline-block w-32">Length:</label>
                <input id="length" name="length" type="text" value={formData.length} onChange={handleChange} className="form-input" readOnly={!isEditMode} />
              </div>
            </div>
          </div>
        </section>
        
        {/* Visual and Mechanical Inspection Section */}
        <section aria-labelledby="inspection-heading" className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 id="inspection-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-200">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b dark:border-gray-700">NETA Section</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b dark:border-gray-700">Description</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-48">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries({
                  "7.3.1.A.1": "Compare cable data with drawings and specifications.",
                  "7.3.1.A.2": "Inspect exposed sections of cables for physical damage.",
                  "7.3.1.A.3.1": "Use of a low-resistance ohmmeter in accordance with Section 7.3.3.B.1.",
                  "7.3.1.A.4": "Inspect compression-applied connectors for correct cable match and indentation."
                }).map(([section, description]) => (
                  <tr key={section} className="hover:bg-gray-50 dark:hover:bg-dark-200">
                    <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">{section}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{description}</td>
                    <td className="px-4 py-2">
                      <select
                        id={`inspection-${section}`}
                        value={formData.inspectionResults[section]}
                        onChange={(e) => handleInspectionChange(section, e.target.value)}
                        className="form-select w-full text-sm"
                        disabled={!isEditMode}
                      >
                        {INSPECTION_RESULTS_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        {/* Electrical Tests Section */}
        <section aria-labelledby="electrical-tests-heading" className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 id="electrical-tests-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests</h2>
          
          <div className="flex justify-end mb-4">
            <div className="w-48">
              <label htmlFor="testVoltage" className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</label>
              <select
                id="testVoltage"
                name="testVoltage"
                value={formData.testVoltage}
                onChange={handleChange}
                className="form-select text-sm"
                disabled={!isEditMode}
              >
                {TEST_VOLTAGES.map(voltage => (
                  <option key={voltage} value={voltage}>{voltage}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Test Sets Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom text-xs text-gray-500 dark:text-gray-400 py-2">
                Insulation Resistance Readings in MΩ (Mega-Ohms). RDG = Raw Reading, 20°C = Temperature Corrected Reading.
              </caption>
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-200">
                  <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-28">From</th>
                  <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-28">To</th>
                  <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-20">Size</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-G</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-G</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-G</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">N-G</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-B</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-C</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-A</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-N</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-N</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-N</th>
                  <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-20">Cont.</th>
                  <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-24">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {formData.testSets.slice(0, 12).map((set) => (
                  <React.Fragment key={set.id}>
                    {/* Raw Readings Row */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-dark-200">
                      <td className="px-1 py-0.5">
                        <input
                          type="text"
                          data-position={`${set.id - 1}-0`}
                          aria-label={`Set ${set.id} From`}
                          value={set.from}
                          onChange={(e) => handleTestSetChange(set.id, 'from', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 0 })}
                          className="form-input text-xs py-1 px-1.5 text-gray-900 dark:text-white"
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <input
                          type="text"
                          data-position={`${set.id - 1}-1`}
                          aria-label={`Set ${set.id} To`}
                          value={set.to}
                          onChange={(e) => handleTestSetChange(set.id, 'to', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 1 })}
                          className="form-input text-xs py-1 px-1.5 text-gray-900 dark:text-white"
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-2`}
                          aria-label={`Set ${set.id} Size`}
                          value={set.size}
                          onChange={(e) => handleTestSetChange(set.id, 'size', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 2 })}
                          className="form-select text-xs py-1 px-1.5 text-gray-900 dark:text-white"
                          disabled={!isEditMode}
                        >
                          <option value="">Select</option>
                          {CABLE_SIZES.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </td>
                      {/* Dynamically generate input cells for readings */}
                      {Object.keys(set.readings).filter(k => k !== 'continuity').map((key, idx) => (
                        <td className="px-1 py-0.5" key={`${set.id}-reading-${key}`}>
                          <input
                            type="text"
                            data-position={`${set.id - 1}-${idx + 3}`}
                            aria-label={`Set ${set.id} Reading ${key}`}
                            value={set.readings[key as keyof typeof set.readings]}
                            onChange={(e) => handleReadingChange(set.id, key as keyof TestSet['readings'], e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: idx + 3 })}
                            className="form-input text-xs py-1 px-1.5 text-center w-full text-gray-900 dark:text-white"
                            readOnly={!isEditMode}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-13`}
                          aria-label={`Set ${set.id} Continuity`}
                          value={set.readings.continuity || ''}
                          onChange={(e) => handleReadingChange(set.id, 'continuity', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 13 })}
                          className="form-select text-xs py-1 px-1.5 text-center text-gray-900 dark:text-white"
                          disabled={!isEditMode}
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-14`}
                          aria-label={`Set ${set.id} Result`}
                          className="form-select text-xs py-1 px-1.5 text-gray-900 dark:text-white"
                          value={set.result || ''}
                          onChange={(e) => handleTestSetChange(set.id, 'result', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 14 })}
                          disabled={!isEditMode}
                        >
                          <option value="">Select</option>
                          {EVALUATION_RESULTS.map(result => (
                            <option key={result} value={result}>{result}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    
                    {/* Temperature Corrected Row */}
                    <tr className="bg-gray-50 dark:bg-dark-200 hover:bg-gray-100 dark:hover:bg-dark-300">
                      <td colSpan={3} className="px-1.5 py-0.5 text-center text-xs text-gray-500 dark:text-gray-400">20°C Corrected Values</td>
                      {/* Dynamically generate cells for corrected readings */}
                      {Object.keys(set.correctedReadings).filter(k => k !== 'continuity').map(key => (
                        <td className="px-1.5 py-0.5 text-center text-xs font-medium text-gray-900 dark:text-white" key={`${set.id}-corrected-${key}`}>
                          {set.correctedReadings[key as keyof typeof set.correctedReadings]}
                        </td>
                      ))}
                      <td></td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        {/* Test Equipment Used */}
        <section aria-labelledby="equipment-heading" className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 id="equipment-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="megohmmeter" className="form-label inline-block w-32">Megohmmeter:</label>
              <input
                id="megohmmeter"
                name="testEquipment.megohmmeter"
                type="text"
                value={formData.testEquipment.megohmmeter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    megohmmeter: e.target.value
                  }
                }))}
                className="form-input"
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="form-label inline-block w-32">Serial Number:</label>
              <input
                id="serialNumber"
                name="testEquipment.serialNumber"
                type="text"
                value={formData.testEquipment.serialNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    serialNumber: e.target.value
                  }
                }))}
                className="form-input"
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label htmlFor="ampId" className="form-label inline-block w-32">AMP ID:</label>
              <input
                id="ampId"
                name="testEquipment.ampId"
                type="text"
                value={formData.testEquipment.ampId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    ampId: e.target.value
                  }
                }))}
                className="form-input"
                readOnly={!isEditMode}
              />
            </div>
          </div>
        </section>

        {/* Comments Section */}
        <section aria-labelledby="comments-heading" className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 id="comments-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
          <textarea
            id="equipmentComments"
            name="testEquipment.comments"
            value={formData.testEquipment.comments}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              testEquipment: {
                ...prev.testEquipment,
                comments: e.target.value
              }
            }))}
            rows={4}
            className="w-full form-textarea resize-none"
            placeholder="Enter any additional comments..."
            readOnly={!isEditMode}
          />
        </section>
      </div>
    </div>
  );
};

export default TwelveSetsLowVoltageCableTestForm;