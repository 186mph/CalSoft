import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import toast from 'react-hot-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// UI Components
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';

// Types
const TestStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL'
};

const CablePhase = {
  A: "A",
  B: "B",
  C: "C",
  N: "N"
};

const InspectionResult = {
  SELECT: 'select one',
  SATISFACTORY: 'satisfactory',
  UNSATISFACTORY: 'unsatisfactory',
  CLEANED: 'cleaned',
  SEE_COMMENTS: 'see comments',
  NONE: 'none of the above'
};

// Unit Options
const continuityUnits = [
  { label: 'Ohms', symbol: 'Ω' },
  { label: 'Milliohms', symbol: 'mΩ' },
  { label: 'Microohms', symbol: 'μΩ' }
];

const insulationTestVoltages = [
  { label: '500 V', value: '500' },
  { label: '1000 V', value: '1000' },
  { label: '2500 V', value: '2500' },
  { label: '5000 V', value: '5000' },
  { label: '10000 V', value: '10000' }
];

const insulationUnits = [
  { label: 'Gigaohms', symbol: 'GΩ' },
  { label: 'Megaohms', symbol: 'MΩ' },
  { label: 'kilaohms', symbol: 'kΩ' }
];

// Current units for withstand test
const currentUnits = [
  { label: 'Milliamps', symbol: 'mA' },
  { label: 'Microamps', symbol: 'µA' }
];

// Replace interface with a comment
// MediumVoltageVLFReport structure:
// {
//   reportInfo: { title, date, location, technicians, ... },
//   status: 'PASS' | 'FAIL',
//   customerName: string,
//   ...
// }

// Get temperature correction factor
const getTCF = (celsius) => {
  // Temperature correction factors based on 20°C reference temperature
  const tempFactors = [
    { temp: -24, factor: 0.054 },
    { temp: -23, factor: 0.068 },
    { temp: -22, factor: 0.082 },
    { temp: -21, factor: 0.096 },
    { temp: -20, factor: 0.11 },
    { temp: -19, factor: 0.124 },
    { temp: -18, factor: 0.138 },
    { temp: -17, factor: 0.152 },
    { temp: -16, factor: 0.166 },
    { temp: -15, factor: 0.18 },
    { temp: -14, factor: 0.194 },
    { temp: -13, factor: 0.208 },
    { temp: -12, factor: 0.222 },
    { temp: -11, factor: 0.236 },
    { temp: -10, factor: 0.25 },
    { temp: -9, factor: 0.264 },
    { temp: -8, factor: 0.278 },
    { temp: -7, factor: 0.292 },
    { temp: -6, factor: 0.306 },
    { temp: -5, factor: 0.32 },
    { temp: -4, factor: 0.336 },
    { temp: -3, factor: 0.352 },
    { temp: -2, factor: 0.368 },
    { temp: -1, factor: 0.384 },
    { temp: 0, factor: 0.4 },
    { temp: 1, factor: 0.42 },
    { temp: 2, factor: 0.44 },
    { temp: 3, factor: 0.46 },
    { temp: 4, factor: 0.48 },
    { temp: 5, factor: 0.5 },
    { temp: 6, factor: 0.526 },
    { temp: 7, factor: 0.552 },
    { temp: 8, factor: 0.578 },
    { temp: 9, factor: 0.604 },
    { temp: 10, factor: 0.63 },
    { temp: 11, factor: 0.666 },
    { temp: 12, factor: 0.702 },
    { temp: 13, factor: 0.738 },
    { temp: 14, factor: 0.774 },
    { temp: 15, factor: 0.81 },
    { temp: 16, factor: 0.848 },
    { temp: 17, factor: 0.886 },
    { temp: 18, factor: 0.924 },
    { temp: 19, factor: 0.962 },
    { temp: 20, factor: 1.0 }, // Reference temperature
    { temp: 21, factor: 1.05 },
    { temp: 22, factor: 1.1 },
    { temp: 23, factor: 1.15 },
    { temp: 24, factor: 1.2 },
    { temp: 25, factor: 1.25 },
    { temp: 26, factor: 1.316 },
    { temp: 27, factor: 1.382 },
    { temp: 28, factor: 1.448 },
    { temp: 29, factor: 1.514 },
    { temp: 30, factor: 1.58 },
    { temp: 31, factor: 1.664 },
    { temp: 32, factor: 1.748 },
    { temp: 33, factor: 1.832 },
    { temp: 34, factor: 1.872 },
    { temp: 35, factor: 2.0 },
    { temp: 36, factor: 2.1 },
    { temp: 37, factor: 2.2 },
    { temp: 38, factor: 2.3 },
    { temp: 39, factor: 2.4 },
    { temp: 40, factor: 2.5 },
    { temp: 41, factor: 2.628 },
    { temp: 42, factor: 2.756 },
    { temp: 43, factor: 2.884 },
    { temp: 44, factor: 3.012 },
    { temp: 45, factor: 3.15 },
    { temp: 46, factor: 3.316 },
    { temp: 47, factor: 3.482 },
    { temp: 48, factor: 3.648 },
    { temp: 49, factor: 3.814 },
    { temp: 50, factor: 3.98 },
    { temp: 51, factor: 4.184 },
    { temp: 52, factor: 4.388 },
    { temp: 53, factor: 4.592 },
    { temp: 54, factor: 4.796 },
    { temp: 55, factor: 5.0 },
    { temp: 56, factor: 5.26 },
    { temp: 57, factor: 5.52 },
    { temp: 58, factor: 5.78 },
    { temp: 59, factor: 6.04 },
    { temp: 60, factor: 6.3 },
    { temp: 61, factor: 6.62 },
    { temp: 62, factor: 6.94 },
    { temp: 63, factor: 7.26 },
    { temp: 64, factor: 7.58 },
    { temp: 65, factor: 7.9 },
    { temp: 66, factor: 8.32 },
    { temp: 67, factor: 8.74 },
    { temp: 68, factor: 9.16 },
    { temp: 69, factor: 9.58 },
    { temp: 70, factor: 10.0 },
    { temp: 71, factor: 10.52 },
    { temp: 72, factor: 11.04 },
    { temp: 73, factor: 11.56 },
    { temp: 74, factor: 12.08 },
    { temp: 75, factor: 12.6 },
    { temp: 76, factor: 13.24 },
    { temp: 77, factor: 13.88 },
    { temp: 78, factor: 14.52 },
    { temp: 79, factor: 15.16 },
    { temp: 80, factor: 15.8 },
    { temp: 81, factor: 16.64 },
    { temp: 82, factor: 17.48 },
    { temp: 83, factor: 18.32 },
    { temp: 84, factor: 19.16 },
    { temp: 85, factor: 20.0 },
    { temp: 86, factor: 21.04 },
    { temp: 87, factor: 22.08 },
    { temp: 88, factor: 23.12 },
    { temp: 89, factor: 24.16 },
    { temp: 90, factor: 25.2 },
    { temp: 91, factor: 26.45 },
    { temp: 92, factor: 27.7 },
    { temp: 93, factor: 28.95 },
    { temp: 94, factor: 30.2 },
    { temp: 95, factor: 31.6 },
    { temp: 96, factor: 33.28 },
    { temp: 97, factor: 34.96 },
    { temp: 98, factor: 36.64 },
    { temp: 99, factor: 38.32 },
    { temp: 100, factor: 40.0 },
    { temp: 101, factor: 42.08 },
    { temp: 102, factor: 44.16 },
    { temp: 103, factor: 46.24 },
    { temp: 104, factor: 48.32 },
    { temp: 105, factor: 50.4 },
    { temp: 106, factor: 52.96 },
    { temp: 107, factor: 55.52 },
    { temp: 108, factor: 58.08 },
    { temp: 109, factor: 60.64 },
    { temp: 110, factor: 63.2 }
  ];
  
  // Find exact match or interpolate
  const exactMatch = tempFactors.find(tf => tf.temp === celsius);
  if (exactMatch) return exactMatch.factor;
  
  // Interpolate between closest values
  const lowerFactor = tempFactors.filter(tf => tf.temp < celsius).pop();
  const upperFactor = tempFactors.find(tf => tf.temp > celsius);
  
  if (!lowerFactor || !upperFactor) {
    // Outside range, use closest value
    return tempFactors.reduce((prev, curr) => 
      Math.abs(curr.temp - celsius) < Math.abs(prev.temp - celsius) ? curr : prev
    ).factor;
  }
  
  // Linear interpolation
  const range = upperFactor.temp - lowerFactor.temp;
  const ratio = (celsius - lowerFactor.temp) / range;
  return lowerFactor.factor + ratio * (upperFactor.factor - lowerFactor.factor);
};

