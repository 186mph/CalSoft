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
const TwentySetsLowVoltageCableTestForm: React.FC = () => {
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
    testSets: Array(20).fill(null).map((_, index) => ({
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
          // Set user from auth context if not loading an existing report yet
          user: user?.email || '' 
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      setError(`Failed to load job info: ${(error as Error).message}`);
    } finally {
      // Don't set loading to false here if we still need to load the report
      // setLoading(false); 
    }
  };

  // Add loadReport function to load existing report data
  const loadReport = async () => {
    if (!reportId) {
      setLoading(false); // No report to load, finish loading
      return;
    }
    
    try {
      // Keep loading true while fetching report
      console.log(`Loading report with ID: ${reportId}`);
      
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('low_voltage_cable_test_20sets') // Use the 20sets table name
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) {
        console.error('Error loading report:', error);
        throw error;
      }
      
      if (data && data.data) {
        console.log('Report data loaded successfully:', data.data);
        // Merge loaded data with existing data (like job info)
        setFormData(prevData => ({
          ...prevData, // Keep job info and user from loadJobInfo
          ...data.data, // Load report-specific data
          // Make sure crucial fields like temperature/humidity are loaded correctly
          temperature: data.data.temperature ?? prevData.temperature,
          humidity: data.data.humidity ?? prevData.humidity,
          testSets: data.data.testSets ?? prevData.testSets, // Ensure testSets are loaded
          // Ensure test equipment data is loaded
          testEquipment: data.data.testEquipment ?? prevData.testEquipment,
        }));
        
        // Set status based on data if available
        if (data.data.status) {
          setStatus(data.data.status);
        }
        setIsEditMode(false); // Existing report loaded, start in view mode
      } else {
        console.warn('No data found for report ID:', reportId);
        setIsEditMode(true); // No data found, treat as new report
      }
    } catch (error) {
      console.error('Error in loadReport:', error);
      setError(`Failed to load report: ${(error as Error).message}`);
      setIsEditMode(true); // Error loading, start in edit mode
    } finally {
      setLoading(false); // Finish loading after report fetch attempt
    }
  };

  // Combined effect for loading job and report data
  useEffect(() => {
    if (jobId && user) {
      loadJobInfo().then(() => {
        if (reportId) {
          loadReport();
        } else {
          setLoading(false); // No reportId, finish loading after job info
          setIsEditMode(true); // New report, start in edit mode
        }
      });
    } else if (!jobId) {
      setError("Job ID is missing.");
      setLoading(false);
    } else if (!user) {
      setError("User not authenticated.");
      setLoading(false);
    }
  }, [jobId, reportId, user]); // Re-run if any of these change


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
  }, [formData.temperature, JSON.stringify(formData.testSets.map(s => s.readings)), tcf]); // Added tcf dependency

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested testEquipment fields
    if (name.startsWith('testEquipment.')) {
      const field = name.split('.')[1] as keyof typeof formData.testEquipment;
      setFormData(prev => ({
        ...prev,
        testEquipment: {
          ...prev.testEquipment,
          [field]: value
        }
      }));
    } else {
      // Handle regular fields
      const targetValue = (e.target as HTMLInputElement).type === 'number' 
                          ? (value === '' ? '' : parseFloat(value)) // Keep empty string or parse number
                          : value;
      setFormData(prev => ({ ...prev, [name]: targetValue }));
    }
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

  // Handle test set metadata changes (From, To, Size, Result)
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
    if (!jobId || !user?.id || !isEditMode) return; // Check edit mode
    
    setIsSaving(true);
    setError(null);
    try {
        // Log the schema and table name for debugging
        console.log('Attempting to save to schema: neta_ops, table: low_voltage_cable_test_20sets');
        
        // Structure the data to be saved, including the status
        const reportDataToSave = {
            ...formData,
            status: status // Include the current status
        };
        
        const reportPayload = {
            job_id: jobId,
            user_id: user.id,
            data: reportDataToSave, // Store the entire form state including status
            updated_at: new Date().toISOString() // Add updated_at timestamp
        };

        // Log the payload for debugging
        console.log('Payload:', reportPayload);

        let savedReportId = reportId;
        let operation: 'update' | 'insert' = 'insert';

        if (reportId) {
            // Update existing report
            operation = 'update';
            const { error: updateError } = await supabase
                .schema('neta_ops')
                .from('low_voltage_cable_test_20sets') // Use the 20sets table name
                .update(reportPayload) // Send the whole payload for update
                .eq('id', reportId);
                
            if (updateError) {
                console.error('Update error details:', updateError);
                throw updateError;
            }
            console.log("Report updated successfully");
            
        } else {
            // Create new report
            operation = 'insert';
            const insertPayload = {
                ...reportPayload,
                created_at: new Date().toISOString() // Add created_at for new reports
            };
            console.log('Insert Payload:', insertPayload);
            
            const { data: insertData, error: insertError } = await supabase
                .schema('neta_ops')
                .from('low_voltage_cable_test_20sets') // Use the 20sets table name
                .insert(insertPayload)
                .select('id')
                .single();
                
            if (insertError) {
                console.error('Insert error details:', insertError);
                throw insertError;
            }
            savedReportId = insertData.id;
            console.log("Report created successfully with ID:", savedReportId);
            
            // Create an asset entry ONLY for the saved report
            const assetData = {
                name: `Low Voltage Cable Test (20 Sets) - ${formData.identifier || new Date().toLocaleDateString()}`,
                file_url: `report:/jobs/${jobId}/low-voltage-cable-test-20sets/${savedReportId}`, // Use the 20sets route
                user_id: user.id,
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
                // Don't throw, but maybe log or notify user
                alert("Report saved, but failed to create asset link. Please notify support.");
            } else if (assetResult) {
                console.log('Asset created with ID:', assetResult.id);
                
                // Link the asset to the job
                const jobAssetData = {
                    job_id: jobId,
                    asset_id: assetResult.id,
                    user_id: user.id
                };
                
                console.log('Linking asset to job:', jobAssetData);
                const { error: jobAssetError } = await supabase
                    .schema('neta_ops')
                    .from('job_assets')
                    .insert(jobAssetData);
                
                if (jobAssetError) {
                    console.error('Error linking asset to job:', jobAssetError);
                    // Don't throw, log or notify
                    alert("Report saved and asset created, but failed to link asset to job. Please notify support.");
                } else {
                    console.log('Asset successfully linked to job');
                }
            }
        }
        
        // After successful save/update
        setIsEditMode(false); // Exit edit mode
        alert(`Report ${operation === 'update' ? 'updated' : 'saved'} successfully!`);
        // Optionally navigate back or refresh data
        navigateAfterSave(navigate, jobId, location);

    } catch (err: any) {
        console.error("Error saving report:", err);
        setError(`Failed to save report: ${err.message || 'Unknown error'}`);
        alert(`Error saving report: ${err.message || 'Unknown error'}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Add these helper functions at the component level, before the return statement
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, currentPos: { row: number, col: number }) => {
    const { row, col } = currentPos;
    
    // Define the number of columns (From, To, Size, A-G, B-G, C-G, N-G, A-B, B-C, C-A, A-N, B-N, C-N, Cont., Results)
    const TOTAL_COLS = 15;
    const TOTAL_ROWS = 20; // Number of test sets (Updated to 20)

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
        // Allow default Tab behavior for accessibility, only override arrows/enter
        break;
    }
  };

  // Render the header section with buttons
  const renderHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Low Voltage Cable Test (ATS up to 20 sets) {/* Updated Title */}
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
          aria-disabled={!isEditMode}
          title={isEditMode ? `Click to change status to ${status === 'PASS' ? 'FAIL' : 'PASS'}` : 'Status cannot be changed in view mode'}
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
            disabled={!isEditMode || isSaving} // Disable if not in edit mode or currently saving
            className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditMode ? 'hidden' : 'hover:bg-orange-700 disabled:opacity-50'}`} // Hide when not editing, style disabled state
          >
            {isSaving ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
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

  // Form input/select/textarea className generator based on edit mode
  const getInputClassName = (additionalClasses: string = "") => {
    return `form-input text-xs py-1 px-1.5 dark:text-white ${additionalClasses} ${
      !isEditMode ? 'bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 cursor-not-allowed' : 'bg-gray-50 dark:bg-dark-100'
    }`;
  };
  
  const getSelectClassName = (additionalClasses: string = "") => {
    return `form-select text-xs py-1 px-1.5 dark:text-white ${additionalClasses} ${
      !isEditMode ? 'bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 cursor-not-allowed appearance-none' : 'bg-gray-50 dark:bg-dark-100'
    }`;
  };

  const getTextAreaClassName = (additionalClasses: string = "") => {
    return `w-full form-textarea resize-none dark:text-white ${additionalClasses} ${
       !isEditMode ? 'bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 cursor-not-allowed' : 'bg-gray-50 dark:bg-dark-100'
    }`;
  };

  // Standard form label class
  const formLabelClass = "form-label inline-block w-32 text-gray-900 dark:text-white";

  return (
    // Main container with padding and centered layout, following ReportRules.md
    <div className="p-6 flex justify-center bg-gray-50 dark:bg-dark-200">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header with title and buttons */}
        {renderHeader()}
        
        {/* Job Information Section - Standard card structure */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Column 1 */}
            <div>
              <div className="mb-4">
                <label htmlFor="customer" className={formLabelClass}>Customer:</label>
                <input id="customer" name="customer" type="text" value={formData.customer} 
                  className="form-input" readOnly={true} // Always read-only for Job Info
                  aria-label="Customer Name (read-only)" /> 
              </div>
              <div className="mb-4">
                <label htmlFor="address" className={formLabelClass}>Address:</label>
                <input id="address" name="address" type="text" value={formData.address} 
                  className="form-input" readOnly={true} 
                  aria-label="Customer Address (read-only)" />
              </div>
              <div className="mb-4">
                <label htmlFor="user" className={formLabelClass}>User:</label>
                <input id="user" name="user" type="text" value={formData.user} 
                  className="form-input" readOnly={true} 
                  aria-label="Current User (read-only)" />
              </div>
              <div className="mb-4">
                <label htmlFor="date" className={formLabelClass}>Date:</label>
                <input id="date" name="date" type="date" value={formData.date} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Report Date" />
              </div>
              <div className="mb-4">
                <label htmlFor="identifier" className={formLabelClass}>Identifier:</label>
                <input id="identifier" name="identifier" type="text" value={formData.identifier || ''} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Report Identifier" />
              </div>
            </div>
            {/* Column 2 */}
            <div>
              <div className="mb-4">
                <label htmlFor="jobNumber" className={formLabelClass}>Job #:</label>
                <input id="jobNumber" name="jobNumber" type="text" value={formData.jobNumber} 
                  className="form-input" readOnly={true} 
                  aria-label="Job Number (read-only)" />
              </div>
              <div className="mb-4">
                <label htmlFor="technicians" className={formLabelClass}>Technicians:</label>
                <input id="technicians" name="technicians" type="text" value={formData.technicians} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Technicians involved" />
              </div>
              <div className="mb-4 flex items-center">
                <label htmlFor="temperature" className={formLabelClass}>Temp:</label>
                <input 
                  id="temperature" 
                  name="temperature" 
                  type="number" 
                  value={formData.temperature} 
                  onChange={handleChange} 
                  className="form-input w-20"
                  readOnly={!isEditMode}
                  aria-label="Ambient Temperature in Fahrenheit"
                />
                <span className="mx-2 text-gray-600 dark:text-gray-400">°F</span>
                <span className="mx-2 text-gray-600 dark:text-gray-400" aria-hidden="true">{celsiusTemperature.toFixed(1)}</span>
                <span className="text-gray-600 dark:text-gray-400" aria-label="Temperature in Celsius">°C</span>
                <span className="mx-5 text-gray-600 dark:text-gray-400">TCF:</span>
                <span className="font-medium text-gray-900 dark:text-white" aria-label="Temperature Correction Factor">{tcf.toFixed(3)}</span>
              </div>
              <div className="mb-4 flex items-center">
                <label htmlFor="humidity" className={formLabelClass}>Humidity:</label>
                <input 
                  id="humidity" 
                  name="humidity" 
                  type="number" 
                  value={formData.humidity} 
                  onChange={handleChange} 
                  className="form-input w-20"
                  readOnly={!isEditMode}
                  aria-label="Relative Humidity Percentage"
                />
                <span className="ml-2 text-gray-600 dark:text-gray-400">%</span>
              </div>
              <div className="mb-4">
                <label htmlFor="substation" className={formLabelClass}>Substation:</label>
                <input id="substation" name="substation" type="text" value={formData.substation} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Substation Name" />
              </div>
              <div className="mb-4">
                <label htmlFor="eqptLocation" className={formLabelClass}>Eqpt. Location:</label>
                <input id="eqptLocation" name="eqptLocation" type="text" value={formData.eqptLocation} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Equipment Location" />
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
                <label htmlFor="testedFrom" className={formLabelClass}>Tested From:</label>
                <input id="testedFrom" name="testedFrom" type="text" value={formData.testedFrom} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Location cable was tested from" />
              </div>
              <div className="mb-4">
                <label htmlFor="manufacturer" className={formLabelClass}>Manufacturer:</label>
                <input id="manufacturer" name="manufacturer" type="text" value={formData.manufacturer} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Cable Manufacturer" />
              </div>
              <div className="mb-4">
                <label htmlFor="conductorMaterial" className={formLabelClass}>Conductor:</label>
                <input id="conductorMaterial" name="conductorMaterial" type="text" value={formData.conductorMaterial} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Conductor Material" />
              </div>
              <div className="mb-4">
                <label htmlFor="insulationType" className={formLabelClass}>Insulation:</label>
                <input id="insulationType" name="insulationType" type="text" value={formData.insulationType} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Insulation Type" />
              </div>
            </div>
            {/* Column 2 */}
            <div>
              <div className="mb-4">
                <label htmlFor="systemVoltage" className={formLabelClass}>System Voltage:</label>
                <input id="systemVoltage" name="systemVoltage" type="text" value={formData.systemVoltage} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="System Voltage" />
              </div>
              <div className="mb-4">
                <label htmlFor="ratedVoltage" className={formLabelClass}>Rated Voltage:</label>
                <input id="ratedVoltage" name="ratedVoltage" type="text" value={formData.ratedVoltage} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Cable Rated Voltage" />
              </div>
              <div className="mb-4">
                <label htmlFor="length" className={formLabelClass}>Length:</label>
                <input id="length" name="length" type="text" value={formData.length} onChange={handleChange} 
                  className="form-input" readOnly={!isEditMode} 
                  aria-label="Cable Length" />
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
                        aria-label={`Inspection result for ${section}`}
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
              <label htmlFor="testVoltage" className="text-sm font-medium text-gray-700 dark:text-white block mb-1">Test Voltage:</label>
              <select
                id="testVoltage"
                name="testVoltage"
                aria-label="Select Test Voltage"
                value={formData.testVoltage}
                onChange={handleChange}
                className="form-select text-sm w-full" // Use w-full for consistency
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
            <table className="w-full border-collapse text-sm min-w-[1000px]"> {/* Added min-width */}
              <caption className="caption-bottom text-xs text-gray-500 dark:text-gray-400 py-2">
                Insulation Resistance Readings in MΩ (Mega-Ohms). Top Row = Raw Reading (RDG), Bottom Row = 20°C Corrected Reading.
              </caption>
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-200">
                  <th scope="col" className="px-1 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-28">From</th>
                  <th scope="col" className="px-1 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-28">To</th>
                  <th scope="col" className="px-1 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-20">Size</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-G</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-G</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-G</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">N-G</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-B</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-C</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-A</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">A-N</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">B-N</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-16">C-N</th>
                  <th scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-20">Cont.</th>
                  <th scope="col" className="px-1 py-1.5 text-left text-xs font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 w-24">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {formData.testSets.slice(0, 20).map((set) => ( // Updated slice to 20
                  <React.Fragment key={set.id}>
                    {/* Raw Readings Row */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-dark-200">
                      <td className="px-1 py-0.5">
                        <input
                          type="text"
                          data-position={`${set.id - 1}-0`}
                          aria-label={`Set ${set.id} From Location`}
                          value={set.from}
                          onChange={(e) => handleTestSetChange(set.id, 'from', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 0 })}
                          className={getInputClassName("w-full")}
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <input
                          type="text"
                          data-position={`${set.id - 1}-1`}
                          aria-label={`Set ${set.id} To Location`}
                          value={set.to}
                          onChange={(e) => handleTestSetChange(set.id, 'to', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 1 })}
                          className={getInputClassName("w-full")}
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-2`}
                          aria-label={`Set ${set.id} Cable Size`}
                          value={set.size}
                          onChange={(e) => handleTestSetChange(set.id, 'size', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 2 })}
                          className={getSelectClassName("w-full")}
                          disabled={!isEditMode}
                        >
                          <option value="">Select</option>
                          {CABLE_SIZES.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </td>
                      {/* Dynamically generate input cells for readings */}
                      {(Object.keys(set.readings) as Array<keyof TestSet['readings']>).filter(k => k !== 'continuity').map((key, idx) => (
                        <td className="px-1 py-0.5" key={`${set.id}-reading-${key}`}>
                          <input
                            type="text" // Keep as text to allow ">2200" etc.
                            data-position={`${set.id - 1}-${idx + 3}`}
                            aria-label={`Set ${set.id} Raw Reading ${key.replace(/([A-Z])/g, ' $1').trim()}`}
                            value={set.readings[key]}
                            onChange={(e) => handleReadingChange(set.id, key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: idx + 3 })}
                            className={getInputClassName("text-center w-full")}
                            readOnly={!isEditMode}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-13`}
                          aria-label={`Set ${set.id} Continuity Result`}
                          value={set.readings.continuity || ''}
                          onChange={(e) => handleReadingChange(set.id, 'continuity', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, { row: set.id - 1, col: 13 })}
                          className={getSelectClassName("text-center w-full")}
                          disabled={!isEditMode}
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </td>
                      <td className="px-1 py-0.5">
                        <select
                          data-position={`${set.id - 1}-14`}
                          aria-label={`Set ${set.id} Overall Result`}
                          className={getSelectClassName("w-full")}
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
                      {(Object.keys(set.correctedReadings) as Array<keyof TestSet['correctedReadings']>).filter(k => k !== 'continuity').map(key => (
                        <td className="px-1.5 py-0.5 text-center text-xs font-medium text-gray-900 dark:text-white" key={`${set.id}-corrected-${key}`}>
                          {set.correctedReadings[key]}
                        </td>
                      ))}
                      <td className="px-1.5 py-0.5"></td>{/* Spacer for Continuity */}
                      <td className="px-1.5 py-0.5"></td>{/* Spacer for Result */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="megohmmeter" className="form-label block mb-1">Megohmmeter:</label>
              <input
                id="megohmmeter"
                name="testEquipment.megohmmeter"
                type="text"
                aria-label="Megohmmeter Model"
                value={formData.testEquipment.megohmmeter}
                onChange={handleChange}
                className="form-input w-full" // Apply standard input class
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="form-label block mb-1">Serial Number:</label>
              <input
                id="serialNumber"
                name="testEquipment.serialNumber"
                type="text"
                aria-label="Megohmmeter Serial Number"
                value={formData.testEquipment.serialNumber}
                onChange={handleChange}
                className="form-input w-full"
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label htmlFor="ampId" className="form-label block mb-1">AMP ID:</label>
              <input
                id="ampId"
                name="testEquipment.ampId"
                type="text"
                aria-label="Megohmmeter AMP ID"
                value={formData.testEquipment.ampId}
                onChange={handleChange}
                className="form-input w-full"
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
            aria-label="Additional Comments"
            value={formData.testEquipment.comments}
            onChange={handleChange}
            rows={4}
            className={getTextAreaClassName()} // Use helper for class
            placeholder={isEditMode ? "Enter any additional comments..." : "No comments entered"}
            readOnly={!isEditMode}
          />
        </section>
        
        {/* Final Save Button at the bottom for consistency */}
        <div className="flex justify-end pt-4">
           {isEditMode && (
             <button
               onClick={handleSave}
               disabled={isSaving}
               className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 hover:bg-orange-700 disabled:opacity-50`}
             >
               {isSaving ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
             </button>
           )}
         </div>
         
      </div>
    </div>
  );
};

export default TwentySetsLowVoltageCableTestForm; // Updated export
