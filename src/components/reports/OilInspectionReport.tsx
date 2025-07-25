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
const OIL_INSPECTION_TABLE = 'oil_inspection_reports' as const;

// Temperature conversion and TCF tables (same as DryTypeTransformer)
const tempConvTable = [
  [-11.2, -24], [-9.4, -23], [-7.6, -22], [-5.8, -21], [-4, -20], [-2.2, -19], [1.4, -17], [3.2, -16], [5, -15], [6.8, -14], [8.6, -13], [10.4, -12], [12.2, -11], [14, -10], [15.8, -9], [17.6, -8], [19.4, -7], [21.2, -6], [23, -5], [24.8, -4], [26.6, -3], [28.4, -2], [30.2, -1], [32, 0], [33.8, 1], [35.6, 2], [37.4, 3], [39.2, 4], [41, 5], [42.8, 6], [44.6, 7], [46.4, 8], [48.2, 9], [50, 10], [51.8, 11], [53.6, 12], [55.4, 13], [57.2, 14], [59, 15], [60.8, 16], [62.6, 17], [64.4, 18], [66.2, 19], [68, 20], [70, 21], [72, 22], [73.4, 23], [75.2, 24], [77, 25], [78.8, 26], [80.6, 27], [82.4, 28], [84.2, 29], [86, 30], [87.8, 31], [89.6, 32], [91.4, 33], [93.2, 34], [95, 35], [96.8, 36], [98.6, 37], [100.4, 38], [102.2, 39], [104, 40], [105.8, 41], [107.6, 42], [109.4, 43], [111.2, 44], [113, 45], [114.8, 46], [116.6, 47], [118.4, 48], [120.2, 49], [122, 50], [123.8, 51], [125.6, 52], [127.4, 53], [129.2, 54], [131, 55], [132.8, 56], [134.6, 57], [136.4, 58], [138.2, 59], [140, 60], [141.8, 61], [143.6, 62], [145.4, 63], [147.2, 64], [149, 65]
];

const tcfTable = [
  [-24, 0.054], [-23, 0.068], [-22, 0.082], [-21, 0.096], [-20, 0.11],
  [-19, 0.124], [-18, 0.138], [-17, 0.152], [-16, 0.166], [-15, 0.18],
  [-14, 0.194], [-13, 0.208], [-12, 0.222], [-11, 0.236], [-10, 0.25],
  [-9, 0.264], [-8, 0.278], [-7, 0.292], [-6, 0.306], [-5, 0.32],
  [-4, 0.336], [-3, 0.352], [-2, 0.368], [-1, 0.384], [0, 0.4],
  [1, 0.42], [2, 0.44], [3, 0.46], [4, 0.48], [5, 0.5],
  [6, 0.526], [7, 0.552], [8, 0.578], [9, 0.604], [10, 0.63],
  [11, 0.666], [12, 0.702], [13, 0.738], [14, 0.774], [15, 0.81],
  [16, 0.848], [17, 0.886], [18, 0.924], [19, 0.962], [20, 1.0],
  [21, 1.05], [22, 1.1], [23, 1.15], [24, 1.2], [25, 1.25],
  [26, 1.316], [27, 1.382], [28, 1.448], [29, 1.514], [30, 1.58],
  [31, 1.664], [32, 1.748], [33, 1.832], [34, 1.872], [35, 2.0],
  [36, 2.1], [37, 2.2], [38, 2.3], [39, 2.4], [40, 2.5],
  [41, 2.628], [42, 2.756], [43, 2.884], [44, 3.012], [45, 3.15],
  [46, 3.316], [47, 3.482], [48, 3.648], [49, 3.814], [50, 3.98],
  [51, 4.184], [52, 4.388], [53, 4.592], [54, 4.796], [55, 5.0],
  [56, 5.26], [57, 5.52], [58, 5.78], [59, 6.04], [60, 6.3],
  [61, 6.62], [62, 6.94], [63, 7.26], [64, 7.58], [65, 7.9],
  [66, 8.32], [67, 8.74], [68, 9.16], [69, 9.58], [70, 10.0],
  [71, 10.52], [72, 11.04], [73, 11.56], [74, 12.08], [75, 12.6],
  [76, 13.24], [77, 13.88], [78, 14.52], [79, 15.16], [80, 15.8],
  [81, 16.64], [82, 17.48], [83, 18.32], [84, 19.16], [85, 20.0],
  [86, 21.04], [87, 22.08], [88, 23.12], [89, 24.16], [90, 25.2],
  [91, 26.45], [92, 27.7], [93, 28.95], [94, 30.2], [95, 31.6],
  [96, 33.28], [97, 34.96], [98, 36.64], [99, 38.32], [100, 40.0],
  [101, 42.08], [102, 44.16], [103, 46.24], [104, 48.32], [105, 50.4],
  [106, 52.96], [107, 55.52], [108, 58.08], [109, 60.64], [110, 63.2]
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
    "7.2.1.2.A.1": string; // Dropdown result
    "7.2.1.2.A.1_comments"?: string; // Optional comments field
    "7.2.1.2.A.2": string;
    "7.2.1.2.A.2_comments"?: string;
    "7.2.1.2.A.3*": string;
    "7.2.1.2.A.3*_comments"?: string;
    "7.2.1.2.A.4": string;
    "7.2.1.2.A.4_comments"?: string;
    "7.2.1.2.A.5*": string;
    "7.2.1.2.A.5*_comments"?: string;
    "7.2.1.2.A.6": string;
    "7.2.1.2.A.6_comments"?: string;
    "7.2.1.2.A.7": string;
    "7.2.1.2.A.7_comments"?: string;
    "7.2.1.2.A.8": string;
    "7.2.1.2.A.8_comments"?: string;
    "7.2.1.2.A.9": string;
    "7.2.1.2.A.9_comments"?: string;
    "7.2.1.2.A.10": string;
    "7.2.1.2.A.10_comments"?: string;
    "7.2.1.2.A.11": string;
    "7.2.1.2.A.11_comments"?: string;
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
    ttrTestSet: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    windingResistanceTestSet: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    excitationTestSet: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    powerFactorTestSet: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
  };

  // Comments (Matches structure of DryTypeTransformer)
  comments: string;
  status: string; // 'PASS' or 'FAIL'

  // Add to the FormData interface
  turnsRatioTests: {
    secondaryVoltage: string;
    tests: {
      tap: number;
      nameplateVoltage: string;
      calculatedRatio: string;
      phaseA: {
        ttr: string;
        percentDev: string;
      };
      phaseB: {
        ttr: string;
        percentDev: string;
      };
      phaseC: {
        ttr: string;
        percentDev: string;
      };
      assessment: string;
    }[];
  };

  // Add winding resistance test data
  windingResistance: {
    primary: {
      testCurrent: string;
      windingTemperature: string;
      correctionTemperature: string;
      windingMaterial: 'Copper' | 'Aluminum';
      tempCorrectionFactor: string;
      tests: Array<{
        tap: number;
        phaseA: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        phaseB: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        phaseC: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        units: string;
        smallestValueDeviation: string;
        assessment: string;
      }>;
    };
    secondary: {
      testCurrent: string;
      windingTemperature: string;
      correctionTemperature: string;
      windingMaterial: 'Copper' | 'Aluminum';
      tempCorrectionFactor: string;
      tests: Array<{
        tap: number | 'Fixed'; // UPDATED: Allow number for secondary taps
        phaseA: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        phaseB: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        phaseC: {
          rMeas: string;
          rDev: string;
          rCorr: string;
        };
        units: string;
        smallestValueDeviation: string;
        assessment: string;
      }>;
    };
  };

  // Add excitation test data
  excitation: {
    testVoltage: string;
    referenceVoltage: string;
    tests: Array<{
      tap: number;
      phaseA: {
        iOut: string;
        wattLosses: string;
        reactance: string;
      };
      phaseB: {
        iOut: string;
        wattLosses: string;
        reactance: string;
      };
      phaseC: {
        iOut: string;
        wattLosses: string;
        reactance: string;
      };
      assessment: string;
    }>;
  };

  // Add power factor test data
  powerFactor: {
    referenceVoltage: string;
    windingTemperature: string;
    primary: {
      tests: Array<{
        no: number | string; // UPDATED: Allow string for test number
        measurement: string;
        testMode: string;
        frequency: string;
        vOut: string;
        iOut: string;
        wattLosses: string;
        pfMeas: string;
        capMeas: string;
        assessment: string;
      }>;
    };
    secondary: {
      tests: Array<{
        no: number | string; // UPDATED: Allow string for test number
        measurement: string;
        testMode: string;
        frequency: string;
        vOut: string;
        iOut: string;
        wattLosses: string;
        pfMeas: string;
        capMeas: string;
        assessment: string;
      }>;
    };
  };
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

