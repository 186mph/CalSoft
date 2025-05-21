import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { navigateAfterSave } from './ReportUtils';

const getVisualInspectionDescription = (section: string): string => {
  const descriptions: Record<string, string> = {
    '7.5.1.1.A.1': 'Compare equipment nameplate data with drawings and specifications.',
    '7.5.1.1.A.2': 'Inspect physical and mechanical condition.',
    '7.5.1.1.A.3': 'Inspect anchorage, alignment, grounding, and required clearances.',
    '7.5.1.1.A.4': 'Verify the unit is clean.',
    '7.5.1.1.A.5': 'Verify correct blade alignment, blade penetration, travel stops, and mechanical operation.',
    '7.5.1.1.A.6': 'Verify that fuse sizes and types are in accordance with drawings, short-circuit studies, and coordination study.',
    '7.5.1.1.A.7': 'Verify that each fuse has adequate mechanical support and contact integrity.',
    '7.5.1.1.A.8.1': 'Use of a low-resistance ohmmeter in accordance with Section 7.5.1.1.B.1.',
    '7.5.1.1.A.9': 'Verify operation and sequencing of interlocking systems.',
    '7.5.1.1.A.10': 'Verify correct phase barrier installation.',
    '7.5.1.1.A.11': 'Verify correct operation of all indicating and control devices.',
    '7.5.1.1.A.12': 'Verify appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.'
  };
  return descriptions[section] || '';
};

// Add these type definitions at the top of the file
type MeasurementValue = number | '';

interface Measurement {
  value: number | null;
  isEmpty: boolean;
}

interface MeasurementSet {
  'P1-P2': Measurement;
  'P2-P3': Measurement;
  'P3-P1': Measurement;
}

interface SinglePhaseMeasurementSet {
  'P1': Measurement;
  'P2': Measurement;
  'P3': Measurement;
}

interface InsulationResistanceData {
  testVoltage: string;
  units: typeof INSULATION_RESISTANCE_UNITS[number];
  poleToPole: MeasurementSet;
  poleToFrame: SinglePhaseMeasurementSet;
  lineToLoad: SinglePhaseMeasurementSet;
}

// Add this utility function before the component
const isNumber = (value: MeasurementValue): value is number => {
  return value !== '';
};

