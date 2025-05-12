import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';

// Temperature conversion and correction factor lookup tables (from PanelboardReport)
const tcfTable: { [key: string]: number } = {
  '-24': 0.054, '-23': 0.068, '-22': 0.082, '-21': 0.096, '-20': 0.11,
  '-19': 0.124, '-18': 0.138, '-17': 0.152, '-16': 0.166, '-15': 0.18,
  '-14': 0.194, '-13': 0.208, '-12': 0.222, '-11': 0.236, '-10': 0.25,
  '-9': 0.264, '-8': 0.278, '-7': 0.292, '-6': 0.306, '-5': 0.32,
  '-4': 0.336, '-3': 0.352, '-2': 0.368, '-1': 0.384, '0': 0.4,
  '1': 0.42, '2': 0.44, '3': 0.46, '4': 0.48, '5': 0.5,
  '6': 0.526, '7': 0.552, '8': 0.578, '9': 0.604, '10': 0.63,
  '11': 0.666, '12': 0.702, '13': 0.738, '14': 0.774, '15': 0.81,
  '16': 0.848, '17': 0.886, '18': 0.924, '19': 0.962, '20': 1,
  '21': 1.05, '22': 1.1, '23': 1.15, '24': 1.2, '25': 1.25,
  '26': 1.316, '27': 1.382, '28': 1.448, '29': 1.514, '30': 1.58,
  '31': 1.664, '32': 1.748, '33': 1.832, '34': 1.872, '35': 2,
  '36': 2.1, '37': 2.2, '38': 2.3, '39': 2.4, '40': 2.5,
  '41': 2.628, '42': 2.756, '43': 2.884, '44': 3.012, '45': 3.15,
  '46': 3.316, '47': 3.482, '48': 3.648, '49': 3.814, '50': 3.98,
  '51': 4.184, '52': 4.388, '53': 4.592, '54': 4.796, '55': 5,
  '56': 5.26, '57': 5.52, '58': 5.78, '59': 6.04, '60': 6.3,
  '61': 6.62, '62': 6.94, '63': 7.26, '64': 7.58, '65': 7.9,
  '66': 8.32, '67': 8.74, '68': 9.16, '69': 9.58, '70': 10,
  '71': 10.52, '72': 11.04, '73': 11.56, '74': 12.08, '75': 12.6,
  '76': 13.24, '77': 13.88, '78': 14.52, '79': 15.16, '80': 15.8,
  '81': 16.64, '82': 17.48, '83': 18.32, '84': 19.16, '85': 20,
  '86': 21.04, '87': 22.08, '88': 23.12, '89': 24.16, '90': 25.2,
  '91': 26.45, '92': 27.7, '93': 28.95, '94': 30.2, '95': 31.6,
  '96': 33.28, '97': 34.96, '98': 36.64, '99': 38.32, '100': 40,
  '101': 42.08, '102': 44.16, '103': 46.24, '104': 48.32, '105': 50.4,
  '106': 52.96, '107': 55.52, '108': 58.08, '109': 60.64, '110': 63.2
};

// Helper function to get TCF based on rounded Celsius (from PanelboardReport)
const getTCF = (celsius: number): number => {
  const roundedCelsius = Math.round(celsius);
  const key = roundedCelsius.toString(); // Use string key for lookup
  return tcfTable[key] !== undefined ? tcfTable[key] : 1; // Default to 1 if not found
};

// Dropdown options
const visualInspectionResultsOptions = ["", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments", "Not Applicable"];
const contactResistanceUnitsOptions = ["µΩ", "mΩ", "Ω"];
const insulationResistanceUnitsOptions = ["kΩ", "MΩ", "GΩ"];
const insulationTestVoltageOptions = ["250V", "500V", "1000V", "2500V", "5000V"];
const equipmentEvaluationResultOptions = ["PASS", "FAIL", "LIMITED SERVICE"];
const tripTestingUnitsOptions = ["sec.", "cycles", "ms"]; // Example options

interface FormData {
  // Job Information
  customer: string;
  address: string;
  user: string;
  date: string;
  identifier: string;
  jobNumber: string;
  technicians: string;
  temperature: {
    fahrenheit: number;
    celsius: number;
    tcf: number;
    humidity: number;
  };
  substation: string;
  eqptLocation: string;

  // Nameplate Data (Update based on Thermal-Magnetic image)
  manufacturer: string;
  catalogNumber: string;
  serialNumber: string;
  type: string;
  icRating: string; // kA
  frameSize: string; // A
  ratingPlug: string; // A - This seems specific to Electronic? Check image again. -> Yes, on electronic. Remove for thermal? Image has it. Keep it.
  curveNo: string;
  operation: string;
  mounting: string;
  thermalMemory: string;

  // Visual and Mechanical Inspection (Seems same as electronic)
  visualInspectionItems: {
    id: string; // NETA Section
    description: string;
    result: string; // Dropdown: Y, N, N/A
  }[];

  // Device Settings (Update based on Thermal-Magnetic image)
  deviceSettings: {
    asFound: {
      thermal: string;
      magnetic: string;
    };
    asLeft: {
      thermal: string;
      magnetic: string;
    };
  };

  // Electrical Tests - Contact/Pole Resistance (Seems same as electronic)
  contactResistance: {
    p1: string;
    p2: string;
    p3: string;
    unit: string; // Dropdown: µΩ, mΩ, Ω
  };

  // Electrical Tests - Insulation Resistance (Seems same as electronic)
  insulationResistance: {
    testVoltage: string; // Dropdown: 1000V, etc.
    unit: string; // Dropdown: MΩ, kΩ
    measured: {
      poleToPole: { p1p2: string; p2p3: string; p3p1: string; };
      poleToFrame: { p1: string; p2: string; p3: string; };
      lineToLoad: { p1: string; p2: string; p3: string; };
    };
    corrected: {
      poleToPole: { p1p2: string; p2p3: string; p3p1: string; };
      poleToFrame: { p1: string; p2: string; p3: string; };
      lineToLoad: { p1: string; p2: string; p3: string; };
    };
  };

  // Electrical Tests - Primary Injection (Update based on Thermal-Magnetic image)
  primaryInjection: {
    testedSettings: {
      thermal: string;
      magnetic: string;
    };
    results: {
      thermal: {
        amperes1: string; // First Amperes column
        multiplierTolerance: string; // e.g., 300%
        amperes2: string; // Second Amperes column
        toleranceMin: string;
        toleranceMax: string;
        pole1: { sec: string; a: string };
        pole2: { sec: string; a: string };
        pole3: { sec: string; a: string };
      };
      magnetic: {
        amperes1: string;
        multiplierTolerance: string; // e.g., -10% 10%
        amperes2: string;
        toleranceMin: string;
        toleranceMax: string;
        pole1: { sec: string; a: string };
        pole2: { sec: string; a: string };
        pole3: { sec: string; a: string };
      };
    };
  };

  // Test Equipment Used (Update based on Thermal-Magnetic image)
  testEquipment: {
    megohmmeter: { name: string; serialNumber: string; ampId: string };
    lowResistanceOhmmeter: { name: string; serialNumber: string; ampId: string };
    primaryInjectionTestSet: { name: string; serialNumber: string; ampId: string };
  };

  // Comments (Seems same as electronic)
  comments: string;

  // Status (PASS/FAIL/LIMITED SERVICE)
  status: string;
}

// Define tableStyles based on MediumVoltageSwitchOilReport.tsx
const tableStyles = {
  container: "w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700",
  table: "w-full min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700",
  headerCell: "px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-normal",
  cell: "px-2 py-2 text-sm text-gray-900 dark:text-white whitespace-normal",
  input: "w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white",
  select: "w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white"
};

// Rename component
const LowVoltageCircuitBreakerThermalMagneticATSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  // Update initial state to match the new FormData structure
  const [formData, setFormData] = useState<FormData>({
    // Initialize with default values based on FormData interface
    customer: '',
    address: '',
    user: user?.email || '',
    date: new Date().toISOString().split('T')[0],
    identifier: '',
    jobNumber: '',
    technicians: '',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 0 },
    substation: '',
    eqptLocation: '',
    // Nameplate Data
    manufacturer: '',
    catalogNumber: '',
    serialNumber: '',
    type: '',
    icRating: '',
    frameSize: '',
    ratingPlug: '',
    curveNo: '',
    operation: '',
    mounting: '',
    thermalMemory: '',
    // Visual Inspection Items (Same as Electronic)
    visualInspectionItems: [
      { id: '7.6.1.2.A.1', description: 'Compare equipment nameplate data with drawings and specifications.', result: '' },
      { id: '7.6.1.2.A.2', description: 'Inspect physical and mechanical condition.', result: '' },
      { id: '7.6.1.2.A.3', description: 'Inspect anchorage and alignment.', result: '' },
      { id: '7.6.1.2.A.4', description: 'Verify that all maintenance devices are available for servicing and operating the breaker.', result: '' },
      { id: '7.6.1.2.A.5', description: 'Verify the unit is clean.', result: '' },
      { id: '7.6.1.2.A.6', description: 'Verify the arc chutes are intact.', result: '' },
      { id: '7.6.1.2.A.7', description: 'Inspect moving and stationary contacts for condition and alignment.', result: '' },
      { id: '7.6.1.2.A.8', description: 'Verify that primary and secondary contact wipe and other dimensions vital to satisfactory operation of the breaker are correct.', result: '' },
      { id: '7.6.1.2.A.9', description: 'Perform all mechanical operator and contact alignment tests on both the breaker and its operating mechanism in accordance with manufacturer\'s published data.', result: '' },
      { id: '7.6.1.2.A.10.1', description: 'Use of a low-resistance ohmmeter in accordance with Section 7.6.1.2.B.1.', result: '' },
      { id: '7.6.1.2.A.11', description: 'Verify cell fit and element alignment.', result: '' },
      { id: '7.6.1.2.A.12', description: 'Verify racking mechanism operation.', result: '' },
      { id: '7.6.1.2.A.13', description: 'Verify appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.', result: '' },
      { id: '7.6.1.2.A.14', description: 'Perform adjustments for final protective device settings in accordance with coordination study provided by end user.', result: '' }
    ],
    // Device Settings (Thermal/Magnetic)
    deviceSettings: {
      asFound: { thermal: '', magnetic: '' },
      asLeft: { thermal: '', magnetic: '' }
    },
    // Contact Resistance (Same as Electronic)
    contactResistance: { p1: '', p2: '', p3: '', unit: 'µΩ' },
    // Insulation Resistance (Same as Electronic)
    insulationResistance: {
      testVoltage: '1000V', unit: 'MΩ',
      measured: {
        poleToPole: { p1p2: '', p2p3: '', p3p1: '' },
        poleToFrame: { p1: '', p2: '', p3: '' },
        lineToLoad: { p1: '', p2: '', p3: '' }
      },
      corrected: {
        poleToPole: { p1p2: '', p2p3: '', p3p1: '' },
        poleToFrame: { p1: '', p2: '', p3: '' },
        lineToLoad: { p1: '', p2: '', p3: '' }
      }
    },
    // Primary Injection (Thermal/Magnetic)
    primaryInjection: {
      testedSettings: { thermal: '', magnetic: '' },
      results: {
        thermal: {
          amperes1: '', multiplierTolerance: '300%', amperes2: '', toleranceMin: '', toleranceMax: '',
          pole1: { sec: '', a: '' }, pole2: { sec: '', a: '' }, pole3: { sec: '', a: '' }
        },
        magnetic: {
          amperes1: '', multiplierTolerance: '-10% 10%', amperes2: '', toleranceMin: '', toleranceMax: '',
          pole1: { sec: '', a: '' }, pole2: { sec: '', a: '' }, pole3: { sec: '', a: '' }
        }
      }
    },
    // Test Equipment (Same as Electronic)
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
      lowResistanceOhmmeter: { name: '', serialNumber: '', ampId: '' },
      primaryInjectionTestSet: { name: '', serialNumber: '', ampId: '' }
    },
    comments: '',
    status: 'PASS', // Default status
  });

  // --- Load Job Info (Keep from Electronic) ---
  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
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
      alert(`Failed to load job info: ${(error as Error).message}`);
    } finally {
      if (!reportId) {
        setLoading(false);
      }
    }
  };

  // --- Load Report (Adapt for Thermal-Magnetic) ---
  const loadReport = async () => {
    if (!reportId) {
      setLoading(false);
      setIsEditing(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        // *** IMPORTANT: Use the correct table name for Thermal-Magnetic reports ***
        .from('low_voltage_circuit_breaker_thermal_magnetic_ats') // Placeholder name
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`Report with ID ${reportId} not found. Starting new report.`);
          setIsEditing(true);
        } else {
          throw error;
        }
      }

      if (data) {
        // Map loaded data to formData state
        setFormData(prev => ({
          ...prev, // Start with defaults
          // Job Info
          customer: data.report_info?.customer || prev.customer,
          address: data.report_info?.address || prev.address,
          user: data.report_info?.user || user?.email || prev.user,
          date: data.report_info?.date || prev.date,
          identifier: data.report_info?.identifier || prev.identifier,
          jobNumber: data.report_info?.jobNumber || prev.jobNumber,
          technicians: data.report_info?.technicians || prev.technicians,
          temperature: data.report_info?.temperature || prev.temperature,
          substation: data.report_info?.substation || prev.substation,
          eqptLocation: data.report_info?.eqptLocation || prev.eqptLocation,

          // Nameplate Data (Map Thermal-Magnetic specific fields)
          manufacturer: data.nameplate_data?.manufacturer || '',
          catalogNumber: data.nameplate_data?.catalogNumber || '',
          serialNumber: data.nameplate_data?.serialNumber || '',
          type: data.nameplate_data?.type || '',
          icRating: data.nameplate_data?.icRating || '',
          frameSize: data.nameplate_data?.frameSize || '',
          ratingPlug: data.nameplate_data?.ratingPlug || '',
          curveNo: data.nameplate_data?.curveNo || '',
          operation: data.nameplate_data?.operation || '',
          mounting: data.nameplate_data?.mounting || '',
          thermalMemory: data.nameplate_data?.thermalMemory || '',

          // Visual and Mechanical Inspection
          visualInspectionItems: data.visual_mechanical?.items || prev.visualInspectionItems,

          // Device Settings (Map Thermal-Magnetic specific fields)
          deviceSettings: data.device_settings || prev.deviceSettings,

          // Contact Resistance
          contactResistance: data.contact_resistance || prev.contactResistance,

          // Insulation Resistance
          insulationResistance: data.insulation_resistance || prev.insulationResistance,

          // Primary Injection (Map Thermal-Magnetic specific fields)
          primaryInjection: data.primary_injection || prev.primaryInjection,

          // Test Equipment Used
          testEquipment: data.test_equipment || prev.testEquipment,

          // Comments
          comments: data.comments || '',

          // Status
          status: data.report_info?.status || 'PASS',
        }));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert(`Failed to load report: ${(error as Error).message}`);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Save Report (Adapt for Thermal-Magnetic) ---
  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    // Structure data for Supabase JSONB columns matching the new FormData
    const reportPayload = {
      job_id: jobId,
      user_id: user.id,
      report_info: {
        customer: formData.customer,
        address: formData.address,
        user: formData.user,
        date: formData.date,
        identifier: formData.identifier,
        jobNumber: formData.jobNumber,
        technicians: formData.technicians,
        temperature: formData.temperature,
        substation: formData.substation,
        eqptLocation: formData.eqptLocation,
        status: formData.status,
      },
      nameplate_data: {
        manufacturer: formData.manufacturer,
        catalogNumber: formData.catalogNumber,
        serialNumber: formData.serialNumber,
        type: formData.type,
        icRating: formData.icRating,
        frameSize: formData.frameSize,
        ratingPlug: formData.ratingPlug,
        curveNo: formData.curveNo,
        operation: formData.operation,
        mounting: formData.mounting,
        thermalMemory: formData.thermalMemory,
      },
      visual_mechanical: {
        items: formData.visualInspectionItems
      },
      device_settings: formData.deviceSettings,
      contact_resistance: formData.contactResistance,
      insulation_resistance: formData.insulationResistance,
      primary_injection: formData.primaryInjection,
      test_equipment: formData.testEquipment,
      comments: formData.comments
    };

    try {
      let result;
      // *** IMPORTANT: Use the correct table name for Thermal-Magnetic reports ***
      const tableName = 'low_voltage_circuit_breaker_thermal_magnetic_ats'; // Placeholder

      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from(tableName)
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from(tableName)
          .insert(reportPayload)
          .select()
          .single();

        // Create asset entry for the new report
        if (result.data) {
          const newReportId = result.data.id;
          const assetData = {
            // *** Update Asset Name and URL ***
            name: `LV CB Thermal-Magnetic ATS - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/low-voltage-circuit-breaker-thermal-magnetic-ats-report/${newReportId}`, // Needs routing
            user_id: user.id
          };

          const { data: assetResult, error: assetError } = await supabase
            .schema('neta_ops')
            .from('assets')
            .insert(assetData)
            .select()
            .single();

          if (assetError) throw assetError;

          // Link asset to job
          await supabase
            .schema('neta_ops')
            .from('job_assets')
            .insert({
              job_id: jobId,
              asset_id: assetResult.id,
              user_id: user.id
            });
        }
      }

      if (result.error) throw result.error;

      setIsEditing(false); // Exit editing mode
      alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      navigateAfterSave(navigate, jobId, location); // Use utility function
    } catch (error: any) {
      console.error('Error saving report:', error);
      let errorMessage = 'Unknown error';
      if (error) {
        if (error.message) errorMessage = error.message;
        if (error.details) errorMessage += ` Details: ${error.details}`;
        if (error.hint) errorMessage += ` Hint: ${error.hint}`;
      }
      alert(`Failed to save report: ${errorMessage}`);
    }
  };

  // --- useEffect for loading data (Keep from Electronic) ---
  useEffect(() => {
    if (jobId) {
      loadJobInfo();
    }
    if (reportId) {
      loadReport();
    } else {
      setLoading(false);
      setIsEditing(true);
    }
  }, [jobId, reportId]);

  // Reset isEditing state when reportId changes
  useEffect(() => {
    setIsEditing(!reportId);
  }, [reportId]);

  // --- Temperature Handlers (Keep from Electronic) ---
  const handleFahrenheitChange = (fahrenheit: number) => {
    const calculatedCelsius = ((fahrenheit - 32) * 5) / 9;
    const roundedCelsius = Math.round(calculatedCelsius);
    const tcf = getTCF(roundedCelsius);

    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        fahrenheit,
        celsius: roundedCelsius,
        tcf
      }
    }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const roundedCelsius = Math.round(celsius);
    const calculatedFahrenheit = (roundedCelsius * 9) / 5 + 32;
    const roundedFahrenheit = Math.round(calculatedFahrenheit);
    const tcf = getTCF(roundedCelsius);

    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        celsius: roundedCelsius,
        fahrenheit: roundedFahrenheit,
        tcf
      }
    }));
  };

  // --- Insulation Resistance Calculation (Keep from Electronic) ---
  useEffect(() => {
    if (!isEditing) return;

    const calculateCorrectedValue = (value: string): string => {
      if (value === "" || value === null || value === undefined || isNaN(Number(value))) {
          return "";
      }
      const numericValue = parseFloat(value);
      const tcf = formData.temperature.tcf;
      if (!tcf || tcf === 0) return numericValue.toFixed(2);
      return (numericValue * tcf).toFixed(2);
    };

    const newCorrected = {
      poleToPole: {
        p1p2: calculateCorrectedValue(formData.insulationResistance.measured.poleToPole.p1p2),
        p2p3: calculateCorrectedValue(formData.insulationResistance.measured.poleToPole.p2p3),
        p3p1: calculateCorrectedValue(formData.insulationResistance.measured.poleToPole.p3p1),
      },
      poleToFrame: {
        p1: calculateCorrectedValue(formData.insulationResistance.measured.poleToFrame.p1),
        p2: calculateCorrectedValue(formData.insulationResistance.measured.poleToFrame.p2),
        p3: calculateCorrectedValue(formData.insulationResistance.measured.poleToFrame.p3),
      },
      lineToLoad: {
        p1: calculateCorrectedValue(formData.insulationResistance.measured.lineToLoad.p1),
        p2: calculateCorrectedValue(formData.insulationResistance.measured.lineToLoad.p2),
        p3: calculateCorrectedValue(formData.insulationResistance.measured.lineToLoad.p3),
      }
    };

    setFormData(prev => ({
      ...prev,
      insulationResistance: {
        ...prev.insulationResistance,
        corrected: newCorrected
      }
    }));

  }, [
    JSON.stringify(formData.insulationResistance.measured),
    formData.temperature.tcf,
    isEditing
  ]);


  // --- Generic Handle Change (Keep from Electronic, may need adjustments for primary injection) ---
  const handleChange = (path: string, value: any) => {
    if (!isEditing) return;

    setFormData(prev => {
        const newState = { ...prev };
        const keys = path.split('.');
        let currentLevel: any = newState;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const arrayMatch = key.match(/(\w+)\[(\d+)\]/); // Handle array notation like visualInspectionItems[0]

            if (arrayMatch) {
                const arrayKey = arrayMatch[1];
                const index = parseInt(arrayMatch[2], 10);
                if (!currentLevel[arrayKey]) currentLevel[arrayKey] = [];
                if (!currentLevel[arrayKey][index]) {
                    // Initialize default object if accessing new array index
                    if (arrayKey === 'visualInspectionItems') {
                        currentLevel[arrayKey][index] = { id: '', description: '', result: '' };
                    } else {
                        currentLevel[arrayKey][index] = {}; // Default for other potential arrays
                    }
                }
                currentLevel = currentLevel[arrayKey][index];
            } else {
                if (currentLevel[key] === undefined || currentLevel[key] === null) {
                   currentLevel[key] = {}; // Ensure nested object exists
                }
                 // Check if it's actually an object before diving deeper
                if (typeof currentLevel[key] !== 'object' || currentLevel[key] === null) {
                   currentLevel[key] = {}; // Overwrite if it's not an object (e.g., was a string)
                }

                currentLevel = currentLevel[key];
            }
             // Safety check: if currentLevel becomes null/undefined unexpectedly, stop.
            if (currentLevel === null || currentLevel === undefined) {
               console.error(`Error navigating path: ${path} at key: ${key}`);
               return prev; // Return previous state to avoid errors
            }
        }

         const finalKey = keys[keys.length - 1];
        // Check if the final key is an array index, although unlikely with this structure
        const finalArrayMatch = finalKey.match(/(\w+)\[(\d+)\]/);
         if (finalArrayMatch) {
            const arrayKey = finalArrayMatch[1];
            const index = parseInt(finalArrayMatch[2], 10);
            if (!currentLevel[arrayKey]) currentLevel[arrayKey] = [];
             currentLevel[arrayKey][index] = value;
        } else {
            currentLevel[finalKey] = value;
        }

         return newState;
     });
};


  if (loading) {
    return <div>Loading...</div>;
  }

  // --- Render Component (Adapt JSX for Thermal-Magnetic) ---
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 dark:text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          8-Low Voltage Circuit Breaker Thermal-Magnetic ATS {/* Updated Title */}
        </h1>
        <div className="flex gap-2">
          {/* Status Button */}
          <button
            onClick={() => {
              if (isEditing) {
                const nextStatus = formData.status === 'PASS' ? 'FAIL' : formData.status === 'FAIL' ? 'LIMITED SERVICE' : 'PASS';
                setFormData(prev => ({ ...prev, status: nextStatus }));
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS' ? 'bg-green-600 text-white focus:ring-green-500' :
              formData.status === 'FAIL' ? 'bg-red-600 text-white focus:ring-red-500' :
              'bg-yellow-500 text-black focus:ring-yellow-400' // Style for LIMITED SERVICE
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.status}
          </button>

          {/* Edit/Save Button */}
          {reportId && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Report
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditing ? 'hidden' : 'hover:bg-orange-700'}`}
            >
              Save Report
            </button>
          )}
        </div>
      </div>

      {/* --- Job Information Section (Keep from Electronic) --- */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Column 1 */}
              <div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="customer" className="form-label inline-block w-32 dark:text-gray-300">Customer:</label>
                      <input id="customer" type="text" value={formData.customer} readOnly={true} className="form-input bg-gray-100 dark:bg-dark-200" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="address" className="form-label inline-block w-32 dark:text-gray-300">Address:</label>
                      <input id="address" type="text" value={formData.address} readOnly={true} className="form-input bg-gray-100 dark:bg-dark-200" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="user" className="form-label inline-block w-32 dark:text-gray-300">User:</label>
                      <input id="user" type="text" value={formData.user} onChange={(e) => handleChange('user', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="date" className="form-label inline-block w-32 dark:text-gray-300">Date:</label>
                      <input id="date" type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="identifier" className="form-label inline-block w-32 dark:text-gray-300">Identifier:</label>
                      <input id="identifier" type="text" value={formData.identifier} onChange={(e) => handleChange('identifier', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
              </div>
              {/* Column 2 */}
              <div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="jobNumber" className="form-label inline-block w-32 dark:text-gray-300">Job #:</label>
                      <input id="jobNumber" type="text" value={formData.jobNumber} readOnly={true} className="form-input bg-gray-100 dark:bg-dark-200" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="technicians" className="form-label inline-block w-32 dark:text-gray-300">Technicians:</label>
                      <input id="technicians" type="text" value={formData.technicians} onChange={(e) => handleChange('technicians', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="substation" className="form-label inline-block w-32 dark:text-gray-300">Substation:</label>
                      <input id="substation" type="text" value={formData.substation} onChange={(e) => handleChange('substation', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="eqptLocation" className="form-label inline-block w-32 dark:text-gray-300">Eqpt. Location:</label>
                      <input id="eqptLocation" type="text" value={formData.eqptLocation} onChange={(e) => handleChange('eqptLocation', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  {/* Temperature Fields */}
                  <div className="mb-4 flex items-center space-x-2">
                    <label className="form-label inline-block w-auto dark:text-gray-300">Temp:</label>
                    <input type="number" value={formData.temperature.fahrenheit} onChange={(e) => handleFahrenheitChange(Number(e.target.value))} readOnly={!isEditing} className="form-input w-20" />
                    <span className="dark:text-gray-300">°F</span>
                    <input type="number" value={formData.temperature.celsius} readOnly className="form-input w-20 bg-gray-100 dark:bg-dark-200" />
                    <span className="dark:text-gray-300">°C</span>
                    <label className="form-label inline-block w-auto dark:text-gray-300 ml-4">TCF:</label>
                    <input type="number" value={formData.temperature.tcf} readOnly className="form-input w-24 bg-gray-100 dark:bg-dark-200" />
                  </div>
                  <div className="mb-4 flex items-center">
                      <label htmlFor="humidity" className="form-label inline-block w-32 dark:text-gray-300">Humidity:</label>
                      <input id="humidity" type="number" value={formData.temperature.humidity} onChange={(e) => handleChange('temperature.humidity', Number(e.target.value))} readOnly={!isEditing} className="form-input w-20" />
                      <span className="ml-2 dark:text-gray-300">%</span>
                  </div>
              </div>
          </div>
      </section>


      {/* --- Nameplate Data Section (Adapt for Thermal-Magnetic) --- */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Column 1 */}
              <div>
                  <div className="mb-4 flex items-center">
                       <label htmlFor="manufacturer" className="form-label inline-block w-32 dark:text-gray-300">Manufacturer:</label>
                       <input id="manufacturer" type="text" value={formData.manufacturer} onChange={(e) => handleChange('manufacturer', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                  <div className="mb-4 flex items-center">
                       <label htmlFor="catalogNumber" className="form-label inline-block w-32 dark:text-gray-300">Catalog Number:</label>
                       <input id="catalogNumber" type="text" value={formData.catalogNumber} onChange={(e) => handleChange('catalogNumber', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                  <div className="mb-4 flex items-center">
                       <label htmlFor="serialNumber" className="form-label inline-block w-32 dark:text-gray-300">Serial Number:</label>
                       <input id="serialNumber" type="text" value={formData.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                  <div className="mb-4 flex items-center">
                       <label htmlFor="type" className="form-label inline-block w-32 dark:text-gray-300">Type:</label>
                       <input id="type" type="text" value={formData.type} onChange={(e) => handleChange('type', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                  <div className="mb-4 flex items-center">
                       <label htmlFor="icRating" className="form-label inline-block w-32 dark:text-gray-300">I.C. Rating (kA):</label>
                       <input id="icRating" type="text" value={formData.icRating} onChange={(e) => handleChange('icRating', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                   <div className="mb-4 flex items-center">
                       <label htmlFor="frameSize" className="form-label inline-block w-32 dark:text-gray-300">Frame Size (A):</label>
                       <input id="frameSize" type="text" value={formData.frameSize} onChange={(e) => handleChange('frameSize', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
              </div>
              {/* Column 2 */}
              <div>
                 <div className="mb-4 flex items-center">
                    <label htmlFor="ratingPlug" className="form-label inline-block w-32 dark:text-gray-300">Rating Plug (A):</label>
                    <input id="ratingPlug" type="text" value={formData.ratingPlug} onChange={(e) => handleChange('ratingPlug', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                  <div className="mb-4 flex items-center">
                    <label htmlFor="curveNo" className="form-label inline-block w-32 dark:text-gray-300">Curve No.:</label>
                    <input id="curveNo" type="text" value={formData.curveNo} onChange={(e) => handleChange('curveNo', e.target.value)} readOnly={!isEditing} className="form-input" />
                  </div>
                   <div className="mb-4 flex items-center">
                       <label htmlFor="operation" className="form-label inline-block w-32 dark:text-gray-300">Operation:</label>
                       <input id="operation" type="text" value={formData.operation} onChange={(e) => handleChange('operation', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                   <div className="mb-4 flex items-center">
                       <label htmlFor="mounting" className="form-label inline-block w-32 dark:text-gray-300">Mounting:</label>
                       <input id="mounting" type="text" value={formData.mounting} onChange={(e) => handleChange('mounting', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
                   <div className="mb-4 flex items-center">
                       <label htmlFor="thermalMemory" className="form-label inline-block w-32 dark:text-gray-300">Thermal Memory:</label>
                       <input id="thermalMemory" type="text" value={formData.thermalMemory} onChange={(e) => handleChange('thermalMemory', e.target.value)} readOnly={!isEditing} className="form-input" />
                   </div>
              </div>
          </div>
      </section>

      {/* --- Visual and Mechanical Inspection Section (Keep from Electronic) --- */}
       <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className={tableStyles.container}>
          <table className={tableStyles.table}>
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className={`${tableStyles.headerCell} w-1/6`}>NETA Section</th>
                <th className={`${tableStyles.headerCell} w-4/6`}>Description</th>
                <th className={`${tableStyles.headerCell} text-center w-1/6`}>Results</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.visualInspectionItems.map((item, index) => (
                <tr key={item.id}>
                  <td className={tableStyles.cell}>{item.id}</td>
                  <td className={tableStyles.cell}>{item.description}</td>
                  <td className={`${tableStyles.cell} text-center`}>
                    <select
                      value={item.result}
                      onChange={(e) => handleChange(`visualInspectionItems[${index}].result`, e.target.value)}
                      disabled={!isEditing}
                      className={tableStyles.select}
                    >
                      <option value=""></option>
                      {visualInspectionResultsOptions.map(option => (
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

      {/* --- Device Settings Section (Adapt for Thermal-Magnetic) --- */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Device Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {/* As Found Table */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-center dark:text-white">Settings As Found</h3>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th className={tableStyles.headerCell}></th>
                    <th className={`${tableStyles.headerCell} text-center`}>Setting</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className={tableStyles.cell}>Thermal</td>
                    <td className={tableStyles.cell}>
                      <input
                        type="text"
                        value={formData.deviceSettings.asFound.thermal}
                        onChange={(e) => handleChange('deviceSettings.asFound.thermal', e.target.value)}
                        readOnly={!isEditing}
                        className={`${tableStyles.input} text-center`}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className={tableStyles.cell}>Magnetic</td>
                    <td className={tableStyles.cell}>
                      <input
                        type="text"
                        value={formData.deviceSettings.asFound.magnetic}
                        onChange={(e) => handleChange('deviceSettings.asFound.magnetic', e.target.value)}
                        readOnly={!isEditing}
                        className={`${tableStyles.input} text-center`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* As Left Table */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-center dark:text-white">Settings As Left</h3>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th className={tableStyles.headerCell}></th>
                    <th className={`${tableStyles.headerCell} text-center`}>Setting</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className={tableStyles.cell}>Thermal</td>
                    <td className={tableStyles.cell}>
                      <input
                        type="text"
                        value={formData.deviceSettings.asLeft.thermal}
                        onChange={(e) => handleChange('deviceSettings.asLeft.thermal', e.target.value)}
                        readOnly={!isEditing}
                        className={`${tableStyles.input} text-center`}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className={tableStyles.cell}>Magnetic</td>
                    <td className={tableStyles.cell}>
                      <input
                        type="text"
                        value={formData.deviceSettings.asLeft.magnetic}
                        onChange={(e) => handleChange('deviceSettings.asLeft.magnetic', e.target.value)}
                        readOnly={!isEditing}
                        className={`${tableStyles.input} text-center`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* --- Electrical Tests - Contact/Pole Resistance Section (Keep from Electronic) --- */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Contact/Pole Resistance</h2>
        <div className={tableStyles.container}>
          <table className={tableStyles.table}>
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className={`${tableStyles.headerCell} text-center`} colSpan={3}>Contact Resistance</th>
                <th className={`${tableStyles.headerCell} text-center`}>Units</th>
              </tr>
              <tr>
                <th className={`${tableStyles.headerCell} text-center`}>P1</th>
                <th className={`${tableStyles.headerCell} text-center`}>P2</th>
                <th className={`${tableStyles.headerCell} text-center`}>P3</th>
                <th className={`${tableStyles.headerCell} text-center`}></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className={tableStyles.cell}>
                  <input
                    type="text"
                    value={formData.contactResistance.p1}
                    onChange={(e) => handleChange('contactResistance.p1', e.target.value)}
                    readOnly={!isEditing}
                    className={`${tableStyles.input} text-center`}
                  />
                </td>
                <td className={tableStyles.cell}>
                  <input
                    type="text"
                    value={formData.contactResistance.p2}
                    onChange={(e) => handleChange('contactResistance.p2', e.target.value)}
                    readOnly={!isEditing}
                    className={`${tableStyles.input} text-center`}
                  />
                </td>
                <td className={tableStyles.cell}>
                  <input
                    type="text"
                    value={formData.contactResistance.p3}
                    onChange={(e) => handleChange('contactResistance.p3', e.target.value)}
                    readOnly={!isEditing}
                    className={`${tableStyles.input} text-center`}
                  />
                </td>
                <td className={`${tableStyles.cell} text-center`}>
                  <select
                    value={formData.contactResistance.unit}
                    onChange={(e) => handleChange('contactResistance.unit', e.target.value)}
                    disabled={!isEditing}
                    className={tableStyles.select}
                  >
                    {contactResistanceUnitsOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Electrical Tests - Insulation Resistance Section (Keep from Electronic) --- */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance</h2>
        <div className="flex justify-end mb-4">
          <label htmlFor="insulationTestVoltage" className="form-label mr-2 dark:text-gray-300">Test Voltage:</label>
          <select
            id="insulationTestVoltage"
            value={formData.insulationResistance.testVoltage}
            onChange={(e) => handleChange('insulationResistance.testVoltage', e.target.value)}
            disabled={!isEditing}
            className="form-select w-32"
          >
            {insulationTestVoltageOptions.map(option => (<option key={option} value={option}>{option}</option>))}
          </select>
        </div>
        <div className={tableStyles.container}>
          <table className={tableStyles.table}>
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className={`${tableStyles.headerCell} w-[16.6%]`} rowSpan={2}></th>
                <th className={`${tableStyles.headerCell} text-center`} colSpan={3}>Measured Values</th>
                <th className={`${tableStyles.headerCell} text-center`} colSpan={3}>Temperature Corrected</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`} rowSpan={2}>Units</th>
              </tr>
              <tr>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P1 (P1-P2)</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P2 (P2-P3)</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P3 (P3-P1)</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P1 (P1-P2)</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P2 (P2-P3)</th>
                <th className={`${tableStyles.headerCell} text-center w-[12.5%]`}>P3 (P3-P1)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Pole to Pole (Closed) */}
              <tr>
                <td className={tableStyles.cell}>Pole to Pole (Closed)</td>
                {/* Measured Values */}
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToPole.p1p2} onChange={(e) => handleChange('insulationResistance.measured.poleToPole.p1p2', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToPole.p2p3} onChange={(e) => handleChange('insulationResistance.measured.poleToPole.p2p3', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToPole.p3p1} onChange={(e) => handleChange('insulationResistance.measured.poleToPole.p3p1', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                {/* Corrected Values */}
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToPole.p1p2} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToPole.p2p3} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToPole.p3p1} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                {/* Units */}
                <td className={`${tableStyles.cell} text-center`}>
                  <select value={formData.insulationResistance.unit} onChange={(e) => handleChange('insulationResistance.unit', e.target.value)} disabled={!isEditing} className={tableStyles.select}>
                    {insulationResistanceUnitsOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </td>
              </tr>
              {/* Pole to Frame (Closed) */}
              <tr>
                <td className={tableStyles.cell}>Pole to Frame (Closed)</td>
                {/* Measured Values */}
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToFrame.p1} onChange={(e) => handleChange('insulationResistance.measured.poleToFrame.p1', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToFrame.p2} onChange={(e) => handleChange('insulationResistance.measured.poleToFrame.p2', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.poleToFrame.p3} onChange={(e) => handleChange('insulationResistance.measured.poleToFrame.p3', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                {/* Corrected Values */}
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToFrame.p1} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToFrame.p2} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.poleToFrame.p3} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                {/* Units */}
                <td className={`${tableStyles.cell} text-center`}>
                  <select value={formData.insulationResistance.unit} onChange={(e) => handleChange('insulationResistance.unit', e.target.value)} disabled={!isEditing} className={tableStyles.select}>
                    {insulationResistanceUnitsOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </td>
              </tr>
              {/* Line to Load (Open) */}
              <tr>
                <td className={tableStyles.cell}>Line to Load (Open)</td>
                 {/* Measured Values */}
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.lineToLoad.p1} onChange={(e) => handleChange('insulationResistance.measured.lineToLoad.p1', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.lineToLoad.p2} onChange={(e) => handleChange('insulationResistance.measured.lineToLoad.p2', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.measured.lineToLoad.p3} onChange={(e) => handleChange('insulationResistance.measured.lineToLoad.p3', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} /></td>
                 {/* Corrected Values */}
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.lineToLoad.p1} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.lineToLoad.p2} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                 <td className={tableStyles.cell}><input type="text" value={formData.insulationResistance.corrected.lineToLoad.p3} readOnly className={`${tableStyles.input} text-center bg-gray-100 dark:bg-dark-200`} /></td>
                {/* Units */}
                <td className={`${tableStyles.cell} text-center`}>
                  <select value={formData.insulationResistance.unit} onChange={(e) => handleChange('insulationResistance.unit', e.target.value)} disabled={!isEditing} className={tableStyles.select}>
                    {insulationResistanceUnitsOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Electrical Tests - Primary Injection Section (Adapt for Thermal-Magnetic) --- */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Electrical Tests - Primary Injection
        </h2>

        {/* Tested Settings Table */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-center dark:text-white">Tested Settings</h3>
          <div className={tableStyles.container}>
            <table className={tableStyles.table}>
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className={tableStyles.headerCell}></th>
                  <th className={`${tableStyles.headerCell} text-center`}>Setting</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className={tableStyles.cell}>Thermal</td>
                  <td className={tableStyles.cell}>
                    <input
                      type="text"
                      value={formData.primaryInjection.testedSettings.thermal}
                      onChange={(e) => handleChange('primaryInjection.testedSettings.thermal', e.target.value)}
                      readOnly={!isEditing}
                      className={`${tableStyles.input} text-center`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={tableStyles.cell}>Magnetic</td>
                  <td className={tableStyles.cell}>
                    <input
                      type="text"
                      value={formData.primaryInjection.testedSettings.magnetic}
                      onChange={(e) => handleChange('primaryInjection.testedSettings.magnetic', e.target.value)}
                      readOnly={!isEditing}
                      className={`${tableStyles.input} text-center`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Primary Injection Results Table */}
        <div className={tableStyles.container}>
          <table className={tableStyles.table}>
            <caption className="caption-top p-2 text-lg font-medium text-gray-900 dark:text-white">
              Primary Injection
            </caption>
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className={tableStyles.headerCell} rowSpan={2}>Function</th>
                <th className={`${tableStyles.headerCell} text-center`}>Ampere s</th>
                <th className={`${tableStyles.headerCell} text-center`}>Multiplier Tolerance</th>
                <th className={`${tableStyles.headerCell} text-center`}>Ampere s</th>
                <th className={`${tableStyles.headerCell} text-center`} colSpan={2}>Tolerance</th>
                <th className={`${tableStyles.headerCell} text-center`} colSpan={3}>Pole</th>
              </tr>
              <tr>
                <th className={tableStyles.headerCell}></th>
                <th className={tableStyles.headerCell}></th>
                <th className={tableStyles.headerCell}></th>
                <th className={`${tableStyles.headerCell} text-center`}>Min</th>
                <th className={`${tableStyles.headerCell} text-center`}>Max</th>
                <th className={`${tableStyles.headerCell} text-center`}>1 sec.</th>
                <th className={`${tableStyles.headerCell} text-center`}>2 sec.</th>
                <th className={`${tableStyles.headerCell} text-center`}>3 sec.</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Thermal Row */}
              <tr>
                <td className={tableStyles.cell}>Thermal</td>
                <td className={tableStyles.cell}>
                  <input type="text" value={formData.primaryInjection.results.thermal.amperes1} onChange={(e) => handleChange('primaryInjection.results.thermal.amperes1', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                </td>
                <td className={`${tableStyles.cell} text-center`}>{formData.primaryInjection.results.thermal.multiplierTolerance}</td>
                <td className={tableStyles.cell}>
                  <input type="text" value={formData.primaryInjection.results.thermal.amperes2} onChange={(e) => handleChange('primaryInjection.results.thermal.amperes2', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                </td>
                <td className={tableStyles.cell}>
                  <input type="text" value={formData.primaryInjection.results.thermal.toleranceMin} onChange={(e) => handleChange('primaryInjection.results.thermal.toleranceMin', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                </td>
                <td className={tableStyles.cell}>
                  <input type="text" value={formData.primaryInjection.results.thermal.toleranceMax} onChange={(e) => handleChange('primaryInjection.results.thermal.toleranceMax', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                </td>
                <td className={tableStyles.cell}>
                  <div className="flex items-center justify-center space-x-1">
                    <input type="text" value={formData.primaryInjection.results.thermal.pole1.sec} onChange={(e) => handleChange('primaryInjection.results.thermal.pole1.sec', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>sec.</span>
                  </div>
                </td>
                <td className={tableStyles.cell}>
                  <div className="flex items-center justify-center space-x-1">
                    <input type="text" value={formData.primaryInjection.results.thermal.pole2.sec} onChange={(e) => handleChange('primaryInjection.results.thermal.pole2.sec', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>sec.</span>
                  </div>
                </td>
                <td className={tableStyles.cell}>
                   <div className="flex items-center justify-center space-x-1">
                    <input type="text" value={formData.primaryInjection.results.thermal.pole3.sec} onChange={(e) => handleChange('primaryInjection.results.thermal.pole3.sec', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>sec.</span>
                  </div>
                </td>
              </tr>
              {/* Magnetic Row */}
              <tr>
                <td className={tableStyles.cell}>Magnetic</td>
                 <td className={tableStyles.cell}>
                   <input type="text" value={formData.primaryInjection.results.magnetic.amperes1} onChange={(e) => handleChange('primaryInjection.results.magnetic.amperes1', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                 </td>
                 <td className={`${tableStyles.cell} text-center`}>{formData.primaryInjection.results.magnetic.multiplierTolerance}</td>
                 <td className={tableStyles.cell}>
                   <input type="text" value={formData.primaryInjection.results.magnetic.amperes2} onChange={(e) => handleChange('primaryInjection.results.magnetic.amperes2', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                 </td>
                 <td className={tableStyles.cell}>
                   <input type="text" value={formData.primaryInjection.results.magnetic.toleranceMin} onChange={(e) => handleChange('primaryInjection.results.magnetic.toleranceMin', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                 </td>
                 <td className={tableStyles.cell}>
                   <input type="text" value={formData.primaryInjection.results.magnetic.toleranceMax} onChange={(e) => handleChange('primaryInjection.results.magnetic.toleranceMax', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center`} />
                 </td>
                <td className={tableStyles.cell}>
                   <div className="flex items-center justify-center space-x-1">
                    {/* Magnetic has no sec field based on image */}
                    <input type="text" value={formData.primaryInjection.results.magnetic.pole1.a} onChange={(e) => handleChange('primaryInjection.results.magnetic.pole1.a', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>A</span>
                  </div>
                </td>
                 <td className={tableStyles.cell}>
                   <div className="flex items-center justify-center space-x-1">
                    <input type="text" value={formData.primaryInjection.results.magnetic.pole2.a} onChange={(e) => handleChange('primaryInjection.results.magnetic.pole2.a', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>A</span>
                  </div>
                 </td>
                 <td className={tableStyles.cell}>
                   <div className="flex items-center justify-center space-x-1">
                    <input type="text" value={formData.primaryInjection.results.magnetic.pole3.a} onChange={(e) => handleChange('primaryInjection.results.magnetic.pole3.a', e.target.value)} readOnly={!isEditing} className={`${tableStyles.input} text-center w-16`} />
                    <span>A</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

       {/* --- Test Equipment Used Section (Keep structure, update labels) --- */}
       <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
         <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
         <div className="grid grid-cols-1 gap-y-4">
           {/* Megohmmeter */}
           <div className="flex items-center">
             <label className="form-label inline-block w-48 dark:text-gray-300">Megohmmeter:</label> {/* Increased width */}
             <input type="text" value={formData.testEquipment.megohmmeter.name} onChange={(e) => handleChange('testEquipment.megohmmeter.name', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-32 ml-4 dark:text-gray-300">Serial Number:</label>
             <input type="text" value={formData.testEquipment.megohmmeter.serialNumber} onChange={(e) => handleChange('testEquipment.megohmmeter.serialNumber', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-24 ml-4 dark:text-gray-300">AMP ID:</label>
             <input type="text" value={formData.testEquipment.megohmmeter.ampId} onChange={(e) => handleChange('testEquipment.megohmmeter.ampId', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
           </div>
           {/* Low Resistance Ohmmeter */}
           <div className="flex items-center">
             <label className="form-label inline-block w-48 dark:text-gray-300">Low-Resistance Ohmmeter:</label> {/* Increased width */}
             <input type="text" value={formData.testEquipment.lowResistanceOhmmeter.name} onChange={(e) => handleChange('testEquipment.lowResistanceOhmmeter.name', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-32 ml-4 dark:text-gray-300">Serial Number:</label>
             <input type="text" value={formData.testEquipment.lowResistanceOhmmeter.serialNumber} onChange={(e) => handleChange('testEquipment.lowResistanceOhmmeter.serialNumber', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-24 ml-4 dark:text-gray-300">AMP ID:</label>
             <input type="text" value={formData.testEquipment.lowResistanceOhmmeter.ampId} onChange={(e) => handleChange('testEquipment.lowResistanceOhmmeter.ampId', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
           </div>
           {/* Primary Injection Test Set */}
           <div className="flex items-center">
             <label className="form-label inline-block w-48 dark:text-gray-300">Primary Injection Test Set:</label> {/* Increased width */}
             <input type="text" value={formData.testEquipment.primaryInjectionTestSet.name} onChange={(e) => handleChange('testEquipment.primaryInjectionTestSet.name', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-32 ml-4 dark:text-gray-300">Serial Number:</label>
             <input type="text" value={formData.testEquipment.primaryInjectionTestSet.serialNumber} onChange={(e) => handleChange('testEquipment.primaryInjectionTestSet.serialNumber', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
             <label className="form-label inline-block w-24 ml-4 dark:text-gray-300">AMP ID:</label>
             <input type="text" value={formData.testEquipment.primaryInjectionTestSet.ampId} onChange={(e) => handleChange('testEquipment.primaryInjectionTestSet.ampId', e.target.value)} readOnly={!isEditing} className="form-input flex-1" />
           </div>
         </div>
       </section>

      {/* --- Comments Section (Keep from Electronic) --- */}
       <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
         <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
         <div className="mb-4">
           <textarea
             value={formData.comments}
             onChange={(e) => handleChange('comments', e.target.value)}
             readOnly={!isEditing}
             className={`w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
             rows={4}
           />
         </div>
       </section>
    </div>
  );
};

export default LowVoltageCircuitBreakerThermalMagneticATSReport; 