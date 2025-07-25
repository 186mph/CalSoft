import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import _ from 'lodash';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const LARGE_TRANSFORMER_MTS_TABLE = 'large_dry_type_transformer_mts_reports' as const;

// Temperature conversion and TCF tables (same as DryTypeTransformer)
const tempConvTable = [
  [-11.2, -24], [-9.4, -23], [-7.6, -22], [-5.8, -21], [-4, -20], [-2.2, -19], [1.4, -17], [3.2, -16], [5, -15], [6.8, -14], [8.6, -13], [10.4, -12], [12.2, -11], [14, -10], [15.8, -9], [17.6, -8], [19.4, -7], [21.2, -6], [23, -5], [24.8, -4], [26.6, -3], [28.4, -2], [30.2, -1], [32, 0], [33.8, 1], [35.6, 2], [37.4, 3], [39.2, 4], [41, 5], [42.8, 6], [44.6, 7], [46.4, 8], [48.2, 9], [50, 10], [51.8, 11], [53.6, 12], [55.4, 13], [57.2, 14], [59, 15], [60.8, 16], [62.6, 17], [64.4, 18], [66.2, 19], [68, 20], [70, 21], [72, 22], [73.4, 23], [75.2, 24], [77, 25], [78.8, 26], [80.6, 27], [82.4, 28], [84.2, 29], [86, 30], [87.8, 31], [89.6, 32], [91.4, 33], [93.2, 34], [95, 35], [96.8, 36], [98.6, 37], [100.4, 38], [102.2, 39], [104, 40], [105.8, 41], [107.6, 42], [109.4, 43], [111.2, 44], [113, 45], [114.8, 46], [116.6, 47], [118.4, 48], [120.2, 49], [122, 50], [123.8, 51], [125.6, 52], [127.4, 53], [129.2, 54], [131, 55], [132.8, 56], [134.6, 57], [136.4, 58], [138.2, 59], [140, 60], [141.8, 61], [143.6, 62], [145.4, 63], [147.2, 64], [149, 65]
];

const tcfTable = [
  [-24, 0.048], [-23, 0.051], [-22, 0.055], [-21, 0.059], [-20, 0.063], [-19, 0.068], [-18, 0.072], [-17, 0.077], [-16, 0.082], [-15, 0.088], [-14, 0.093], [-13, 0.1], [-12, 0.106], [-11, 0.113], [-10, 0.12], [-9, 0.128], [-8, 0.136], [-7, 0.145], [-6, 0.154], [-5, 0.164], [-4, 0.174], [-3, 0.185], [-2, 0.197], [-1, 0.209], [0, 0.222], [1, 0.236], [2, 0.251], [3, 0.266], [4, 0.282], [5, 0.3], [6, 0.318], [7, 0.338], [8, 0.358], [9, 0.38], [10, 0.404], [11, 0.429], [12, 0.455], [13, 0.483], [14, 0.513], [15, 0.544], [16, 0.577], [17, 0.612], [18, 0.65], [19, 0.689], [20, 0.731], [21, 0.775], [22, 0.822], [23, 0.872], [24, 0.925], [25, 0.981], [26, 1.04], [27, 1.103], [28, 1.17], [29, 1.241], [30, 1.316], [31, 1.396], [32, 1.48], [33, 1.57], [34, 1.665], [35, 1.766], [36, 1.873], [37, 1.987], [38, 2.108], [39, 2.236], [40, 2.371], [41, 2.514], [42, 2.665], [43, 2.825], [44, 2.994], [45, 3.174], [46, 3.363], [47, 3.564], [48, 3.776], [49, 4], [50, 4.236], [51, 4.486], [52, 4.75], [53, 5.03], [54, 5.326], [55, 5.639], [56, 5.97], [57, 6.32], [58, 6.69], [59, 7.082], [60, 7.498], [61, 7.938], [62, 8.403], [63, 8.895], [64, 9.415], [65, 9.96]
];

// Dropdown options
const visualInspectionOptions = [ // As per screenshot
  "Select One", "Yes", "No", "N/A", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments",
];

const insulationResistanceUnits = [
  { symbol: "kΩ", name: "Kilo-Ohms" },
  { symbol: "MΩ", name: "Mega-Ohms" },
  { symbol: "GΩ", name: "Giga-Ohms" }
];

const testVoltageOptions = [
  "250V", "500V", "1000V",
  "2500V", "5000V", "10000V"
];

const turnsRatioAssessmentOptions = ["Select One", "Pass", "Fail", "N/A"];


// Interface for form data structure
interface FormData {
  // Job Information
  customer: string;
  address: string;
  date: string;
  technicians: string;
  jobNumber: string;
  substation: string;
  eqptLocation: string;
  identifier: string;
  userName: string;
  temperature: {
    ambient: number;
    celsius: number;
    fahrenheit: number;
    correctionFactor: number;
    humidity?: number; // Make humidity optional as it's not always present
  };

  // Nameplate Data
  nameplateData: {
    manufacturer: string;
    catalogNumber: string;
    serialNumber: string;
    kva: string;
    tempRise: string;
    impedance: string;
    primary: {
      volts: string;
      voltsSecondary: string;
      connection: string;
      material: string;
    };
    secondary: {
      volts: string;
      voltsSecondary: string;
      connection: string;
      material: string;
    };
    tapConfiguration: {
      positions: number[];
      voltages: string[];
      currentPosition: number;
      currentPositionSecondary: string;
      tapVoltsSpecific: string;
      tapPercentSpecific: string;
    };
  };

  // Visual Inspection
  visualInspection: {
    [key: string]: string | undefined; // Allow for string results and optional comments
  };

