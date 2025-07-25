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
const LIQUID_TRANSFORMER_TABLE = 'liquid_filled_transformer_reports' as const;

// Temperature conversion and TCF tables (same as DryTypeTransformer)
const tempConvTable = [
  [-11.2, -24], [-9.4, -23], [-7.6, -22], [-5.8, -21], [-4, -20], [-2.2, -19], [1.4, -17], [3.2, -16], [5, -15], [6.8, -14], [8.6, -13], [10.4, -12], [12.2, -11], [14, -10], [15.8, -9], [17.6, -8], [19.4, -7], [21.2, -6], [23, -5], [24.8, -4], [26.6, -3], [28.4, -2], [30.2, -1], [32, 0], [33.8, 1], [35.6, 2], [37.4, 3], [39.2, 4], [41, 5], [42.8, 6], [44.6, 7], [46.4, 8], [48.2, 9], [50, 10], [51.8, 11], [53.6, 12], [55.4, 13], [57.2, 14], [59, 15], [60.8, 16], [62.6, 17], [64.4, 18], [66.2, 19], [68, 20], [70, 21], [72, 22], [73.4, 23], [75.2, 24], [77, 25], [78.8, 26], [80.6, 27], [82.4, 28], [84.2, 29], [86, 30], [87.8, 31], [89.6, 32], [91.4, 33], [93.2, 34], [95, 35], [96.8, 36], [98.6, 37], [100.4, 38], [102.2, 39], [104, 40], [105.8, 41], [107.6, 42], [109.4, 43], [111.2, 44], [113, 45], [114.8, 46], [116.6, 47], [118.4, 48], [120.2, 49], [122, 50], [123.8, 51], [125.6, 52], [127.4, 53], [129.2, 54], [131, 55], [132.8, 56], [134.6, 57], [136.4, 58], [138.2, 59], [140, 60], [141.8, 61], [143.6, 62], [145.4, 63], [147.2, 64], [149, 65]
];

const tcfTable = [
  [-24, 0.048], [-23, 0.051], [-22, 0.055], [-21, 0.059], [-20, 0.063],
  [-19, 0.068], [-18, 0.073], [-17, 0.078], [-16, 0.083], [-15, 0.089],
  [-14, 0.096], [-13, 0.103], [-12, 0.110], [-11, 0.118], [-10, 0.125],
  [-9, 0.135], [-8, 0.145], [-7, 0.155], [-6, 0.166], [-5, 0.180],
  [-4, 0.191], [-3, 0.205], [-2, 0.219], [-1, 0.235], [0, 0.250],
  [1, 0.270], [2, 0.289], [3, 0.310], [4, 0.332], [5, 0.360],
  [6, 0.381], [7, 0.409], [8, 0.438], [9, 0.469], [10, 0.500],
  [11, 0.539], [12, 0.577], [13, 0.619], [14, 0.663], [15, 0.750],
  [16, 0.761], [17, 0.816], [18, 0.874], [19, 0.937], [20, 1.000],
  [21, 1.075], [22, 1.152], [23, 1.235], [24, 1.323], [25, 1.400],
  [26, 1.519], [27, 1.628], [28, 1.745], [29, 1.869], [30, 1.980],
  [31, 2.146], [32, 2.300], [33, 2.464], [34, 2.641], [35, 2.800],
  [36, 3.032], [37, 3.249], [38, 3.482], [39, 3.731], [40, 3.950],
  [41, 4.284], [42, 4.590], [43, 4.918], [44, 5.270], [45, 5.600],
  [46, 6.051], [47, 6.484], [48, 6.948], [49, 7.445], [50, 7.850],
  [51, 8.549], [52, 9.160], [53, 9.816], [54, 10.518], [55, 11.200],
  [56, 12.077], [57, 12.941], [58, 13.866], [59, 14.859], [60, 15.850],
  [61, 17.061], [62, 18.281], [63, 19.589], [64, 20.991], [65, 22.400],
  [66, 24.101], [67, 25.826], [68, 27.673], [69, 29.653], [70, 31.750],
  [71, 34.048], [72, 36.484], [73, 39.094], [74, 41.891], [75, 44.700],
  [76, 48.100], [77, 51.541], [78, 55.228], [79, 59.179], [80, 63.500],
  [81, 67.950], [82, 72.811], [83, 78.021], [84, 83.603], [85, 89.789],
  [86, 95.993], [87, 102.861], [88, 110.219], [89, 118.105], [90, 127.000],
  [91, 135.609], [92, 145.311], [93, 155.707], [94, 166.846], [95, 180.000],
  [96, 191.574], [97, 205.280], [98, 219.966], [99, 235.703], [100, 245.000],
  [101, 270.636], [102, 289.998], [103, 310.745], [104, 332.977], [105, 359.150],
  [106, 382.326], [107, 409.679], [108, 438.989], [109, 470.395], [110, 509.000]
];

// Dropdown options
const visualInspectionOptions = [
  "Select One",
  "Satisfactory",
  "Unsatisfactory",
  "Cleaned",
  "See Comments",
  "Not Applicable"
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

// Interface for form data structure
interface FormData {
  // Job Information (matches DryTypeTransformer)
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
    ambient: number; // User inputs Fahrenheit
    celsius: number; // Calculated
    fahrenheit: number; // Same as ambient, kept for consistency/display
    correctionFactor: number; // Looked up from tcfTable based on celsius
  };

  // Nameplate Data (matches screenshot)
  nameplateData: {
    manufacturer: string;
    catalogNumber: string;
    serialNumber: string; // Added based on common practice
    kva: string;
    tempRise: string;
    impedance: string; // Added based on common practice
    primary: {
      volts: string; // Line-to-line
      voltsSecondary: string; // Added second voltage field
      connection: string; // 'Delta', 'Wye', 'Single Phase'
      material: string; // 'Aluminum', 'Copper'
    };
    secondary: {
      volts: string; // Line-to-line
      voltsSecondary: string; // Added second voltage field
      connection: string; // 'Delta', 'Wye', 'Single Phase'
      material: string; // 'Aluminum', 'Copper'
    };
    tapConfiguration: { // Based on screenshot
      positions: number[];
      voltages: string[]; // Array for 7 tap voltages
      currentPosition: number; // Tap Position Left (first part)
      currentPositionSecondary: string; // Tap Position Left (second part, often '/')
      tapVoltsSpecific: string; // Volts box next to Tap Position Left
      tapPercentSpecific: string; // Percent box next to Tap Position Left
    };
    
    // Add indicator gauge values
    indicatorGauges: {
      oilLevel: string;
      tankPressure: string;
      oilTemperature: string;
      windingTemperature: string;
      oilTempRange: string;
      windingTempRange: string;
    };
  };

  // Visual Inspection (Updated with new NETA sections)
  visualInspection: {
    "7.2.2.A.1": string; // Dropdown result
    "7.2.2.A.1_comments"?: string; // Optional comments field
    "7.2.2.A.2": string;
    "7.2.2.A.2_comments"?: string;
    "7.2.2.A.3": string;
    "7.2.2.A.3_comments"?: string;
    "7.2.2.A.4*": string;
    "7.2.2.A.4*_comments"?: string;
    "7.2.2.A.5": string;
    "7.2.2.A.5_comments"?: string;
    "7.2.2.A.6": string;
    "7.2.2.A.6_comments"?: string;
    "7.2.2.A.7": string;
    "7.2.2.A.7_comments"?: string;
    "7.2.2.A.8": string;
    "7.2.2.A.8_comments"?: string;
    "7.2.2.A.9": string;
    "7.2.2.A.9_comments"?: string;
    "7.2.2.A.10": string;
    "7.2.2.A.10_comments"?: string;
    "7.2.2.A.11": string;
    "7.2.2.A.11_comments"?: string;
    "7.2.2.A.12": string;
    "7.2.2.A.12_comments"?: string;
    "7.2.2.A.13": string;
    "7.2.2.A.13_comments"?: string;
    "7.2.2.A.14": string;
    "7.2.2.A.14_comments"?: string;
    "7.2.2.A.15": string;
    "7.2.2.A.15_comments"?: string;
    "7.2.2.A.16": string;
    "7.2.2.A.16_comments"?: string;
    "7.2.2.A.17": string;
    "7.2.2.A.17_comments"?: string;
    "7.2.2.A.18": string;
    "7.2.2.A.18_comments"?: string;
    "7.2.2.A.19": string;
    "7.2.2.A.19_comments"?: string;
  };

  // Insulation Resistance (Matches structure of DryTypeTransformer)
  insulationResistance: {
    temperature: string;
    primaryToGround: {
      testVoltage: string;
      unit: string;
      readings: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      corrected: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      dielectricAbsorption: string;
      polarizationIndex: string;
    };
    secondaryToGround: {
      testVoltage: string;
      unit: string;
      readings: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      corrected: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      dielectricAbsorption: string;
      polarizationIndex: string;
    };
    primaryToSecondary: {
      testVoltage: string;
      unit: string;
      readings: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      corrected: {
        halfMinute: string;
        oneMinute: string;
        tenMinute: string;
      };
      dielectricAbsorption: string;
      polarizationIndex: string;
    };
    dielectricAbsorptionAcceptable: string;
    polarizationIndexAcceptable: string;
  };

  // Test Equipment (Matches structure of DryTypeTransformer)
  testEquipment: {
    megohmmeter: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    // Add other equipment if needed (e.g., Hipot Tester, Ohmmeter)
  };

  // Comments (Matches structure of DryTypeTransformer)
  comments: string;
  status: string; // 'PASS' or 'FAIL'
}

// Helper function to calculate corrected value (same as DryType)
const calculateCorrectedValue = (readingStr: string, tcf: number): string => {
  // Handle special cases like "> 2000" or "< 1" if necessary
   if (typeof readingStr === 'string' && (readingStr.includes('>') || readingStr.includes('<'))) {
      return readingStr; // Return non-numeric strings as is
   }
  const readingNum = parseFloat(readingStr);
  if (isNaN(readingNum) || !isFinite(readingNum)) {
    return ''; // Return empty if reading is not a valid number
  }
  const corrected = readingNum * tcf;
  // Adjust precision based on magnitude or keep fixed? Using 2 for now.
  return corrected.toFixed(2);
};

// Helper function to calculate DA/PI ratio (same as DryType)
const calculateRatio = (numeratorStr: string, denominatorStr: string): string => {
  // Handle non-numeric inputs if corrected values can be non-numeric
   if (typeof numeratorStr === 'string' && (numeratorStr.includes('>') || numeratorStr.includes('<'))) return '';
   if (typeof denominatorStr === 'string' && (denominatorStr.includes('>') || denominatorStr.includes('<'))) return '';

  const numerator = parseFloat(numeratorStr);
  const denominator = parseFloat(denominatorStr);

  if (isNaN(numerator) || isNaN(denominator) || !isFinite(numerator) || !isFinite(denominator) || denominator === 0) {
    return ''; // Return empty if inputs are invalid or denominator is zero
  }

  const ratio = numerator / denominator;
  return ratio.toFixed(2); // Format to 2 decimal places
};

// Helper function to calculate TCF (same as DryTypeTransformer)
const calculateTCF = (celsius: number): number => {
  const match = tcfTable.find(item => item[0] === celsius);
  return match ? match[1] : 1;
};

// Helper function to calculate DA (same as DryTypeTransformer)
const calculateDA = (readings: { halfMinute: string, oneMinute: string, tenMinute: string }): string => {
  const halfMinute = parseFloat(readings.halfMinute);
  const oneMinute = parseFloat(readings.oneMinute);
  const tenMinute = parseFloat(readings.tenMinute);
  const ratio = oneMinute / halfMinute;
  return ratio.toFixed(2);
};

// Helper function to calculate PI (same as DryTypeTransformer)
const calculatePI = (readings: { halfMinute: string, oneMinute: string, tenMinute: string }): string => {
  const oneMinute = parseFloat(readings.oneMinute);
  const tenMinute = parseFloat(readings.tenMinute);
  const ratio = tenMinute / oneMinute;
  return ratio.toFixed(2);
};

const LiquidFilledTransformerReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  // Initialize form data with default values
  const [formData, setFormData] = useState<FormData>({
    customer: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    technicians: '',
    jobNumber: '',
    substation: '',
    eqptLocation: '',
    identifier: '',
    userName: '', // Consider pre-filling with logged-in user?
    temperature: {
      ambient: 72, // Default ambient temp in F
      celsius: 22, // Calculated from 72F
      fahrenheit: 72, // Display F
      correctionFactor: 1.152 // Looked up for 22C
    },
    nameplateData: {
      manufacturer: '',
      catalogNumber: '',
      serialNumber: '',
      kva: '',
      tempRise: '',
      impedance: '',
      primary: {
        volts: '', // Default Primary Volts? e.g., '4160'
        voltsSecondary: '', // Default Secondary Volts? e.g., '480'
        connection: 'Delta', // Default connection?
        material: 'Aluminum' // Default material?
      },
      secondary: {
        volts: '', // Default Secondary Volts? e.g., '480'
        voltsSecondary: '', // Default Secondary Volts? e.g., '480'
        connection: 'Wye', // Default connection?
        material: 'Aluminum' // Default material?
      },
      tapConfiguration: {
        positions: [1, 2, 3, 4, 5, 6, 7], // Standard 7 positions
        voltages: ['', '', '', '', '', '', ''], // Empty strings initially
        currentPosition: 3, // Default tap position?
        currentPositionSecondary: '', // Usually blank or '/'
        tapVoltsSpecific: '',
        tapPercentSpecific: ''
      },
      
      // Initialize indicator gauge values
      indicatorGauges: {
        oilLevel: '',
        tankPressure: '',
        oilTemperature: '',
        windingTemperature: '',
        oilTempRange: '',
        windingTempRange: ''
      }
    },
    visualInspection: { // Initialize all keys from the interface
      "7.2.2.A.1": "Select One",
      "7.2.2.A.2": "Select One",
      "7.2.2.A.3": "Select One",
      "7.2.2.A.4*": "Select One",
      "7.2.2.A.5": "Select One",
      "7.2.2.A.6": "Select One",
      "7.2.2.A.7": "Select One",
      "7.2.2.A.8": "Select One",
      "7.2.2.A.9": "Select One",
      "7.2.2.A.10": "Select One",
      "7.2.2.A.11": "Select One",
      "7.2.2.A.12": "Select One",
      "7.2.2.A.13": "Select One",
      "7.2.2.A.14": "Select One",
      "7.2.2.A.15": "Select One",
      "7.2.2.A.16": "Select One",
      "7.2.2.A.17": "Select One",
      "7.2.2.A.18": "Select One",
      "7.2.2.A.19": "Select One"
    },
    insulationResistance: { // Default voltages match screenshot
      temperature: '',
      primaryToGround: {
        testVoltage: "5000V",
        unit: "MΩ",
        readings: { halfMinute: "", oneMinute: "", tenMinute: "" },
        corrected: { halfMinute: "", oneMinute: "", tenMinute: "" },
        dielectricAbsorption: '', polarizationIndex: ''
      },
      secondaryToGround: {
        testVoltage: "1000V",
        unit: "MΩ",
        readings: { halfMinute: "", oneMinute: "", tenMinute: "" },
        corrected: { halfMinute: "", oneMinute: "", tenMinute: "" },
        dielectricAbsorption: '', polarizationIndex: ''
      },
      primaryToSecondary: {
        testVoltage: "5000V",
        unit: "MΩ",
        readings: { halfMinute: "", oneMinute: "", tenMinute: "" },
        corrected: { halfMinute: "", oneMinute: "", tenMinute: "" },
        dielectricAbsorption: '', polarizationIndex: ''
      },
      dielectricAbsorptionAcceptable: '',
      polarizationIndexAcceptable: ''
    },
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' }
    },
    comments: '',
    status: 'PASS' // Default status
  });

  // Helper function to get visual inspection description based on screenshot
  const getVisualInspectionDescription = (id: string): string => {
    // Use NETA section numbers from the screenshot (7.2.2.A.x)
    const descriptions: { [key: string]: string } = {
      "7.2.2.A.1": "Compare equipment nameplate data with drawings and specifications.",
      "7.2.2.A.2": "Inspect physical and mechanical condition.",
      "7.2.2.A.3": "Inspect impact recorder prior to unloading.",
      "7.2.2.A.4*": "Test dew point of tank gases. *Optional",
      "7.2.2.A.5": "Inspect anchorage, alignment, and grounding.",
      "7.2.2.A.6": "Verify the presence of PCB content labeling.",
      "7.2.2.A.7": "Verify removal of any shipping bracing after placement.",
      "7.2.2.A.8": "Verify the bushings are clean.",
      "7.2.2.A.9": "Verify that alarm, control, and trip settings on temperature and level indicators are as specified.",
      "7.2.2.A.10": "Verify operation of alarm, control, and trip circuits from temperature and level indicators, pressure relief device, gas accumulator, and fault pressure relay.",
      "7.2.2.A.11": "Verify that cooling fans and pumps operate correctly and have appropriate overcurrent protection.",
      "7.2.2.A.12": "Inspect bolted electrical connections for high resistance using low-resistance ohmmeter, calibrated torquewrench, or thermographic survey.",
      "7.2.2.A.13": "Verify correct liquid level in tanks and bushings.",
      "7.2.2.A.14": "Verify valves are in the correct operating position.",
      "7.2.2.A.15": "Verify that positive pressure is maintained on gas-blanketed transformers.",
      "7.2.2.A.16": "Perform inspections and mechanical tests as recommended by the manufacturer.",
      "7.2.2.A.17": "Test load tap-changer in accordance with Section 7.12.3.",
      "7.2.2.A.18": "Verify presence of transformer surge arresters.",
      "7.2.2.A.19": "Verify de-energized tap-changer position is left as specified."
    };
    return descriptions[id] || `Unknown Section: ${id}`; // Fallback for missing keys
  };

  // Handle temperature changes (same logic as DryTypeTransformer)
  const handleTemperatureChange = (fahrenheit: number) => {
      // Find the closest match in the temperature conversion table
      const closestMatch = tempConvTable.reduce((prev, curr) => {
        return Math.abs(curr[0] - fahrenheit) < Math.abs(prev[0] - fahrenheit) ? curr : prev;
      });

      const celsius = closestMatch[1];

      // Find the correction factor from the TCF table
      const tcfMatch = tcfTable.find(item => item[0] === celsius) || [0, 1]; // Default TCF to 1 if not found
      const correctionFactor = tcfMatch[1];

      setFormData(prev => ({
        ...prev,
        temperature: {
          ambient: fahrenheit, // Keep the user input F value
          celsius,             // Store calculated C value
          fahrenheit: fahrenheit, // Store F value for display consistency
          correctionFactor      // Store looked-up TCF
        }
      }));
    };


  // Handle form field changes (generic handlers, same as DryTypeTransformer)
   const handleChange = (section: keyof FormData | null, field: string, value: any) => {
       setFormData(prev => {
           if (section) {
               // Check if the section exists before trying to spread it
               const currentSection = prev[section];
               if (typeof currentSection !== 'object' || currentSection === null) {
                   console.error(`Section "${section}" does not exist or is not an object in formData.`);
                   return prev; // Return previous state if section is invalid
               }
               return {
                   ...prev,
                   [section]: {
                       ...(currentSection as object), // Type assertion
                       [field]: value
                   }
               };
           } else {
               // Ensure the top-level field exists
               if (!(field in prev)) {
                   console.error(`Field "${field}" does not exist at the top level of formData.`);
                   return prev;
               }
               return {
                   ...prev,
                   [field]: value
               };
           }
       });
   };

   const handleNestedChange = (section: keyof FormData, subsection: string, value: any) => {
       setFormData(prev => {
           const currentSection = prev[section];
           if (typeof currentSection !== 'object' || currentSection === null) {
               console.error(`Section "${section}" does not exist or is not an object.`);
               return prev;
           }
           // Check if the subsection exists before trying to spread it
           const currentSubsection = currentSection[subsection];
            // Allow updating the entire subsection object directly
           return {
               ...prev,
               [section]: {
                   ...(currentSection as object),
                   [subsection]: value // Update the subsection directly
               }
           };
       });
   };


   const handleDeepNestedChange = (section: keyof FormData, subsection: string, nestedSection: string, field: string, value: any) => {
       setFormData(prev => {
            const currentSection = prev[section];
             if (typeof currentSection !== 'object' || currentSection === null) {
                console.error(`Section "${section}" is invalid.`); return prev;
            }
            const currentSubsection = currentSection[subsection];
            if (typeof currentSubsection !== 'object' || currentSubsection === null) {
                 console.error(`Subsection "${subsection}" in "${section}" is invalid.`); return prev;
            }
            const currentNestedSection = currentSubsection[nestedSection];
            if (typeof currentNestedSection !== 'object' || currentNestedSection === null) {
                console.error(`Nested section "${nestedSection}" in "${section}.${subsection}" is invalid.`); return prev;
            }

           return {
               ...prev,
               [section]: {
                   ...(currentSection as object),
                   [subsection]: {
                       ...(currentSubsection as object),
                       [nestedSection]: {
                           ...(currentNestedSection as object),
                           [field]: value
                       }
                   }
               }
           };
       });
   };

   // Handle specific changes for Visual Inspection comments
    const handleVisualInspectionChange = (id: string, type: 'result' | 'comment', value: string) => {
        const field = type === 'result' ? id : `${id}_comments`;
        handleNestedChange('visualInspection', field, value);
    };


  // useEffect to calculate corrected values, DA, and PI (same logic as DryTypeTransformer)
  useEffect(() => {
      const tcf = formData.temperature.correctionFactor;

      const updateCalculatedValues = (testId: keyof FormData['insulationResistance']) => {
          // Ensure testId refers to a structure with readings before accessing
          if (testId !== 'primaryToGround' && testId !== 'secondaryToGround' && testId !== 'primaryToSecondary') {
              return {
                  corrected: { halfMinute: '', oneMinute: '', tenMinute: '' },
                  dielectricAbsorption: '',
                  polarizationIndex: ''
              };
          }

          const testRecord = formData.insulationResistance[testId];
          // Check if testRecord and readings exist
           if (!testRecord || !testRecord.readings) {
               console.warn(`Insulation resistance data for ${testId} is missing or incomplete.`);
               return {
                  corrected: { halfMinute: '', oneMinute: '', tenMinute: '' },
                  dielectricAbsorption: '',
                  polarizationIndex: ''
               };
           }
           const readings = testRecord.readings;


          const corrected = {
              halfMinute: calculateCorrectedValue(readings.halfMinute, tcf),
              oneMinute: calculateCorrectedValue(readings.oneMinute, tcf),
              tenMinute: calculateCorrectedValue(readings.tenMinute, tcf),
          };
           // Use CORRECTED values for DA/PI calculations as per NETA/industry standard
          const dielectricAbsorption = calculateRatio(corrected.oneMinute, corrected.halfMinute);
          const polarizationIndex = calculateRatio(corrected.tenMinute, corrected.oneMinute);

          return { corrected, dielectricAbsorption, polarizationIndex };
      };

      // Check if insulationResistance exists before trying to update
      if (formData.insulationResistance) {
          setFormData(prev => {
              if (!prev.insulationResistance) return prev;

              const primaryCalcs = updateCalculatedValues('primaryToGround');
              const secondaryCalcs = updateCalculatedValues('secondaryToGround');
              const primarySecondaryCalcs = updateCalculatedValues('primaryToSecondary');

              const prevPrimary = prev.insulationResistance.primaryToGround;
              const prevSecondary = prev.insulationResistance.secondaryToGround;
              const prevPrimarySecondary = prev.insulationResistance.primaryToSecondary;

              const daValues = [
                  primaryCalcs.dielectricAbsorption,
                  secondaryCalcs.dielectricAbsorption,
                  primarySecondaryCalcs.dielectricAbsorption
              ].map(v => parseFloat(v));
              const daAcceptable = daValues.some(v => !isNaN(v)) && daValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';

              const piValues = [
                  primaryCalcs.polarizationIndex,
                  secondaryCalcs.polarizationIndex,
                  primarySecondaryCalcs.polarizationIndex
              ].map(v => parseFloat(v));
              const piAcceptable = piValues.some(v => !isNaN(v)) && piValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';

              if (
                  !_.isEqual(prevPrimary.corrected, primaryCalcs.corrected) ||
                  !_.isEqual(prevSecondary.corrected, secondaryCalcs.corrected) ||
                  !_.isEqual(prevPrimarySecondary.corrected, primarySecondaryCalcs.corrected) ||
                  prevPrimary.dielectricAbsorption !== primaryCalcs.dielectricAbsorption ||
                  prevSecondary.dielectricAbsorption !== secondaryCalcs.dielectricAbsorption ||
                  prevPrimarySecondary.dielectricAbsorption !== primarySecondaryCalcs.dielectricAbsorption ||
                  prevPrimary.polarizationIndex !== primaryCalcs.polarizationIndex ||
                  prevSecondary.polarizationIndex !== secondaryCalcs.polarizationIndex ||
                  prevPrimarySecondary.polarizationIndex !== primarySecondaryCalcs.polarizationIndex ||
                  prev.insulationResistance.dielectricAbsorptionAcceptable !== daAcceptable ||
                  prev.insulationResistance.polarizationIndexAcceptable !== piAcceptable
              ) {
                  return {
                      ...prev,
                      insulationResistance: {
                          ...prev.insulationResistance,  // This preserves all existing fields including temperature
                          primaryToGround: {
                              ...prev.insulationResistance.primaryToGround,
                              corrected: primaryCalcs.corrected,
                              dielectricAbsorption: primaryCalcs.dielectricAbsorption,
                              polarizationIndex: primaryCalcs.polarizationIndex,
                          },
                          secondaryToGround: {
                              ...prev.insulationResistance.secondaryToGround,
                              corrected: secondaryCalcs.corrected,
                              dielectricAbsorption: secondaryCalcs.dielectricAbsorption,
                              polarizationIndex: secondaryCalcs.polarizationIndex,
                          },
                          primaryToSecondary: {
                              ...prev.insulationResistance.primaryToSecondary,
                              corrected: primarySecondaryCalcs.corrected,
                              dielectricAbsorption: primarySecondaryCalcs.dielectricAbsorption,
                              polarizationIndex: primarySecondaryCalcs.polarizationIndex,
                          },
                          dielectricAbsorptionAcceptable: daAcceptable,
                          polarizationIndexAcceptable: piAcceptable,
                      },
                  };
              }
              return prev;
          });
      }

  }, [ // Dependencies: trigger recalculation when readings or TCF change
      formData.insulationResistance?.primaryToGround?.readings,
      formData.insulationResistance?.secondaryToGround?.readings,
      formData.insulationResistance?.primaryToSecondary?.readings,
      formData.temperature.correctionFactor,
      // Add formData.insulationResistance itself to handle potential unit changes etc.
      // Be cautious if this causes infinite loops, might need more specific dependencies.
      // formData.insulationResistance
  ]);


  // Load job information (same logic as DryTypeTransformer)
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
      const err = error as SupabaseError;
      console.error('Error loading job info:', err);
      alert(`Failed to load job info: ${err.message}`);
    } finally {
      // setLoading(false); // Loading finishes in loadReport or useEffect
    }
  };

  // Load existing report
  const loadReport = async () => {
      if (!reportId) {
          setLoading(false);
          setIsEditing(true);
          return;
      }

      setLoading(true);
      try {
          console.log(`Loading report from ${LIQUID_TRANSFORMER_TABLE} with ID: ${reportId}`);
          const { data, error } = await supabase
              .schema('neta_ops')
              .from(LIQUID_TRANSFORMER_TABLE)
              .select('*')
              .eq('id', reportId)
              .single();

          if (error) {
              if (error.code === 'PGRST116') {
                  console.warn(`Report with ID ${reportId} not found in ${LIQUID_TRANSFORMER_TABLE}. Starting new report.`);
                  setIsEditing(true);
              } else {
                  throw error;
              }
          }

          if (data) {
              console.log("Loaded report data:", data);
              setFormData(prev => ({
                  ...prev,
                  customer: data.report_info?.customer ?? prev.customer,
                  address: data.report_info?.address ?? prev.address,
                  date: data.report_info?.date ?? prev.date,
                  technicians: data.report_info?.technicians ?? '',
                  jobNumber: data.report_info?.jobNumber ?? prev.jobNumber,
                  substation: data.report_info?.substation ?? '',
                  eqptLocation: data.report_info?.eqptLocation ?? '',
                  identifier: data.report_info?.identifier ?? '',
                  userName: data.report_info?.userName ?? '',
                  temperature: data.report_info?.temperature ?? prev.temperature,
                  status: data.report_info?.status ?? 'PASS',
                  comments: data.comments ?? data.report_info?.comments ?? '',
                  nameplateData: data.report_info?.nameplateData ?? prev.nameplateData,
                  visualInspection: {
                      ...prev.visualInspection,
                      ...(data.visual_inspection?.items ?? {})
                  },
                  insulationResistance: {
                      ...prev.insulationResistance,
                      ...(data.insulation_resistance?.tests ?? {})
                  },
                  testEquipment: data.test_equipment ?? prev.testEquipment,
              }));
              setIsEditing(false);
          }
      } catch (error) {
          const err = error as SupabaseError;
          console.error(`Error loading report from ${LIQUID_TRANSFORMER_TABLE}:`, err);
          alert(`Failed to load report: ${err.message}`);
          setIsEditing(true);
      } finally {
          setLoading(false);
      }
  };


  // Save report
  const handleSave = async () => {
      if (!jobId || !user?.id || !isEditing) {
          console.warn("Save condition not met:", { jobId, userId: user?.id, isEditing });
          return;
      }

       // --- IMPORTANT: Structure the data for the Supabase table ---
       // --- This needs to match the schema of 'large_transformer_reports' ---
       const tableName = 'liquid_filled_transformer_reports'; // <<< CHANGE AS NEEDED
       const reportData = {
           job_id: jobId,
           user_id: user.id,
           // --- Option 1: Using a 'report_info' JSONB column (like DryType) ---
           report_info: {
               customer: formData.customer,
               address: formData.address,
               date: formData.date,
               technicians: formData.technicians,
               jobNumber: formData.jobNumber,
               substation: formData.substation,
               eqptLocation: formData.eqptLocation,
               identifier: formData.identifier,
               userName: formData.userName,
               temperature: formData.temperature,
               nameplateData: formData.nameplateData,
               status: formData.status,
               // comments: formData.comments // Include comments here if in report_info
           },
            // Separate JSONB columns for complex sections (recommended)
            visual_inspection: { items: formData.visualInspection },
            insulation_resistance: { tests: formData.insulationResistance },
            test_equipment: formData.testEquipment, // Assuming this is simple enough for one JSONB
            comments: formData.comments, // Or have comments as a top-level text column

            // --- Option 2: Using individual columns (if preferred) ---
            // customer: formData.customer,
            // address: formData.address,
            // date: formData.date,
            // ... etc ...
            // nameplate_manufacturer: formData.nameplateData.manufacturer,
            // ... etc ...
            // visual_inspection_data: formData.visualInspection, // JSONB column
            // insulation_resistance_data: formData.insulationResistance, // JSONB column
            // test_equipment_data: formData.testEquipment, // JSONB column
            // comments: formData.comments,
            // status: formData.status,
       };

       console.log(`Saving data to ${tableName}:`, reportData);

       try {
           setLoading(true); // Indicate saving process
           let result;
           let currentReportId = reportId; // Use ID from URL for updates

           if (currentReportId) {
               // Update existing report
               console.log(`Updating ${tableName} with ID: ${currentReportId}`);
               result = await supabase
                   .schema('neta_ops') // Use schema
                   .from(tableName)
                   .update(reportData)
                   .eq('id', currentReportId)
                   .select()
                   .single();
           } else {
               // Create new report
               console.log(`Inserting into ${tableName} for job ID: ${jobId}`);
               result = await supabase
                   .schema('neta_ops') // Use schema
                   .from(tableName) 
                   .insert(reportData)
                   .select()
                   .single();

               if (result.data?.id) {
                   currentReportId = result.data.id; // Get the new report ID
                   console.log(`New report created with ID: ${currentReportId}`);

                   // --- Create corresponding asset entry (like DryType) ---
                   const assetName = `Liquid Filled Transformer - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`;
                   // Update the URL path to match the new route
                   const assetUrl = `report:/jobs/${jobId}/liquid-filled-transformer/${currentReportId}`;

                   const assetData = {
                       name: assetName,
                       file_url: assetUrl,
                       user_id: user.id
                   };
                   console.log("Creating asset:", assetData);

                   const { data: assetResult, error: assetError } = await supabase
                       .schema('neta_ops') // Use schema
                       .from('assets')
                       .insert(assetData)
                       .select('id') // Only select the ID
                       .single();

                   if (assetError) throw assetError;
                   console.log("Asset created:", assetResult);

                   // Link asset to job
                   console.log(`Linking asset ${assetResult.id} to job ${jobId}`);
                   const { error: linkError } = await supabase
                       .schema('neta_ops') // Use schema
                       .from('job_assets')
                       .insert({
                           job_id: jobId,
                           asset_id: assetResult.id,
                           user_id: user.id
                       });
                   if (linkError) throw linkError;
                   console.log("Asset linked.");

                   // Optionally navigate to the new report URL after creation
                   // navigate(`/jobs/${jobId}/liquid-filled-transformer/${currentReportId}`, { replace: true }); // <<< ADJUST ROUTE AS NEEDED
               }
           }

           if (result.error) throw result.error;

           console.log(`${tableName} saved/updated successfully. Result:`, result.data);
           setIsEditing(false); // Exit editing mode
           alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
           navigateAfterSave(navigate, jobId, location);
            
            // Remove or comment out the URL history update since we're navigating away
       } catch (error: any) {
           console.error(`Error saving to ${tableName}:`, error);
           alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
       } finally {
           setLoading(false); // Finish loading indicator
       }
   };


  // useEffect to load data on initial mount or when jobId/reportId changes
  useEffect(() => {
      const fetchData = async () => {
          await loadJobInfo(); // Load job info first
          await loadReport(); // Then attempt to load the report
      }
      fetchData();
  }, [jobId, reportId]); // Dependencies for loading data

  // Loading indicator
  if (loading) {
    return <div className="p-4">Loading Report Data...</div>;
  }

  // Render the form JSX
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liquid Filled Transformer Report</h1>
        <div className="flex gap-2">
          {/* Pass/Fail Button */}
          <button
            onClick={() => {
              if (isEditing) {
                handleChange(null, 'status', formData.status === 'PASS' ? 'FAIL' : 'PASS');
              }
            }}
            disabled={!isEditing}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-red-600 text-white focus:ring-red-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.status}
          </button>

          {/* Edit/Save Buttons */}
          {!isEditing && reportId ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Report
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isEditing || loading}
              className={`px-4 py-2 text-sm text-white bg-accent-color rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color ${
                !isEditing ? 'hidden' : 'hover:bg-accent-color/90'
              } ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {loading ? 'Saving...' : (reportId ? 'Update Report' : 'Save New Report')}
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <input
                type="text"
                value={formData.customer}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <textarea
                value={formData.address}
                readOnly
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleChange(null, 'userName', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter User Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => handleChange(null, 'identifier', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Transformer ID / Name"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. °F</label>
                <input
                  type="number"
                  value={formData.temperature.ambient}
                  onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">°C</label>
                <input
                  type="number"
                  value={formData.temperature.celsius}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TCF</label>
                <input
                  type="number"
                  value={formData.temperature.correctionFactor}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job #</label>
              <input
                type="text"
                value={formData.jobNumber}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label>
              <input
                type="text"
                value={formData.technicians}
                onChange={(e) => handleChange(null, 'technicians', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange(null, 'date', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
              <input
                type="text"
                value={formData.substation}
                onChange={(e) => handleChange(null, 'substation', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eqpt. Location</label>
              <input
                type="text"
                value={formData.eqptLocation}
                onChange={(e) => handleChange(null, 'eqptLocation', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Humidity %</label>
              <input
                type="number"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nameplate Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Row 1: Manufacturer, Catalog, Serial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
            <input
              type="text"
              value={formData.nameplateData.manufacturer}
              onChange={(e) => handleNestedChange('nameplateData', 'manufacturer', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Number</label>
            <input
              type="text"
              value={formData.nameplateData.catalogNumber}
              onChange={(e) => handleNestedChange('nameplateData', 'catalogNumber', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
            <input
              type="text"
              value={formData.nameplateData.serialNumber}
              onChange={(e) => handleNestedChange('nameplateData', 'serialNumber', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {/* Row 2: KVA, Temp Rise, Impedance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">KVA</label>
            <input
              type="text"
              value={formData.nameplateData.kva}
              onChange={(e) => handleNestedChange('nameplateData', 'kva', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. Rise (°C)</label>
            <input
              type="text"
              value={formData.nameplateData.tempRise}
              onChange={(e) => handleNestedChange('nameplateData', 'tempRise', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Impedance (%)</label>
            <input
              type="text"
              value={formData.nameplateData.impedance}
              onChange={(e) => handleNestedChange('nameplateData', 'impedance', e.target.value)}
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-4 items-center">
            <div></div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Volts</div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Connections</div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">Winding Material</div>

            {/* Primary Row */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary</div>
            <div className="flex justify-center items-center space-x-2">
              <input
                type="text"
                value={formData.nameplateData.primary.volts}
                onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, volts: e.target.value })}
                readOnly={!isEditing}
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <input
                type="text"
                value={formData.nameplateData.primary.voltsSecondary || ''}
                onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, voltsSecondary: e.target.value })}
                readOnly={!isEditing}
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div className="flex justify-center space-x-4">
              {['Delta', 'Wye', 'Single Phase'].map(conn => (
                <label key={`pri-${conn}`} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="primary-connection"
                    value={conn}
                    checked={formData.nameplateData.primary.connection === conn}
                    onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, connection: conn })}
                    disabled={!isEditing}
                    className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{conn}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-center space-x-4">
              {['Aluminum', 'Copper'].map(mat => (
                <label key={`pri-${mat}`} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="primary-material"
                    value={mat}
                    checked={formData.nameplateData.primary.material === mat}
                    onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, material: mat })}
                    disabled={!isEditing}
                    className="form-radio h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700 focus:ring-accent-color"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{mat}</span>
                </label>
              ))}
            </div>

            {/* Secondary Row */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary</div>
            <div className="flex justify-center items-center space-x-2">
              <input
                type="text"
                value={formData.nameplateData.secondary.volts}
                onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, volts: e.target.value })}
                readOnly={!isEditing}
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!isEditing ? 'bg-gray-100' : ''}`}
              />
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <input
                type="text"
                value={formData.nameplateData.secondary.voltsSecondary || ''}
                onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, voltsSecondary: e.target.value })}
                readOnly={!isEditing}
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!isEditing ? 'bg-gray-100' : ''}`}
              />
            </div>
            <div className="flex justify-center space-x-4">
              {['Delta', 'Wye', 'Single Phase'].map(conn => (
                <label key={`sec-${conn}`} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="secondary-connection"
                    value={conn}
                    checked={formData.nameplateData.secondary.connection === conn}
                    onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, connection: conn })}
                    disabled={!isEditing}
                    className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{conn}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-center space-x-4">
              {['Aluminum', 'Copper'].map(mat => (
                <label key={`sec-${mat}`} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="secondary-material"
                    value={mat}
                    checked={formData.nameplateData.secondary.material === mat}
                    onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, material: mat })}
                    disabled={!isEditing}
                    className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{mat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Tap Configuration */}
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-white">Tap Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Voltages</label>
              <div className="grid grid-cols-7 gap-2 flex-1">
                {formData.nameplateData.tapConfiguration.voltages.map((voltage, index) => (
                  <input
                    key={`tap-volt-${index}`}
                    type="text"
                    value={voltage}
                    onChange={(e) => {
                      const newVoltages = [...formData.nameplateData.tapConfiguration.voltages];
                      newVoltages[index] = e.target.value;
                      handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, voltages: newVoltages });
                    }}
                    readOnly={!isEditing}
                    className={`w-full text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    placeholder={index === 5 || index === 6 ? '-' : ''}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Position</label>
              <div className="grid grid-cols-7 gap-2 flex-1">
                {formData.nameplateData.tapConfiguration.positions.map((position) => (
                  <div key={`tap-pos-${position}`} className="text-center text-sm text-gray-700 dark:text-white font-medium">
                    {position}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Position Left</label>
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.nameplateData.tapConfiguration.currentPosition}
                    onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, currentPosition: parseInt(e.target.value) || 0 })}
                    readOnly={!isEditing}
                    className={`w-16 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-500 dark:text-gray-400">/</span>
                  <input
                    type="text"
                    value={formData.nameplateData.tapConfiguration.currentPositionSecondary}
                    onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, currentPositionSecondary: e.target.value })}
                    readOnly={!isEditing}
                    className={`w-16 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volts</span>
                  <input
                    type="text"
                    value={formData.nameplateData.tapConfiguration.tapVoltsSpecific}
                    onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, tapVoltsSpecific: e.target.value })}
                    readOnly={!isEditing}
                    className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Percent</span>
                  <input
                    type="text"
                    value={formData.nameplateData.tapConfiguration.tapPercentSpecific}
                    onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', { ...formData.nameplateData.tapConfiguration, tapPercentSpecific: e.target.value })}
                    readOnly={!isEditing}
                    className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Indicator Gauge Values */}
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-white">Indicator Gauge Values</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oil Level</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.oilLevel}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'oilLevel', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oil Temperature (°C)</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.oilTemperature}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'oilTemperature', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oil Temp. Range</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.oilTempRange}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'oilTempRange', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tank Pressure</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.tankPressure}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'tankPressure', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Winding Temperature (°C)</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.windingTemperature}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'windingTemperature', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Winding Temp. Range</label>
              <input
                type="text"
                value={formData.nameplateData.indicatorGauges.windingTempRange}
                onChange={(e) => handleDeepNestedChange('nameplateData', 'indicatorGauges', 'windingTempRange', '', e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>


      {/* Visual and Mechanical Inspection */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">Result</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.keys(formData.visualInspection)
                 .filter(key => !key.endsWith('_comments'))
                 .sort((a, b) => {
                   // Extract the numeric part from the section ID (e.g., "7.2.2.A.1" -> 1)
                   const aNum = parseInt(a.split('.').pop() || '0');
                   const bNum = parseInt(b.split('.').pop() || '0');
                   return aNum - bNum;
                 })
                 .map((id) => (
                <tr key={id}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{id}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{getVisualInspectionDescription(id)}</td>
                  <td className="px-4 py-2">
                    <select
                      value={formData.visualInspection[id]}
                      onChange={(e) => handleVisualInspectionChange(id, 'result', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {visualInspectionOptions.map(option => (
                        <option key={option} value={option} className="dark:bg-dark-100 dark:text-white">{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={formData.visualInspection[`${id}_comments`] || ''}
                      onChange={(e) => handleVisualInspectionChange(id, 'comment', e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      placeholder="Optional comments"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insulation Resistance Tests */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance</h2>
        <div className="space-y-6">
          {/* Grid container for side-by-side tables */}
          <div className="grid grid-cols-2 gap-6">
            {/* Insulation Resistance Values Table */}
            <div>
              <table className="w-full border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr>
                    <th colSpan={6} className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">Insulation Resistance Values</th>
                  </tr>
                  <tr>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Test</th>
                    <th className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700 w-20">kV</th>
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
                  ].map((test) => (
                    <tr key={test.id}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.label}</td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <select
                          value={formData.insulationResistance[test.id]?.testVoltage || ''}
                          onChange={(e) => handleNestedChange('insulationResistance', test.id, { ...formData.insulationResistance[test.id], testVoltage: e.target.value })}
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
                          value={formData.insulationResistance[test.id]?.readings?.halfMinute || ''} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', test.id, 'readings', 'halfMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.readings?.oneMinute || ''} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', test.id, 'readings', 'oneMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.readings?.tenMinute || ''} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', test.id, 'readings', 'tenMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={formData.insulationResistance[test.id]?.unit || 'MΩ'}
                          onChange={(e) => handleNestedChange('insulationResistance', test.id, { ...formData.insulationResistance[test.id], unit: e.target.value })}
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

            {/* Temperature Corrected Values Table */}
            <div>
              <table className="w-full border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr>
                    <th colSpan={4} className="px-2 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700">Temperature Corrected Values</th>
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
                  ].map((test) => (
                    <tr key={`${test.id}-corr`}>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.corrected?.halfMinute || ''} 
                          readOnly 
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" 
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.corrected?.oneMinute || ''} 
                          readOnly 
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" 
                        />
                      </td>
                      <td className="px-1 py-1 border-r dark:border-gray-700">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.corrected?.tenMinute || ''} 
                          readOnly 
                          className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" 
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input 
                          type="text" 
                          value={formData.insulationResistance[test.id]?.unit || 'MΩ'} 
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

          {/* Dielectric Absorption and Polarization Index Table */}
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">(Ratio of 1 Min. to 0.5 Minute Result)</div>
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
                      formData.insulationResistance.dielectricAbsorptionAcceptable === 'Yes' ? 'text-green-600 dark:text-green-400 font-medium' :
                      formData.insulationResistance.dielectricAbsorptionAcceptable === 'No' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'
                    }`} 
                  />
                </td>
              </tr>
              <tr>
                <td className="px-2 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                  Polarization Index
                  <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">(Ratio of 10 Min. to 1 Min. Result)</div>
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
                      formData.insulationResistance.polarizationIndexAcceptable === 'Yes' ? 'text-green-600 dark:text-green-400 font-medium' :
                      formData.insulationResistance.polarizationIndexAcceptable === 'No' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'
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
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
         <div className="grid grid-cols-1 gap-6">
           {/* Megohmmeter Section */}
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
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
         <textarea
            value={formData.comments}
            onChange={(e) => handleChange(null, 'comments', e.target.value)}
            rows={4}
            readOnly={!isEditing}
            className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          />
      </div>

       {/* Update utility classes for dark mode */}
       <style>{`
         .input-field { 
           @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white;
         }
         .input-disabled { 
           @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed;
         }
         .select-field { 
           @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white;
         }
         .select-disabled { 
           @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed;
         }
         .textarea-field { 
           @apply block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white;
         }
         .textarea-disabled { 
           @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed;
         }
         .radio-input { 
           @apply focus:ring-accent-color h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700;
         }
         .radio-label { 
           @apply ml-2 block text-sm text-gray-700 dark:text-gray-300;
         }
         .th-cell { 
           @apply px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider;
         }
         .td-cell { 
           @apply px-6 py-4 text-sm text-gray-900 dark:text-white;
         }
         .th-cell-small { 
           @apply px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700;
         }
         .td-cell-small { 
           @apply px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700;
         }
         .table-title { 
           @apply px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700;
         }
         .table-border {
           @apply border border-gray-200 dark:border-gray-700;
         }
         .tr-border {
           @apply border-b border-gray-200 dark:border-gray-700;
         }
         .td-border {
           @apply border-r border-gray-200 dark:border-gray-700;
         }
       `}</style>

    </div>
  );
};

export default LiquidFilledTransformerReport; 