const createMeasurement = (value: string | number | null): Measurement => {
  if (value === '' || value === null) {
    return { value: null, isEmpty: true };
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return { value: numValue, isEmpty: false };
};

const applyTemperatureCorrection = (measurement: Measurement, tcf: number): Measurement => {
  if (measurement.isEmpty || measurement.value === null) {
    return { value: null, isEmpty: true };
  }
  const correctedValue = measurement.value * tcf;
  return { 
    value: correctedValue, 
    isEmpty: false
  };
};

interface FormData {
  // Job Information
  customer: string;
  address: string;
  user: string;
  date: string;
  jobNumber: string;
  technicians: string;
  substation: string;
  eqptLocation: string;
  identifier: string;

  // Environmental Data
  temperature: {
    fahrenheit: number;
    celsius: number;
    tcf: number;
  };
  humidity: number;

  // Enclosure Data
  manufacturer: string;
  catalogNo: string;
  serialNumber: string;
  series: string;
  type: string;
  systemVoltage: string;
  ratedVoltage: string;
  ratedCurrent: string;
  aicRating: string;
  phaseConfiguration: string;

  // Switch Data
  switchData: Array<{
    position: string;
    manufacturer: string;
    catalogNo: string;
    serialNo: string;
    type: string;
    ratedAmperage: string;
    ratedVoltage: string;
  }>;

  // Fuse Data
  fuseData: Array<{
    position: string;
    manufacturer: string;
    catalogNo: string;
    class: string;
    amperage: string;
    aic: string;
    voltage: string;
  }>;

  // Visual and Mechanical Inspection
  visualMechanicalInspection: {
    [key: string]: string;
  };

  // Insulation Resistance
  insulationResistance: InsulationResistanceData;

  // Test Equipment
  testEquipment: {
    megohmmeter: {
      model: string;
      serialNumber: string;
      ampId: string;
    };
    lowResistance: {
      model: string;
      serialNumber: string;
      ampId: string;
    };
  };

  // Contact Resistance
  contactResistance: {
    units: string;
    poleToPole: {
      'P1-P2': number | '';
      'P2-P3': number | '';
      'P3-P1': number | '';
    };
    poleToFrame: {
      'P1': number | '';
      'P2': number | '';
      'P3': number | '';
    };
    lineToLoad: {
      'P1': number | '';
      'P2': number | '';
      'P3': number | '';
    };
  };

  // Comments
  comments: {
    enclosure: string;
  };
}

const VOLTAGE_OPTIONS = ['240V', '480V', '600V', '4160V'];
const TEST_VOLTAGE_OPTIONS = ['250V', '500V', '1000V', '2500V', '5000V'];
const INSULATION_RESISTANCE_UNITS = ['kΩ', 'MΩ', 'GΩ'] as const;
const CONTACT_RESISTANCE_UNITS = ['μΩ', 'mΩ', 'Ω'] as const;

// Temperature conversion lookup table
const TEMP_CONVERSION_DATA: { fahrenheit: number; celsius: number }[] = [
  { fahrenheit: -11.2, celsius: -24 },
  { fahrenheit: -9.4, celsius: -23 },
  { fahrenheit: -7.6, celsius: -22 },
  { fahrenheit: -5.8, celsius: -21 },
  { fahrenheit: -4, celsius: -20 },
  { fahrenheit: -2.2, celsius: -19 },
  { fahrenheit: -0.4, celsius: -18 },
  { fahrenheit: 1.4, celsius: -17 },
  { fahrenheit: 3.2, celsius: -16 },
  { fahrenheit: 5, celsius: -15 },
  { fahrenheit: 6.8, celsius: -14 },
  { fahrenheit: 8.6, celsius: -13 },
  { fahrenheit: 10.4, celsius: -12 },
  { fahrenheit: 12.2, celsius: -11 },
  { fahrenheit: 14, celsius: -10 },
  { fahrenheit: 15.8, celsius: -9 },
  { fahrenheit: 17.6, celsius: -8 },
  { fahrenheit: 19.4, celsius: -7 },
  { fahrenheit: 21.2, celsius: -6 },
  { fahrenheit: 23, celsius: -5 },
  { fahrenheit: 24.8, celsius: -4 },
  { fahrenheit: 26.6, celsius: -3 },
  { fahrenheit: 28.4, celsius: -2 },
  { fahrenheit: 30.2, celsius: -1 },
  { fahrenheit: 32, celsius: 0 },
  { fahrenheit: 33.8, celsius: 1 },
  { fahrenheit: 35.6, celsius: 2 },
  { fahrenheit: 37.4, celsius: 3 },
  { fahrenheit: 39.2, celsius: 4 },
  { fahrenheit: 41, celsius: 5 },
  { fahrenheit: 42.8, celsius: 6 },
  { fahrenheit: 44.6, celsius: 7 },
  { fahrenheit: 46.4, celsius: 8 },
  { fahrenheit: 48.2, celsius: 9 },
  { fahrenheit: 50, celsius: 10 },
  { fahrenheit: 51.8, celsius: 11 },
  { fahrenheit: 53.6, celsius: 12 },
  { fahrenheit: 55.4, celsius: 13 },
  { fahrenheit: 57.2, celsius: 14 },
  { fahrenheit: 59, celsius: 15 },
  { fahrenheit: 60.8, celsius: 16 },
  { fahrenheit: 62.6, celsius: 17 },
  { fahrenheit: 64.4, celsius: 18 },
  { fahrenheit: 66.2, celsius: 19 },
  { fahrenheit: 68, celsius: 20 },
  { fahrenheit: 69.8, celsius: 21 },
  { fahrenheit: 71.6, celsius: 22 },
  { fahrenheit: 73.4, celsius: 23 },
  { fahrenheit: 75.2, celsius: 24 },
  { fahrenheit: 77, celsius: 25 },
  { fahrenheit: 78.8, celsius: 26 },
  { fahrenheit: 80.6, celsius: 27 },
  { fahrenheit: 82.4, celsius: 28 },
  { fahrenheit: 84.2, celsius: 29 },
  { fahrenheit: 86, celsius: 30 },
  { fahrenheit: 87.8, celsius: 31 },
  { fahrenheit: 89.6, celsius: 32 },
  { fahrenheit: 91.4, celsius: 33 },
  { fahrenheit: 93.2, celsius: 34 },
  { fahrenheit: 95, celsius: 35 },
  { fahrenheit: 96.8, celsius: 36 },
  { fahrenheit: 98.6, celsius: 37 },
  { fahrenheit: 100.4, celsius: 38 },
  { fahrenheit: 102.2, celsius: 39 },
  { fahrenheit: 104, celsius: 40 },
  { fahrenheit: 105.8, celsius: 41 },
  { fahrenheit: 107.6, celsius: 42 },
  { fahrenheit: 109.4, celsius: 43 },
  { fahrenheit: 111.2, celsius: 44 },
  { fahrenheit: 113, celsius: 45 },
  { fahrenheit: 114.8, celsius: 46 },
  { fahrenheit: 116.6, celsius: 47 },
  { fahrenheit: 118.4, celsius: 48 },
  { fahrenheit: 120.2, celsius: 49 },
  { fahrenheit: 122, celsius: 50 },
  { fahrenheit: 123.8, celsius: 51 },
  { fahrenheit: 125.6, celsius: 52 },
  { fahrenheit: 127.4, celsius: 53 },
  { fahrenheit: 129.2, celsius: 54 },
  { fahrenheit: 131, celsius: 55 },
  { fahrenheit: 132.8, celsius: 56 },
  { fahrenheit: 134.6, celsius: 57 },
  { fahrenheit: 136.4, celsius: 58 },
  { fahrenheit: 138.2, celsius: 59 },
  { fahrenheit: 140, celsius: 60 },
  { fahrenheit: 141.8, celsius: 61 },
  { fahrenheit: 143.6, celsius: 62 },
  { fahrenheit: 145.4, celsius: 63 },
  { fahrenheit: 147.2, celsius: 64 },
  { fahrenheit: 149, celsius: 65 },
  { fahrenheit: 150.8, celsius: 66 },
  { fahrenheit: 152.6, celsius: 67 },
  { fahrenheit: 154.4, celsius: 68 },
  { fahrenheit: 156.2, celsius: 69 },
  { fahrenheit: 158, celsius: 70 },
  { fahrenheit: 159.8, celsius: 71 },
  { fahrenheit: 161.6, celsius: 72 },
  { fahrenheit: 163.4, celsius: 73 },
  { fahrenheit: 165.2, celsius: 74 },
  { fahrenheit: 167, celsius: 75 },
  { fahrenheit: 168.8, celsius: 76 },
  { fahrenheit: 170.6, celsius: 77 },
  { fahrenheit: 172.4, celsius: 78 },
  { fahrenheit: 174.2, celsius: 79 },
  { fahrenheit: 176, celsius: 80 },
  { fahrenheit: 177.8, celsius: 81 },
  { fahrenheit: 179.6, celsius: 82 },
  { fahrenheit: 181.4, celsius: 83 },
  { fahrenheit: 183.2, celsius: 84 },
  { fahrenheit: 185, celsius: 85 },
  { fahrenheit: 186.8, celsius: 86 },
  { fahrenheit: 188.6, celsius: 87 },
  { fahrenheit: 190.4, celsius: 88 },
  { fahrenheit: 192.2, celsius: 89 },
  { fahrenheit: 194, celsius: 90 },
  { fahrenheit: 195.8, celsius: 91 },
  { fahrenheit: 197.6, celsius: 92 },
  { fahrenheit: 199.4, celsius: 93 },
  { fahrenheit: 201.2, celsius: 94 },
  { fahrenheit: 203, celsius: 95 },
  { fahrenheit: 204.8, celsius: 96 },
  { fahrenheit: 206.6, celsius: 97 },
  { fahrenheit: 208.4, celsius: 98 },
  { fahrenheit: 210.2, celsius: 99 },
  { fahrenheit: 212, celsius: 100 },
  { fahrenheit: 213.8, celsius: 101 },
  { fahrenheit: 215.6, celsius: 102 },
  { fahrenheit: 217.4, celsius: 103 },
  { fahrenheit: 219.2, celsius: 104 },
  { fahrenheit: 221, celsius: 105 },
  { fahrenheit: 222.8, celsius: 106 },
  { fahrenheit: 224.6, celsius: 107 },
  { fahrenheit: 226.4, celsius: 108 },
  { fahrenheit: 228.2, celsius: 109 },
  { fahrenheit: 230, celsius: 110 }
];

// TCF lookup table
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

// Convert Fahrenheit to Celsius using lookup table with interpolation
const fahrenheitToCelsius = (fahrenheit: number): number => {
  // Sort data points by fahrenheit value
  const sortedData = [...TEMP_CONVERSION_DATA].sort((a, b) => a.fahrenheit - b.fahrenheit);
  
  // Find exact match
  const exactMatch = sortedData.find(data => data.fahrenheit === fahrenheit);
  if (exactMatch) {
    return exactMatch.celsius;
  }

  // Find surrounding values for interpolation
  const lowerBound = sortedData.filter(data => data.fahrenheit <= fahrenheit).pop();
  const upperBound = sortedData.find(data => data.fahrenheit >= fahrenheit);

  if (!lowerBound || !upperBound) {
    // If temperature is out of range, fall back to formula
    return (fahrenheit - 32) * (5/9);
  }

  // Interpolate between the two values
  const ratio = (fahrenheit - lowerBound.fahrenheit) / (upperBound.fahrenheit - lowerBound.fahrenheit);
  return lowerBound.celsius + ratio * (upperBound.celsius - lowerBound.celsius);
};

// Calculate TCF using lookup table with interpolation
const calculateTCF = (tempF: number): number => {
  const tempC = fahrenheitToCelsius(tempF);
  
  // Sort data points by celsius value
  const sortedData = [...TCF_DATA].sort((a, b) => a.celsius - b.celsius);
  
  // Find exact match
  const exactMatch = sortedData.find(data => data.celsius === Math.round(tempC));
  if (exactMatch) {
    return exactMatch.multiplier;
  }

  // Find surrounding values for interpolation
  const lowerBound = sortedData.filter(data => data.celsius <= tempC).pop();
  const upperBound = sortedData.find(data => data.celsius >= tempC);

  if (!lowerBound || !upperBound) {
    // If temperature is out of range, return closest value
    return lowerBound ? lowerBound.multiplier : (upperBound ? upperBound.multiplier : 1);
  }

  // Interpolate between the two values
  const ratio = (tempC - lowerBound.celsius) / (upperBound.celsius - lowerBound.celsius);
  return lowerBound.multiplier + ratio * (upperBound.multiplier - lowerBound.multiplier);
};

// Add this after your existing constants
const INSPECTION_OPTIONS = [
  'Select One',
  'Satisfactory',
  'Unsatisfactory',
  'Cleaned',
  'See Comments',
  'Not Applicable'
] as const;

// Update the input handling for insulation resistance measurements
const getMeasurementValue = (measurement: Measurement): string => {
  return measurement.isEmpty || measurement.value === null ? '' : measurement.value.toString();
};

// Add this helper function at the top with other utility functions
const getMeasurementDisplayValue = (measurement: Measurement): string => {
  if (measurement.isEmpty || measurement.value === null) return '';
  return measurement.value.toString();
};

const getTemperatureCorrectedValue = (measurement: Measurement, tcf: number): string => {
  if (measurement.isEmpty || measurement.value === null) return '';
  return (measurement.value * tcf).toFixed(2);
};

export default function LowVoltageSwitchReport() {
  const { id: jobId, reportId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Add debug logging for URL parameters
  useEffect(() => {
    console.log('URL Parameters:', {
      jobId,
      reportId,
      pathname: location.pathname,
      search: location.search
    });
  }, [jobId, reportId, location]);

  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [isEditMode, setIsEditMode] = useState(!reportId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tcf, setTcf] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customer: '',
    address: '',
    user: user?.email || '',
    date: new Date().toISOString().split('T')[0],
    jobNumber: '',
    technicians: '',
    substation: '',
    eqptLocation: '',
    identifier: '',
    temperature: {
      fahrenheit: 68,
      celsius: 20,
      tcf: 1
    },
    humidity: 0,
    manufacturer: '',
    catalogNo: '',
    serialNumber: '',
    series: '',
    type: '',
    systemVoltage: '',
    ratedVoltage: '',
    ratedCurrent: '',
    aicRating: '',
    phaseConfiguration: '',
    switchData: [{
      position: '',
      manufacturer: '',
      catalogNo: '',
      serialNo: '',
      type: '',
      ratedAmperage: '',
      ratedVoltage: ''
    }],
    fuseData: [{
      position: '',
      manufacturer: '',
      catalogNo: '',
      class: '',
      amperage: '',
      aic: '',
      voltage: ''
    }],
    insulationResistance: {
      testVoltage: '1000V',
      units: 'MΩ',
      poleToPole: {
        'P1-P2': { value: null, isEmpty: true },
        'P2-P3': { value: null, isEmpty: true },
        'P3-P1': { value: null, isEmpty: true }
      },
      poleToFrame: {
        'P1': { value: null, isEmpty: true },
        'P2': { value: null, isEmpty: true },
        'P3': { value: null, isEmpty: true }
      },
      lineToLoad: {
        'P1': { value: null, isEmpty: true },
        'P2': { value: null, isEmpty: true },
        'P3': { value: null, isEmpty: true }
      }
    },
    testEquipment: {
      megohmmeter: {
        model: '',
        serialNumber: '',
        ampId: ''
      },
      lowResistance: {
        model: '',
        serialNumber: '',
        ampId: ''
      }
    },
    visualMechanicalInspection: {
      '7.5.1.1.A.1': '',
      '7.5.1.1.A.2': '',
      '7.5.1.1.A.3': '',
      '7.5.1.1.A.4': '',
      '7.5.1.1.A.5': '',
      '7.5.1.1.A.6': '',
      '7.5.1.1.A.7': '',
      '7.5.1.1.A.8.1': '',
      '7.5.1.1.A.9': '',
      '7.5.1.1.A.10': '',
      '7.5.1.1.A.11': '',
      '7.5.1.1.A.12': ''
    },
    contactResistance: {
      units: 'μΩ',
      poleToPole: {
        'P1-P2': '',
        'P2-P3': '',
        'P3-P1': ''
      },
      poleToFrame: {
        'P1': '',
        'P2': '',
        'P3': ''
      },
      lineToLoad: {
        'P1': '',
        'P2': '',
        'P3': ''
      }
    },
    comments: {
      enclosure: ''
    }
  });

  // Load job info
  useEffect(() => {
    const loadJobInfo = async () => {
      if (!jobId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const { data: jobData, error: jobError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select(`title, job_number, customer_id`)
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        if (jobData?.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select(`name, company_name, address`)
            .eq('id', jobData.customer_id)
            .single();
            
          if (!customerError && customerData) {
            setFormData(currentData => ({
              ...currentData,
              customer: customerData.company_name || customerData.name || '',
              address: customerData.address || '',
              jobNumber: jobData.job_number || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error loading job info:', error);
        toast.error(`Failed to load job info: ${(error as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadJobInfo();
  }, [jobId]);

  // Load existing report
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
          .schema('neta_ops')
          .from('low_voltage_switch_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            ...formData,
            ...data.report_info,
            switchData: data.switch_data || formData.switchData,
            fuseData: data.fuse_data || formData.fuseData,
            visualMechanicalInspection: data.visual_inspection || formData.visualMechanicalInspection,
            insulationResistance: data.insulation_resistance || formData.insulationResistance,
            contactResistance: data.contact_resistance || formData.contactResistance,
            testEquipment: data.test_equipment || formData.testEquipment,
            comments: {
              enclosure: data.comments || ''
            }
          });
          setStatus(data.status || 'PENDING');
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Error loading report:', error);
        toast.error(`Failed to load report: ${(error as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  // Update TCF when temperature changes
  useEffect(() => {
    setTcf(calculateTCF(formData.temperature.fahrenheit));
  }, [formData.temperature.fahrenheit]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: FormData) => {
      if (field.includes('.')) {
        const [section, subfield] = field.split('.');
        const sectionKey = section as keyof FormData;
        const prevSection = prev[sectionKey] as Record<string, any>;
        
        return {
          ...prev,
          [section]: {
            ...prevSection,
            [subfield]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleNestedChange = (section: keyof FormData, field: string, value: any) => {
    setFormData(prev => {
      const updatedData = { ...prev };
      if (section === 'insulationResistance') {
        updatedData.insulationResistance = {
          ...prev.insulationResistance,
          [field]: value
        };
      } else if (section === 'testEquipment') {
        updatedData.testEquipment = {
          ...prev.testEquipment,
          [field]: value
        };
      } else if (section === 'visualMechanicalInspection') {
        updatedData.visualMechanicalInspection = {
          ...prev.visualMechanicalInspection,
          [field]: value
        };
      } else if (section === 'contactResistance') {
        updatedData.contactResistance = {
          ...prev.contactResistance,
          [field]: value
        };
      }
      return updatedData;
    });
  };

  const handleSave = async () => {
    console.log('Save attempt with params:', { jobId, reportId, user: user?.id, isEditMode });
    
    if (!jobId || !user?.id || !isEditMode) {
      console.log('Save conditions not met:', { jobId, userId: user?.id, isEditMode });
      toast.error('Missing required information: ' + 
        (!jobId ? 'Job ID is missing. ' : '') +
        (!user?.id ? 'User is not logged in. ' : '') +
        (!isEditMode ? 'Not in edit mode. ' : '')
      );
      return;
    }

    try {
      console.log('Starting save process...');
      setSaving(true);
      let result;

      const reportData = {
        job_id: jobId,
        user_id: user.id,
        report_info: {
          customer: formData.customer,
          address: formData.address,
          user: formData.user,
          date: formData.date,
          jobNumber: formData.jobNumber,
          technicians: formData.technicians,
          substation: formData.substation,
          eqptLocation: formData.eqptLocation,
          identifier: formData.identifier,
          temperature: formData.temperature.fahrenheit,
          humidity: formData.humidity,
          manufacturer: formData.manufacturer,
          catalogNo: formData.catalogNo,
          serialNumber: formData.serialNumber,
          series: formData.series,
          type: formData.type,
          systemVoltage: formData.systemVoltage,
          ratedVoltage: formData.ratedVoltage,
          ratedCurrent: formData.ratedCurrent,
          aicRating: formData.aicRating,
          phaseConfiguration: formData.phaseConfiguration,
          status
        },
        switch_data: formData.switchData,
        fuse_data: formData.fuseData,
        visual_inspection: formData.visualMechanicalInspection,
        insulation_resistance: formData.insulationResistance,
        temp_corrected_insulation: {
          tcf,
          values: {
            poleToPole: {
              'P1-P2': applyTemperatureCorrection(formData.insulationResistance.poleToPole['P1-P2'], tcf),
              'P2-P3': applyTemperatureCorrection(formData.insulationResistance.poleToPole['P2-P3'], tcf),
              'P3-P1': applyTemperatureCorrection(formData.insulationResistance.poleToPole['P3-P1'], tcf)
            },
            poleToFrame: {
              'P1': applyTemperatureCorrection(formData.insulationResistance.poleToFrame['P1'], tcf),
              'P2': applyTemperatureCorrection(formData.insulationResistance.poleToFrame['P2'], tcf),
              'P3': applyTemperatureCorrection(formData.insulationResistance.poleToFrame['P3'], tcf)
            },
            lineToLoad: {
              'P1': applyTemperatureCorrection(formData.insulationResistance.lineToLoad['P1'], tcf),
              'P2': applyTemperatureCorrection(formData.insulationResistance.lineToLoad['P2'], tcf),
              'P3': applyTemperatureCorrection(formData.insulationResistance.lineToLoad['P3'], tcf)
            }
          }
        },
        contact_resistance: formData.contactResistance,
        test_equipment: formData.testEquipment,
        comments: formData.comments.enclosure
      };

      try {
        let result;
        if (reportId) {
          // Update existing report
          result = await supabase
            .schema('neta_ops')
            .from('low_voltage_switch_reports')
            .update(reportData)
            .eq('id', reportId)
            .select()
            .single();
        } else {
          // Create new report
          result = await supabase
            .schema('neta_ops')
            .from('low_voltage_switch_reports')
            .insert(reportData)
            .select()
            .single();

          // Create asset entry for the report
          if (result.data) {
            const assetData = {
              name: `Low Voltage Switch Report - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
              file_url: `report:/jobs/${jobId}/low-voltage-switch-report/${result.data.id}`,
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

        setIsEditMode(false);
        toast.success(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
        navigate(`/jobs/${jobId}?tab=assets`);
      } catch (error: any) {
        console.error('Error saving report:', error);
        toast.error(`Failed to save report: ${error?.message || 'Unknown error'}`);
      } finally {
        setSaving(false);
      }
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast.error(`Failed to save report: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reportId || !window.confirm('Are you sure you want to delete this report?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .schema('neta_ops')
        .from('low_voltage_switch_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Report deleted successfully');
      navigate(`/jobs/${jobId}/reports`);
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(`Failed to delete report: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="p-6 flex justify-center">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Low Voltage Switch Report
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isEditMode) {
                  setStatus(status === 'PASS' ? 'FAIL' : 'PASS');
                }
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                status === 'PASS'
                  ? 'bg-green-600 text-white focus:ring-green-500'
                  : 'bg-red-600 text-white focus:ring-red-500'
              } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              {status}
            </button>

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
                disabled={!isEditMode || saving}
                className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                  !isEditMode || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            )}
          </div>
        </div>

        {/* Job Information */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Job Information
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => handleChange('customer', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Job #
              </label>
              <input
                type="text"
                value={formData.jobNumber}
                onChange={(e) => handleChange('jobNumber', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Identifier
              </label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => handleChange('identifier', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Technicians
              </label>
              <input
                type="text"
                value={formData.technicians}
                onChange={(e) => handleChange('technicians', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Substation
              </label>
              <input
                type="text"
                value={formData.substation}
                onChange={(e) => handleChange('substation', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Eqpt. Location
              </label>
              <input
                type="text"
                value={formData.eqptLocation}
                onChange={(e) => handleChange('eqptLocation', e.target.value)}
                readOnly={!isEditMode}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Temperature
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.temperature.fahrenheit}
                    onChange={(e) => handleChange('temperature', { ...formData.temperature, fahrenheit: Number(e.target.value) })}
                    readOnly={!isEditMode}
                    className={`block w-20 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-600 dark:text-gray-400">°F</span>
                  <input
                    type="number"
                    value={formData.temperature.celsius}
                    readOnly
                    className="block w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 text-base"
                  />
                  <span className="text-gray-600 dark:text-gray-400">°C</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-4">TCF</span>
                  <input
                    type="number"
                    value={tcf}
                    readOnly
                    className="block w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Humidity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.humidity}
                    onChange={(e) => handleChange('humidity', Number(e.target.value))}
                    readOnly={!isEditMode}
                    className={`block w-20 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-600 dark:text-gray-400">%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enclosure Data */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Enclosure Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="manufacturer" className="form-label">Manufacturer:</label>
              <input
                type="text"
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="catalogNo" className="form-label">Catalog No:</label>
              <input
                type="text"
                id="catalogNo"
                value={formData.catalogNo}
                onChange={(e) => handleChange('catalogNo', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="form-label">Serial Number:</label>
              <input
                type="text"
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="series" className="form-label">Series:</label>
              <input
                type="text"
                id="series"
                value={formData.series}
                onChange={(e) => handleChange('series', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="type" className="form-label">Type:</label>
              <input
                type="text"
                id="type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="systemVoltage" className="form-label">System Voltage:</label>
              <input
                type="text"
                id="systemVoltage"
                value={formData.systemVoltage}
                onChange={(e) => handleChange('systemVoltage', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="ratedVoltage" className="form-label">Rated Voltage:</label>
              <input
                type="text"
                id="ratedVoltage"
                value={formData.ratedVoltage}
                onChange={(e) => handleChange('ratedVoltage', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="ratedCurrent" className="form-label">Rated Current:</label>
              <input
                type="text"
                id="ratedCurrent"
                value={formData.ratedCurrent}
                onChange={(e) => handleChange('ratedCurrent', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="aicRating" className="form-label">AIC Rating:</label>
              <input
                type="text"
                id="aicRating"
                value={formData.aicRating}
                onChange={(e) => handleChange('aicRating', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="phaseConfiguration" className="form-label">Phase Configuration:</label>
              <input
                type="text"
                id="phaseConfiguration"
                value={formData.phaseConfiguration}
                onChange={(e) => handleChange('phaseConfiguration', e.target.value)}
                readOnly={!isEditMode}
                className="form-input"
              />
            </div>
          </div>
        </section>

        {/* Switch Data Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Switch Data
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Position / Identifier</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Manufacturer</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Catalog No.</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Serial No.</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Type</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={2}>Rated</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200" colSpan={4}></th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Amperage</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Voltage</th>
                </tr>
              </thead>
              <tbody>
                {formData.switchData.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.position}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, position: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.manufacturer}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, manufacturer: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.catalogNo}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, catalogNo: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.serialNo}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, serialNo: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.type}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, type: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.ratedAmperage}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, ratedAmperage: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.ratedVoltage}
                        onChange={(e) => {
                          const newSwitchData = [...formData.switchData];
                          newSwitchData[index] = { ...item, ratedVoltage: e.target.value };
                          setFormData({ ...formData, switchData: newSwitchData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Fuse Data Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Fuse Data
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Position / Identifier</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Manufacturer</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Catalog No.</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Class</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Rated</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200" colSpan={4}></th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Amperage</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">AIC</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">Voltage</th>
                </tr>
              </thead>
              <tbody>
                {formData.fuseData.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.position}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, position: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.manufacturer}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, manufacturer: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.catalogNo}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, catalogNo: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.class}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, class: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.amperage}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, amperage: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.aic}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, aic: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      <input
                        type="text"
                        value={item.voltage}
                        onChange={(e) => {
                          const newFuseData = [...formData.fuseData];
                          newFuseData[index] = { ...item, voltage: e.target.value };
                          setFormData({ ...formData, fuseData: newFuseData });
                        }}
                        readOnly={!isEditMode}
                        className="form-input w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Measured Insulation Resistance Values */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Measured Insulation Resistance Values
          </h2>
          <div className="mb-4 flex items-center gap-4">
            <div>
              <label htmlFor="testVoltage" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Test Voltage:</label>
              <select
                id="testVoltage"
                value={formData.insulationResistance.testVoltage}
                onChange={(e) => handleChange('insulationResistance.testVoltage', e.target.value)}
                disabled={!isEditMode}
                className={`block w-32 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              >
                {TEST_VOLTAGE_OPTIONS.map(voltage => (
                  <option key={voltage} value={voltage}>{voltage}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="irUnits" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Units:</label>
              <select
                id="irUnits"
                value={formData.insulationResistance.units}
                onChange={(e) => handleChange('insulationResistance.units', e.target.value)}
                disabled={!isEditMode}
                className={`block w-24 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              >
                {INSULATION_RESISTANCE_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Pole</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Frame</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Line-to-Load</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1-P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2-P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3-P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToPole['P1-P2'])}
                      onChange={(e) => handleChange('insulationResistance.poleToPole', { 
                        ...formData.insulationResistance.poleToPole, 
                        'P1-P2': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToPole['P2-P3'])}
                      onChange={(e) => handleChange('insulationResistance.poleToPole', { 
                        ...formData.insulationResistance.poleToPole, 
                        'P2-P3': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToPole['P3-P1'])}
                      onChange={(e) => handleChange('insulationResistance.poleToPole', { 
                        ...formData.insulationResistance.poleToPole, 
                        'P3-P1': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToFrame['P1'])}
                      onChange={(e) => handleChange('insulationResistance.poleToFrame', { 
                        ...formData.insulationResistance.poleToFrame, 
                        'P1': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToFrame['P2'])}
                      onChange={(e) => handleChange('insulationResistance.poleToFrame', { 
                        ...formData.insulationResistance.poleToFrame, 
                        'P2': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.poleToFrame['P3'])}
                      onChange={(e) => handleChange('insulationResistance.poleToFrame', { 
                        ...formData.insulationResistance.poleToFrame, 
                        'P3': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.lineToLoad['P1'])}
                      onChange={(e) => handleChange('insulationResistance.lineToLoad', { 
                        ...formData.insulationResistance.lineToLoad, 
                        'P1': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.lineToLoad['P2'])}
                      onChange={(e) => handleChange('insulationResistance.lineToLoad', { 
                        ...formData.insulationResistance.lineToLoad, 
                        'P2': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={getMeasurementDisplayValue(formData.insulationResistance.lineToLoad['P3'])}
                      onChange={(e) => handleChange('insulationResistance.lineToLoad', { 
                        ...formData.insulationResistance.lineToLoad, 
                        'P3': createMeasurement(e.target.value) 
                      })}
                      readOnly={!isEditMode}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Temperature Corrected Insulation Resistance Values */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Temperature Corrected Insulation Resistance Values
          </h2>
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300">
              Temperature Correction Factor (TCF): {tcf}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Pole</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Frame</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Line-to-Load</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1-P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2-P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3-P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToPole['P1-P2'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToPole['P2-P3'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToPole['P3-P1'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToFrame['P1'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToFrame['P2'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.poleToFrame['P3'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.lineToLoad['P1'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.lineToLoad['P2'], tcf)}
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <div className="text-center text-gray-900 dark:text-white">
                      {getTemperatureCorrectedValue(formData.insulationResistance.lineToLoad['P3'], tcf)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact Resistance */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Contact Resistance
          </h2>
          <div className="mb-4">
            <label htmlFor="crUnits" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Units:</label>
            <select
              id="crUnits"
              value={formData.contactResistance.units}
              onChange={(e) => handleChange('contactResistance.units', e.target.value)}
              disabled={!isEditMode}
              className={`block w-24 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-base ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {CONTACT_RESISTANCE_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Pole</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Pole-to-Frame</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal text-center" colSpan={3}>Line-to-Load</th>
                </tr>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1-P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2-P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3-P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P1</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P2</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-200 font-normal">P3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToPole['P1-P2']}
                      onChange={(e) => handleChange('contactResistance.poleToPole', { ...formData.contactResistance.poleToPole, 'P1-P2': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToPole['P2-P3']}
                      onChange={(e) => handleChange('contactResistance.poleToPole', { ...formData.contactResistance.poleToPole, 'P2-P3': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToPole['P3-P1']}
                      onChange={(e) => handleChange('contactResistance.poleToPole', { ...formData.contactResistance.poleToPole, 'P3-P1': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToFrame['P1']}
                      onChange={(e) => handleChange('contactResistance.poleToFrame', { ...formData.contactResistance.poleToFrame, 'P1': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToFrame['P2']}
                      onChange={(e) => handleChange('contactResistance.poleToFrame', { ...formData.contactResistance.poleToFrame, 'P2': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.poleToFrame['P3']}
                      onChange={(e) => handleChange('contactResistance.poleToFrame', { ...formData.contactResistance.poleToFrame, 'P3': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.lineToLoad['P1']}
                      onChange={(e) => handleChange('contactResistance.lineToLoad', { ...formData.contactResistance.lineToLoad, 'P1': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.lineToLoad['P2']}
                      onChange={(e) => handleChange('contactResistance.lineToLoad', { ...formData.contactResistance.lineToLoad, 'P2': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-1">
                    <input
                      type="number"
                      value={formData.contactResistance.lineToLoad['P3']}
                      onChange={(e) => handleChange('contactResistance.lineToLoad', { ...formData.contactResistance.lineToLoad, 'P3': Number(e.target.value) })}
                      readOnly={!isEditMode}
                      className="form-input w-full"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Visual & Mechanical Inspection */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Visual & Mechanical Inspection
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-dark-200 font-normal text-left">Section</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-dark-200 font-normal text-left">Description</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-dark-200 font-normal text-left">Results</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(formData.visualMechanicalInspection).map(([key, value], index) => (
                  <tr key={index}>
                    <td className="border border-gray-200 dark:border-gray-700 p-2">{key}</td>
                    <td className="border border-gray-200 dark:border-gray-700 p-2">
                      {getVisualInspectionDescription(key)}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 p-2">
                      <select
                        value={value}
                        onChange={(e) => handleChange('visualMechanicalInspection', { ...formData.visualMechanicalInspection, [key]: e.target.value })}
                        disabled={!isEditMode}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      >
                        <option value="">Select One</option>
                        <option value="Satisfactory">Satisfactory</option>
                        <option value="Unsatisfactory">Unsatisfactory</option>
                        <option value="Cleaned">Cleaned</option>
                        <option value="See Comments">See Comments</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Test Equipment */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Test Equipment Used
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="text-right font-medium text-gray-700 dark:text-white">
                Megohmmeter:
              </div>
              <div>
                <input
                  type="text"
                  value={formData.testEquipment.megohmmeter.model}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    megohmmeter: { ...formData.testEquipment.megohmmeter, model: e.target.value }
                  })}
                  placeholder="Fluke 1587FC"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-gray-700 dark:text-white">Serial Number:</span>
                <input
                  type="text"
                  value={formData.testEquipment.megohmmeter.serialNumber}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    megohmmeter: { ...formData.testEquipment.megohmmeter, serialNumber: e.target.value }
                  })}
                  placeholder="Test"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-gray-700 dark:text-white">AMP ID:</span>
                <input
                  type="text"
                  value={formData.testEquipment.megohmmeter.ampId}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    megohmmeter: { ...formData.testEquipment.megohmmeter, ampId: e.target.value }
                  })}
                  placeholder="Test"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="text-right font-medium text-gray-700 dark:text-white">
                Low Resistance:
              </div>
              <div>
                <input
                  type="text"
                  value={formData.testEquipment.lowResistance.model}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    lowResistance: { ...formData.testEquipment.lowResistance, model: e.target.value }
                  })}
                  placeholder="Megger DLRO"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-gray-700 dark:text-white">Serial Number:</span>
                <input
                  type="text"
                  value={formData.testEquipment.lowResistance.serialNumber}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    lowResistance: { ...formData.testEquipment.lowResistance, serialNumber: e.target.value }
                  })}
                  placeholder="Test"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-gray-700 dark:text-white">AMP ID:</span>
                <input
                  type="text"
                  value={formData.testEquipment.lowResistance.ampId}
                  onChange={(e) => handleChange('testEquipment', {
                    ...formData.testEquipment,
                    lowResistance: { ...formData.testEquipment.lowResistance, ampId: e.target.value }
                  })}
                  placeholder="Test"
                  readOnly={!isEditMode}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Comments */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Comments
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                Enclosure:
              </label>
              <textarea
                value={formData.comments.enclosure}
                onChange={(e) => handleChange('comments', { ...formData.comments, enclosure: e.target.value })}
                readOnly={!isEditMode}
                rows={6}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}