// Add TanDeltaChart component 
const TanDeltaChart = ({ values, chartData, systemVoltageL2G }) => {
  // Use chartData if provided, otherwise generate from values
  const data = chartData || getChartData();

  function getChartData() {
    return values?.map(value => {
      // Parse the voltage step (e.g. "0.5 Uo" -> 0.5)
      const stepMatch = value?.voltageStep?.match(/(\d+\.?\d*)/) || [0, 0];
      const stepFactor = parseFloat(stepMatch[1]) || 0;
      
      // Use kV as is or calculate from systemVoltageL2G and voltage step
      const kV = value?.kV !== undefined && value?.kV !== '' 
        ? parseFloat(value.kV) 
        : parseFloat(systemVoltageL2G || 14.4) * stepFactor;

      return {
        name: value?.voltageStep || '',
        kV: kV,
        phaseA: parseFloat(value?.phaseA?.td) || 0,
        phaseB: parseFloat(value?.phaseB?.td) || 0,
        phaseC: parseFloat(value?.phaseC?.td) || 0
      };
    }) || [];
  }

  if (data.length === 0) {
    return <div className="text-center p-4">No data available for chart</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="kV"
            label={{ value: 'Test Voltage (kV)', position: 'insideBottomRight', offset: -5 }} 
          />
          <YAxis 
            label={{ value: 'Tan Delta (E-3)', angle: -90, position: 'insideLeft', offset: 10 }}
            domain={['auto', 'auto']} 
          />
          <Tooltip 
            formatter={(value) => [value.toFixed(2), 'Tan Delta (E-3)']}
            labelFormatter={(value) => `Test Voltage: ${value} kV`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="phaseA" 
            name="Phase A" 
            stroke="#1E40AF" /* Blue to match the table header */ 
            activeDot={{ r: 8 }} 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="phaseB" 
            name="Phase B" 
            stroke="#DC2626" /* Red to match the table header */
            activeDot={{ r: 8 }} 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="phaseC" 
            name="Phase C" 
            stroke="#15803D" /* Green to match the table header */
            activeDot={{ r: 8 }} 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const MediumVoltageCableVLFTest = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // State for IDs, loading, saving, edit mode, and errors
  const [jobId, setJobId] = useState(undefined);
  const [reportId, setReportId] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // Default to view mode
  const [error, setError] = useState(null);
  
  // Parse URL for jobId and reportId on mount and path change
  useEffect(() => {
    console.log('Parsing URL:', location.pathname);
    const pathParts = location.pathname.split('/').filter(part => part !== ''); // Remove empty parts
    const jobsIndex = pathParts.findIndex(part => part === 'jobs');
    let extractedJobId = undefined;
    let extractedReportId = undefined;

    if (jobsIndex !== -1 && jobsIndex + 1 < pathParts.length) {
      extractedJobId = pathParts[jobsIndex + 1];
      console.log('Extracted Job ID:', extractedJobId);
      // Check if there's a report ID after the job ID and report type
      // Example: /jobs/{jobId}/medium-voltage-vlf-report/{reportId}
      if (jobsIndex + 3 < pathParts.length) {
         extractedReportId = pathParts[jobsIndex + 3];
         console.log('Extracted Report ID:', extractedReportId);
      } else {
         console.log('No Report ID found in URL path.');
      }
    } else {
      console.error('Could not find /jobs/ structure in URL path.');
    }

    setJobId(extractedJobId);
    setReportId(extractedReportId);
    setIsEditMode(!extractedReportId); // Set edit mode if no report ID is found

  }, [location.pathname]);
  
  // Debug information for troubleshooting
  console.log('Component Initialization:');
  console.log('- URL params:', params);
  console.log('- reportId:', reportId);
  console.log('- jobId from params:', params.jobId);
  console.log('- jobId extracted:', jobId);
  console.log('- pathname:', location.pathname);
  console.log('- search params:', location.search);
  console.log('- user:', user ? `Authenticated as ${user.email}` : 'Not authenticated');
  console.log('- isEditMode:', isEditMode);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    reportInfo: {
      title: "",
      date: "",
      location: "",
      technicians: [],
      reportNumber: "",
      customerName: "",
      customerContactName: "",
      customerContactEmail: "",
      customerContactPhone: "",
    },
    status: TestStatus.PASS,
    customerName: "",
    siteAddress: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    jobNumber: "",
    identifier: "",
    testedBy: "",
    testDate: "",
    location: "",         // Initialize substation field
    equipmentLocation: "", // Initialize equipment location field
    cableType: "",
    operatingVoltage: "",
    cableLength: "",
    
    // Cable information
    cableInfo: {
      description: "",
      size: "",
      length: "",
      voltageRating: "",
      insulation: "",
      yearInstalled: "",
      testedFrom: "",  // Changed from testedFrom
      testedTo: "",    // Changed from testedTo
      from: "",        // Separate from field
      to: "",          // Separate to field
      manufacturer: "",
      insulationThickness: "",
      conductorMaterial: "",
    },
    
    // Termination data
    terminationData: {
      terminationData: "",
      ratedVoltage: "",
      terminationData2: "",
      ratedVoltage2: "",
      from: "",
      to: "",
    },
    
    // Visual and Mechanical Inspection
    visualInspection: {
      compareData: InspectionResult.SELECT,           // 7.3.3.A.1
      inspectDamage: InspectionResult.SELECT,         // 7.3.3.A.2
      useOhmmeter: InspectionResult.SELECT,           // 7.3.3.A.3.1
      inspectConnectors: InspectionResult.SELECT,     // 7.3.3.A.4
      inspectGrounding: InspectionResult.SELECT,      // 7.3.3.A.5
      verifyBends: InspectionResult.SELECT,           // 7.3.3.A.6
      inspectCurrentTransformers: InspectionResult.SELECT, // 7.3.3.A.8
      inspectIdentification: InspectionResult.SELECT, // 7.3.3.A.9
      inspectJacket: InspectionResult.SELECT,         // 7.3.3.A.10
    },
    
    // Electrical Tests - Shield Continuity
    shieldContinuity: {
      phaseA: "",
      phaseB: "",
      phaseC: "",
      unit: "Ω", // Default unit
    },
    
    // Electrical Tests - Insulation Resistance
    insulationTest: {
      testVoltage: "1000",
      unit: "GΩ", // Default unit
      preTest: {
        ag: "",
        bg: "",
        cg: "",
      },
      postTest: {
        ag: "",
        bg: "",
        cg: "",
      },
      preTestCorrected: {
        ag: "",
        bg: "",
        cg: "",
      },
      postTestCorrected: {
        ag: "",
        bg: "",
        cg: "",
      },
    },
    
    // Test Equipment
    equipment: {
      ohmmeter: "",
      ohmSerialNumber: "",
      ohmAmpId: "", // Add ohmmeter AMP ID
      megohmmeter: "",
      megohmSerialNumber: "",
      megohmAmpId: "", // Add megohmmeter AMP ID
      vlfHipot: "",
      vlfSerialNumber: "",
      vlfAmpId: "", // Rename general ampId to specific vlfAmpId
      vlfTestSet: "", // Add this field to maintain compatibility with existing code
    },
    
    // Temperature correction data
    temperature: {
      fahrenheit: 68,
      celsius: 20,
      humidity: 0,
      tcf: 1.0,
    },
    
    // Comments
    comments: "",
    
    // For backward compatibility
    testEquipment: {
      vlf: "",
      vlfCalibrationDate: "",
      insulationTester: "",
      insulationTesterCalibrationDate: "",
    },
    vlfTests: [],
    insulationResistanceTests: [],
    voltageBreakdownChart: null,
    voltageBreakdownPreview: "",
    testConditions: {
      weatherConditions: "",
      temperature: "",
      humidity: "",
      cableCondition: "",
    },
    conclusion: "",
    recommendations: "",
    testEngineer: "",
    clientRepresentative: "",
    reportDate: "",
    equipmentType: "",
    equipmentInfo: {
      type: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      ratingKV: "",
      ratingKVA: "",
      installationDate: "",
      lastMaintenanceDate: "",
    },
    testData: {
      testVoltage: "",
      testDuration: "",
      frequency: "",
      leakageCurrentPhaseA: "",
      leakageCurrentPhaseB: "",
      leakageCurrentPhaseC: "",
    },
    testResults: {
      summary: "",
      phaseAStatus: "",
      phaseBStatus: "",
      phaseCStatus: "",
      overallResult: "",
      recommendedActions: "",
    },
    notes: "",
    signatures: {
      technicianSignature: "",
      customerSignature: "",
    },
    
    // Electrical Tests Withstand Test
    withstandTest: {
      readings: [
        { 
          timeMinutes: "10", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
        { 
          timeMinutes: "20", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
        { 
          timeMinutes: "30", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
        { 
          timeMinutes: "40", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
        { 
          timeMinutes: "50", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
        { 
          timeMinutes: "60", 
          kVAC: "13", 
          phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
          phaseC: { mA: "", nF: "", currentUnit: "mA" } 
        },
      ]
    },
    
    // Add Tan Delta test initial data
    tanDeltaTest: {
      systemVoltageL2G: '14.4',
      testVoltage: '',
      frequency: '0.1',
      values: [
        { 
          voltageStep: "0.5 Uo", 
          kV: "7.200", 
          phaseA: { td: '', stdDev: '10' }, 
          phaseB: { td: '', stdDev: '5' }, 
          phaseC: { td: '', stdDev: '5' } 
        },
        { 
          voltageStep: "1.0 Uo", 
          kV: "14.400", 
          phaseA: { td: '', stdDev: '10' }, 
          phaseB: { td: '', stdDev: '5' }, 
          phaseC: { td: '', stdDev: '5' } 
        },
        { 
          voltageStep: "1.5 Uo", 
          kV: "21.600", 
          phaseA: { td: '', stdDev: '10' }, 
          phaseB: { td: '', stdDev: '5' }, 
          phaseC: { td: '', stdDev: '5' } 
        },
        { 
          voltageStep: "2.0 Uo", 
          kV: "28.800", 
          phaseA: { td: '', stdDev: '10' }, 
          phaseB: { td: '', stdDev: '5' }, 
          phaseC: { td: '', stdDev: '5' } 
        }
      ],
      points: [
        { kV: 0.5, phaseA: 1.1, phaseB: 1.2, phaseC: 1.3 },
        { kV: 1.0, phaseA: 1.3, phaseB: 1.4, phaseC: 1.5 },
        { kV: 1.5, phaseA: 1.5, phaseB: 1.6, phaseC: 1.7 },
        { kV: 2.0, phaseA: 1.8, phaseB: 1.9, phaseC: 2.0 },
      ],
      editingTanDeltaData: false
    },
  });

  // Check for returnToAssets query parameter
  const returnToAssets = new URLSearchParams(location.search).get('returnToAssets') === 'true';

  // Fix useEffect to handle data loading with better sequence control
  useEffect(() => {
    console.log('Data loading useEffect triggered. Current state:', { jobId, reportId, loading, error });

    // Don't proceed if already in an error state or if path isn't ready
    if (error || !location.pathname) {
      console.log('Exiting useEffect early due to existing error or missing pathname.');
      // Ensure loading is false if we exit due to error
      if (loading) setLoading(false);
      return;
    }

    const loadData = async () => {
      // Set loading true ONLY when we start fetching inside loadData
      setLoading(true); 
      try {
        // --- Job Info Loading --- 
    if (jobId) {
          console.log('Attempting to load Job Info for jobId:', jobId);
          await loadJobInfo(jobId);
          console.log('Job info loaded successfully.');
        } else {
          // If there's no jobId *and* no reportId, it's an invalid state
          if (!reportId) {
             console.error('Critical error: No jobId found after URL parsing, and no reportId exists.');
             setError('Missing job ID. Please navigate back to the job and try again.');
             // No need to proceed further
             return; 
          }
          // If only reportId exists, we might be loading an existing report without job context (less common, but handle)
          console.log('No jobId found, but reportId exists. Proceeding to load report.');
        }

        // --- Report Loading --- 
    if (reportId) {
          console.log('Attempting to load Report for reportId:', reportId);
          await loadReport(); // loadReport now handles its own errors/state
          console.log('Report loading process completed.');
    } else {
          // No reportId means we are creating a new report
          console.log('No reportId found, setting edit mode for new report.');
          setIsEditMode(true);
        }

      } catch (err) {
        // Catch errors from loadJobInfo or loadReport if they re-throw
        console.error('Error caught during loadData execution:', err);
        // Error state/toast is likely already set within loadJobInfo/loadReport
        if (!error) { // Set a generic error if one wasn't set specifically
           setError(`Error loading data: ${(err && err.message) || 'Unknown error'}`);
        }
      } finally {
        // Ensure loading is always set to false after attempts
        console.log('loadData finally block: Setting loading to false.');
      setLoading(false);
    }
    };

    // Only run loadData if we potentially have an ID to work with
    // or if the component just mounted and needs initial setup.
    // The jobId dependency handles the case where jobId updates after mount.
    if (jobId !== undefined || reportId !== undefined) {
       // Moved setLoading(true) inside loadData
       loadData();
    } else {
       // If both are undefined after initial parse, we are not loading yet.
       console.log('Waiting for jobId/reportId state update... Loading set to false for now.');
       setLoading(false); // Explicitly set loading false if we don't run loadData
    }

  }, [jobId, reportId, location.pathname]); // Keep error out of dependencies

  // Load job information with improved data handling
  const loadJobInfo = async (currentJobId) => {
    if (!currentJobId) {
      console.log('loadJobInfo: No jobId provided');
      setError('No job ID was provided. Please go back and try again.');
      return;
    }
    
    console.log('loadJobInfo: Started for jobId:', currentJobId);
    
    try {
      console.log('Fetching job data from neta_ops.jobs table');
      
      // First check if the database/schema is accessible
      const { data: schemaCheck, error: schemaError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select('id')
        .limit(1);
      
      if (schemaError) {
        console.error('Database schema access error:', schemaError);
        throw new Error('Could not connect to the database. Please try again later.');
      }
      
      // Now fetch the actual job data - match the field structure from DryTypeTransformerReport.tsx
      const { data: jobData, error: jobError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          title,
          job_number,
          customer_id
        `)
        .eq('id', currentJobId)
        .single();

      if (jobError) {
        console.error('loadJobInfo: Error fetching job data:', jobError);
        
        // Check error type to provide better error messages
        if (jobError.code === 'PGRST116') {
          throw new Error(`Job with ID ${currentJobId} not found. Please verify the job exists.`);
        } else {
          throw jobError;
        }
      }

      console.log('loadJobInfo: Fetched job data:', jobData);

      // Initialize customer info with default values
        let customerName = '';
        let customerAddress = '';
      
      // Then fetch customer data from common schema if customer_id exists
      if (jobData?.customer_id) {
        console.log('loadJobInfo: Fetching customer data for customer_id:', jobData.customer_id);
        
        try {
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
            
          if (customerError) {
            console.error('loadJobInfo: Error fetching customer data:', customerError);
          } else if (customerData) {
            console.log('loadJobInfo: Fetched customer data:', customerData);
            customerName = customerData.company_name || customerData.name || '';
            customerAddress = customerData.address || '';
          }
        } catch (customerErr) {
          // Just log the error but continue - we can still create a report without customer data
          console.error('Error fetching customer data:', customerErr);
        }
      } else {
        console.log('Job has no customer_id, skipping customer data fetch');
      }

      console.log('loadJobInfo: Setting form data with job and customer info');
      
      // Create a consolidated update object with the correct field mappings
      const updatedFormData = {
          jobNumber: jobData.job_number || '',
          jobTitle: jobData.title || '',
          customerName: customerName,
        siteAddress: customerAddress,
        contactPerson: '',
        // Since location and equipment_location fields don't exist in the jobs table,
        // we'll leave these blank or use defaults
        location: '',
        equipmentLocation: '',
        testDate: new Date().toISOString().split('T')[0],
        reportInfo: {
          title: jobData.title || '',
          customerName: customerName,
          customerContactName: ''
        }
      };
      
      // Update all form data at once to prevent partial updates
    setFormData(prev => ({
      ...prev,
        ...updatedFormData
      }));
      
      // Verify the update with a delay to ensure state has updated
      setTimeout(() => {
        console.log('Job and customer info applied to form data:', formData);
      }, 100);
    } catch (error) {
      console.error('loadJobInfo: Error loading job info:', error);
      setError(`Failed to load job info: ${(error && error.message) || 'Unknown error'}`);
      toast.error(`Failed to load job info: ${(error && error.message) || 'Unknown error'}`);
      throw error; // Re-throw so parent can handle
    }
  };

  // Generic change handler for form fields
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update chart data based on current Tan Delta values
  const updateChartData = (tanDeltaValues) => {
    // Create chart data from updated tan delta values
    const chartData = tanDeltaValues?.map(value => {
      // Parse the voltage step (e.g. "0.5 Uo" -> 0.5)
      const stepMatch = value?.voltageStep?.match(/(\d+\.?\d*)/) || [0, 0];
      const stepFactor = parseFloat(stepMatch[1]) || 0;
      
      const kV = value?.kV !== undefined && value?.kV !== '' 
        ? parseFloat(value.kV) 
        : parseFloat(formData.tanDeltaTest?.systemVoltageL2G || 14.4) * stepFactor;

      return {
        name: value?.voltageStep || '',
        kV: kV,
        phaseA: parseFloat(value?.phaseA?.td) || 0,
        phaseB: parseFloat(value?.phaseB?.td) || 0,
        phaseC: parseFloat(value?.phaseC?.td) || 0
      };
    }) || [];

    // Update chart data in the form state
    setFormData(prev => ({
      ...prev,
      tanDeltaTest: {
        ...prev.tanDeltaTest,
        chartData
      }
    }));
  };

  const handleVLFTestChange = (index, field, value) => {
    setFormData(prev => {
      const updatedTests = [...(prev.vlfTests || [])];
      updatedTests[index] = {
        ...updatedTests[index],
        [field]: value
      };
      return {
        ...prev,
        vlfTests: updatedTests
      };
    });
  };

  // Handle insulation test change
  const handleInsulationTestChange = (index, field, value) => {
    setFormData(prev => {
      const updatedTests = [...(prev.insulationResistanceTests || [])];
      updatedTests[index] = {
        ...updatedTests[index],
        [field]: value
      };
      return {
        ...prev,
        insulationResistanceTests: updatedTests
      };
    });
  };

  // Add a new VLF test
  const addVLFTest = () => {
    setFormData(prev => ({
      ...prev,
      vlfTests: [
        ...(prev.vlfTests || []),
        {
          testVoltage: '',
          duration: '',
          phase: CablePhase.A,
          result: 'PASS',
          notes: ''
        }
      ]
    }));
  };
  
  // Remove a VLF test
  const removeVLFTest = (index) => {
    if (!formData.vlfTests || formData.vlfTests.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      vlfTests: prev.vlfTests ? prev.vlfTests.filter((_, i) => i !== index) : []
    }));
  };

  // Add insulation resistance test
  const addInsulationTest = () => {
    setFormData(prev => ({
      ...prev,
      insulationResistanceTests: [
        ...(prev.insulationResistanceTests || []),
        {
          phase: CablePhase.A,
          testVoltage: '',
          oneMinuteReading: '',
          tenMinuteReading: '',
          piRatio: ''
        }
      ]
    }));
  };

  // Remove an insulation resistance test
  const removeInsulationTest = (index) => {
    if (!formData.insulationResistanceTests || formData.insulationResistanceTests.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      insulationResistanceTests: prev.insulationResistanceTests ? prev.insulationResistanceTests.filter((_, i) => i !== index) : []
    }));
  };

  // Update temperature correction factors
  const updateCorrectedValues = () => {
    const { insulationTest, temperature } = formData;
    
    if (!insulationTest) return;
    
    // Calculate pre-test corrected values
    const preTestCorrected = {
      ag: calculateCorrectedValue(insulationTest.preTest.ag, temperature.tcf),
      bg: calculateCorrectedValue(insulationTest.preTest.bg, temperature.tcf),
      cg: calculateCorrectedValue(insulationTest.preTest.cg, temperature.tcf)
    };
    
    // Calculate post-test corrected values
    const postTestCorrected = {
      ag: calculateCorrectedValue(insulationTest.postTest.ag, temperature.tcf),
      bg: calculateCorrectedValue(insulationTest.postTest.bg, temperature.tcf),
      cg: calculateCorrectedValue(insulationTest.postTest.cg, temperature.tcf)
    };
    
    // Update form data with corrected values
    setFormData(prev => ({
      ...prev,
      insulationTest: {
        ...prev.insulationTest,
        preTestCorrected,
        postTestCorrected
      }
    }));
  };

  // Helper function to calculate corrected value
  const calculateCorrectedValue = (value, tcf) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    return (numValue * tcf).toFixed(2);
  };

  // Handle insulation test value change
  const handleInsulationTestValueChange = (testType, field, value) => {
    // Only allow direct editing of non-corrected fields, 
    // corrected fields should be calculated automatically
    if (testType === 'preTestCorrected' || testType === 'postTestCorrected') {
      // For corrected fields, just update the value directly
      setFormData(prev => ({
        ...prev,
        insulationTest: {
          ...prev.insulationTest,
          [testType]: {
            ...prev.insulationTest[testType],
            [field]: value
          }
        }
      }));
      return;
    }
    
    // For non-corrected fields, update the value and calculate the corrected value
    setFormData(prev => {
      // First update the test value
      const updatedTest = {
        ...prev.insulationTest,
        [testType]: {
          ...prev.insulationTest[testType],
          [field]: value
        }
      };
      
      // Calculate corrected value for this field
      const correctedField = `${testType}Corrected`;
      const correctedValue = calculateCorrectedValue(value, prev.temperature.tcf);
      
      // Update corrected value
      updatedTest[correctedField] = {
        ...prev.insulationTest[correctedField],
        [field]: correctedValue
      };
      
      return {
        ...prev,
        insulationTest: updatedTest
      };
    });
  };

  // Handle Fahrenheit temperature change
  const handleFahrenheitChange = (fahrenheit) => {
    const celsius = Math.round((fahrenheit - 32) * 5 / 9);
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        fahrenheit: fahrenheit,
        celsius: celsius
      }
    }));
  };

  // Handle Celsius temperature change
  const handleCelsiusChange = (celsius) => {
    const fahrenheit = Math.round(celsius * 9 / 5 + 32);
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        celsius: celsius,
        fahrenheit: fahrenheit
      }
    }));
  };

  // Fix the handleWithstandTestChange function
  const handleWithstandTestChange = (index, field, value, phase, subfield) => {
    setFormData(prev => {
      // Make a deep copy of the entire withstandTest object
      const withstandTest = JSON.parse(JSON.stringify(prev.withstandTest || { readings: [] }));
      const readings = withstandTest.readings || [];
      
      // Ensure the readings array has enough elements
      while (readings.length <= index) {
        readings.push({
          timeMinutes: "",
          kVAC: "13",
          phaseA: { mA: "", nF: "", currentUnit: "mA" },
          phaseB: { mA: "", nF: "", currentUnit: "mA" },
          phaseC: { mA: "", nF: "", currentUnit: "mA" }
        });
      }
      
      if (phase && subfield) {
        // Update subfield for a specific phase
        readings[index][phase] = {
          ...readings[index][phase],
          [subfield]: value
        };
      } else {
        // Update main field
        readings[index][field] = value;
      }
      
      // Update the entire withstandTest object
      withstandTest.readings = readings;
      
      return {
        ...prev,
        withstandTest
      };
    });
  };

  // Toggle the editing mode for Tan Delta data table - no longer needed since editing is done directly in the table
  const toggleTanDeltaDataEditing = () => {
    // This function is no longer needed but kept for compatibility
    console.log("Chart editing is now done directly in the table");
  };

  // Function to handle Tan Delta point changes - updated to work with the new format
  const handleTanDeltaPointChange = (index, field, value) => {
    // This function is no longer needed but kept for compatibility
  };

  // Function to add a new Tan Delta point - no longer needed
  const addTanDeltaPoint = () => {
    // This function is no longer needed but kept for compatibility
  };

  // Function to remove a Tan Delta point - no longer needed
  const removeTanDeltaPoint = () => {
    // This function is no longer needed but kept for compatibility
  };

  // Save report
  const handleSave = async () => {
    if (isSaving) return;

    console.log('Starting save operation');
    setIsSaving(true);

    try {
      // Validate basic requirements
      const effectiveJobId = jobId || formData.jobNumber;
      if (!effectiveJobId) {
        toast.error('Job ID is required');
        setIsSaving(false);
        return;
      }

      if (!user || !user.id) {
        toast.error('User is not logged in');
        setIsSaving(false);
        return;
      }

      if (!isEditMode) {
        toast.error('Edit mode is not active');
        setIsSaving(false);
        return;
      }

      console.log('Saving with jobId:', effectiveJobId);
      console.log('Saving with user.id:', user.id);
      console.log('Form data to save:', formData);

      const reportData = {
        ...(!reportId ? { created_at: new Date().toISOString() } : {}),
        report_info: {
          ...formData,
          jobNumber: effectiveJobId,
          userId: user.id,
          signatures: formData.signatures || null,
        },
        job_id: effectiveJobId,
        user_id: user.id,
        withstand_test: formData.withstandTest,
        tan_delta_test: formData.tanDeltaTest,
        equipment: formData.equipment,
        cable_info: formData.cableInfo,
        termination_data: formData.terminationData,
        status: formData.status || 'PASS',
      };

      console.log('Prepared report data:', reportData);

      let result;
      if (reportId) {
        console.log(`Updating existing report with ID: ${reportId}`);
        try {
          const { data, error } = await supabase
            .schema('neta_ops')
            .from('medium_voltage_cable_vlf_test_reports')
            .update(reportData)
            .eq('id', reportId);
          
          result = { data, error };
          console.log('Update result:', result);
          
          if (error) {
            console.error('Error updating report:', error);
            console.error('Update error details:', JSON.stringify(error));
            throw error;
          }
          console.log('Report updated successfully:', data);
        } catch (updateError) {
          console.error('Exception during update:', updateError);
          throw updateError;
        }
      } else {
        console.log('Creating new report');
        try {
          const { data, error } = await supabase
            .schema('neta_ops')
            .from('medium_voltage_cable_vlf_test_reports')
            .insert(reportData)
            .select('id');
          
          result = { data, error };
          console.log('Creation result:', result);
          
          if (error) {
            console.error('Error creating report:', error);
            console.error('Creation error details:', JSON.stringify(error));
            throw error;
          }
          console.log('Report created successfully:', data);
          
          // Only proceed with asset creation if we have result.data with a report ID
          if (result.data && result.data[0]) {
            console.log('Creating asset for the report:', result.data[0].id);
            
            // Create the asset with correct structure
            const assetData = {
              name: `Medium Voltage Cable VLF Test - ${formData.identifier || formData.location || 'Unnamed'}`,
              file_url: `report:/jobs/${effectiveJobId}/medium-voltage-cable-vlf-test/${result.data[0].id}`,
              user_id: user.id
            };
            
            console.log('Asset data to create:', assetData);
            
            const { data: assetResult, error: assetError } = await supabase
              .schema('neta_ops')
              .from('assets')
              .insert(assetData)
              .select('id')
              .single();
            
            if (assetError) {
              console.error('Error creating asset:', assetError);
              console.error('Asset error details:', JSON.stringify(assetError));
              if (assetError.message.includes('permission denied')) {
                toast.error('You do not have permission to create assets. Please contact your administrator.');
                // We still saved the report, so consider it partial success
                setIsEditMode(false);
                toast.success(`Report saved successfully, but could not create an asset due to permissions.`);
                navigateAfterSave(navigate, effectiveJobId, location);
                return;
              }
              throw assetError;
            }
            
            console.log('Asset creation result:', assetResult);
            console.log('Linking asset to job...');
            // Link asset to job
            const { data: linkResult, error: linkError } = await supabase
              .schema('neta_ops')
              .from('job_assets')
              .insert({
                job_id: effectiveJobId,
                asset_id: assetResult.id,
                user_id: user.id
              });
              
            console.log('Job asset link response:', { data: linkResult, error: linkError });
              
            if (linkError) {
              console.error('Error linking asset to job:', linkError);
              console.error('Link error details:', JSON.stringify(linkError));
              if (linkError.message.includes('permission denied')) {
                toast.error('You do not have permission to link assets to jobs. Please contact your administrator.');
                // We still saved the report and created the asset, so consider it partial success
                setIsEditMode(false);
                toast.success(`Report and asset saved, but could not link asset to job due to permissions.`);
                navigateAfterSave(navigate, effectiveJobId, location);
                return;
              }
              throw linkError;
            }
            console.log('Asset linked to job successfully');
          }
        } catch (createError) {
          console.error('Exception during create:', createError);
          throw createError;
        }
      }

      // Fix the handleSave function to properly handle errors and results
      if (result && result.error) {
        console.error('Error in main report operation:', result.error);
        console.error('Full error details:', JSON.stringify(result.error));
        if (result.error.message && result.error.message.includes('permission denied')) {
          toast.error('You do not have permission to save this report. Please contact your administrator.');
          return;
        }
        throw result.error;
      }

      // Add additional debugging for successful save
      console.log('Save operation completed successfully:', result?.data);
      
      // Fix: Ensure we're properly setting isEditMode to false and showing toast
      setIsEditMode(false);
      toast.success(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      
      // Navigate away after successful save
      navigateAfterSave(navigate, effectiveJobId, location);
    } catch (error) {
      console.error('Error saving report:', error);
      if (error.message && error.message.includes('permission denied')) {
        toast.error(`Permission denied: You don't have the required access rights. Please contact your administrator.`);
      } else {
        toast.error(`Failed to save report: ${error && error.message || 'Unknown error'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Update temperature correction factor when celsius value changes
  useEffect(() => {
    const tcf = getTCF(formData.temperature.celsius);
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        tcf
      }
    }));
    
    // Update corrected values
    updateCorrectedValues();
  }, [formData.temperature.celsius, formData.insulationResistanceTests]);

  // Update chart data when form data changes
  useEffect(() => {
    if (formData.tanDeltaTest?.values?.length > 0) {
      updateChartData(formData.tanDeltaTest.values);
    }
  }, [formData.tanDeltaTest?.values, formData.tanDeltaTest?.systemVoltageL2G]);

  // Load existing report
  const loadReport = async () => {
    if (!reportId) {
      console.log('loadReport: No reportId provided, setting edit mode.');
      setLoading(false);
      setIsEditMode(true);
      return;
    }

    console.log('loadReport: Started for reportId:', reportId);
    setLoading(true);

    try {
      console.log(`Attempting to load report from 'neta_ops.medium_voltage_cable_vlf_test_reports' table`);
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('medium_voltage_cable_vlf_test_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        console.error(`Error loading from medium_voltage_cable_vlf_test_reports:`, error);
        // Handle specific errors if needed, otherwise throw generic
        if (error.message.includes('permission denied')) {
          toast.error('Permission denied when loading the report.');
        } else if (error.code === 'PGRST116') { // Not found
          toast.error('Report not found.');
          setIsEditMode(true); // Allow creating new if not found
        } else {
          toast.error(`Failed to load report: ${error.message}`);
        }
        throw error; // Re-throw to trigger the catch block below
      }

      if (data && data.report_info) {
        console.log('loadReport: Found report, setting form data.');
        // ... (rest of the logic to set form data based on 'data')
        setFormData(prev => ({
          ...prev,
          ...data.report_info, // Spread the report_info from the loaded data
          // Make sure to map all relevant fields correctly
          customerName: data.report_info?.customerName || prev.customerName,
          siteAddress: data.report_info?.siteAddress || prev.siteAddress,
          jobNumber: data.report_info?.jobNumber || prev.jobNumber,
          location: data.report_info?.location || prev.location,
          equipmentLocation: data.report_info?.equipmentLocation || prev.equipmentLocation,
          contactPerson: data.report_info?.contactPerson || prev.contactPerson,
          identifier: data.report_info?.identifier || prev.identifier,
          cableInfo: data.report_info?.cableInfo || prev.cableInfo,
          terminationData: data.report_info?.terminationData || prev.terminationData,
          visualInspection: data.report_info?.visualInspection || prev.visualInspection,
          shieldContinuity: data.report_info?.shieldContinuity || prev.shieldContinuity,
          insulationTest: data.report_info?.insulationTest || prev.insulationTest,
          equipment: {
            ...prev.equipment,
            ...(data.report_info?.equipment || {}),
            // Add specific handling for AMP IDs
            ohmAmpId: data.report_info?.equipment?.ohmAmpId || prev.equipment?.ohmAmpId || '',
            megohmAmpId: data.report_info?.equipment?.megohmAmpId || prev.equipment?.megohmAmpId || '',
            vlfAmpId: data.report_info?.equipment?.vlfAmpId || data.report_info?.equipment?.ampId || prev.equipment?.vlfAmpId || prev.equipment?.ampId || '',
          },
          temperature: data.report_info?.temperature || prev.temperature,
          withstandTest: data.withstand_test || data.report_info?.withstandTest || {
            readings: [
              { 
                timeMinutes: "10", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
              { 
                timeMinutes: "20", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
              { 
                timeMinutes: "30", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
              { 
                timeMinutes: "40", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
              { 
                timeMinutes: "50", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
              { 
                timeMinutes: "60", 
                kVAC: "13", 
                phaseA: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseB: { mA: "", nF: "", currentUnit: "mA" }, 
                phaseC: { mA: "", nF: "", currentUnit: "mA" } 
              },
            ]
          },
          comments: data.report_info?.comments || prev.comments,
          status: data.report_info?.status || prev.status,
          // Ensure nested reportInfo object is also updated if it exists in DB
          reportInfo: {
            ...prev.reportInfo,
            ...(data.report_info.reportInfo || {})
          },
          tanDeltaTest: data.tan_delta_test || {
            systemVoltageL2G: '14.4',
            testVoltage: '',
            frequency: '0.1',
            values: [
              { 
                voltageStep: "0.5 Uo", 
                kV: "7.200", 
                phaseA: { td: '', stdDev: '10' }, 
                phaseB: { td: '', stdDev: '5' }, 
                phaseC: { td: '', stdDev: '5' } 
              },
              { 
                voltageStep: "1.0 Uo", 
                kV: "14.400", 
                phaseA: { td: '', stdDev: '10' }, 
                phaseB: { td: '', stdDev: '5' }, 
                phaseC: { td: '', stdDev: '5' } 
              },
              { 
                voltageStep: "1.5 Uo", 
                kV: "21.600", 
                phaseA: { td: '', stdDev: '10' }, 
                phaseB: { td: '', stdDev: '5' }, 
                phaseC: { td: '', stdDev: '5' } 
              },
              { 
                voltageStep: "2.0 Uo", 
                kV: "28.800", 
                phaseA: { td: '', stdDev: '10' }, 
                phaseB: { td: '', stdDev: '5' }, 
                phaseC: { td: '', stdDev: '5' } 
              }
            ],
            points: [
              { kV: 0.5, phaseA: 1.1, phaseB: 1.2, phaseC: 1.3 },
              { kV: 1.0, phaseA: 1.3, phaseB: 1.4, phaseC: 1.5 },
              { kV: 1.5, phaseA: 1.5, phaseB: 1.6, phaseC: 1.7 },
              { kV: 2.0, phaseA: 1.8, phaseB: 1.9, phaseC: 2.0 },
            ],
            editingTanDeltaData: false
          },
        }));
        setIsEditMode(false); // Set to view mode since report was loaded
      } else {
        console.warn('Report data loaded but report_info is missing or empty.');
        toast.error('Loaded report seems incomplete.'); // Changed from toast.warn
        setIsEditMode(true); // Allow editing if data is incomplete
      }

    } catch (error) {
      console.error('loadReport: CATCH block - Error loading report:', error);
      // Error is already toasted inside the try block
      // If loading fails, default to creating a new report
      setIsEditMode(true);
    } finally {
      console.log('loadReport: Finished, setting loading=false');
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center max-w-md p-6 bg-white dark:bg-dark-150 rounded-lg shadow">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/jobs/${jobId || ''}`)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Return to Job
            </button>
            {error.includes('database') && (
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Force reload of the data
                  setTimeout(() => window.location.reload(), 500);
                }}
                className="px-4 py-2 mt-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Render component UI here
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MEDIUM VOLTAGE CABLE TEST REPORT</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isEditMode) {
                setFormData(prev => ({ ...prev, status: prev.status === TestStatus.PASS ? TestStatus.FAIL : TestStatus.PASS }))
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === TestStatus.PASS
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-red-600 text-white focus:ring-red-500'
            } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.status === TestStatus.PASS ? 'PASS' : 'FAIL'}
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
              disabled={!isEditMode}
              className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditMode ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'}`}
            >
              Save Report
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Details</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
            <div>
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
              <input
                type="text"
                  value={formData.customerName}
                  onChange={(e) => handleChange('customerName', e.target.value)}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
              />
            </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Site Address</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
              <input
                type="text"
                  value={formData.siteAddress}
                  onChange={(e) => handleChange('siteAddress', e.target.value)}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
              />
            </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">User</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
              />
            </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Date</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="date"
                  value={formData.testDate}
                  onChange={(e) => handleChange('testDate', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                />
              </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
              <input
                type="text"
                value={formData.identifier || ''}
                onChange={(e) => {
                  console.log('Setting identifier to:', e.target.value);
                  handleChange('identifier', e.target.value);
                }}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                  placeholder="Enter an identifier for this cable"
              />
            </div>
          </div>
          </div>
          
          {/* Right Column */}
            <div>
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Job #</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
              <input
                type="text"
                  value={formData.jobNumber || ''}
                  onChange={(e) => handleChange('jobNumber', e.target.value)}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
              />
            </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Technicians</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
              <input
                  type="text"
                  value={formData.testedBy}
                  onChange={(e) => handleChange('testedBy', e.target.value)}
                readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
              />
            </div>
            </div>
            
            <div className="mb-4 flex items-center">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Temp.</label>
              <div className="flex-1 flex items-center">
                <div className="w-16 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="number"
                  value={formData.temperature?.fahrenheit || 68}
                    onChange={(e) => handleFahrenheitChange(Number(e.target.value))}
                  readOnly={!isEditMode}
                    className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                />
              </div>
                <span className="mx-2">°F</span>
                <span className="mx-2">{formData.temperature?.celsius || 20}</span>
                <span className="mx-2">°C</span>
                
                <span className="mx-5">TCF</span>
                <div className="w-16 border-b border-gray-300 dark:border-gray-600">
                  <input
                    type="text"
                    value={formData.temperature?.tcf.toFixed(3) || '1.000'}
                    readOnly={true}
                    className="w-full bg-transparent border-none focus:ring-0 cursor-default"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Humidity</label>
              <div className="flex items-center flex-1">
                <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="number"
                    value={formData.temperature?.humidity || 0}
                    onChange={(e) => handleChange('temperature', {...formData.temperature, humidity: Number(e.target.value)})}
                  readOnly={!isEditMode}
                    className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                />
              </div>
                <span className="ml-2">%</span>
              </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Substation</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                />
              </div>
            </div>
            
            <div className="mb-4 flex">
              <label className="inline-block w-24 font-medium text-gray-700 dark:text-gray-300">Eqpt. Location</label>
              <div className="flex-1 border-b border-gray-300 dark:border-gray-600">
                <input
                  type="text"
                  value={formData.equipmentLocation || ''}
                  onChange={(e) => handleChange('equipmentLocation', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full bg-transparent border-none focus:ring-0 ${!isEditMode ? 'cursor-default' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cable Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Cable & Termination Data</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Tested From</label>
                <input
                  type="text"
                  value={formData.cableInfo?.testedFrom || ''}
                  onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, testedFrom: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300"></label>
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
                <input
                  type="text"
                  value={formData.cableInfo?.manufacturer || ''}
                  onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, manufacturer: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Cable Rated Voltage (kV)</label>
                <input
                  type="text"
                value={formData.cableInfo?.voltageRating || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, voltageRating: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Cable Type</label>
                <input
                  type="text"
                  value={formData.cableType || ''}
                  onChange={(e) => handleChange('cableType', e.target.value)}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Length (ft)</label>
                <input
                  type="text"
                value={formData.cableLength || ''}
                onChange={(e) => handleChange('cableLength', e.target.value)}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Conductor Size</label>
                <input
                  type="text"
                value={formData.cableInfo?.size || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, size: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Insulation Type</label>
                <input
                  type="text"
                value={formData.cableInfo?.insulation || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, insulation: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Conductor Material</label>
                <input
                  type="text"
                value={formData.cableInfo?.conductorMaterial || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, conductorMaterial: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Insulation Thickness</label>
                <input
                  type="text"
                  value={formData.cableInfo?.insulationThickness || ''}
                  onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, insulationThickness: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                <input
                  type="text"
                value={formData.cableInfo?.from || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, from: e.target.value})}
                readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                <input
                  type="text"
                value={formData.cableInfo?.to || ''}
                onChange={(e) => handleChange('cableInfo', {...formData.cableInfo, to: e.target.value})}
                readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
          </div>
          
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Termination Data</label>
                <input
                  type="text"
                value={formData.terminationData?.terminationData || ''}
                onChange={(e) => handleChange('terminationData', {...formData.terminationData, terminationData: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Termination Data</label>
                <input
                  type="text"
                value={formData.terminationData?.terminationData2 || ''}
                onChange={(e) => handleChange('terminationData', {...formData.terminationData, terminationData2: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (kV)</label>
                <input
                  type="text"
                value={formData.terminationData?.ratedVoltage || ''}
                onChange={(e) => handleChange('terminationData', {...formData.terminationData, ratedVoltage: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="flex items-center">
              <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (kV)</label>
                <input
                  type="text"
                value={formData.terminationData?.ratedVoltage2 || ''}
                onChange={(e) => handleChange('terminationData', {...formData.terminationData, ratedVoltage2: e.target.value})}
                  readOnly={!isEditMode}
                className={`w-1/2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
            </div>
          </div>
        </div>
      </div>

      {/* Visual and Mechanical Inspection */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">7.3.3.A Visual and Mechanical Inspection</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.1 Compare cable data with drawings and specifications.</label>
            <select
              value={formData.visualInspection?.compareData || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, compareData: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.2 Inspect exposed sections of cables for physical damage.</label>
            <select
              value={formData.visualInspection?.inspectDamage || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectDamage: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.3.1 Use of a low-resistance ohmmeter in accordance with Section 7.3.3.B.1.</label>
            <select
              value={formData.visualInspection?.useOhmmeter || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, useOhmmeter: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.4 Inspect compression-applied connectors for correct cable match and indentation.</label>
            <select
              value={formData.visualInspection?.inspectConnectors || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectConnectors: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.5 Inspect shield grounding, cable supports, and terminations.</label>
            <select
              value={formData.visualInspection?.inspectGrounding || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectGrounding: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.6 Verify that visible cable bends meet or exceed ICEA and manufacturer's minimum published bending radius.</label>
            <select
              value={formData.visualInspection?.verifyBends || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, verifyBends: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.8 If cables are terminated through window-type current transformers, inspect to verify that neutral and ground conductors are correctly placed and that shields are correctly terminated for operation of protective devices.</label>
            <select
              value={formData.visualInspection?.inspectCurrentTransformers || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectCurrentTransformers: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.9 Inspect for correct identification and arrangements.</label>
            <select
              value={formData.visualInspection?.inspectIdentification || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectIdentification: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-3/4 text-sm font-medium text-gray-700 dark:text-gray-300">7.3.3.A.10 Inspect cable jacket and insulation condition.</label>
            <select
              value={formData.visualInspection?.inspectJacket || InspectionResult.SELECT}
              onChange={(e) => handleChange('visualInspection', {...formData.visualInspection, inspectJacket: e.target.value})}
              disabled={!isEditMode}
              className={`w-1/4 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {Object.values(InspectionResult).map((result) => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Electrical Tests - Shield Continuity */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Shield Continuity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">A Phase</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">B Phase</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">C Phase</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.shieldContinuity.phaseA}
                    onChange={(e) => handleChange('shieldContinuity', {...formData.shieldContinuity, phaseA: e.target.value})}
              readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.shieldContinuity.phaseB}
                    onChange={(e) => handleChange('shieldContinuity', {...formData.shieldContinuity, phaseB: e.target.value})}
              readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.shieldContinuity.phaseC}
                    onChange={(e) => handleChange('shieldContinuity', {...formData.shieldContinuity, phaseC: e.target.value})}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
              <select
                    value={formData.shieldContinuity.unit}
                    onChange={(e) => handleChange('shieldContinuity', {...formData.shieldContinuity, unit: e.target.value})}
                disabled={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  >
                    {continuityUnits.map(unit => (
                      <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                    ))}
              </select>
                </td>
              </tr>
            </tbody>
          </table>
            </div>
      </div>

      {/* Electrical Tests - Insulation Resistance Values */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance Values</h2>
        <div className="mb-4 flex items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Voltage:</label>
              <select
            value={formData.insulationTest.testVoltage}
            onChange={(e) => handleChange('insulationTest', {...formData.insulationTest, testVoltage: e.target.value})}
                disabled={!isEditMode}
            className={`w-32 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          >
            {insulationTestVoltages.map(option => (
              <option key={option.value} value={option.value} className="dark:bg-dark-100 dark:text-white">{option.label}</option>
            ))}
              </select>
          <span className="ml-2 text-gray-900 dark:text-white">V</span>
            </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"></th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan={3}>Insulation Resistance</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan={3}>Temperature Corrected</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"></th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">A-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">B-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">C-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">A-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">B-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">C-G</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">Pre-Test</td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTest.ag}
                    onChange={(e) => handleInsulationTestValueChange('preTest', 'ag', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTest.bg}
                    onChange={(e) => handleInsulationTestValueChange('preTest', 'bg', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTest.cg}
                    onChange={(e) => handleInsulationTestValueChange('preTest', 'cg', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTestCorrected.ag}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTestCorrected.bg}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.preTestCorrected.cg}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formData.insulationTest.unit}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">Post-Test</td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTest.ag}
                    onChange={(e) => handleInsulationTestValueChange('postTest', 'ag', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTest.bg}
                    onChange={(e) => handleInsulationTestValueChange('postTest', 'bg', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTest.cg}
                    onChange={(e) => handleInsulationTestValueChange('postTest', 'cg', e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTestCorrected.ag}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTestCorrected.bg}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formData.insulationTest.postTestCorrected.cg}
                    readOnly={true}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm dark:bg-dark-100 dark:text-white bg-gray-100 dark:bg-dark-200"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formData.insulationTest.unit}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Add unit dropdown at the bottom of the table */}
        <div className="mt-2 flex justify-end items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Units:</label>
              <select
            value={formData.insulationTest.unit}
            onChange={(e) => handleChange('insulationTest', {...formData.insulationTest, unit: e.target.value})}
                disabled={!isEditMode}
            className={`w-32 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          >
            {insulationUnits.map(unit => (
              <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
            ))}
              </select>
            </div>
      </div>

      {/* Electrical Tests Withstand Test */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests Withstand Test</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time(min)</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">kVAC</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan={2}>A Phase</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan={2}>B Phase</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan={2}>C Phase</th>
              </tr>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2"></th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2"></th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <select
                    onChange={(e) => {
                      const newReadings = [...(formData.withstandTest?.readings || [])];
                      newReadings.forEach(reading => {
                        if (reading.phaseA) {
                          reading.phaseA.currentUnit = e.target.value;
                        }
                      });
                      handleChange('withstandTest', {...formData.withstandTest, readings: newReadings});
                    }}
                    value={formData.withstandTest?.readings[0]?.phaseA?.currentUnit || 'mA'}
                disabled={!isEditMode}
                    className={`w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-xs dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  >
                    {currentUnits.map(unit => (
                      <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                    ))}
              </select>
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">nF</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <select
                    onChange={(e) => {
                      const newReadings = [...(formData.withstandTest?.readings || [])];
                      newReadings.forEach(reading => {
                        if (reading.phaseB) {
                          reading.phaseB.currentUnit = e.target.value;
                        }
                      });
                      handleChange('withstandTest', {...formData.withstandTest, readings: newReadings});
                    }}
                    value={formData.withstandTest?.readings[0]?.phaseB?.currentUnit || 'mA'}
                    disabled={!isEditMode}
                    className={`w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-xs dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  >
                    {currentUnits.map(unit => (
                      <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                    ))}
                  </select>
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">nF</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <select
                    onChange={(e) => {
                      const newReadings = [...(formData.withstandTest?.readings || [])];
                      newReadings.forEach(reading => {
                        if (reading.phaseC) {
                          reading.phaseC.currentUnit = e.target.value;
                        }
                      });
                      handleChange('withstandTest', {...formData.withstandTest, readings: newReadings});
                    }}
                    value={formData.withstandTest?.readings[0]?.phaseC?.currentUnit || 'mA'}
                    disabled={!isEditMode}
                    className={`w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-xs dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  >
                    {currentUnits.map(unit => (
                      <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                    ))}
                  </select>
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">nF</th>
              </tr>
            </thead>
            <tbody>
              {formData.withstandTest?.readings.map((reading, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={reading.timeMinutes}
                      onChange={(e) => handleWithstandTestChange(index, 'timeMinutes', e.target.value)}
              readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
            <input
              type="text"
                      value={reading.kVAC || "13"}
                      onChange={(e) => handleWithstandTestChange(index, 'kVAC', e.target.value)}
              readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-center ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
            <input
              type="text"
                      value={reading.phaseA?.mA || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseA', e.target.value, 'phaseA', 'mA')}
              readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
            <input
              type="text"
                      value={reading.phaseA?.nF || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseA', e.target.value, 'phaseA', 'nF')}
              readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
            <input
              type="text"
                      value={reading.phaseB?.mA || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseB', e.target.value, 'phaseB', 'mA')}
              readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={reading.phaseB?.nF || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseB', e.target.value, 'phaseB', 'nF')}
                      readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={reading.phaseC?.mA || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseC', e.target.value, 'phaseC', 'mA')}
                      readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={reading.phaseC?.nF || ''}
                      onChange={(e) => handleWithstandTestChange(index, 'phaseC', e.target.value, 'phaseC', 'nF')}
                      readOnly={!isEditMode}
                      className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Tan Delta Test Section */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Tan Delta (Power Factor) Test</h2>
        
        {/* System Voltage Line to Ground */}
        <div className="flex items-center mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 w-64">System Voltage Line to Ground (kV RMS)</label>
          <input
            type="number"
            value={formData.tanDeltaTest?.systemVoltageL2G || ''}
            onChange={(e) => {
              const newTanDeltaTest = {
                ...formData.tanDeltaTest,
                systemVoltageL2G: e.target.value
              };
              handleChange('tanDeltaTest', newTanDeltaTest);
              
              // Update chart data when system voltage changes
              updateChartData(newTanDeltaTest.values || []);
            }}
            readOnly={!isEditMode}
            className={`w-32 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${
              !isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''
            }`}
          />
          <span className="ml-2">kV</span>
        </div>
        
        {/* Tan Delta Test Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-dark-200">
                <th colSpan="8" className="text-center border border-gray-300 dark:border-gray-700 px-3 py-2">Tan Delta Test</th>
              </tr>
              <tr className="bg-gray-100 dark:bg-dark-200">
                <th rowSpan="2" className="border border-gray-300 dark:border-gray-700 px-3 py-2">Voltage Steps</th>
                <th rowSpan="2" className="border border-gray-300 dark:border-gray-700 px-3 py-2">kV</th>
                <th colSpan="2" className="text-center border border-gray-300 dark:border-gray-700 px-3 py-2 text-blue-600">A Phase</th>
                <th colSpan="2" className="text-center border border-gray-300 dark:border-gray-700 px-3 py-2 text-red-600">B Phase</th>
                <th colSpan="2" className="text-center border border-gray-300 dark:border-gray-700 px-3 py-2 text-green-600">C Phase</th>
              </tr>
              <tr className="bg-gray-100 dark:bg-dark-200">
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">TD [E-3]</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">Std. Dev</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">TD [E-3]</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">Std. Dev</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">TD [E-3]</th>
                <th className="border border-gray-300 dark:border-gray-700 px-3 py-2">Std. Dev</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((rowIndex) => {
                const defaultSteps = ["0.5 Uo", "1.0 Uo", "1.5 Uo", "2.0 Uo"];
                const defaultFactors = [0.5, 1.0, 1.5, 2.0];
                const baseVoltage = parseFloat(formData.tanDeltaTest?.systemVoltageL2G) || 14.4;
                const defaultKV = (baseVoltage * defaultFactors[rowIndex]).toFixed(3);
                
                // Ensure the values array and its elements exist
                const ensureValuesExist = () => {
                  const newValues = [...(formData.tanDeltaTest?.values || [])];
                  while (newValues.length <= rowIndex) {
                    newValues.push({});
                  }
                  return newValues;
                };
                
                return (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white dark:bg-dark-150" : "bg-gray-50 dark:bg-dark-100"}>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="text"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.voltageStep || defaultSteps[rowIndex]}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          newValues[rowIndex].voltageStep = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                          
                          // Update chart data when voltage step changes
                          updateChartData(newValues);
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-center ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.kV !== undefined && formData.tanDeltaTest?.values?.[rowIndex]?.kV !== '' 
                          ? formData.tanDeltaTest?.values?.[rowIndex]?.kV 
                          : defaultKV}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          newValues[rowIndex].kV = e.target.value === '' ? '' : e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                          
                          // Update chart data when kV changes
                          updateChartData(newValues);
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white text-center ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseA?.td || ''}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseA) newValues[rowIndex].phaseA = {};
                          newValues[rowIndex].phaseA.td = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                          
                          // Update chart data when TD value changes
                          updateChartData(newValues);
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseA?.stdDev || '10'}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseA) newValues[rowIndex].phaseA = {};
                          newValues[rowIndex].phaseA.stdDev = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseB?.td || ''}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseB) newValues[rowIndex].phaseB = {};
                          newValues[rowIndex].phaseB.td = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                          
                          // Update chart data when TD value changes
                          updateChartData(newValues);
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseB?.stdDev || '5'}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseB) newValues[rowIndex].phaseB = {};
                          newValues[rowIndex].phaseB.stdDev = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseC?.td || ''}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseC) newValues[rowIndex].phaseC = {};
                          newValues[rowIndex].phaseC.td = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                          
                          // Update chart data when TD value changes
                          updateChartData(newValues);
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">
                      <input
                        type="number"
                        step="1"
                        value={formData.tanDeltaTest?.values?.[rowIndex]?.phaseC?.stdDev || '5'}
                        onChange={(e) => {
                          const newValues = ensureValuesExist();
                          if (!newValues[rowIndex]) newValues[rowIndex] = {};
                          if (!newValues[rowIndex].phaseC) newValues[rowIndex].phaseC = {};
                          newValues[rowIndex].phaseC.stdDev = e.target.value;
                          handleChange('tanDeltaTest', {...formData.tanDeltaTest, values: newValues});
                        }}
                        readOnly={!isEditMode}
                        className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Tan Delta Chart */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Tan Delta Test Results Chart</h3>
          </div>
          <div className="border rounded-md p-4 bg-white">
            <TanDeltaChart values={formData.tanDeltaTest?.values || []} chartData={formData.tanDeltaTest?.chartData} systemVoltageL2G={formData.tanDeltaTest?.systemVoltageL2G || ''} />
          </div>
        </div>
        
        {/* Tan Delta Test Result */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tan Delta Test Result</label>
          <select
            value={formData.tanDeltaTest?.result || ''}
            onChange={(e) => handleChange('tanDeltaTest', {...formData.tanDeltaTest, result: e.target.value})}
            disabled={!isEditMode}
            className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          >
            <option value="">Select Result</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="WARNING">WARNING</option>
          </select>
        </div>
      </div>

      {/* Test Results, Equipment Used, Recommendations Sections */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Results & Recommendations</h2>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Test Equipment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Equipment Used</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ohmmeter</label>
                <input
                  type="text"
                  value={formData.equipment?.ohmmeter || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, ohmmeter: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={formData.equipment?.ohmSerialNumber || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, ohmSerialNumber: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AMP ID</label>
                <input
                  type="text"
                  value={formData.equipment?.ohmAmpId || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, ohmAmpId: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Megohmmeter</label>
                <input
                  type="text"
                  value={formData.equipment?.megohmmeter || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, megohmmeter: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={formData.equipment?.megohmSerialNumber || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, megohmSerialNumber: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AMP ID</label>
                <input
                  type="text"
                  value={formData.equipment?.megohmAmpId || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, megohmAmpId: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VLF Test Set</label>
                <input
                  type="text"
                  value={formData.equipment?.vlfHipot || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, vlfHipot: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={formData.equipment?.vlfSerialNumber || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, vlfSerialNumber: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AMP ID</label>
                <input
                  type="text"
                  value={formData.equipment?.vlfAmpId || ''}
                  onChange={(e) => handleChange('equipment', {...formData.equipment, vlfAmpId: e.target.value})}
                  readOnly={!isEditMode}
                  className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            </div>
          </div>
          
          {/* Conclusion */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Conclusion</h3>
            <textarea
              value={formData.conclusion || ''}
              onChange={(e) => handleChange('conclusion', e.target.value)}
              readOnly={!isEditMode}
              rows={4}
              className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              placeholder="Enter test conclusion"
            />
          </div>
          
          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Recommendations</h3>
            <textarea
              value={formData.recommendations || ''}
              onChange={(e) => handleChange('recommendations', e.target.value)}
              readOnly={!isEditMode}
              rows={4}
              className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              placeholder="Enter recommendations"
            />
          </div>
          
          {/* Comments */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Additional Comments</h3>
            <textarea
              value={formData.comments || ''}
              onChange={(e) => handleChange('comments', e.target.value)}
              readOnly={!isEditMode}
              rows={4}
              className={`w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              placeholder="Enter any additional comments"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediumVoltageCableVLFTest; 