import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import _ from 'lodash';
import { navigateAfterSave } from './ReportUtils';

// Temperature conversion and correction factor lookup tables
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

const getTCF = (celsius: number): number => {
  const roundedCelsius = Math.round(celsius);
  const key = roundedCelsius.toString();
  return tcfTable[key] !== undefined ? tcfTable[key] : 1;
};

// Dropdown options
const visualInspectionResultOptions = [
  "Select One", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments", "Not Applicable"
];
const insulationResistanceUnitOptions = [
  { symbol: "kΩ", name: "Kilo-Ohms" }, { symbol: "MΩ", name: "Mega-Ohms" }, { symbol: "GΩ", name: "Giga-Ohms" }
];
const insulationTestVoltageOptions = ["250V", "500V", "1000V", "2500V", "5000V"];
const contactResistanceUnitOptions = [
  { symbol: "µΩ", name: "Micro-Ohms" }, { symbol: "mΩ", name: "Milli-Ohms" }, { symbol: "Ω", name: "Ohms" }
];
// Dielectric Withstand and VLF options are not used in this specific report based on images, but kept for reference if needed later.
const equipmentEvaluationResultOptions = ["PASS", "FAIL", "LIMITED SERVICE"];
const ratioPolarityOptions = ["Satisfactory", "Unsatisfactory", "N/A"];


interface FormData {
  // Job Information
  customerName: string;
  customerAddress: string;
  userName: string;
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

  // Device Data
  deviceData: {
    manufacturer: string;
    class: string;
    ctRatio: string;
    catalogNumber: string;
    voltageRating: string;
    polarityFacing: string;
    type: string;
    frequency: string;
  };

  // Visual and Mechanical Inspection
  visualMechanicalInspection: Array<{
    netaSection: string;
    description: string;
    result: string;
  }>;

  // CT Identification
  ctIdentification: {
    phase1: string; 
    phase1Serial: string;
    phase2: string; 
    phase2Serial: string;
    phase3: string; 
    phase3Serial: string;
    neutral: string; 
    neutralSerial: string;
  };

  // Electrical Tests
  electricalTests: {
    ratioPolarity: Array<{
      id: string;
      identifier: string;
      ratio: string;
      testType: 'voltage' | 'current';
      testValue: string;
      pri: string;
      sec: string;
      measuredRatio: string;
      ratioDev: string;
      polarity: string;
    }>;
    primaryWindingInsulation: {
      testVoltage: string;
      readingPhase1: string;
      readingPhase2: string;
      readingPhase3: string;
      readingNeutral: string;
      units: string;
      tempCorrection20CPhase1: string;
      tempCorrection20CPhase2: string;
      tempCorrection20CPhase3: string;
      tempCorrection20CNeutral: string;
    };
    secondaryWindingInsulation: {
      testVoltage: string;
      readingPhase1: string;
      readingPhase2: string;
      readingPhase3: string;
      readingNeutral: string;
      units: string;
      tempCorrection20CPhase1: string;
      tempCorrection20CPhase2: string;
      tempCorrection20CPhase3: string;
      tempCorrection20CNeutral: string;
    };
  };

  // Test Equipment Used
  testEquipmentUsed: {
    megohmmeterName: string;
    megohmmeterSerial: string;
    megohmmeterAmpId: string;
    ctRatioTestSetName: string;
    ctRatioTestSetSerial: string;
    ctRatioTestSetAmpId: string;
  };

  comments: string;
  status: string; // PASS, FAIL, LIMITED SERVICE
}

const calculateTempCorrected = (reading: string, tcf: number): string => {
  const numericReading = parseFloat(reading);
  if (isNaN(numericReading)) return '';
  return (numericReading * tcf).toFixed(2);
};

const CurrentTransformerTestATSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  const initialVisualInspectionItems = [
    { netaSection: '7.10.1.A.1', description: 'Compare equipment nameplate data with drawings and specifications.', result: 'Select One' },
    { netaSection: '7.10.1.A.2', description: 'Inspect physical and mechanical condition.', result: 'Select One' },
    { netaSection: '7.10.1.A.3', description: 'Verify correct connection of transformers with system requirements.', result: 'Select One' },
    { netaSection: '7.10.1.A.4', description: 'Verify that adequate clearances exist between primary and secondary circuit wiring.', result: 'Select One' },
    { netaSection: '7.10.1.A.5', description: 'Verify the unit is clean.', result: 'Select One' },
    { netaSection: '7.10.1.A.6', description: 'Use of a low-resistance ohmmeter in accordance with Section 7.10.1.B.1.', result: 'Select One' },
    { netaSection: '7.10.1.A.7', description: 'Verify that all required grounding and shorting connections provide contact.', result: 'Select One' },
    { netaSection: '7.10.1.A.8', description: 'Verify appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.', result: 'Select One' },
  ];

  const initialRatioPolarityItems = Array(4).fill(null).map((_, i) => ({
    id: `rp-${i}`,
    identifier: '',
    ratio: '',
    testType: 'voltage' as const,
    testValue: '',
    pri: '',
    sec: '',
    measuredRatio: '',
    ratioDev: '',
    polarity: 'Select One',
  }));


  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerAddress: '',
    userName: user?.email || '',
    date: new Date().toISOString().split('T')[0],
    identifier: '',
    jobNumber: '',
    technicians: '',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 0 },
    substation: '',
    eqptLocation: '',
    deviceData: {
      manufacturer: '', class: '', ctRatio: '', catalogNumber: '',
      voltageRating: '', polarityFacing: '', type: '', frequency: ''
    },
    visualMechanicalInspection: initialVisualInspectionItems,
    ctIdentification: {
      phase1: '', 
      phase1Serial: '',
      phase2: '', 
      phase2Serial: '',
      phase3: '', 
      phase3Serial: '',
      neutral: '', 
      neutralSerial: ''
    },
    electricalTests: {
      ratioPolarity: initialRatioPolarityItems,
      primaryWindingInsulation: {
        testVoltage: '1000V', readingPhase1: '', readingPhase2: '', readingPhase3: '', readingNeutral: '', units: 'MΩ',
        tempCorrection20CPhase1: '', tempCorrection20CPhase2: '', tempCorrection20CPhase3: '', tempCorrection20CNeutral: ''
      },
      secondaryWindingInsulation: {
        testVoltage: '1000V', readingPhase1: '', readingPhase2: '', readingPhase3: '', readingNeutral: '', units: 'MΩ',
        tempCorrection20CPhase1: '', tempCorrection20CPhase2: '', tempCorrection20CPhase3: '', tempCorrection20CNeutral: ''
      }
    },
    testEquipmentUsed: {
      megohmmeterName: '', megohmmeterSerial: '', megohmmeterAmpId: '',
      ctRatioTestSetName: '', ctRatioTestSetSerial: '', ctRatioTestSetAmpId: ''
    },
    comments: '',
    status: 'PASS',
  });

  // Load job information
  const loadJobInfo = async () => {
    if (!jobId) return;
    try {
      const { data: jobData, error: jobError } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`title, job_number, customer_id`)
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
            .select(`name, company_name, address`)
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
          customerName: customerName,
          customerAddress: customerAddress,
          // description: jobData.title || '' // Assuming job title can be a description if needed
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      alert(`Failed to load job info: ${(error as Error).message}`);
    } finally {
      if (!reportId) setLoading(false);
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
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('current_transformer_test_ats_reports') // Ensure this table name is correct
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          console.warn(`Report with ID ${reportId} not found. Starting new report.`);
          setIsEditing(true);
        } else {
          throw error;
        }
      }
      if (data) {
        // Deep merge existing data with initial state to ensure all fields are present
        const loadedFormData = _.merge({}, {
          customerName: '',
          customerAddress: '',
          userName: user?.email || '',
          date: new Date().toISOString().split('T')[0],
          identifier: '',
          jobNumber: '',
          technicians: '',
          temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 0 },
          substation: '',
          eqptLocation: '',
          deviceData: {
            manufacturer: '', class: '', ctRatio: '', catalogNumber: '',
            voltageRating: '', polarityFacing: '', type: '', frequency: ''
          },
          visualMechanicalInspection: initialVisualInspectionItems,
          ctIdentification: {
            phase1: '', 
            phase1Serial: '',
            phase2: '', 
            phase2Serial: '',
            phase3: '', 
            phase3Serial: '',
            neutral: '', 
            neutralSerial: ''
          },
          electricalTests: {
            ratioPolarity: initialRatioPolarityItems,
            primaryWindingInsulation: {
              testVoltage: '1000V', readingPhase1: '', readingPhase2: '', readingPhase3: '', readingNeutral: '', units: 'MΩ',
              tempCorrection20CPhase1: '', tempCorrection20CPhase2: '', tempCorrection20CPhase3: '', tempCorrection20CNeutral: ''
            },
            secondaryWindingInsulation: {
              testVoltage: '1000V', readingPhase1: '', readingPhase2: '', readingPhase3: '', readingNeutral: '', units: 'MΩ',
              tempCorrection20CPhase1: '', tempCorrection20CPhase2: '', tempCorrection20CPhase3: '', tempCorrection20CNeutral: ''
            }
          },
          testEquipmentUsed: {
            megohmmeterName: '', megohmmeterSerial: '', megohmmeterAmpId: '',
            ctRatioTestSetName: '', ctRatioTestSetSerial: '', ctRatioTestSetAmpId: ''
          },
          comments: '',
          status: 'PASS',
        }, data.report_data); // Assuming report data is stored in 'report_data' JSONB column

        setFormData(loadedFormData);
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
  
  useEffect(() => {
    if (jobId) loadJobInfo();
    if (reportId) loadReport(); else setLoading(false);
  }, [jobId, reportId]);

  useEffect(() => {
    setIsEditing(!reportId);
  }, [reportId]);


  const handleFahrenheitChange = (fahrenheit: number) => {
    const celsius = ((fahrenheit - 32) * 5) / 9;
    const roundedCelsius = Math.round(celsius);
    const tcf = getTCF(roundedCelsius);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, fahrenheit, celsius: roundedCelsius, tcf } }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const roundedCelsius = Math.round(celsius);
    const fahrenheit = (roundedCelsius * 9) / 5 + 32;
    const roundedFahrenheit = Math.round(fahrenheit);
    const tcf = getTCF(roundedCelsius);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, celsius: roundedCelsius, fahrenheit: roundedFahrenheit, tcf } }));
  };

  const handleChange = (path: string, value: any) => {
    setFormData(prev => _.set({ ...prev }, path, value));
  };
  
  const handleVisualInspectionChange = (index: number, field: keyof FormData['visualMechanicalInspection'][0], value: string) => {
    setFormData(prev => {
      const newItems = [...prev.visualMechanicalInspection];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, visualMechanicalInspection: newItems };
    });
  };

  const handleRatioPolarityChange = (index: number, field: keyof FormData['electricalTests']['ratioPolarity'][0], value: string) => {
    setFormData(prev => {
      const newItems = [...prev.electricalTests.ratioPolarity];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, electricalTests: { ...prev.electricalTests, ratioPolarity: newItems } };
    });
  };
  
  // Save report
  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    const reportPayload = {
      job_id: jobId,
      user_id: user.id,
      report_data: formData // Store the whole formData object
    };

    try {
      let result;
      if (reportId) {
        result = await supabase
          .schema('neta_ops')
          .from('current_transformer_test_ats_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        result = await supabase
          .schema('neta_ops')
          .from('current_transformer_test_ats_reports')
          .insert(reportPayload)
          .select()
          .single();

        if (result.data) {
          const assetData = {
            name: `12-Current Transformer Test ATS - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/12-current-transformer-test-ats-report/${result.data.id}`,
            user_id: user.id,
            template_type: 'ATS'
          };
          const { data: assetResult, error: assetError } = await supabase
            .schema('neta_ops')
            .from('assets')
            .insert(assetData)
            .select()
            .single();
          if (assetError) throw assetError;
          await supabase
            .schema('neta_ops')
            .from('job_assets')
            .insert({ job_id: jobId, asset_id: assetResult.id, user_id: user.id });
        }
      }
      if (result.error) throw result.error;
      setIsEditing(false);
      alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
    }
  };

  const renderCtIdentification = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2">
      {[
        { label: 'Phase 1', topKey: 'phase1', serialKey: 'phase1Serial' },
        { label: 'Phase 2', topKey: 'phase2', serialKey: 'phase2Serial' },
        { label: 'Phase 3', topKey: 'phase3', serialKey: 'phase3Serial' },
        { label: 'Neutral', topKey: 'neutral', serialKey: 'neutralSerial' },
      ].map((item) => (
        <div key={item.label}>
          <label htmlFor={`ct-${item.topKey}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {item.label}
          </label>
          <input
            type="text"
            id={`ct-${item.topKey}`}
            name={item.topKey}
            value={formData.ctIdentification[item.topKey as keyof typeof formData.ctIdentification]}
            onChange={(e) => handleChange(`ctIdentification.${item.topKey}`, e.target.value)}
            readOnly={!isEditing}
            className={`mt-1 block w-full p-2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-brand-orange focus:ring-brand-orange dark:bg-dark-100 dark:text-white ${
              !isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''
            }`}
          />
          <label htmlFor={`ct-${item.serialKey}`} className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Serial #
          </label>
          <input
            type="text"
            id={`ct-${item.serialKey}`}
            name={item.serialKey}
            value={formData.ctIdentification[item.serialKey as keyof typeof formData.ctIdentification]}
            onChange={(e) => handleChange(`ctIdentification.${item.serialKey}`, e.target.value)}
            readOnly={!isEditing}
            className={`mt-1 block w-full p-2 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-brand-orange focus:ring-brand-orange dark:bg-dark-100 dark:text-white ${
              !isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''
            }`}
          />
        </div>
      ))}
    </div>
  );

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 dark:text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">12-Current Transformer Test ATS</h1>
        <div className="flex gap-2">
          <select
            value={formData.status}
            onChange={(e) => {
              if (isEditing) handleChange('status', e.target.value)
            }}
            disabled={!isEditing}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS' ? 'bg-green-600 text-white focus:ring-green-500' :
              formData.status === 'FAIL' ? 'bg-red-600 text-white focus:ring-red-500' :
              'bg-yellow-500 text-white focus:ring-yellow-400' // LIMITED SERVICE
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 dark:bg-opacity-80'}`}
          >
            {equipmentEvaluationResultOptions.map(option => (
              <option key={option} value={option} className="bg-white dark:bg-dark-100 text-gray-900 dark:text-white">{option}</option>
            ))}
          </select>

          {reportId && !isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Edit Report
            </button>
          ) : (
            <button onClick={handleSave} disabled={!isEditing} className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditing ? 'hidden' : 'hover:bg-orange-700'}`}>
              Save Report
            </button>
          )}
        </div>
      </div>

      {/* Job Information Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <label className="form-label inline-block w-32">Customer:</label>
              <input type="text" value={formData.customerName} readOnly className="form-input bg-gray-100 dark:bg-dark-200 w-[calc(100%-8rem)]" />
            </div>
            <div>
              <label className="form-label inline-block w-32">Address:</label>
              <input type="text" value={formData.customerAddress} readOnly className="form-input bg-gray-100 dark:bg-dark-200 w-[calc(100%-8rem)]" />
            </div>
             <div>
              <label htmlFor="user" className="form-label inline-block w-32">User:</label>
              <input id="user" name="user" type="text" value={formData.userName} onChange={(e) => handleChange('userName', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label htmlFor="date" className="form-label inline-block w-32">Date:</label>
              <input id="date" name="date" type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label htmlFor="identifier" className="form-label inline-block w-32">Identifier:</label>
              <input id="identifier" name="identifier" type="text" value={formData.identifier} onChange={(e) => handleChange('identifier', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-3">
            <div>
              <label className="form-label inline-block w-32">Job #:</label>
              <input type="text" value={formData.jobNumber} readOnly className="form-input bg-gray-100 dark:bg-dark-200 w-[calc(100%-8rem)]" />
            </div>
            <div>
              <label htmlFor="technicians" className="form-label inline-block w-32">Technicians:</label>
              <input id="technicians" name="technicians" type="text" value={formData.technicians} onChange={(e) => handleChange('technicians', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div className="flex items-center">
              <label htmlFor="temperature.fahrenheit" className="form-label inline-block w-16">Temp:</label>
              <input id="temperature.fahrenheit" name="temperature.fahrenheit" type="number" value={formData.temperature.fahrenheit} onChange={(e) => handleFahrenheitChange(Number(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              <span className="mx-1">°F</span>
              <input id="temperature.celsius" name="temperature.celsius" type="number" value={formData.temperature.celsius} onChange={(e) => handleCelsiusChange(Number(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              <span className="mx-1">°C</span>
              <label htmlFor="temperature.tcf" className="form-label inline-block w-10 ml-2">TCF:</label>
              <input id="temperature.tcf" name="temperature.tcf" type="number" value={formData.temperature.tcf} readOnly className="form-input w-20 bg-gray-100 dark:bg-dark-200" />
            </div>
            <div>
              <label htmlFor="temperature.humidity" className="form-label inline-block w-32">Humidity:</label>
              <input id="temperature.humidity" name="temperature.humidity" type="number" value={formData.temperature.humidity} onChange={(e) => handleChange('temperature.humidity', Number(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              <span className="ml-1">%</span>
            </div>
            <div>
              <label htmlFor="substation" className="form-label inline-block w-32">Substation:</label>
              <input id="substation" name="substation" type="text" value={formData.substation} onChange={(e) => handleChange('substation', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
             <div>
              <label htmlFor="eqptLocation" className="form-label inline-block w-32">Eqpt. Location:</label>
              <input id="eqptLocation" name="eqptLocation" type="text" value={formData.eqptLocation} onChange={(e) => handleChange('eqptLocation', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Device Data Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Device Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div><label htmlFor="deviceData.manufacturer" className="form-label inline-block w-32">Manufacturer:</label><input id="deviceData.manufacturer" type="text" value={formData.deviceData.manufacturer} onChange={(e) => handleChange('deviceData.manufacturer', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.class" className="form-label inline-block w-32">Class:</label><input id="deviceData.class" type="text" value={formData.deviceData.class} onChange={(e) => handleChange('deviceData.class', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.ctRatio" className="form-label inline-block w-32">CT Ratio:</label><input id="deviceData.ctRatio" type="text" value={formData.deviceData.ctRatio} onChange={(e) => handleChange('deviceData.ctRatio', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.catalogNumber" className="form-label inline-block w-32">Catalog Number:</label><input id="deviceData.catalogNumber" type="text" value={formData.deviceData.catalogNumber} onChange={(e) => handleChange('deviceData.catalogNumber', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          </div>
          {/* Right Column */}
          <div className="space-y-3">
            <div><label htmlFor="deviceData.voltageRating" className="form-label inline-block w-32">Voltage Rating (V):</label><input id="deviceData.voltageRating" type="text" value={formData.deviceData.voltageRating} onChange={(e) => handleChange('deviceData.voltageRating', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.polarityFacing" className="form-label inline-block w-32">Polarity Facing:</label><input id="deviceData.polarityFacing" type="text" value={formData.deviceData.polarityFacing} onChange={(e) => handleChange('deviceData.polarityFacing', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.type" className="form-label inline-block w-32">Type:</label><input id="deviceData.type" type="text" value={formData.deviceData.type} onChange={(e) => handleChange('deviceData.type', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="deviceData.frequency" className="form-label inline-block w-32">Frequency:</label><input id="deviceData.frequency" type="text" value={formData.deviceData.frequency} onChange={(e) => handleChange('deviceData.frequency', e.target.value)} readOnly={!isEditing} className={`form-input w-[calc(100%-8rem)] ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          </div>
        </div>
      </section>

      {/* Visual and Mechanical Inspection Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NETA Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Results</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.visualMechanicalInspection.map((item, index) => (
                <tr key={item.netaSection}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.netaSection}</td>
                  <td className="px-6 py-4 text-sm">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select value={item.result} onChange={(e) => handleVisualInspectionChange(index, 'result', e.target.value)} disabled={!isEditing} className={`form-select ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}>
                      {visualInspectionResultOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CT Identification Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">CT Identification</h2>
        {renderCtIdentification()}
      </section>

      {/* Electrical Tests Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests</h2>
        
        {/* Ratio and Polarity Table */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Ratio and Polarity</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  {['Identifier', 'Ratio', 
                    formData.electricalTests.ratioPolarity[0]?.testType === 'current' ? 'Test Current' : 'Test Voltage', 
                    'Pri.', 'Sec.', 'Measured Ratio', 'Ratio dev.', 'Polarity'].map(header => (
                    <th key={header} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header === 'Test Current' || header === 'Test Voltage' ? (
                        <div className="flex items-center space-x-2">
                          <span>{header}</span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                const newType = formData.electricalTests.ratioPolarity[0]?.testType === 'voltage' ? 'current' : 'voltage';
                                setFormData(prev => ({
                                  ...prev,
                                  electricalTests: {
                                    ...prev.electricalTests,
                                    ratioPolarity: prev.electricalTests.ratioPolarity.map(item => ({
                                      ...item,
                                      testType: newType,
                                      testValue: 'Select One' // Reset value when switching type
                                    }))
                                  }
                                }));
                              }}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              (Switch to {formData.electricalTests.ratioPolarity[0]?.testType === 'voltage' ? 'Current' : 'Voltage'})
                            </button>
                          )}
                        </div>
                      ) : header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {formData.electricalTests.ratioPolarity.map((item, index) => (
                  <tr key={item.id}>
                    <td><input type="text" value={item.identifier} onChange={(e) => handleRatioPolarityChange(index, 'identifier', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td><input type="text" value={item.ratio} onChange={(e) => handleRatioPolarityChange(index, 'ratio', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td>
                      <input 
                        type="text" 
                        value={item.testValue} 
                        onChange={(e) => handleRatioPolarityChange(index, 'testValue', e.target.value)} 
                        readOnly={!isEditing} 
                        placeholder={item.testType === 'voltage' ? 'Enter voltage' : 'Enter current'}
                        className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                    <td><input type="text" value={item.pri} onChange={(e) => handleRatioPolarityChange(index, 'pri', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td><input type="text" value={item.sec} onChange={(e) => handleRatioPolarityChange(index, 'sec', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td><input type="text" value={item.measuredRatio} onChange={(e) => handleRatioPolarityChange(index, 'measuredRatio', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td><input type="text" value={item.ratioDev} onChange={(e) => handleRatioPolarityChange(index, 'ratioDev', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></td>
                    <td>
                      <select value={item.polarity} onChange={(e) => handleRatioPolarityChange(index, 'polarity', e.target.value)} disabled={!isEditing} className={`form-select w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}>
                        <option value="Select One" disabled>Select One</option>
                        {ratioPolarityOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Primary Winding Insulation Table */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Primary Winding - 1 min. Insulation Resistance to Ground</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Test Voltage:&nbsp;
                    <select 
                      value={formData.electricalTests.primaryWindingInsulation.testVoltage} 
                      onChange={(e) => handleChange('electricalTests.primaryWindingInsulation.testVoltage', e.target.value)} 
                      disabled={!isEditing} 
                      className={`form-select inline-block w-auto p-1 text-xs ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {insulationTestVoltageOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </th>
                  {['Phase 1', 'Phase 2', 'Phase 3', 'Neutral'].map(header => (
                    <th key={header} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">Reading</td>
                  {['readingPhase1', 'readingPhase2', 'readingPhase3', 'readingNeutral'].map(fieldKey => (
                    <td key={fieldKey} className="px-1 py-1">
                      <input 
                        type="text" 
                        value={formData.electricalTests.primaryWindingInsulation[fieldKey as keyof typeof formData.electricalTests.primaryWindingInsulation]} 
                        onChange={(e) => {
                          const value = e.target.value;
                          handleChange(`electricalTests.primaryWindingInsulation.${fieldKey}`, value);
                          // Calculate and update temperature corrected value
                          const correctedValue = calculateTempCorrected(value, formData.temperature.tcf);
                          handleChange(`electricalTests.primaryWindingInsulation.tempCorrection20C${fieldKey.replace('reading', '')}`, correctedValue);
                        }} 
                        readOnly={!isEditing} 
                        className={`form-input w-full text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <select 
                      value={formData.electricalTests.primaryWindingInsulation.units} 
                      onChange={(e) => handleChange('electricalTests.primaryWindingInsulation.units', e.target.value)} 
                      disabled={!isEditing} 
                      className={`form-select w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {insulationResistanceUnitOptions.map(option => <option key={option.symbol} value={option.symbol}>{option.symbol}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">Temp. Correction 20°C</td>
                  {['tempCorrection20CPhase1', 'tempCorrection20CPhase2', 'tempCorrection20CPhase3', 'tempCorrection20CNeutral'].map(fieldKey => (
                    <td key={fieldKey} className="px-1 py-1">
                      <input 
                        type="text" 
                        value={formData.electricalTests.primaryWindingInsulation[fieldKey as keyof typeof formData.electricalTests.primaryWindingInsulation]} 
                        readOnly
                        className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" 
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center">
                    {formData.electricalTests.primaryWindingInsulation.units}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Secondary Winding Insulation Table */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Secondary Winding - 1 min. Insulation Resistance to Ground</h3>
           <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Test Voltage:&nbsp;
                    <select 
                      value={formData.electricalTests.secondaryWindingInsulation.testVoltage} 
                      onChange={(e) => handleChange('electricalTests.secondaryWindingInsulation.testVoltage', e.target.value)} 
                      disabled={!isEditing} 
                      className={`form-select inline-block w-auto p-1 text-xs ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {insulationTestVoltageOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </th>
                  {['Phase 1', 'Phase 2', 'Phase 3', 'Neutral'].map(header => (
                    <th key={header} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">Reading</td>
                  {['readingPhase1', 'readingPhase2', 'readingPhase3', 'readingNeutral'].map(fieldKey => (
                    <td key={fieldKey} className="px-1 py-1">
                      <input 
                        type="text" 
                        value={formData.electricalTests.secondaryWindingInsulation[fieldKey as keyof typeof formData.electricalTests.secondaryWindingInsulation]} 
                        onChange={(e) => {
                          const value = e.target.value;
                          handleChange(`electricalTests.secondaryWindingInsulation.${fieldKey}`, value);
                          // Calculate and update temperature corrected value
                          const correctedValue = calculateTempCorrected(value, formData.temperature.tcf);
                          handleChange(`electricalTests.secondaryWindingInsulation.tempCorrection20C${fieldKey.replace('reading', '')}`, correctedValue);
                        }} 
                        readOnly={!isEditing} 
                        className={`form-input w-full text-center ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <select 
                      value={formData.electricalTests.secondaryWindingInsulation.units} 
                      onChange={(e) => handleChange('electricalTests.secondaryWindingInsulation.units', e.target.value)} 
                      disabled={!isEditing} 
                      className={`form-select w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {insulationResistanceUnitOptions.map(option => <option key={option.symbol} value={option.symbol}>{option.symbol}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">Temp. Correction 20°C</td>
                  {['tempCorrection20CPhase1', 'tempCorrection20CPhase2', 'tempCorrection20CPhase3', 'tempCorrection20CNeutral'].map(fieldKey => (
                    <td key={fieldKey} className="px-1 py-1">
                      <input 
                        type="text" 
                        value={formData.electricalTests.secondaryWindingInsulation[fieldKey as keyof typeof formData.electricalTests.secondaryWindingInsulation]} 
                        readOnly
                        className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" 
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center">
                    {formData.electricalTests.secondaryWindingInsulation.units}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Test Equipment Used Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label htmlFor="testEquipmentUsed.megohmmeterName" className="form-label block">Megohmmeter:</label><input id="testEquipmentUsed.megohmmeterName" type="text" value={formData.testEquipmentUsed.megohmmeterName} onChange={(e) => handleChange('testEquipmentUsed.megohmmeterName', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="testEquipmentUsed.megohmmeterSerial" className="form-label block">Serial Number:</label><input id="testEquipmentUsed.megohmmeterSerial" type="text" value={formData.testEquipmentUsed.megohmmeterSerial} onChange={(e) => handleChange('testEquipmentUsed.megohmmeterSerial', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="testEquipmentUsed.megohmmeterAmpId" className="form-label block">AMP ID:</label><input id="testEquipmentUsed.megohmmeterAmpId" type="text" value={formData.testEquipmentUsed.megohmmeterAmpId} onChange={(e) => handleChange('testEquipmentUsed.megohmmeterAmpId', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label htmlFor="testEquipmentUsed.ctRatioTestSetName" className="form-label block">CT Ratio Test Set:</label><input id="testEquipmentUsed.ctRatioTestSetName" type="text" value={formData.testEquipmentUsed.ctRatioTestSetName} onChange={(e) => handleChange('testEquipmentUsed.ctRatioTestSetName', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="testEquipmentUsed.ctRatioTestSetSerial" className="form-label block">Serial Number:</label><input id="testEquipmentUsed.ctRatioTestSetSerial" type="text" value={formData.testEquipmentUsed.ctRatioTestSetSerial} onChange={(e) => handleChange('testEquipmentUsed.ctRatioTestSetSerial', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <div><label htmlFor="testEquipmentUsed.ctRatioTestSetAmpId" className="form-label block">AMP ID:</label><input id="testEquipmentUsed.ctRatioTestSetAmpId" type="text" value={formData.testEquipmentUsed.ctRatioTestSetAmpId} onChange={(e) => handleChange('testEquipmentUsed.ctRatioTestSetAmpId', e.target.value)} readOnly={!isEditing} className={`form-input w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <textarea
          value={formData.comments}
          onChange={(e) => handleChange('comments', e.target.value)}
          readOnly={!isEditing}
          rows={6}
          className={`form-textarea w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          placeholder="Enter comments here..."
        />
      </section>
    </div>
  );
};

export default CurrentTransformerTestATSReport; 