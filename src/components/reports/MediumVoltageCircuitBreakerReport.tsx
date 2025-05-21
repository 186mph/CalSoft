import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';

// Temperature conversion and correction factor lookup tables (copied from PanelboardReport)
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

const visualInspectionOptions = [
  "Select One",
  "Satisfactory",
  "Unsatisfactory",
  "Cleaned",
  "See Comments",
  "Not Applicable"
];

const insulationResistanceUnits = ["kΩ", "MΩ", "GΩ"];
const insulationTestVoltages = ["250V", "500V", "1000V", "2500V", "5000V"];
const contactResistanceUnits = ["μΩ", "mΩ", "Ω"];
const dielectricWithstandUnits = ["μA", "mA"];
const equipmentEvaluationResults = ["PASS", "FAIL", "LIMITED SERVICE"];

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
  status: string; // PASS, FAIL, LIMITED SERVICE

  // Temperature Data
  temperature: {
    fahrenheit: number;
    celsius: number;
    tcf: number;
  };
  humidity: number;

  // Nameplate Data
  manufacturer: string;
  catalogNumber: string;
  serialNumber: string;
  type: string;
  manufacturingDate: string;
  icRating: string; // I.C. Rating (kA)
  ratedVoltage: string; // kV
  operatingVoltage: string; // kV
  ampacity: string; // A
  mvaRating: string; // MVA

  // Visual and Mechanical Inspection
  visualMechanicalInspection: {
    [key: string]: string; // NETA Section -> Result
  };
  counterReadingAsFound: string;
  counterReadingAsLeft: string;

  // Contact/Pole Resistance
  contactResistance: {
    p1: string;
    p2: string;
    p3: string;
    units: string;
  };

  // Insulation Resistance
  insulationResistanceMeasured: {
    testVoltage: string;
    poleToPoleUnits: string;
    poleToFrameUnits: string;
    lineToLoadUnits: string;
    poleToPoleClosedP1P2: string;
    poleToPoleClosedP2P3: string;
    poleToPoleClosedP3P1: string;
    poleToFrameClosedP1: string;
    poleToFrameClosedP2: string;
    poleToFrameClosedP3: string;
    lineToLoadOpenP1: string;
    lineToLoadOpenP2: string;
    lineToLoadOpenP3: string;
  };
  insulationResistanceCorrected: {
    poleToPoleClosedP1P2: string;
    poleToPoleClosedP2P3: string;
    poleToPoleClosedP3P1: string;
    poleToFrameClosedP1: string;
    poleToFrameClosedP2: string;
    poleToFrameClosedP3: string;
    lineToLoadOpenP1: string;
    lineToLoadOpenP2: string;
    lineToLoadOpenP3: string;
  };

  // Dielectric Withstand
  dielectricWithstandClosed: {
    p1Ground: string;
    p2Ground: string;
    p3Ground: string;
    units: string;
    result: string;
    testVoltage: string;
    testDuration: string; // e.g., "1 Min."
  };
  vacuumIntegrityOpen: {
    p1: string;
    p2: string;
    p3: string;
    units: string;
    result: string;
    testVoltage: string;
    testDuration: string; // e.g., "1 Min."
  };

  // Test Equipment Used
  testEquipment: {
    insulationResistanceTester: {
      model: string;
      serial: string;
      id: string;
    };
    microOhmmeter: {
      model: string;
      serial: string;
      id: string;
    };
    hiPotTester: {
      model: string;
      serial: string;
      id: string;
    };
  };

  // Comments
  comments: string;
}

const visualInspectionItemsList = [
  { id: '7.6.3.A.1', description: 'Compare equipment nameplate data with drawings and specifications.' },
  { id: '7.6.3.A.2', description: 'Inspect physical and mechanical condition.' },
  { id: '7.6.3.A.3', description: 'Inspect anchorage, alignment, and grounding.' },
  { id: '7.6.3.A.4', description: 'Verify that all maintenance devices such as special tools and gauges specified by the manufacturer are available for servicing and operating the breaker.' },
  { id: '7.6.3.A.5', description: 'Verify the unit is clean.' },
  { id: '7.6.3.A.6', description: 'Perform all mechanical operation tests on the operating mechanism in accordance with manufacturer\'s published data.' },
  { id: '7.6.3.A.7', description: 'Measure critical distances such as contact gap as recommended by manufacturer.' },
  { id: '7.6.3.A.8.1', description: 'Use of low-resistance ohmmeter in accordance with Section 7.6.3.B.1.' },
  { id: '7.6.3.A.9', description: 'Verify cell fit and element alignment.' },
  { id: '7.6.3.A.10', description: 'Verify racking mechanism operation.' },
  { id: '7.6.3.A.11', description: 'Verify appropriate lubrication on moving, current-carrying parts and on moving and sliding surfaces.' }
];

const MediumVoltageCircuitBreakerReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<boolean>(!reportId);
  const [saving, setSaving] = useState<boolean>(false);

  const initialFormData: FormData = {
    customer: '', address: '', user: user?.email || '', date: new Date().toISOString().split('T')[0],
    jobNumber: '', technicians: '', substation: '', eqptLocation: '', identifier: '', status: 'PASS',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1 }, humidity: 80,
    manufacturer: '', catalogNumber: '', serialNumber: '', type: '', manufacturingDate: '',
    icRating: '', ratedVoltage: '', operatingVoltage: '', ampacity: '', mvaRating: '',
    visualMechanicalInspection: visualInspectionItemsList.reduce((acc, item) => ({ ...acc, [item.id]: 'Select One' }), {}),
    counterReadingAsFound: '', counterReadingAsLeft: '',
    contactResistance: { p1: '', p2: '', p3: '', units: 'μΩ' },
    insulationResistanceMeasured: {
      testVoltage: '1000V',
      poleToPoleUnits: 'MΩ',
      poleToFrameUnits: 'MΩ',
      lineToLoadUnits: 'MΩ',
      poleToPoleClosedP1P2: '',
      poleToPoleClosedP2P3: '',
      poleToPoleClosedP3P1: '',
      poleToFrameClosedP1: '',
      poleToFrameClosedP2: '',
      poleToFrameClosedP3: '',
      lineToLoadOpenP1: '',
      lineToLoadOpenP2: '',
      lineToLoadOpenP3: '',
    },
    insulationResistanceCorrected: {
      poleToPoleClosedP1P2: '', poleToPoleClosedP2P3: '', poleToPoleClosedP3P1: '',
      poleToFrameClosedP1: '', poleToFrameClosedP2: '', poleToFrameClosedP3: '',
      lineToLoadOpenP1: '', lineToLoadOpenP2: '', lineToLoadOpenP3: '',
    },
    dielectricWithstandClosed: {
      p1Ground: '', p2Ground: '', p3Ground: '', units: 'μA', result: '', testVoltage: '', testDuration: '1 Min.'
    },
    vacuumIntegrityOpen: {
      p1: '', p2: '', p3: '', units: 'μA', result: '', testVoltage: '', testDuration: '1 Min.'
    },
    testEquipment: {
      insulationResistanceTester: {
        model: '', serial: '', id: '',
      },
      microOhmmeter: {
        model: '', serial: '', id: '',
      },
      hiPotTester: {
        model: '', serial: '', id: '',
      },
    },
    comments: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    const loadJobInfo = async () => {
      if (!jobId) return;
      try {
        const { data: jobData, error: jobError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select('title, job_number, customer_id')
          .eq('id', jobId)
          .single();
        if (jobError) throw jobError;

        let customerName = '';
        let customerAddress = '';
        if (jobData?.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('name, company_name, address')
            .eq('id', jobData.customer_id)
            .single();
          if (!customerError && customerData) {
            customerName = customerData.company_name || customerData.name || '';
            customerAddress = customerData.address || '';
          }
        }
        setFormData(prev => ({
          ...prev,
          customer: customerName,
          address: customerAddress,
          jobNumber: jobData?.job_number || '',
        }));
      } catch (error) {
        console.error('Error loading job info:', error);
        alert(`Failed to load job info: ${(error as Error).message}`);
      }
    };

    if (jobId) loadJobInfo();
    if (!reportId) setLoading(false);
  }, [jobId]);

  useEffect(() => {
    const loadReportData = async () => {
      if (!reportId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .schema('neta_ops')
          .from('medium_voltage_circuit_breaker_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found
            setIsEditing(true);
          } else {
            throw error;
          }
        }
        if (data) {
          setFormData(prev => ({ ...prev, ...data.report_data, status: data.report_data.status || 'PASS' }));
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
    if (reportId) loadReportData();
  }, [reportId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    setFormData(prev => {
      let current = { ...prev } as any;
      let pointer = current;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          pointer[key] = value;
        } else {
          if (!pointer[key]) pointer[key] = {};
          pointer = pointer[key];
        }
      });
      return current;
    });
  };
  
  const handleFahrenheitChange = (fahrenheit: number) => {
    const celsius = Math.round(((fahrenheit - 32) * 5) / 9);
    const tcf = getTCF(celsius);
    setFormData(prev => ({
      ...prev,
      temperature: { ...prev.temperature, fahrenheit, celsius, tcf }
    }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const roundedCelsius = Math.round(celsius);
    const fahrenheit = Math.round((roundedCelsius * 9) / 5 + 32);
    const tcf = getTCF(roundedCelsius);
    setFormData(prev => ({
      ...prev,
      temperature: { ...prev.temperature, celsius: roundedCelsius, fahrenheit, tcf }
    }));
  };

  useEffect(() => {
    const calculateCorrected = () => {
      const corrected: Partial<FormData['insulationResistanceCorrected']> = {};
      const measured = formData.insulationResistanceMeasured;
      const tcf = formData.temperature.tcf;

      for (const key in measured) {
        if (key !== 'testVoltage' && key !== 'units') {
          const valueStr = (measured as any)[key];
          if (valueStr && !isNaN(parseFloat(valueStr))) {
            (corrected as any)[key] = (parseFloat(valueStr) * tcf).toFixed(2);
          } else {
            (corrected as any)[key] = valueStr; // Keep non-numeric like N/A, >1000 etc.
          }
        }
      }
      setFormData(prev => ({
        ...prev,
        insulationResistanceCorrected: corrected as FormData['insulationResistanceCorrected']
      }));
    };
    calculateCorrected();
  }, [formData.insulationResistanceMeasured, formData.temperature.tcf]);

  const calculateCorrectedValue = (value: string, tcf: number): string => {
    if (value && !isNaN(parseFloat(value))) {
      return (parseFloat(value) * tcf).toFixed(2);
    }
    return value; // Keep non-numeric values as is
  };

  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;
    setSaving(true);

    const reportPayload = {
      job_id: jobId,
      user_id: user.id,
      report_data: formData,
    };

    try {
      let result;
      if (reportId) {
        result = await supabase
          .schema('neta_ops')
          .from('medium_voltage_circuit_breaker_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        result = await supabase
          .schema('neta_ops')
          .from('medium_voltage_circuit_breaker_reports')
          .insert(reportPayload)
          .select()
          .single();

        if (result.data) {
          const assetData = {
            name: `MV Circuit Breaker Report - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/medium-voltage-circuit-breaker-report/${result.data.id}`,
            user_id: user.id,
          };
          const { error: assetError } = await supabase.schema('neta_ops').from('assets').insert(assetData);
          if (assetError) throw assetError;
          
          // Get the newly created asset's ID to link it
          const { data: newAsset, error: newAssetError } = await supabase
            .schema('neta_ops')
            .from('assets')
            .select('id')
            .eq('file_url', assetData.file_url)
            .single();
          if (newAssetError || !newAsset) throw newAssetError || new Error("Failed to retrieve new asset ID");

          await supabase.schema('neta_ops').from('job_assets').insert({
            job_id: jobId,
            asset_id: newAsset.id,
            user_id: user.id,
          });
        }
      }
      if (result.error) throw result.error;
      setIsEditing(false);
      alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      navigateAfterSave(navigate, jobId, location);
    } catch (error) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  const renderInput = (name: string, placeholder?: string, type: string = "text", readOnlyOverride?: boolean, widthClass: string = "w-full") => {
    const value = name.split('.').reduce((o, i) => o?.[i], formData);
    const displayValue = (typeof value === 'string' || typeof value === 'number') ? value : '';
    return (
      <input
        type={type}
        name={name}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        readOnly={!isEditing || readOnlyOverride}
        className={`mt-1 block ${widthClass} rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${(!isEditing || readOnlyOverride) ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
      />
    );
  }

  const renderSelect = (name: string, options: readonly string[], readOnlyOverride?: boolean, widthClass: string = "w-full") => {
    const value = name.split('.').reduce((o, i) => o?.[i], formData);
    const displayValue = (typeof value === 'string' || typeof value === 'number') ? value : '';
    return (
      <select
        name={name}
        value={displayValue}
        onChange={handleInputChange}
        disabled={!isEditing || readOnlyOverride}
        className={`mt-1 block ${widthClass} rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${(!isEditing || readOnlyOverride) ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medium Voltage Circuit Breaker Test Report</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isEditing) {
                setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }));
              }
            }}
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
              disabled={!isEditing || saving}
              className={`px-4 py-2 text-sm text-white bg-[#f26722] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26722] ${!isEditing ? 'hidden' : 'hover:bg-[#f26722]/90'}`}
            >
              {saving ? 'Saving...' : (reportId ? 'Update Report' : 'Save Report')}
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer:</label>{renderInput("customer", "", "text", true)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job #:</label>{renderInput("jobNumber", "", "text", true)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address:</label>{renderInput("address", "", "text", true)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians:</label>{renderInput("technicians")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User:</label>{renderInput("user", "", "text", true)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation:</label>{renderInput("substation")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>{renderInput("date", "", "date")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eqpt. Location:</label>{renderInput("eqptLocation")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier:</label>{renderInput("identifier")}</div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. °F:</label>
            <input
              type="number"
              value={formData.temperature.fahrenheit}
              onChange={(e) => handleFahrenheitChange(Number(e.target.value))}
              readOnly={!isEditing}
              className={`mt-1 block w-20 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">°C:</label>
            <input
              type="number"
              value={formData.temperature.celsius}
              onChange={(e) => handleCelsiusChange(Number(e.target.value))}
              readOnly={!isEditing}
              className={`mt-1 block w-20 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TCF:</label>
            <input
              type="number"
              value={formData.temperature.tcf}
              readOnly
              className="mt-1 block w-20 rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Humidity %:</label>
            {renderInput("humidity", "", "number")}
          </div>
        </div>
      </div>

      {/* Nameplate Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer:</label>{renderInput("manufacturer")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">I.C. Rating (kA):</label>{renderInput("icRating")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Number:</label>{renderInput("catalogNumber")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (kV):</label>{renderInput("ratedVoltage")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number:</label>{renderInput("serialNumber")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Operating Voltage (kV):</label>{renderInput("operatingVoltage")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>{renderInput("type")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ampacity (A):</label>{renderInput("ampacity")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturing Date:</label>{renderInput("manufacturingDate")}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MVA Rating:</label>{renderInput("mvaRating")}</div>
        </div>
      </div>

      {/* Visual and Mechanical Inspection */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NETA Section</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Results</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {visualInspectionItemsList.map(item => (
                <tr key={item.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{item.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {renderSelect(`visualMechanicalInspection.${item.id}`, visualInspectionOptions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="mt-4 border-collapse border border-gray-200 dark:border-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200" colSpan={2}>
                  Counter Reading
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">As Found</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("counterReadingAsFound", "", "text", false, "w-full")}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">As Left</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("counterReadingAsLeft", "", "text", false, "w-full")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact/Pole Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Contact/Pole Resistance</h2>
        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">P1</td>
              <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">P2</td>
              <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">P3</td>
              <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">Units</td>
            </tr>
            <tr>
              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                {renderInput("contactResistance.p1", "", "text", false, "w-full")}
              </td>
              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                {renderInput("contactResistance.p2", "", "text", false, "w-full")}
              </td>
              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                {renderInput("contactResistance.p3", "", "text", false, "w-full")}
              </td>
              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                {renderSelect("contactResistance.units", contactResistanceUnits, false, "w-full")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insulation Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance</h2>
        <div className="overflow-x-auto">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Voltage:</span>
            {renderSelect("insulationResistanceMeasured.testVoltage", insulationTestVoltages, false, "w-32")}
          </div>
          <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
            <thead>
              <tr>
                <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200"></th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200"></th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                  Measured Values<br />P1 (P1-P2) P2 (P2-P3) P3 (P3-P1)
                </th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                  Temperature Corrected<br />P1 (P1-P2) P2 (P2-P3) P3 (P3-P1)
                </th>
                <th className="w-32 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Pole to Pole</td>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Closed</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToPoleClosedP1P2", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToPoleClosedP2P3", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToPoleClosedP3P1", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToPoleClosedP1P2, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToPoleClosedP2P3, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToPoleClosedP3P1, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderSelect("insulationResistanceMeasured.poleToPoleUnits", insulationResistanceUnits, false, "w-full")}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Pole to Frame</td>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Closed</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToFrameClosedP1", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToFrameClosedP2", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.poleToFrameClosedP3", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToFrameClosedP1, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToFrameClosedP2, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.poleToFrameClosedP3, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderSelect("insulationResistanceMeasured.poleToFrameUnits", insulationResistanceUnits, false, "w-full")}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Line to Load</td>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Open</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.lineToLoadOpenP1", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.lineToLoadOpenP2", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("insulationResistanceMeasured.lineToLoadOpenP3", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.lineToLoadOpenP1, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.lineToLoadOpenP2, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={calculateCorrectedValue(formData.insulationResistanceMeasured.lineToLoadOpenP3, formData.temperature.tcf)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-dark-200 shadow-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderSelect("insulationResistanceMeasured.lineToLoadUnits", insulationResistanceUnits, false, "w-full")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dielectric Withstand */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Dielectric Withstand</h2>
        <div className="space-y-6">
          {/* Dielectric Withstand - Breaker CLOSED */}
          <div>
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th colSpan={4} className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    Dielectric Withstand - Breaker CLOSED
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    Units
                  </th>
                </tr>
                <tr>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P1-Ground
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P2-Ground
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P3-Ground
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    {renderSelect("dielectricWithstandClosed.units", dielectricWithstandUnits, false, "w-full")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Result:</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("dielectricWithstandClosed.result", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("dielectricWithstandClosed.p1Ground", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("dielectricWithstandClosed.p2Ground", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("dielectricWithstandClosed.p3Ground", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700"></td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end mt-2 space-x-4">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Voltage:</label>
                {renderInput("dielectricWithstandClosed.testVoltage", "", "text", false, "w-24")}
              </div>
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Duration:</label>
                {renderInput("dielectricWithstandClosed.testDuration", "", "text", false, "w-24")}
              </div>
            </div>
          </div>

          {/* Vacuum Integrity - Breaker OPEN */}
          <div>
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr>
                  <th colSpan={4} className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    Vacuum Integrity - Breaker OPEN
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    Units
                  </th>
                </tr>
                <tr>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P1
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P2
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    P3
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">
                    {renderSelect("vacuumIntegrityOpen.units", dielectricWithstandUnits, false, "w-full")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Result:</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("vacuumIntegrityOpen.result", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("vacuumIntegrityOpen.p1", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("vacuumIntegrityOpen.p2", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {renderInput("vacuumIntegrityOpen.p3", "", "text", false, "w-full")}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700"></td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end mt-2 space-x-4">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Voltage:</label>
                {renderInput("vacuumIntegrityOpen.testVoltage", "", "text", false, "w-24")}
              </div>
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Test Duration:</label>
                {renderInput("vacuumIntegrityOpen.testDuration", "", "text", false, "w-24")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Equipment Used */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">Equipment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">Model</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">Serial</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-200">ID</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Insulation Resistance Tester</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.insulationResistanceTester.model", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.insulationResistanceTester.serial", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.insulationResistanceTester.id", "", "text", false, "w-full")}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Micro-ohmmeter</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.microOhmmeter.model", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.microOhmmeter.serial", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.microOhmmeter.id", "", "text", false, "w-full")}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">Hi-Pot Tester</td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.hiPotTester.model", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.hiPotTester.serial", "", "text", false, "w-full")}
                </td>
                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                  {renderInput("testEquipment.hiPotTester.id", "", "text", false, "w-full")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <textarea
          name="comments"
          value={formData.comments}
          onChange={handleInputChange}
          placeholder="Enter any comments or notes here..."
          readOnly={!isEditing}
          rows={4}
          className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>
    </div>
  );
};

export default MediumVoltageCircuitBreakerReport; 