// Helper function to calculate corrected resistance
const calculateCorrectedResistance = (measured: string, tcf: string): string => {
  const measuredValue = parseFloat(measured);
  const tcfValue = parseFloat(tcf);
  
  if (isNaN(measuredValue) || isNaN(tcfValue) || tcfValue === 0) {
    return '';
  }
  
  // Corrected resistance = measured resistance * TCF
  return (measuredValue * tcfValue).toFixed(7);
};

// Helper function to calculate resistance deviation
const calculateResistanceDeviation = (measured: string, reference: string): string => {
  const measuredValue = parseFloat(measured);
  const referenceValue = parseFloat(reference);
  
  if (isNaN(measuredValue) || isNaN(referenceValue) || referenceValue === 0) {
    return '';
  }
  
  // Deviation % = ((measured - reference) / reference) * 100
  return (((measuredValue - referenceValue) / referenceValue) * 100).toFixed(2);
};

// Helper function to calculate smallest value deviation
const calculateSmallestValueDeviation = (phaseA: string, phaseB: string, phaseC: string): string => {
  const values = [phaseA, phaseB, phaseC]
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
  
  if (values.length < 3) {
    return '';
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Smallest value deviation % = ((max - min) / avg) * 100
  return ((max - min) / avg * 100).toFixed(2) + '%';
};

// Helper function to calculate Reactance for Excitation test
const calculateReactance = (
  voltageOutput: string, // in kV
  currentOutput: string  // in mA
): string => {
  const vOut = parseFloat(voltageOutput);
  const iOut = parseFloat(currentOutput);

  if (isNaN(vOut) || isNaN(iOut) || iOut === 0) {
    return '';
  }
  
  // Reactance (kΩ) = V (kV) / I (mA) * 1000
  const reactance = (vOut / iOut) * 1000;
  return reactance.toFixed(3);
};

// Helper function to calculate Power Factor
const calculatePowerFactor = (
  wattLosses: string,    // in mW
  voltageOutput: string, // in kV
  currentOutput: string  // in mA
): string => {
  const wLoss = parseFloat(wattLosses);
  const vOut = parseFloat(voltageOutput);
  const iOut = parseFloat(currentOutput);

  if (isNaN(wLoss) || isNaN(vOut) || isNaN(iOut) || vOut === 0 || iOut === 0) {
    return '';
  }

  // PF = Watt Losses (mW) / (V (kV) * I (mA) * 1000)
  const powerFactor = wLoss / (vOut * iOut * 1000);
  return (powerFactor * 100).toFixed(4) + '%';
};

const OilInspectionReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  const [isOmicronMode, setIsOmicronMode] = useState(false); // <-- Add state for the toggle

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
    userName: '',
    temperature: {
      ambient: 72,
      celsius: 22,
      fahrenheit: 72,
      correctionFactor: 1.152
    },
    nameplateData: {
      manufacturer: '',
      catalogNumber: '',
      serialNumber: '',
      kva: '',
      tempRise: '',
      impedance: '',
      primary: {
        volts: '',
        voltsSecondary: '',
        connection: 'Delta',
        material: 'Aluminum'
      },
      secondary: {
        volts: '',
        voltsSecondary: '',
        connection: 'Wye',
        material: 'Aluminum'
      },
      tapConfiguration: {
        positions: [1, 2, 3, 4, 5, 6, 7],
        voltages: ['', '', '', '', '', '', ''],
        currentPosition: 3,
        currentPositionSecondary: '',
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
    visualInspection: {
      "7.2.1.2.A.1": "Select One",
      "7.2.1.2.A.2": "Select One",
      "7.2.1.2.A.3*": "Select One",
      "7.2.1.2.A.4": "Select One",
      "7.2.1.2.A.5*": "Select One",
      "7.2.1.2.A.6": "Select One",
      "7.2.1.2.A.7": "Select One",
      "7.2.1.2.A.8": "Select One",
      "7.2.1.2.A.9": "Select One",
      "7.2.1.2.A.10": "Select One",
      "7.2.1.2.A.11": "Select One"
    },
    insulationResistance: {
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
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
      ttrTestSet: { name: '', serialNumber: '', ampId: '' },
      windingResistanceTestSet: { name: '', serialNumber: '', ampId: '' },
      excitationTestSet: { name: '', serialNumber: '', ampId: '' },
      powerFactorTestSet: { name: '', serialNumber: '', ampId: '' }
    },
    comments: '',
    status: 'PASS',
    turnsRatioTests: {
      secondaryVoltage: '',
      tests: Array.from({ length: 7 }, (_, i) => ({
        tap: i + 1,
        nameplateVoltage: '',
        calculatedRatio: '',
        phaseA: { ttr: '', percentDev: '' },
        phaseB: { ttr: '', percentDev: '' },
        phaseC: { ttr: '', percentDev: '' },
        assessment: ''
      }))
    },
    windingResistance: {
      primary: {
        testCurrent: '',
        windingTemperature: '30',
        correctionTemperature: '75',
        windingMaterial: 'Copper',
        tempCorrectionFactor: '1.170', // Recalculate this if temps change
        tests: Array.from({ length: 7 }, (_, i) => ({
          tap: i + 1,
          phaseA: { rMeas: '', rDev: '', rCorr: '' },
          phaseB: { rMeas: '', rDev: '', rCorr: '' },
          phaseC: { rMeas: '', rDev: '', rCorr: '' },
          units: 'μΩ',
          smallestValueDeviation: '',
          assessment: ''
        }))
      },
      secondary: {
        testCurrent: '',
        windingTemperature: '30',
        correctionTemperature: '75',
        windingMaterial: 'Copper',
        tempCorrectionFactor: '1.170', // Recalculate this if temps change
        tests: Array.from({ length: 7 }, (_, i) => ({ // UPDATED: 7 taps instead of Fixed
          tap: i + 1, 
          phaseA: { rMeas: '', rDev: '', rCorr: '' },
          phaseB: { rMeas: '', rDev: '', rCorr: '' },
          phaseC: { rMeas: '', rDev: '', rCorr: '' },
          units: 'μΩ',
          smallestValueDeviation: '',
          assessment: ''
        }))
      }
    },
    excitation: {
      testVoltage: '10',
      referenceVoltage: '10',
      tests: Array.from({ length: 7 }, (_, i) => ({
        tap: i + 1,
        phaseA: { iOut: '', wattLosses: '', reactance: '' },
        phaseB: { iOut: '', wattLosses: '', reactance: '' },
        phaseC: { iOut: '', wattLosses: '', reactance: '' },
        assessment: ''
      }))
    },
    powerFactor: {
      referenceVoltage: '10',
      windingTemperature: '30',
      primary: {
        tests: [ // UPDATED: Only include tests 1, 2a, 3a
          {
            no: 1,
            measurement: 'ICH+ICHL',
            testMode: 'GST',
            frequency: '60.00', // Changed to string
            vOut: '10.00', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          },
          {
            no: '2a', // Changed to string
            measurement: 'ICH',
            testMode: 'GSTg-A',
            frequency: '60.00', // Changed to string
            vOut: '10.00', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          },
           {
            no: '3a', // Changed to string
            measurement: 'ICHL',
            testMode: 'UST-A',
            frequency: '60.00', // Changed to string
            vOut: '10.00', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          }
        ]
      },
      secondary: {
        tests: [ // UPDATED: Only include tests 1, 2a, 3a
          {
            no: 1,
            measurement: 'ICL+ICLH',
            testMode: 'GST',
            frequency: '60.00', // Changed to string
            vOut: '0.10', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          },
          {
            no: '2a', // Changed to string
            measurement: 'ICL',
            testMode: 'GSTg-A',
            frequency: '60.00', // Changed to string
            vOut: '0.10', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          },
          {
            no: '3a', // Changed to string
            measurement: 'ICLH',
            testMode: 'UST-A',
            frequency: '60.00', // Changed to string
            vOut: '0.10', // Changed to string
            iOut: '', // Default empty
            wattLosses: '', // Default empty
            pfMeas: '',
            capMeas: '',
            assessment: ''
          }
        ]
      }
    }
  });

  // Helper function to get visual inspection description based on screenshot
  const getVisualInspectionDescription = (id: string): string => {
    // Use NETA section numbers from the screenshot (7.2.2.A.x)
    const descriptions: { [key: string]: string } = {
      "7.2.1.2.A.1": "Inspect physical and mechanical condition.",
      "7.2.1.2.A.2": "Inspect anchorage, alignment, and grounding.",
      "7.2.1.2.A.3*": "Prior to cleaning the unit, perform as-found tests.",
      "7.2.1.2.A.4": "Clean the unit.",
      "7.2.1.2.A.5*": "Verify that control and alarm settings on temperature indicators are as specified.",
      "7.2.1.2.A.6": "Verify that cooling fans operate correctly.",
      "7.2.1.2.A.7": "Inspect bolted electrical connections for high resistance using a low-resistance ohmmeter",
      "7.2.1.2.A.8": "Perform specific inspections and mechanical tests as recommended by the manufacturer.",
      "7.2.1.2.A.9": "Perform as-left tests.",
      "7.2.1.2.A.10": "Verify that as-left tap connections are as specified.",
      "7.2.1.2.A.11": "Verify the presence of surge arresters."
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
      // First fetch job data from neta_ops schema - use correct query format
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

      try {
          console.log(`Loading report from ${OIL_INSPECTION_TABLE} with ID: ${reportId}`);
          const { data, error } = await supabase
              .schema('neta_ops')
              .from(`${OIL_INSPECTION_TABLE}`)
              .select('*')
              .eq('id', parseInt(reportId)) // Convert string ID to number
              .single();

          if (error) {
              if (error.code === 'PGRST116') {
                  console.warn(`Report with ID ${reportId} not found in ${OIL_INSPECTION_TABLE}. Starting new report.`);
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
                  nameplateData: data.nameplate_data ?? prev.nameplateData,
                  visualInspection: data.visual_inspection ?? prev.visualInspection,
                  insulationResistance: data.insulation_resistance ?? prev.insulationResistance,
                  testEquipment: data.test_equipment ?? prev.testEquipment,
                  turnsRatioTests: data.turns_ratio_tests ?? prev.turnsRatioTests,
                  windingResistance: data.winding_resistance ?? prev.windingResistance,
                  excitation: data.excitation ?? prev.excitation,
                  powerFactor: data.power_factor ?? prev.powerFactor,
                  comments: data.comments ?? ''
              }));
              setIsOmicronMode(data.report_info?.isOmicronMode ?? false); // <-- Add this line
              setIsEditing(false);
          }
      } catch (error) {
          const err = error as SupabaseError;
          console.error(`Error loading report from ${OIL_INSPECTION_TABLE}:`, err);
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

       const reportData = {
           job_id: jobId,
           user_id: user.id,
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
            status: formData.status,
            isOmicronMode: isOmicronMode // <-- Add this line
           },
        nameplate_data: formData.nameplateData,
        visual_inspection: formData.visualInspection,
        insulation_resistance: formData.insulationResistance,
            test_equipment: formData.testEquipment,
            comments: formData.comments,
            turns_ratio_tests: formData.turnsRatioTests,
            winding_resistance: formData.windingResistance,
            excitation: formData.excitation,
            power_factor: formData.powerFactor
       };

       console.log(`Saving data to ${OIL_INSPECTION_TABLE}:`, reportData);

       try {
           setLoading(true); // Start loading indicator

           let result;
           let savedReport;
           if (reportId) {
               // Update existing report
               console.log(`Updating ${OIL_INSPECTION_TABLE} with ID: ${reportId}`);
               result = await supabase
                   .schema('neta_ops')
                   .from(OIL_INSPECTION_TABLE)
                   .update(reportData)
                   .eq('id', parseInt(reportId)) // Convert string ID to number
                   .select()
                   .single();
               
               if (result.error) throw result.error;
               savedReport = result.data;
           } else {
               // Create new report
               console.log(`Inserting into ${OIL_INSPECTION_TABLE} for job ID: ${jobId}`);
               result = await supabase
                   .schema('neta_ops')
                   .from(OIL_INSPECTION_TABLE)
                   .insert(reportData)
                   .select()
                   .single();

               if (result.error) throw result.error;
               savedReport = result.data;
               console.log(`Created new report with ID: ${savedReport.id}`);
           }

           if (result.error) throw result.error;

           // Use the savedReport variable already declared above
           console.log(`${OIL_INSPECTION_TABLE} saved/updated successfully. Result:`, savedReport);

           if (!reportId && savedReport) {
               // Create asset entry for new reports
               const assetName = formData.identifier 
                   ? `Oil Inspection Report - ${formData.identifier}`
                   : `Oil Inspection Report - ${formData.eqptLocation || 'Unnamed'}`;
               const assetUrl = `report:/jobs/${jobId}/oil-inspection/${savedReport.id}`;

                      const { data: assetResult, error: assetError } = await supabase
                          .schema('neta_ops')
                          .from('assets')
                   .insert({
                       name: assetName,
                       file_url: assetUrl,
                       user_id: user.id
                   })
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

               // Update URL for new reports
               navigate(`/jobs/${jobId}/oil-inspection/${savedReport.id}`, { replace: true });
           }

           //setIsEditing(false); // <-- Keep this commented or remove
           // alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`); // <-- Remove this alert
           navigateAfterSave(navigate, jobId, location);

       } catch (error: any) {
           console.error(`Error saving to ${OIL_INSPECTION_TABLE}:`, error);
           alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
       } finally {
           setLoading(false);
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

  // Add effect to sync tap voltages to turns ratio test nameplate voltages
  useEffect(() => {
    if (formData.nameplateData.tapConfiguration.voltages.length > 0) {
      const newTests = formData.turnsRatioTests.tests.map((test, index) => ({
        ...test,
        nameplateVoltage: formData.nameplateData.tapConfiguration.voltages[index] || ''
      }));
      
      handleNestedChange('turnsRatioTests', 'tests', newTests);
    }
  }, [formData.nameplateData.tapConfiguration.voltages]);

  // Add effect to calculate turns ratios when nameplate voltages or secondary voltage changes
  useEffect(() => {
    if (formData.turnsRatioTests.secondaryVoltage) {
      const secondaryVoltage = parseFloat(formData.turnsRatioTests.secondaryVoltage);
      if (!isNaN(secondaryVoltage) && secondaryVoltage !== 0) {
        const newTests = formData.turnsRatioTests.tests.map(test => {
          let calculatedRatio = '';
          const nameplateVoltage = parseFloat(test.nameplateVoltage);
          
          // Always use single-phase calculation: Tap voltage ÷ Secondary voltage
          if (!isNaN(nameplateVoltage)) {
            calculatedRatio = (nameplateVoltage / secondaryVoltage).toFixed(3);
          }
          
          return {
            ...test,
            calculatedRatio
          };
        });
        
        handleNestedChange('turnsRatioTests', 'tests', newTests);
      }
    }
  }, [
    formData.turnsRatioTests.secondaryVoltage,
    formData.turnsRatioTests.tests.map(t => t.nameplateVoltage).join(',')
  ]);

  // Add effect to sync secondary voltage from nameplate to turns ratio test
  useEffect(() => {
    if (formData.nameplateData.secondary.volts) {
      handleNestedChange('turnsRatioTests', 'secondaryVoltage', formData.nameplateData.secondary.volts);
    }
  }, [formData.nameplateData.secondary.volts]);

  // Add helper function to calculate percentage deviation
  const calculatePercentDeviation = (calculatedRatio: string, measuredTTR: string): string => {
    // Verify if there's a measured TTR value
    if (!measuredTTR || measuredTTR.trim() === '') {
      return '';
    }
    
    // Verify if there's a calculated ratio
    const calcRatio = parseFloat(calculatedRatio);
    const ttrValue = parseFloat(measuredTTR);
    
    if (isNaN(calcRatio) || isNaN(ttrValue) || calcRatio === 0) {
      return '';
    }
    
    // Calculate the deviation percentage:
    // ((Calculated Ratio - Measured TTR) / Calculated Ratio) * 100
    const difference = calcRatio - ttrValue;
    const percentage = (difference / calcRatio) * 100;
    
    // Return formatted percentage with 2 decimal places
    return percentage.toFixed(2);
  };

  // Add event handler for TTR changes to update the deviation
  const handleTTRChange = (testIndex: number, phase: 'phaseA' | 'phaseB' | 'phaseC', value: string) => {
    const newTests = [...formData.turnsRatioTests.tests];
    const currentTest = newTests[testIndex];
    
    // Update the TTR value
    newTests[testIndex] = {
      ...currentTest,
      [phase]: {
        ...currentTest[phase],
        ttr: value,
        // Calculate and update the deviation automatically
        percentDev: calculatePercentDeviation(currentTest.calculatedRatio, value)
      }
    };
    
    handleNestedChange('turnsRatioTests', 'tests', newTests);
  };

  // Add new constant for acceptable deviation limit
  const ACCEPTABLE_DEVIATION_LIMIT = 0.5; // ±0.5%

  // Add function to determine assessment based on deviation values
  const determineAssessment = (test: typeof formData.turnsRatioTests.tests[0]): string => {
    // If any TTR value is missing, return empty assessment
    if (!test.phaseA.ttr || !test.phaseB.ttr || !test.phaseC.ttr) {
      return '';
    }
    
    // If any deviation field is empty, return empty assessment
    if (!test.phaseA.percentDev || !test.phaseB.percentDev || !test.phaseC.percentDev) {
      return '';
    }
    
    // Parse deviation values
    const phaseADev = parseFloat(test.phaseA.percentDev);
    const phaseBDev = parseFloat(test.phaseB.percentDev);
    const phaseCDev = parseFloat(test.phaseC.percentDev);
    
    // Check if any value is NaN
    if (isNaN(phaseADev) || isNaN(phaseBDev) || isNaN(phaseCDev)) {
      return '';
    }
    
    // Check if all deviations are within acceptable limits (±0.5%)
    if (
      Math.abs(phaseADev) <= ACCEPTABLE_DEVIATION_LIMIT &&
      Math.abs(phaseBDev) <= ACCEPTABLE_DEVIATION_LIMIT &&
      Math.abs(phaseCDev) <= ACCEPTABLE_DEVIATION_LIMIT
    ) {
      return 'Pass';
    } else {
      return 'Fail';
    }
  };

  // Effect to recalculate deviations when calculated ratios change
  useEffect(() => {
    const newTests = formData.turnsRatioTests.tests.map(test => {
      // Recalculate all deviations when calculated ratio changes
      return {
        ...test,
        phaseA: {
          ...test.phaseA,
          percentDev: calculatePercentDeviation(test.calculatedRatio, test.phaseA.ttr)
        },
        phaseB: {
          ...test.phaseB,
          percentDev: calculatePercentDeviation(test.calculatedRatio, test.phaseB.ttr)
        },
        phaseC: {
          ...test.phaseC,
          percentDev: calculatePercentDeviation(test.calculatedRatio, test.phaseC.ttr)
        }
      };
    });
    
    // Only update if there are actual changes to prevent infinite loops
    const hasChanges = newTests.some((test, i) => {
      const current = formData.turnsRatioTests.tests[i];
      return (
        test.phaseA.percentDev !== current.phaseA.percentDev ||
        test.phaseB.percentDev !== current.phaseB.percentDev ||
        test.phaseC.percentDev !== current.phaseC.percentDev
      );
    });
    
    if (hasChanges) {
      handleNestedChange('turnsRatioTests', 'tests', newTests);
    }
  }, [formData.turnsRatioTests.tests.map(t => t.calculatedRatio).join(',')]);

  // Effect to calculate assessment when any deviation changes
  useEffect(() => {
    const newTests = formData.turnsRatioTests.tests.map(test => {
      return {
        ...test,
        assessment: determineAssessment(test)
      };
    });
    
    // Only update if there are actual changes to prevent infinite loops
    const hasChanges = newTests.some((test, i) => {
      return test.assessment !== formData.turnsRatioTests.tests[i].assessment;
    });
    
    if (hasChanges) {
      handleNestedChange('turnsRatioTests', 'tests', newTests);
    }
  }, [
    formData.turnsRatioTests.tests.map(t => 
      `${t.phaseA.percentDev}|${t.phaseB.percentDev}|${t.phaseC.percentDev}`
    ).join(',')
  ]);

  // Add effect for winding resistance calculations
  useEffect(() => {
    const updateWindingResistanceTests = (side: 'primary' | 'secondary') => {
      const tests = formData.windingResistance[side].tests.map(test => {
        // Calculate corrected values
        const phaseACorrected = calculateCorrectedResistance(
          test.phaseA.rMeas,
          formData.windingResistance[side].tempCorrectionFactor
        );
        const phaseBCorrected = calculateCorrectedResistance(
          test.phaseB.rMeas,
          formData.windingResistance[side].tempCorrectionFactor
        );
        const phaseCCorrected = calculateCorrectedResistance(
          test.phaseC.rMeas,
          formData.windingResistance[side].tempCorrectionFactor
        );

        // Calculate deviations using first phase as reference
        const phaseADev = '0.00'; // Reference phase
        const phaseBDev = calculateResistanceDeviation(test.phaseB.rMeas, test.phaseA.rMeas);
        const phaseCDev = calculateResistanceDeviation(test.phaseC.rMeas, test.phaseA.rMeas);

        // Calculate smallest value deviation
        const smallestValueDeviation = calculateSmallestValueDeviation(
          test.phaseA.rMeas,
          test.phaseB.rMeas,
          test.phaseC.rMeas
        );

        // Determine assessment (Pass if deviation is less than 3%)
        const deviationValue = parseFloat(smallestValueDeviation);
        const assessment = isNaN(deviationValue) ? '' : deviationValue <= 3 ? 'Pass' : 'Fail';

        return {
          ...test,
          phaseA: {
            ...test.phaseA,
            rCorr: phaseACorrected,
            rDev: phaseADev
          },
          phaseB: {
            ...test.phaseB,
            rCorr: phaseBCorrected,
            rDev: phaseBDev
          },
          phaseC: {
            ...test.phaseC,
            rCorr: phaseCCorrected,
            rDev: phaseCDev
          },
          smallestValueDeviation,
          assessment
        };
      });

      handleNestedChange('windingResistance', side, {
        ...formData.windingResistance[side],
        tests
      });
    };

    // Update both primary and secondary winding resistance tests
    updateWindingResistanceTests('primary');
    updateWindingResistanceTests('secondary');
  }, [
    formData.windingResistance.primary.tests.map(t => 
      `${t.phaseA.rMeas}|${t.phaseB.rMeas}|${t.phaseC.rMeas}`
    ).join(','),
    formData.windingResistance.secondary.tests.map(t => 
      `${t.phaseA.rMeas}|${t.phaseB.rMeas}|${t.phaseC.rMeas}`
    ).join(','),
    formData.windingResistance.primary.tempCorrectionFactor,
    formData.windingResistance.secondary.tempCorrectionFactor
  ]);

  // Add effect for Excitation calculations (Reactance)
  useEffect(() => {
    const newTests = formData.excitation.tests.map(test => {
      const phaseAReactance = calculateReactance(formData.excitation.testVoltage, test.phaseA.iOut);
      const phaseBReactance = calculateReactance(formData.excitation.testVoltage, test.phaseB.iOut);
      const phaseCReactance = calculateReactance(formData.excitation.testVoltage, test.phaseC.iOut);

      return {
        ...test,
        phaseA: { ...test.phaseA, reactance: phaseAReactance },
        phaseB: { ...test.phaseB, reactance: phaseBReactance },
        phaseC: { ...test.phaseC, reactance: phaseCReactance },
        // Assessment logic can be added here if needed
      };
    });

    // Only update if there are actual changes
    if (!_.isEqual(newTests, formData.excitation.tests)) {
        handleNestedChange('excitation', 'tests', newTests);
    }
  }, [
    formData.excitation.testVoltage, 
    formData.excitation.tests.map(t => `${t.phaseA.iOut}|${t.phaseB.iOut}|${t.phaseC.iOut}`).join(',')
  ]);

  // Add effect for Power Factor calculations (PF Meas.)
  useEffect(() => {
    const updatePowerFactorTests = (side: 'primary' | 'secondary') => {
      const tests = formData.powerFactor[side].tests.map(test => {
        const pfMeas = calculatePowerFactor(test.wattLosses, test.vOut, test.iOut);
        
        return {
          ...test,
          pfMeas: pfMeas,
          // capMeas calculation logic can be added here if needed
          // Assessment logic can be added here if needed
        };
      });
      
      // Only update if there are actual changes
      if (!_.isEqual(tests, formData.powerFactor[side].tests)) {
         handleNestedChange('powerFactor', side, {
          ...formData.powerFactor[side],
          tests
        });
      }
    };

    updatePowerFactorTests('primary');
    updatePowerFactorTests('secondary');
  }, [
    formData.powerFactor.primary.tests.map(t => `${t.wattLosses}|${t.vOut}|${t.iOut}`).join(','),
    formData.powerFactor.secondary.tests.map(t => `${t.wattLosses}|${t.vOut}|${t.iOut}`).join(',')
  ]);

  // ADD NEW HANDLER for Winding Resistance Table Inputs
  const handleWindingResistanceTestChange = (
    side: 'primary' | 'secondary',
    testIndex: number,
    phase: 'phaseA' | 'phaseB' | 'phaseC',
    field: 'rMeas', // Only rMeas is directly editable in this setup
    value: string
  ) => {
    setFormData(prev => {
      const updatedWindingResistance = _.cloneDeep(prev.windingResistance);
      if (updatedWindingResistance[side]?.tests?.[testIndex]?.[phase]) {
        updatedWindingResistance[side].tests[testIndex][phase][field] = value;

        // TODO: Re-integrate calculation logic here or call a separate calculation function
        // For now, just updating the value to fix the input binding
        // Example: Recalculate dependent fields if needed
        // const test = updatedWindingResistance[side].tests[testIndex];
        // test.phaseA.rDev = calculateResistanceDeviation(test.phaseA.rMeas, /* reference */);
        // test.phaseA.rCorr = calculateCorrectedResistance(test.phaseA.rMeas, /* tcf */);
        // test.assessment = determineWindingResistanceAssessment(test);

        return {
          ...prev,
          windingResistance: updatedWindingResistance
        };
      }
      return prev; // Return previous state if path is invalid
    });
    // Consider calling a function like updateWindingResistanceCalculations(side) here if complex updates are needed
  };

  // Loading indicator
  if (loading) {
    return <div className="p-4">Loading Report Data...</div>;
  }

  // Render the form JSX
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Oil Inspection Report</h1>
        <div className="flex gap-2 items-center"> {/* <-- Added items-center */}
          {/* Omicron/Manual Toggle Button */}
          <button
            onClick={() => setIsOmicronMode(!isOmicronMode)}
            disabled={!isEditing} // Disable toggle if not editing
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isOmicronMode
                ? 'bg-purple-600 text-white focus:ring-purple-500'
                : 'bg-blue-600 text-white focus:ring-blue-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {isOmicronMode ? 'Omicron Result Entry' : 'Manual Result Entry'}
          </button>

          {/* Existing Pass/Fail and Edit/Save Buttons */}
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
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <input
                type="text"
                value={formData.nameplateData.secondary.voltsSecondary || ''}
                onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, voltsSecondary: e.target.value })}
                readOnly={!isEditing}
                className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
                      handleNestedChange('nameplateData', 'tapConfiguration', { 
                        ...formData.nameplateData.tapConfiguration, 
                        voltages: newVoltages 
                      });
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

      {/* Conditionally Rendered Sections */}
      {!isOmicronMode && (
        <>
          {/* Turns Ratio Tests Section */}
          <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Turns Ratio Tests (TTR)</h2>
        <div className="space-y-4">
          {/* Secondary Voltage Input */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary Winding Voltage (L-N for Wye, L-L for Delta):</label>
            <input
              type="text"
              value={formData.turnsRatioTests.secondaryVoltage}
              readOnly={true}
              className="w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-200 cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">V</span>
          </div>

          {/* Table of turns ratio tests */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tap</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nameplate Voltage</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Calculated Ratio</th>
                  <th colSpan={2} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phase A</th>
                  <th colSpan={2} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phase B</th>
                  <th colSpan={2} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phase C</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assessment</th>
                </tr>
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">TTR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">% Dev.</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">TTR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">% Dev.</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">TTR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">% Dev.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {formData.turnsRatioTests.tests.map((test, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{test.tap}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.nameplateVoltage}
                        onChange={(e) => {
                          const newTests = [...formData.turnsRatioTests.tests];
                          newTests[index] = { ...test, nameplateVoltage: e.target.value };
                          handleNestedChange('turnsRatioTests', 'tests', newTests);
                        }}
                        readOnly={!isEditing}
                        className={`w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.calculatedRatio}
                        onChange={(e) => {
                          const newTests = [...formData.turnsRatioTests.tests];
                          newTests[index] = { ...test, calculatedRatio: e.target.value };
                          handleNestedChange('turnsRatioTests', 'tests', newTests);
                        }}
                        readOnly={!isEditing}
                        className={`w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseA.ttr}
                        onChange={(e) => handleTTRChange(index, 'phaseA', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseA.percentDev}
                        readOnly={true}
                        className="w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-200 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseB.ttr}
                        onChange={(e) => handleTTRChange(index, 'phaseB', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseB.percentDev}
                        readOnly={true}
                        className="w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-200 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseC.ttr}
                        onChange={(e) => handleTTRChange(index, 'phaseC', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.phaseC.percentDev}
                        readOnly={true}
                        className="w-24 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-200 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={test.assessment}
                        readOnly={true}
                        className={`w-32 text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-200 cursor-not-allowed ${test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400 font-medium' : test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

          {/* Winding Resistance Primary Section */}
          <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Winding Resistance - Primary Side</h2>
              <div className="grid grid-cols-5 gap-4 mb-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Test Current (A)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.primary.testCurrent} 
                    onChange={(e) => handleNestedChange('windingResistance', 'primary', { ...formData.windingResistance.primary, testCurrent: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Winding Temperature (°C)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.primary.windingTemperature} 
                    onChange={(e) => handleNestedChange('windingResistance', 'primary', { ...formData.windingResistance.primary, windingTemperature: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Correction Temperature (°C)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.primary.correctionTemperature} 
                    onChange={(e) => handleNestedChange('windingResistance', 'primary', { ...formData.windingResistance.primary, correctionTemperature: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Winding Material</label>
                  <select 
                    value={formData.windingResistance.primary.windingMaterial} 
                    onChange={(e) => handleNestedChange('windingResistance', 'primary', { ...formData.windingResistance.primary, windingMaterial: e.target.value as 'Copper' | 'Aluminum' })} 
                    disabled={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  >
                    <option value="Copper">Copper</option>
                    <option value="Aluminum">Aluminum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Temp. Correction Factor</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.primary.tempCorrectionFactor} 
                    onChange={(e) => handleNestedChange('windingResistance', 'primary', { ...formData.windingResistance.primary, tempCorrectionFactor: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-dark-200">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-16">TAP</th>
                      <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase A</th>
                      <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase B</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-32">Units</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-32">Smallest<br/>Value<br/>Deviation</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 w-24">Assess-<br/>ment</th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Meas.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Dev.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Corr.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Meas.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Dev.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Corr.</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.windingResistance.primary.tests.map((test, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">{test.tap}</td>

                        {/* Phase A */}
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                          <input
                            type="text"
                            value={test.phaseA.rMeas}
                            onChange={(e) => handleWindingResistanceTestChange('primary', index, 'phaseA', 'rMeas', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full p-1 text-center border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseA.rDev}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseA.rCorr}
                        </td>

                        {/* Phase B */}
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                          <input
                            type="text"
                            value={test.phaseB.rMeas}
                            onChange={(e) => handleWindingResistanceTestChange('primary', index, 'phaseB', 'rMeas', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full p-1 text-center border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseB.rDev}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseB.rCorr}
                        </td>

                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.units}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.smallestValueDeviation}%
                        </td>
                        <td className={`px-3 py-2 text-sm border-r dark:border-gray-700 text-center ${
                          test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400' : 
                          test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400' : 
                          'text-gray-900 dark:text-white'
                        }`}>
                          {test.assessment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          {/* Secondary Winding Resistance */}
          <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Winding Resistance - Secondary Side</h2>
              <div className="grid grid-cols-5 gap-4 mb-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Test Current (A)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.secondary.testCurrent} 
                    onChange={(e) => handleNestedChange('windingResistance', 'secondary', { ...formData.windingResistance.secondary, testCurrent: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Winding Temperature (°C)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.secondary.windingTemperature} 
                    onChange={(e) => handleNestedChange('windingResistance', 'secondary', { ...formData.windingResistance.secondary, windingTemperature: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Correction Temperature (°C)</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.secondary.correctionTemperature} 
                    onChange={(e) => handleNestedChange('windingResistance', 'secondary', { ...formData.windingResistance.secondary, correctionTemperature: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Winding Material</label>
                  <select 
                    value={formData.windingResistance.secondary.windingMaterial} 
                    onChange={(e) => handleNestedChange('windingResistance', 'secondary', { ...formData.windingResistance.secondary, windingMaterial: e.target.value as 'Copper' | 'Aluminum' })} 
                    disabled={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  >
                    <option value="Copper">Copper</option>
                    <option value="Aluminum">Aluminum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Temp. Correction Factor</label>
                  <input 
                    type="text" 
                    value={formData.windingResistance.secondary.tempCorrectionFactor} 
                    onChange={(e) => handleNestedChange('windingResistance', 'secondary', { ...formData.windingResistance.secondary, tempCorrectionFactor: e.target.value })} 
                    readOnly={!isEditing}
                    className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-dark-200">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-16">TAP</th>
                      <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase A</th>
                      <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase B</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-32">Units</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-32">Smallest<br/>Value<br/>Deviation</th>
                      <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 w-24">Assess-<br/>ment</th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Meas.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Dev.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Corr.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Meas.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Dev.</th>
                      <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">R Corr.</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.windingResistance.secondary.tests.map((test, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {typeof test.tap === 'number' ? test.tap : 'Fixed'}
                        </td>

                        {/* Phase A */}
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                          <input
                            type="text"
                            value={test.phaseA.rMeas}
                            onChange={(e) => handleWindingResistanceTestChange('secondary', index, 'phaseA', 'rMeas', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full p-1 text-center border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseA.rDev}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseA.rCorr}
                        </td>

                        {/* Phase B */}
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                          <input
                            type="text"
                            value={test.phaseB.rMeas}
                            onChange={(e) => handleWindingResistanceTestChange('secondary', index, 'phaseB', 'rMeas', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full p-1 text-center border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100'}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseB.rDev}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.phaseB.rCorr}
                        </td>

                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.units}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">
                          {test.smallestValueDeviation}%
                        </td>
                        <td className={`px-3 py-2 text-sm border-r dark:border-gray-700 text-center ${
                          test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400' : 
                          test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400' : 
                          'text-gray-900 dark:text-white'
                        }`}>
                          {test.assessment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>

          {/* Excitation Tests Section */}
          <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Excitation Tests</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Voltage (kV)</label>
            <input 
              type="text" 
              value={formData.excitation.testVoltage} 
              onChange={(e) => handleNestedChange('excitation', 'testVoltage', e.target.value)} 
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">*Reference Voltage (kV)</label>
            <input 
              type="text" 
              value={formData.excitation.referenceVoltage} 
              onChange={(e) => handleNestedChange('excitation', 'referenceVoltage', e.target.value)} 
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-16">TAP</th>
                <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase A</th>
                <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase B</th>
                <th colSpan={3} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-sm font-medium text-gray-700 dark:text-white border-b dark:border-gray-700 border-r dark:border-gray-700">Phase C</th>
                <th rowSpan={2} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Assessment</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* I out (mA)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* Watt losses (W)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Reactance (kΩ)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* I out (mA)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* Watt losses (W)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Reactance (kΩ)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* I out (mA)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">* Watt losses (W)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700 w-24">Reactance (kΩ)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.excitation.tests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">{test.tap}</td>
                  {/* Phase A */}
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseA.iOut} 
                      onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseA.iOut = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseA.wattLosses} 
                      onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseA.wattLosses = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.phaseA.reactance} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  {/* Phase B */}
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseB.iOut} 
                       onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseB.iOut = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseB.wattLosses} 
                       onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseB.wattLosses = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.phaseB.reactance} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  {/* Phase C */}
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseC.iOut} 
                       onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseC.iOut = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.phaseC.wattLosses} 
                       onChange={(e) => {
                        const newTests = [...formData.excitation.tests];
                        newTests[index].phaseC.wattLosses = e.target.value;
                        handleNestedChange('excitation', 'tests', newTests);
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.phaseC.reactance} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  {/* Assessment */}
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.assessment} 
                      readOnly 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed ${test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400 font-medium' : test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400 font-medium' : ''}`} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

          {/* Power Factor Tests Section */}
          <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Power Factor Tests</h2>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">*Reference Voltage (kV)</label>
            <input 
              type="text" 
              value={formData.powerFactor.referenceVoltage} 
              onChange={(e) => handleNestedChange('powerFactor', 'referenceVoltage', e.target.value)} 
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Winding Temperature (°C)</label>
            <input 
              type="text" 
              value={formData.powerFactor.windingTemperature} 
              onChange={(e) => handleNestedChange('powerFactor', 'windingTemperature', e.target.value)} 
              readOnly={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
         <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Calculations: PF meas. = Cosine Theta = Watt Losses / (V out x I out)</p>

        {/* Injection at Primary Table */}
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Injection at Primary</h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">No.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Meas.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Test Mode</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Freq.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">V out (kV)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">*I out (mA)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">*Watt Losses (mW)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">PF Meas.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Cap meas. (pF)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Assessment</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.powerFactor.primary.tests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">{test.no}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.measurement}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.testMode}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.frequency}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.vOut}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.iOut} 
                      onChange={(e) => {
                        const newTests = [...formData.powerFactor.primary.tests];
                        newTests[index].iOut = e.target.value;
                        handleNestedChange('powerFactor', 'primary', { ...formData.powerFactor.primary, tests: newTests });
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.wattLosses} 
                      onChange={(e) => {
                        const newTests = [...formData.powerFactor.primary.tests];
                        newTests[index].wattLosses = e.target.value;
                        handleNestedChange('powerFactor', 'primary', { ...formData.powerFactor.primary, tests: newTests });
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.pfMeas} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.capMeas} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.assessment} 
                      readOnly 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed ${test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400 font-medium' : test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400 font-medium' : ''}`} 
                    />
                  </td>
                </tr>
              ))}
              {/* Placeholder for Cross Check Row */}
               <tr className="bg-gray-50 dark:bg-dark-200">
                 <td colSpan={3} className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 font-medium">Calculated Cross Check for ICHL</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">10.00</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">1.84</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">112.11</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">0.6093%</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
               </tr>
            </tbody>
          </table>
        </div>

        {/* Injection at Secondary Table */}
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Injection at Secondary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
             <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">No.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Meas.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Test Mode</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Freq.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">V out (kV)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">*I out (mA)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">*Watt Losses (mW)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">PF Meas.</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Cap meas. (pF)</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-r dark:border-gray-700">Assessment</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.powerFactor.secondary.tests.map((test, index) => (
                 <tr key={index}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">{test.no}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.measurement}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.testMode}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.frequency}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">{test.vOut}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.iOut} 
                      onChange={(e) => {
                        const newTests = [...formData.powerFactor.secondary.tests];
                        newTests[index].iOut = e.target.value;
                        handleNestedChange('powerFactor', 'secondary', { ...formData.powerFactor.secondary, tests: newTests });
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.wattLosses} 
                      onChange={(e) => {
                        const newTests = [...formData.powerFactor.secondary.tests];
                        newTests[index].wattLosses = e.target.value;
                        handleNestedChange('powerFactor', 'secondary', { ...formData.powerFactor.secondary, tests: newTests });
                      }} 
                      readOnly={!isEditing} 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`} 
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.pfMeas} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input type="text" value={test.capMeas} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed" />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    <input 
                      type="text" 
                      value={test.assessment} 
                      readOnly 
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm text-gray-900 dark:text-white text-center cursor-not-allowed ${test.assessment === 'Pass' ? 'text-green-600 dark:text-green-400 font-medium' : test.assessment === 'Fail' ? 'text-red-600 dark:text-red-400 font-medium' : ''}`} 
                    />
                  </td>
                </tr>
              ))}
              {/* Placeholder for Cross Check Row */}
               <tr className="bg-gray-50 dark:bg-dark-200">
                 <td colSpan={3} className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 font-medium">Calculated Cross Check for ICLH</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">0.10</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">27.53</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">2097.8</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700 text-center">0.7620%</td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
                 <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700"></td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

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
           {/* TTR Test Set Section */}
           <div className="grid grid-cols-3 gap-4 border-b dark:border-gray-700 pb-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TTR Test Set</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.ttrTestSet.name} 
                 onChange={(e) => handleNestedChange('testEquipment', 'ttrTestSet', { ...formData.testEquipment.ttrTestSet, name: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
         </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.ttrTestSet.serialNumber} 
                 onChange={(e) => handleNestedChange('testEquipment', 'ttrTestSet', { ...formData.testEquipment.ttrTestSet, serialNumber: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
      </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.ttrTestSet.ampId} 
                 onChange={(e) => handleNestedChange('testEquipment', 'ttrTestSet', { ...formData.testEquipment.ttrTestSet, ampId: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
           </div>
           {/* Winding Resistance Test Set Section */}
           <div className="grid grid-cols-3 gap-4 border-b dark:border-gray-700 pb-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Winding Resistance Test Set</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.windingResistanceTestSet.name} 
                 onChange={(e) => handleNestedChange('testEquipment', 'windingResistanceTestSet', { ...formData.testEquipment.windingResistanceTestSet, name: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.windingResistanceTestSet.serialNumber} 
                 onChange={(e) => handleNestedChange('testEquipment', 'windingResistanceTestSet', { ...formData.testEquipment.windingResistanceTestSet, serialNumber: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.windingResistanceTestSet.ampId} 
                 onChange={(e) => handleNestedChange('testEquipment', 'windingResistanceTestSet', { ...formData.testEquipment.windingResistanceTestSet, ampId: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
           </div>
           {/* Excitation Test Set Section */}
           <div className="grid grid-cols-3 gap-4 border-b dark:border-gray-700 pb-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Excitation Test Set</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.excitationTestSet.name} 
                 onChange={(e) => handleNestedChange('testEquipment', 'excitationTestSet', { ...formData.testEquipment.excitationTestSet, name: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.excitationTestSet.serialNumber} 
                 onChange={(e) => handleNestedChange('testEquipment', 'excitationTestSet', { ...formData.testEquipment.excitationTestSet, serialNumber: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.excitationTestSet.ampId} 
                 onChange={(e) => handleNestedChange('testEquipment', 'excitationTestSet', { ...formData.testEquipment.excitationTestSet, ampId: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
           </div>
           {/* Power Factor Test Set Section */}
           <div className="grid grid-cols-3 gap-4 border-b dark:border-gray-700 pb-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Power Factor Test Set</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.powerFactorTestSet.name} 
                 onChange={(e) => handleNestedChange('testEquipment', 'powerFactorTestSet', { ...formData.testEquipment.powerFactorTestSet, name: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.powerFactorTestSet.serialNumber} 
                 onChange={(e) => handleNestedChange('testEquipment', 'powerFactorTestSet', { ...formData.testEquipment.powerFactorTestSet, serialNumber: e.target.value })} 
                 readOnly={!isEditing}
                 className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
               <input 
                 type="text" 
                 value={formData.testEquipment.powerFactorTestSet.ampId} 
                 onChange={(e) => handleNestedChange('testEquipment', 'powerFactorTestSet', { ...formData.testEquipment.powerFactorTestSet, ampId: e.target.value })} 
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
    </div>
  );
};

export default OilInspectionReport; 