  // Insulation Resistance
  insulationResistance: {
    temperature: string; // This seems redundant if we have the main temp object
    primaryToGround: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    secondaryToGround: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    primaryToSecondary: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    dielectricAbsorptionAcceptable: string;
    polarizationIndexAcceptable: string;
  };

  // Turns Ratio
  turnsRatio: {
    secondaryWindingVoltage: string;
    taps: Array<{
      tap: string; // 1, 2, 3, 4, 5, 6, 7
      nameplateVoltage: string;
      calculatedRatio: string;
      phaseA_TTR: string;
      phaseA_Dev: string;
      phaseB_TTR: string;
      phaseB_Dev: string;
      phaseC_TTR: string;
      phaseC_Dev: string;
      assessment: string; // Dropdown
    }>;
  };

  // Test Equipment
  testEquipment: {
    megohmmeter: { name: string; serialNumber: string; ampId: string; };
    // Add other equipment like TTR tester if needed
  };

  // Comments
  comments: string;
  status: string;
}

// Helper function to calculate corrected value
const calculateCorrectedValue = (readingStr: string, tcf: number): string => {
   if (typeof readingStr === 'string' && (readingStr.includes('>') || readingStr.includes('<'))) {
      return readingStr;
   }
  const readingNum = parseFloat(readingStr);
  if (isNaN(readingNum) || !isFinite(readingNum)) return '';
  return (readingNum * tcf).toFixed(2);
};

// Helper function to calculate DA/PI ratio
const calculateDAPRatio = (numeratorStr: string, denominatorStr: string): string => {
   if (typeof numeratorStr === 'string' && (numeratorStr.includes('>') || numeratorStr.includes('<'))) return '';
   if (typeof denominatorStr === 'string' && (denominatorStr.includes('>') || denominatorStr.includes('<'))) return '';
   const numerator = parseFloat(numeratorStr);
   const denominator = parseFloat(denominatorStr);
   if (isNaN(numerator) || isNaN(denominator) || !isFinite(numerator) || !isFinite(denominator) || denominator === 0) return '';
   return (numerator / denominator).toFixed(2);
};

// Helper function to calculate turns ratio
const calculateTurnsRatio = (nameplateVoltage: string, secondaryVoltage: string): string => {
  // If nameplate voltage is empty, 0, or "-", return empty string
  if (!nameplateVoltage || nameplateVoltage === "0" || nameplateVoltage === "-") return "";
  
  // If secondary voltage is empty or 0, return empty string
  if (!secondaryVoltage || parseFloat(secondaryVoltage) === 0) return "";
  
  // Convert voltages to numbers
  const primary = parseFloat(nameplateVoltage);
  const secondary = parseFloat(secondaryVoltage);
  
  // Check if conversions resulted in valid numbers
  if (isNaN(primary) || isNaN(secondary)) return "";
  
  // Calculate and format the ratio to 3 decimal places
  return (primary / secondary).toFixed(3);
};

// Helper function to calculate TCF
const calculateTCF = (celsius: number): number => {
  const match = tcfTable.find(item => item[0] === celsius);
  return match ? match[1] : 1;
};

// Add this helper function near the other helper functions at the top
const calculateAssessment = (phaseA_Dev: string, phaseB_Dev: string, phaseC_Dev: string): string => {
  // If any deviation is empty, return empty string (matches =IF(OR(AD66="",W66="",P66=""), "")
  if (!phaseA_Dev || !phaseB_Dev || !phaseC_Dev) return '';
  
  // Convert deviations to numbers
  const devA = parseFloat(phaseA_Dev);
  const devB = parseFloat(phaseB_Dev);
  const devC = parseFloat(phaseC_Dev);
  
  // Check if any conversion resulted in NaN
  if (isNaN(devA) || isNaN(devB) || isNaN(devC)) return '';
  
  // Check if all deviations are within ±0.501% (matches AND(AD66<0.501, AD66>-0.501, W66<0.501, W66>-0.501, P66<0.501, P66>-0.501)
  if (devA < 0.501 && devA > -0.501 &&
      devB < 0.501 && devB > -0.501 &&
      devC < 0.501 && devC > -0.501) {
    return 'Pass';
  }
  
  // If any condition fails, return "Fail"
  return 'Fail';
};

// Add this helper function near the other helper functions
const calculateDeviation = (calculatedRatio: string, ttr: string): string => {
  // If TTR is empty, return empty string
  if (!ttr) return '';
  
  // Convert values to numbers
  const calculated = parseFloat(calculatedRatio);
  const measured = parseFloat(ttr);
  
  // Check if conversions resulted in valid numbers
  if (isNaN(calculated) || isNaN(measured) || calculated === 0) return '';
  
  // Calculate deviation percentage
  return (((calculated - measured) / calculated) * 100).toFixed(3);
};

const LargeDryTypeTransformerMTSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  const initialVisualInspectionState = {
    "7.2.1.2.A.1": "Select One", "7.2.1.2.A.1_comments": "",
    "7.2.1.2.A.2": "Select One", "7.2.1.2.A.2_comments": "",
    "7.2.1.2.A.3*": "Select One", "7.2.1.2.A.3*_comments": "", // Note asterisk
    "7.2.1.2.A.4": "Select One", "7.2.1.2.A.4_comments": "",
    "7.2.1.2.A.5*": "Select One", "7.2.1.2.A.5*_comments": "", // Note asterisk
    "7.2.1.2.A.6": "Select One", "7.2.1.2.A.6_comments": "",
    "7.2.1.2.A.7": "Select One", "7.2.1.2.A.7_comments": "",
    "7.2.1.2.A.8": "Select One", "7.2.1.2.A.8_comments": "",
    "7.2.1.2.A.9": "Select One", "7.2.1.2.A.9_comments": "",
    "7.2.1.2.A.10": "Select One", "7.2.1.2.A.10_comments": "",
    "7.2.1.2.A.11": "Select One", "7.2.1.2.A.11_comments": "",
  };
  
  const [formData, setFormData] = useState<FormData>({
    customer: '', address: '', date: new Date().toISOString().split('T')[0], technicians: '',
    jobNumber: '', substation: '', eqptLocation: '', identifier: '', userName: '',
    temperature: { ambient: 70, celsius: 21, fahrenheit: 70, correctionFactor: 1.05, humidity: 50 },
    nameplateData: {
      manufacturer: '', catalogNumber: '', serialNumber: '', kva: '', tempRise: '', impedance: '',
      primary: { volts: '', voltsSecondary: '', connection: 'Delta', material: 'Aluminum' },
      secondary: { volts: '', voltsSecondary: '', connection: 'Wye', material: 'Aluminum' },
      tapConfiguration: {
        positions: [1, 2, 3, 4, 5, 6, 7], voltages: ['', '', '', '', '', '', ''],
        currentPosition: 3, currentPositionSecondary: '', tapVoltsSpecific: '', tapPercentSpecific: ''
      }
    },
    visualInspection: initialVisualInspectionState,
    insulationResistance: {
      temperature: '', // This will be set by the main temperature object
      primaryToGround: { testVoltage: "5000V", unit: "MΩ", readings: { halfMinute: "", oneMinute: "", tenMinute: "" }, corrected: { halfMinute: "", oneMinute: "", tenMinute: "" }, dielectricAbsorption: '', polarizationIndex: '' },
      secondaryToGround: { testVoltage: "1000V", unit: "MΩ", readings: { halfMinute: "", oneMinute: "", tenMinute: "" }, corrected: { halfMinute: "", oneMinute: "", tenMinute: "" }, dielectricAbsorption: '', polarizationIndex: '' },
      primaryToSecondary: { testVoltage: "5000V", unit: "MΩ", readings: { halfMinute: "", oneMinute: "", tenMinute: "" }, corrected: { halfMinute: "", oneMinute: "", tenMinute: "" }, dielectricAbsorption: '', polarizationIndex: '' },
      dielectricAbsorptionAcceptable: '', polarizationIndexAcceptable: ''
    },
    turnsRatio: {
      secondaryWindingVoltage: '',
      taps: Array(7).fill(null).map((_, i) => ({
        tap: (i + 1).toString(), nameplateVoltage: '', calculatedRatio: '',
        phaseA_TTR: '', phaseA_Dev: '', phaseB_TTR: '', phaseB_Dev: '',
        phaseC_TTR: '', phaseC_Dev: '', assessment: 'Select One'
      }))
    },
    testEquipment: { megohmmeter: { name: '', serialNumber: '', ampId: '' } },
    comments: '', status: 'PASS'
  });

  const getVisualInspectionDescription = (id: string): string => {
    const descriptions: { [key: string]: string } = {
      "7.2.1.2.A.1": "Inspect physical and mechanical condition.",
      "7.2.1.2.A.2": "Inspect anchorage, alignment, and grounding.",
      "7.2.1.2.A.3*": "Prior to cleaning the unit, perform as-found tests.", // Note asterisk
      "7.2.1.2.A.4": "Clean the unit.",
      "7.2.1.2.A.5*": "Verify that control and alarm settings on temperature indicators are as specified.", // Note asterisk
      "7.2.1.2.A.6": "Verify that cooling fans operate correctly.",
      "7.2.1.2.A.7": "Inspect bolted electrical connections for high resistance using a low-resistance ohmmeter.",
      "7.2.1.2.A.8": "Perform specific inspections and mechanical tests as recommended by the manufacturer.",
      "7.2.1.2.A.9": "Perform as-left tests.",
      "7.2.1.2.A.10": "Verify that as-left tap connections are as specified.",
      "7.2.1.2.A.11": "Verify the presence of surge arresters."
    };
    return descriptions[id] || `Unknown Section: ${id}`;
  };

  const handleTemperatureChange = (fahrenheit: number) => {
      const closestMatch = tempConvTable.reduce((prev, curr) => 
        Math.abs(curr[0] - fahrenheit) < Math.abs(prev[0] - fahrenheit) ? curr : prev
      );
      const celsius = closestMatch[1];
      const tcfMatch = tcfTable.find(item => item[0] === celsius) || [0, 1];
      const correctionFactor = tcfMatch[1];
      setFormData(prev => ({
        ...prev,
        temperature: { ...prev.temperature, ambient: fahrenheit, celsius, fahrenheit, correctionFactor }
      }));
    };

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

   const handleNestedChange = (section: keyof FormData, subsection: string, value: any) => {
       setFormData(prev => {
           const currentSection = prev[section];
           if (typeof currentSection !== 'object' || currentSection === null) return prev;
           return { ...prev, [section]: { ...(currentSection as object), [subsection]: value } };
       });
   };

   const handleDeepNestedChange = (section: keyof FormData, subsection: string, nestedSection: string, field: string, value: any) => {
       setFormData(prev => {
            const currentSection = prev[section];
            if (typeof currentSection !== 'object' || currentSection === null) return prev;
            const currentSubsection = currentSection[subsection];
            if (typeof currentSubsection !== 'object' || currentSubsection === null) return prev;
            const currentNestedSection = currentSubsection[nestedSection];
            if (typeof currentNestedSection !== 'object' || currentNestedSection === null) return prev;
           return { ...prev, [section]: { ...(currentSection as object), [subsection]: { ...(currentSubsection as object), [nestedSection]: { ...(currentNestedSection as object), [field]: value } } } };
       });
   };

    const handleVisualInspectionChange = (id: string, type: 'result' | 'comment', value: string) => {
        const fieldKey = type === 'result' ? id : `${id}_comments`;
        setFormData(prev => ({
            ...prev,
            visualInspection: {
                ...prev.visualInspection,
                [fieldKey]: value
            }
        }));
    };
    
    const handleTurnsRatioChange = (index: number, field: keyof FormData['turnsRatio']['taps'][0], value: string) => {
        setFormData(prev => {
            const newTaps = [...prev.turnsRatio.taps];
            const calculatedRatio = calculateTurnsRatio(prev.nameplateData.tapConfiguration.voltages[index] || '', prev.turnsRatio.secondaryWindingVoltage);
            
            // Update the TTR value
            newTaps[index] = { ...newTaps[index], [field]: value };
            
            // Calculate and update the corresponding deviation
            if (field === 'phaseA_TTR') {
                newTaps[index].phaseA_Dev = calculateDeviation(calculatedRatio, value);
            } else if (field === 'phaseB_TTR') {
                newTaps[index].phaseB_Dev = calculateDeviation(calculatedRatio, value);
            } else if (field === 'phaseC_TTR') {
                newTaps[index].phaseC_Dev = calculateDeviation(calculatedRatio, value);
            }
            
            return { ...prev, turnsRatio: { ...prev.turnsRatio, taps: newTaps } };
        });
    };


  useEffect(() => {
      const tcf = formData.temperature.correctionFactor;
      const updateCalculatedValues = (testId: keyof FormData['insulationResistance']) => {
          if (testId !== 'primaryToGround' && testId !== 'secondaryToGround' && testId !== 'primaryToSecondary') {
              return { corrected: { halfMinute: '', oneMinute: '', tenMinute: '' }, dielectricAbsorption: '', polarizationIndex: '' };
          }
          const testRecord = formData.insulationResistance[testId];
           if (!testRecord || !testRecord.readings) {
               return { corrected: { halfMinute: '', oneMinute: '', tenMinute: '' }, dielectricAbsorption: '', polarizationIndex: '' };
           }
           const readings = testRecord.readings;
          const corrected = {
              halfMinute: calculateCorrectedValue(readings.halfMinute, tcf),
              oneMinute: calculateCorrectedValue(readings.oneMinute, tcf),
              tenMinute: calculateCorrectedValue(readings.tenMinute, tcf),
          };
          const dielectricAbsorption = calculateDAPRatio(corrected.oneMinute, corrected.halfMinute);
          const polarizationIndex = calculateDAPRatio(corrected.tenMinute, corrected.oneMinute);
          return { corrected, dielectricAbsorption, polarizationIndex };
      };

      if (formData.insulationResistance) {
          setFormData(prev => {
              if (!prev.insulationResistance) return prev;
              const primaryCalcs = updateCalculatedValues('primaryToGround');
              const secondaryCalcs = updateCalculatedValues('secondaryToGround');
              const primarySecondaryCalcs = updateCalculatedValues('primaryToSecondary');
              const daValues = [primaryCalcs.dielectricAbsorption, secondaryCalcs.dielectricAbsorption, primarySecondaryCalcs.dielectricAbsorption].map(v => parseFloat(v));
              const daAcceptable = daValues.some(v => !isNaN(v)) && daValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';
              const piValues = [primaryCalcs.polarizationIndex, secondaryCalcs.polarizationIndex, primarySecondaryCalcs.polarizationIndex].map(v => parseFloat(v));
              const piAcceptable = piValues.some(v => !isNaN(v)) && piValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';

              if (!_.isEqual(prev.insulationResistance.primaryToGround.corrected, primaryCalcs.corrected) ||
                  !_.isEqual(prev.insulationResistance.secondaryToGround.corrected, secondaryCalcs.corrected) ||
                  !_.isEqual(prev.insulationResistance.primaryToSecondary.corrected, primarySecondaryCalcs.corrected) ||
                  prev.insulationResistance.primaryToGround.dielectricAbsorption !== primaryCalcs.dielectricAbsorption ||
                  prev.insulationResistance.secondaryToGround.dielectricAbsorption !== secondaryCalcs.dielectricAbsorption ||
                  prev.insulationResistance.primaryToSecondary.dielectricAbsorption !== primarySecondaryCalcs.dielectricAbsorption ||
                  prev.insulationResistance.primaryToGround.polarizationIndex !== primaryCalcs.polarizationIndex ||
                  prev.insulationResistance.secondaryToGround.polarizationIndex !== secondaryCalcs.polarizationIndex ||
                  prev.insulationResistance.primaryToSecondary.polarizationIndex !== primarySecondaryCalcs.polarizationIndex ||
                  prev.insulationResistance.dielectricAbsorptionAcceptable !== daAcceptable ||
                  prev.insulationResistance.polarizationIndexAcceptable !== piAcceptable) {
                  return { ...prev, insulationResistance: {
                          ...prev.insulationResistance,
                          primaryToGround: { ...prev.insulationResistance.primaryToGround, corrected: primaryCalcs.corrected, dielectricAbsorption: primaryCalcs.dielectricAbsorption, polarizationIndex: primaryCalcs.polarizationIndex },
                          secondaryToGround: { ...prev.insulationResistance.secondaryToGround, corrected: secondaryCalcs.corrected, dielectricAbsorption: secondaryCalcs.dielectricAbsorption, polarizationIndex: secondaryCalcs.polarizationIndex },
                          primaryToSecondary: { ...prev.insulationResistance.primaryToSecondary, corrected: primarySecondaryCalcs.corrected, dielectricAbsorption: primarySecondaryCalcs.dielectricAbsorption, polarizationIndex: primarySecondaryCalcs.polarizationIndex },
                          dielectricAbsorptionAcceptable: daAcceptable, polarizationIndexAcceptable: piAcceptable,
                      }
                  };
              } return prev;
          });
      }
  }, [formData.insulationResistance?.primaryToGround?.readings, formData.insulationResistance?.secondaryToGround?.readings, formData.insulationResistance?.primaryToSecondary?.readings, formData.temperature.correctionFactor]);

  const loadJobInfo = async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      const { data: jobData, error: jobError } = await supabase.schema('neta_ops').from('jobs').select(`title, job_number, customer_id`).eq('id', jobId).single();
      if (jobError) throw jobError;
      if (jobData) {
        let customerName = ''; let customerAddress = '';
        if (jobData.customer_id) {
          const { data: customerData, error: customerError } = await supabase.schema('common').from('customers').select(`name, company_name, address`).eq('id', jobData.customer_id).single();
          if (!customerError && customerData) { customerName = customerData.company_name || customerData.name || ''; customerAddress = customerData.address || ''; }
        }
        setFormData(prev => ({ ...prev, jobNumber: jobData.job_number || '', customer: customerName, address: customerAddress }));
      }
    } catch (error) { const err = error as SupabaseError; console.error('Error loading job info:', err); alert(`Failed to load job info: ${err.message}`);
    } finally { /* setLoading(false); */ }
  };

  const loadReport = async () => {
    if (!reportId) { setLoading(false); setIsEditing(true); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.schema('neta_ops').from(LARGE_TRANSFORMER_MTS_TABLE).select('*').eq('id', reportId).single();
      if (error) { if (error.code === 'PGRST116') { setIsEditing(true); } else { throw error; } }
      if (data) {
        setFormData(prev => ({
          ...prev,
          customer: data.report_info?.customer ?? prev.customer, address: data.report_info?.address ?? prev.address, date: data.report_info?.date ?? prev.date,
          technicians: data.report_info?.technicians ?? '', jobNumber: data.report_info?.jobNumber ?? prev.jobNumber, substation: data.report_info?.substation ?? '',
          eqptLocation: data.report_info?.eqptLocation ?? '', identifier: data.report_info?.identifier ?? '', userName: data.report_info?.userName ?? '',
          temperature: data.report_info?.temperature ?? prev.temperature, status: data.report_info?.status ?? 'PASS', comments: data.comments ?? data.report_info?.comments ?? '',
          nameplateData: data.report_info?.nameplateData ?? prev.nameplateData,
          visualInspection: { ...initialVisualInspectionState, ...(data.visual_inspection?.items ?? {}) }, // Merge with initial to ensure all keys
          insulationResistance: { ...prev.insulationResistance, ...(data.insulation_resistance?.tests ?? {}) },
          turnsRatio: data.turns_ratio ?? prev.turnsRatio,
          testEquipment: data.test_equipment ?? prev.testEquipment,
        }));
        setIsEditing(false);
      }
    } catch (error) { const err = error as SupabaseError; console.error(`Error loading report from ${LARGE_TRANSFORMER_MTS_TABLE}:`, err); alert(`Failed to load report: ${err.message}`); setIsEditing(true);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
      if (!jobId || !user?.id || !isEditing) return;
       const reportData = {
           job_id: jobId, user_id: user.id,
           report_info: {
               customer: formData.customer, address: formData.address, date: formData.date, technicians: formData.technicians, jobNumber: formData.jobNumber,
               substation: formData.substation, eqptLocation: formData.eqptLocation, identifier: formData.identifier, userName: formData.userName,
               temperature: formData.temperature, nameplateData: formData.nameplateData, status: formData.status, isLargeType: true, isMTS: true,
           },
            visual_inspection: { items: formData.visualInspection },
            insulation_resistance: { tests: formData.insulationResistance },
            turns_ratio: formData.turnsRatio, // Save turns ratio data
            test_equipment: formData.testEquipment, comments: formData.comments,
       };
       console.log(`Saving data to ${LARGE_TRANSFORMER_MTS_TABLE}:`, reportData);
       try {
           setLoading(true); let result; let currentReportId = reportId;
           if (currentReportId) {
               result = await supabase.schema('neta_ops').from(LARGE_TRANSFORMER_MTS_TABLE).update(reportData).eq('id', currentReportId).select().single();
           } else {
               result = await supabase.schema('neta_ops').from(LARGE_TRANSFORMER_MTS_TABLE).insert(reportData).select().single();
               if (result.data?.id) {
                   currentReportId = result.data.id;
                   const assetName = `2-Large Dry Type Xfmr. Insp. & Test MTS 23 - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`;
                   const assetUrl = `report:/jobs/${jobId}/large-dry-type-transformer-mts-report/${currentReportId}`; //Ensure this route is correct
                   const assetData = { name: assetName, file_url: assetUrl, user_id: user.id, template_type: 'MTS' }; // Add template_type
                   const { data: assetResult, error: assetError } = await supabase.schema('neta_ops').from('assets').insert(assetData).select('id').single();
                   if (assetError) throw assetError;
                   await supabase.schema('neta_ops').from('job_assets').insert({ job_id: jobId, asset_id: assetResult.id, user_id: user.id });
               }
           }
           if (result.error) throw result.error;
           setIsEditing(false); alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
           navigateAfterSave(navigate, jobId, location);
       } catch (error: any) { console.error(`Error saving to ${LARGE_TRANSFORMER_MTS_TABLE}:`, error); alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
       } finally { setLoading(false); }
   };

  useEffect(() => { const fetchData = async () => { await loadJobInfo(); await loadReport(); }; fetchData(); }, [jobId, reportId]);

  if (loading) return <div className="p-4">Loading Report Data...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">2-Large Dry Type Xfmr. Inspection and Test MTS 23</h1>
        <div className="flex gap-2">
          <button onClick={() => { if (isEditing) { handleChange(null, 'status', formData.status === 'PASS' ? 'FAIL' : 'PASS'); } }} disabled={!isEditing}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${ formData.status === 'PASS' ? 'bg-green-600 text-white focus:ring-green-500' : 'bg-red-600 text-white focus:ring-red-500' } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}>
            {formData.status}
          </button>
          {!isEditing && reportId ? ( <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"> Edit Report </button>
          ) : ( <button onClick={handleSave} disabled={!isEditing || loading}
              className={`px-4 py-2 text-sm text-white bg-accent-color rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color ${ !isEditing ? 'hidden' : 'hover:bg-accent-color/90' } ${loading ? 'opacity-50 cursor-wait' : ''}`}>
              {loading ? 'Saving...' : (reportId ? 'Update Report' : 'Save New Report')} </button>
          )}
        </div>
      </div>

      {/* Job Information (Copied from LargeDryTypeTransformerReport) */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        {/* ... (Job Info JSX from LargeDryTypeTransformerReport, ensure dark mode classes) ... */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Left Column */}
          <div className="space-y-4">
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label> <input type="text" value={formData.customer} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed" /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label> <textarea value={formData.address} readOnly rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed" /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label> <input type="text" value={formData.userName} onChange={(e) => handleChange(null, 'userName', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder="Enter User Name" /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label> <input type="text" value={formData.identifier} onChange={(e) => handleChange(null, 'identifier', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder="Transformer ID / Name" /> </div>
            <div className="grid grid-cols-3 gap-4">
              <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. °F</label> <input type="number" value={formData.temperature.ambient} onChange={(e) => handleTemperatureChange(Number(e.target.value))} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
              <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">°C</label> <input type="number" value={formData.temperature.celsius} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed" /> </div>
              <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TCF</label> <input type="number" value={formData.temperature.correctionFactor} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed" /> </div>
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-4">
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job #</label> <input type="text" value={formData.jobNumber} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed" /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label> <input type="text" value={formData.technicians} onChange={(e) => handleChange(null, 'technicians', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label> <input type="date" value={formData.date} onChange={(e) => handleChange(null, 'date', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label> <input type="text" value={formData.substation} onChange={(e) => handleChange(null, 'substation', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eqpt. Location</label> <input type="text" value={formData.eqptLocation} onChange={(e) => handleChange(null, 'eqptLocation', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Humidity %</label> <input type="number" value={formData.temperature.humidity || ''} onChange={(e) => handleChange('temperature', 'humidity', Number(e.target.value))} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder="Optional" /> </div>
          </div>
        </div>
      </div>

      {/* Nameplate Data (Copied from LargeDryTypeTransformerReport) */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        {/* ... (Nameplate Data JSX from LargeDryTypeTransformerReport, ensure dark mode classes) ... */}
        {/* Exact same structure as in LargeDryTypeTransformerReport, ensuring classNames for dark mode */}
        <div className="grid grid-cols-3 gap-4">
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label> <input type="text" value={formData.nameplateData.manufacturer} onChange={(e) => handleNestedChange('nameplateData', 'manufacturer', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Number</label> <input type="text" value={formData.nameplateData.catalogNumber} onChange={(e) => handleNestedChange('nameplateData', 'catalogNumber', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label> <input type="text" value={formData.nameplateData.serialNumber} onChange={(e) => handleNestedChange('nameplateData', 'serialNumber', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">KVA</label> <input type="text" value={formData.nameplateData.kva} onChange={(e) => handleNestedChange('nameplateData', 'kva', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. Rise (°C)</label> <input type="text" value={formData.nameplateData.tempRise} onChange={(e) => handleNestedChange('nameplateData', 'tempRise', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
          <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Impedance (%)</label> <input type="text" value={formData.nameplateData.impedance} onChange={(e) => handleNestedChange('nameplateData', 'impedance', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
        </div>
        <div className="mt-6">
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-4 items-center">
            <div></div> <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Volts</div> <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Connections</div> <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Winding Material</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary</div>
            <div className="flex justify-center items-center space-x-2"> <input type="text" value={formData.nameplateData.primary.volts} onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, volts: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> <span className="text-gray-500 dark:text-gray-400">/</span> <input type="text" value={formData.nameplateData.primary.voltsSecondary || ''} onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, voltsSecondary: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div className="flex justify-center space-x-4"> {['Delta', 'Wye', 'Single Phase'].map(conn => ( <label key={`pri-${conn}`} className="inline-flex items-center"> <input type="radio" name="primary-connection" value={conn} checked={formData.nameplateData.primary.connection === conn} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, connection: conn })} disabled={!isEditing} className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color" /> <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{conn}</span> </label> ))} </div>
            <div className="flex justify-center space-x-4"> {['Aluminum', 'Copper'].map(mat => ( <label key={`pri-${mat}`} className="inline-flex items-center"> <input type="radio" name="primary-material" value={mat} checked={formData.nameplateData.primary.material === mat} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, material: mat })} disabled={!isEditing} className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color" /> <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{mat}</span> </label> ))} </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary</div>
            <div className="flex justify-center items-center space-x-2"> <input type="text" value={formData.nameplateData.secondary.volts} onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, volts: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> <span className="text-gray-500 dark:text-gray-400">/</span> <input type="text" value={formData.nameplateData.secondary.voltsSecondary || ''} onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, voltsSecondary: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div>
            <div className="flex justify-center space-x-4"> {['Delta', 'Wye', 'Single Phase'].map(conn => ( <label key={`sec-${conn}`} className="inline-flex items-center"> <input type="radio" name="secondary-connection" value={conn} checked={formData.nameplateData.secondary.connection === conn} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, connection: conn })} disabled={!isEditing} className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color" /> <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{conn}</span> </label> ))} </div>
            <div className="flex justify-center space-x-4"> {['Aluminum', 'Copper'].map(mat => ( <label key={`sec-${mat}`} className="inline-flex items-center"> <input type="radio" name="secondary-material" value={mat} checked={formData.nameplateData.secondary.material === mat} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, material: mat })} disabled={!isEditing} className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color" /> <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{mat}</span> </label> ))} </div>
          </div>
        </div>
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-white">Tap Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center"> <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Voltages</label> <div className="grid grid-cols-7 gap-2 flex-1"> {formData.nameplateData.tapConfiguration.voltages.map((voltage, index) => ( <input key={`tap-volt-${index}`} type="text" value={voltage} onChange={(e) => { const newVoltages = [...formData.nameplateData.tapConfiguration.voltages]; newVoltages[index] = e.target.value; handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, voltages: newVoltages }); }} readOnly={!isEditing} className={`w-full text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder={index === 5 || index === 6 ? '-' : ''} /> ))} </div> </div>
            <div className="flex items-center"> <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Position</label> <div className="grid grid-cols-7 gap-2 flex-1"> {formData.nameplateData.tapConfiguration.positions.map((position) => ( <div key={`tap-pos-${position}`} className="text-center text-sm text-gray-700 dark:text-white font-medium"> {position} </div> ))} </div> </div>
            <div className="flex items-center"> <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Position Left</label> <div className="flex items-center space-x-8"> <div className="flex items-center space-x-2"> <input type="number" value={formData.nameplateData.tapConfiguration.currentPosition} onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, currentPosition: parseInt(e.target.value) || 0 })} readOnly={!isEditing} className={`w-16 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> <span className="text-gray-500 dark:text-gray-400">/</span> <input type="text" value={formData.nameplateData.tapConfiguration.currentPositionSecondary} onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, currentPositionSecondary: e.target.value })} readOnly={!isEditing} className={`w-16 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div> <div className="flex items-center space-x-2"> <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volts</span> <input type="text" value={formData.nameplateData.tapConfiguration.tapVoltsSpecific} onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, tapVoltsSpecific: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div> <div className="flex items-center space-x-2"> <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Percent</span> <input type="text" value={formData.nameplateData.tapConfiguration.tapPercentSpecific} onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, tapPercentSpecific: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /> </div> </div> </div>
          </div>
        </div>
      </div>

      {/* Visual and Mechanical Inspection - Updated for new image */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NETA Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">Results</th>
                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comments</th> */}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.keys(initialVisualInspectionState)
                 .filter(key => !key.endsWith('_comments')) // Only iterate over result keys
                 .sort() // Sort keys for consistent order
                 .map((id) => (
                <tr key={id}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{id.replace('*','')}</td> {/* Remove asterisk for display */}
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{getVisualInspectionDescription(id)}</td>
                  <td className="px-4 py-2">
                    <select
                      value={formData.visualInspection[id] || 'Select One'}
                      onChange={(e) => handleVisualInspectionChange(id, 'result', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {visualInspectionOptions.map(option => (
                        <option key={option} value={option} className="dark:bg-dark-100 dark:text-white">{option}</option>
                      ))}
                    </select>
                  </td>
                  {/* <td className="px-4 py-2">\n                    <input type="text" value={formData.visualInspection[\`\${id}_comments\`] || ''} onChange={(e) => handleVisualInspectionChange(id, 'comment', e.target.value)} readOnly={!isEditing}\n                      className={\`w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}\n                      placeholder="Optional comments" />\n                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Electrical Tests - Insulation Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Electrical Tests - Insulation Resistance
        </h2>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <table className="w-full border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr>
                    <th colSpan={6} className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">
                      Insulation Resistance Values
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Test</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">kV</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">0.5 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">1 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">10 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 w-16">Unit</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                  {[
                    { id: 'primaryToGround', label: 'Primary to Ground' },
                    { id: 'secondaryToGround', label: 'Secondary to Ground' },
                    { id: 'primaryToSecondary', label: 'Primary to Secondary' }
                  ].map((testItem) => (
                    <tr key={testItem.id}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{testItem.label}</td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <select
                          value={formData.insulationResistance[testItem.id]?.testVoltage || ''}
                          onChange={(e) => handleNestedChange('insulationResistance', testItem.id, { ...formData.insulationResistance[testItem.id], testVoltage: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {testVoltageOptions.map(voltage => (
                            <option key={voltage} value={voltage} className="dark:bg-dark-100 dark:text-white">{voltage}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.readings?.halfMinute || ''}
                          onChange={(e) => handleDeepNestedChange('insulationResistance', testItem.id, 'readings', 'halfMinute', e.target.value)}
                          readOnly={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.readings?.oneMinute || ''}
                          onChange={(e) => handleDeepNestedChange('insulationResistance', testItem.id, 'readings', 'oneMinute', e.target.value)}
                          readOnly={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.readings?.tenMinute || ''}
                          onChange={(e) => handleDeepNestedChange('insulationResistance', testItem.id, 'readings', 'tenMinute', e.target.value)}
                          readOnly={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={formData.insulationResistance[testItem.id]?.unit || 'MΩ'}
                          onChange={(e) => handleNestedChange('insulationResistance', testItem.id, { ...formData.insulationResistance[testItem.id], unit: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {insulationResistanceUnits.map(unit => (
                            <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <table className="w-full border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr>
                    <th colSpan={4} className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">
                      Temperature Corrected Values
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">0.5 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">1 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">10 Min.</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">Unit</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                  {[
                    { id: 'primaryToGround' },
                    { id: 'secondaryToGround' },
                    { id: 'primaryToSecondary' }
                  ].map((testItem) => (
                    <tr key={`${testItem.id}-corr`}>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.corrected?.halfMinute || ''}
                          readOnly
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.corrected?.oneMinute || ''}
                          readOnly
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.corrected?.tenMinute || ''}
                          readOnly
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={formData.insulationResistance[testItem.id]?.unit || 'MΩ'}
                          readOnly
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <table className="w-full border border-gray-200 dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700 w-1/3">Calculated Values</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Primary</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Secondary</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Pri-Sec</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">Acceptable</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-2 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                  Dielectric Absorption
                  <div className="text-xs text-gray-500 dark:text-gray-400">(Ratio of 1 Min. to 0.5 Minute Result)</div>
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.primaryToGround?.dielectricAbsorption || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.secondaryToGround?.dielectricAbsorption || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.primaryToSecondary?.dielectricAbsorption || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formData.insulationResistance.dielectricAbsorptionAcceptable}
                    readOnly
                    className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm ${
                      formData.insulationResistance.dielectricAbsorptionAcceptable === 'Yes'
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : formData.insulationResistance.dielectricAbsorptionAcceptable === 'No'
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  />
                </td>
              </tr>
              <tr>
                <td className="px-2 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                  Polarization Index
                  <div className="text-xs text-gray-500 dark:text-gray-400">(Ratio of 10 Min. to 1 Min. Result)</div>
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.primaryToGround?.polarizationIndex || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.secondaryToGround?.polarizationIndex || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1 border-r dark:border-gray-700">
                  <input
                    type="text"
                    value={formData.insulationResistance.primaryToSecondary?.polarizationIndex || ''}
                    readOnly
                    className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formData.insulationResistance.polarizationIndexAcceptable}
                    readOnly
                    className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm ${
                      formData.insulationResistance.polarizationIndexAcceptable === 'Yes'
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : formData.insulationResistance.polarizationIndexAcceptable === 'No'
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Equipment Used */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Test Equipment Used
        </h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-3 gap-4 border-b dark:border-gray-700 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Megohmmeter</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.name}
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', { ...formData.testEquipment.megohmmeter, name: e.target.value })}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.serialNumber}
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', { ...formData.testEquipment.megohmmeter, serialNumber: e.target.value })}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.ampId}
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', { ...formData.testEquipment.megohmmeter, ampId: e.target.value })}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
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

      {/* Electrical Tests - Turns Ratio */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Electrical Tests - Turns Ratio
        </h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Secondary Winding Voltage:
              </label>
              <input
                type="text"
                value={formData.turnsRatio.secondaryWindingVoltage}
                onChange={(e) => handleNestedChange('turnsRatio', 'secondaryWindingVoltage', e.target.value)}
                readOnly={!isEditing}
                className={`w-20 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">V</span>
            </div>
          </div>
          <table className="w-full border border-gray-200 dark:border-gray-700">
            <thead>
              <tr>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Tap</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Nameplate Voltage</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Calculated Ratio</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase A TTR</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase A Dev %</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase B TTR</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase B Dev %</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase C TTR</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase C Dev %</th>
                <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">Assessment</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.turnsRatio.taps.map((tapData, index) => {
                // Calculate deviations for each phase
                const calculatedRatio = calculateTurnsRatio(formData.nameplateData.tapConfiguration.voltages[index] || '', formData.turnsRatio.secondaryWindingVoltage);
                const phaseA_Dev = calculateDeviation(calculatedRatio, tapData.phaseA_TTR);
                const phaseB_Dev = calculateDeviation(calculatedRatio, tapData.phaseB_TTR);
                const phaseC_Dev = calculateDeviation(calculatedRatio, tapData.phaseC_TTR);
                
                // Update the assessment based on calculated deviations
                const assessment = calculateAssessment(phaseA_Dev, phaseB_Dev, phaseC_Dev);

                return (
                  <tr key={index}>
                    <td className="px-2 py-2 text-center text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{tapData.tap}</td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={formData.nameplateData.tapConfiguration.voltages[index] || ''} 
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white`} 
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={calculatedRatio}
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white`}
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={tapData.phaseA_TTR} 
                        onChange={(e) => handleTurnsRatioChange(index, 'phaseA_TTR', e.target.value)} 
                        readOnly={!isEditing} 
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={phaseA_Dev}
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white`}
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={tapData.phaseB_TTR} 
                        onChange={(e) => handleTurnsRatioChange(index, 'phaseB_TTR', e.target.value)} 
                        readOnly={!isEditing} 
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={phaseB_Dev}
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white`}
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={tapData.phaseC_TTR} 
                        onChange={(e) => handleTurnsRatioChange(index, 'phaseC_TTR', e.target.value)} 
                        readOnly={!isEditing} 
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                      />
                    </td>
                    <td className="px-2 py-2 border-r dark:border-gray-700">
                      <input 
                        type="text" 
                        value={phaseC_Dev}
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text"
                        value={assessment}
                        readOnly
                        className={`w-full text-center text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white ${
                          assessment === 'Pass'
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : assessment === 'Fail'
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : ''
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
         .th-cell { @apply px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider; }
         .td-cell { @apply px-6 py-4 text-sm text-gray-900 dark:text-white; }
       `}</style>
    </div>
  );
};

export default LargeDryTypeTransformerMTSReport; 