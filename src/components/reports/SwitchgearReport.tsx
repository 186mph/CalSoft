import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';

// Add these constants at the top of the file, after the imports
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

const contactResistanceUnits = [
  { symbol: "µΩ", name: "Micro-Ohms" },
  { symbol: "mΩ", name: "Milli-Ohms" },
  { symbol: "Ω", name: "Ohms" }
];

interface FormData {
  // Job Information
  customer: string;
  address: string;
  date: string;
  technicians: string;
  jobNumber: string;
  substation: string;
  eqptLocation: string;
  temperature: {
    celsius: number;
    fahrenheit: number;
    humidity: number;
    tcf: number;
  };
  
  // Nameplate Data
  manufacturer: string;
  catalogNumber: string;
  serialNumber: string;
  type: string;
  systemVoltage: string;
  ratedVoltage: string;
  ratedCurrent: string;
  phaseConfiguration: string;

  // Visual and Mechanical Inspection
  visualInspectionItems: {
    id: string;
    description: string;
    result: string;
    comments: string;
  }[];

  // Electrical Tests
  insulationResistanceTests: {
    busSection: string;
    values: {
      ag: string;
      bg: string;
      cg: string;
      ab: string;
      bc: string;
      ca: string;
      an: string;
      bn: string;
      cn: string;
    };
    testVoltage: string;
    unit: string;
  }[];

  // Temperature Corrected Values
  temperatureCorrectedTests: {
    busSection: string;
    values: {
      ag: string;
      bg: string;
      cg: string;
      ab: string;
      bc: string;
      ca: string;
      an: string;
      bn: string;
      cn: string;
    };
    unit: string;
  }[];

  // Contact Resistance
  contactResistanceTests: {
    busSection: string;
    values: {
      aPhase: string;
      bPhase: string;
      cPhase: string;
      neutral: string;
      ground: string;
    };
    testVoltage: string;
    unit: string;
  }[];

  // Dielectric Withstand
  dielectricWithstandTests: {
    busSection: string;
    values: {
      ag: string;
      bg: string;
      cg: string;
    };
    testVoltage: string;
    unit: string;
  }[];

  // Test Equipment Used
  testEquipment: {
    megohmmeter: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    lowResistance: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
    hipot: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
  };

  comments: string;
  status: string;

  // New fields
  jobTitle: string;
  customerName: string;
  customerLocation: string;
  jobId: string;
  identifier: string;
  userName: string;
  testEquipmentLocation: string;
}

// Add TCF lookup function
const getTCF = (celsius: number): number => {
  const tcfTable = {
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
  
  // Round to nearest integer for lookup
  const roundedTemp = Math.round(celsius);
  return tcfTable[roundedTemp.toString()] || 1; // Default to 1 if temperature not found
};

const SwitchgearReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId); // True if new report, false if loading existing
  const [formData, setFormData] = useState<FormData>({
    // Initialize with default values
    customer: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    technicians: '',
    jobNumber: '',
    substation: '',
    eqptLocation: '',
    temperature: {
      fahrenheit: 68,
      celsius: 20,
      humidity: 0,
      tcf: 1
    },
    manufacturer: '',
    catalogNumber: '',
    serialNumber: '',
    type: '',
    systemVoltage: '',
    ratedVoltage: '',
    ratedCurrent: '',
    phaseConfiguration: '',
    visualInspectionItems: [
      { id: '7.1.A.1', description: 'Compare equipment nameplate data with drawings and specifications.', result: '', comments: '' },
      { id: '7.1.A.2', description: 'Inspect physical, electrical, and mechanical condition of cords and connectors.', result: '', comments: '' },
      { id: '7.1.A.3', description: 'Inspect anchorage, alignment, grounding, and required area clearances.', result: '', comments: '' },
      { id: '7.1.A.4', description: 'Verify the unit is clean and all shipping bracing, loose parts, and documentation shipped inside cubicles have been removed.', result: '', comments: '' },
      { id: '7.1.A.5', description: 'Verify that fuse and circuit breaker sizes and types correspond to drawings and coordination study as well as to the circuit breaker address for microprocessor-communication packages.', result: '', comments: '' },
      { id: '7.1.A.6', description: 'Verify that current and voltage transformer ratios correspond to drawings.', result: '', comments: '' },
      { id: '7.1.A.7', description: 'Verify that wiring connections are tight and that wiring is secure to prevent damage during routine operation of moving parts.', result: '', comments: '' },
      { id: '7.1.A.8.1', description: 'Use of a low-resistance ohmmeter in accordance with Section 7.1.B.1.', result: '', comments: '' },
      { id: '7.1.A.9', description: 'Confirm correct operation and sequencing of electrical and mechanical interlock systems.', result: '', comments: '' },
      { id: '7.1.A.10', description: 'Verify appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.', result: '', comments: '' },
      { id: '7.1.A.11', description: 'Inspect insulators for evidence of physical damage or contaminated surfaces.', result: '', comments: '' },
      { id: '7.1.A.12', description: 'Verify correct barrier and shutter installation and operation.', result: '', comments: '' },
      { id: '7.1.A.13', description: 'Exercise all active components.', result: '', comments: '' },
      { id: '7.1.A.14', description: 'Inspect mechanical indicating devices for correct operation.', result: '', comments: '' },
      { id: '7.1.A.15', description: 'Verify that filters are in place and vents are clear.', result: '', comments: '' }
    ],
    insulationResistanceTests: [
      {
        busSection: 'Bus 1',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 2',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 3',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 4',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 5',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 6',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        testVoltage: '',
        unit: 'MΩ'
      }
    ],
    temperatureCorrectedTests: [
      {
        busSection: 'Bus 1',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 2',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 3',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 4',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 5',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      },
      {
        busSection: 'Bus 6',
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
        unit: 'MΩ'
      }
    ],
    contactResistanceTests: [
      {
        busSection: 'Bus 1',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      },
      {
        busSection: 'Bus 2',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      },
      {
        busSection: 'Bus 3',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      },
      {
        busSection: 'Bus 4',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      },
      {
        busSection: 'Bus 5',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      },
      {
        busSection: 'Bus 6',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      }
    ],
    dielectricWithstandTests: [
      {
        busSection: 'Bus 1',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      },
      {
        busSection: 'Bus 2',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      },
      {
        busSection: 'Bus 3',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      },
      {
        busSection: 'Bus 4',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      },
      {
        busSection: 'Bus 5',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      },
      {
        busSection: 'Bus 6',
        values: { ag: '', bg: '', cg: '' },
        testVoltage: '',
        unit: 'µA'
      }
    ],
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
      lowResistance: { name: '', serialNumber: '', ampId: '' },
      hipot: { name: '', serialNumber: '', ampId: '' }
    },
    comments: '',
    jobTitle: '',
    customerName: '',
    customerLocation: '',
    jobId: '',
    identifier: '',
    userName: '',
    testEquipmentLocation: '',
    status: 'PASS'
  });

  useEffect(() => {
    if (jobId) {
      loadJobInfo();
    }
    if (reportId) {
      loadReport();
    } else {
      setFormData(prev => ({
        ...prev,
        jobId: jobId || '',
        customerName: prev.customerName || '',
        customerLocation: prev.customerLocation || '',
      }));
    }
    setIsEditing(!reportId);
  }, [jobId, reportId]);

  useEffect(() => {
    const tcf = getTCF(formData.temperature.celsius);
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        tcf
      },
      // Update temperature corrected values
      temperatureCorrectedTests: formData.insulationResistanceTests.map(test => ({
        busSection: test.busSection,
        values: {
          ag: test.values.ag ? (parseFloat(test.values.ag) * tcf).toFixed(2) : '',
          bg: test.values.bg ? (parseFloat(test.values.bg) * tcf).toFixed(2) : '',
          cg: test.values.cg ? (parseFloat(test.values.cg) * tcf).toFixed(2) : '',
          ab: test.values.ab ? (parseFloat(test.values.ab) * tcf).toFixed(2) : '',
          bc: test.values.bc ? (parseFloat(test.values.bc) * tcf).toFixed(2) : '',
          ca: test.values.ca ? (parseFloat(test.values.ca) * tcf).toFixed(2) : '',
          an: test.values.an ? (parseFloat(test.values.an) * tcf).toFixed(2) : '',
          bn: test.values.bn ? (parseFloat(test.values.bn) * tcf).toFixed(2) : '',
          cn: test.values.cn ? (parseFloat(test.values.cn) * tcf).toFixed(2) : ''
        },
        unit: test.unit
      }))
    }));
  }, [formData.temperature.celsius, formData.insulationResistanceTests]);

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
          customerName: customerName,
          customerLocation: customerAddress,
          jobTitle: jobData.title || ''
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      alert(`Failed to load job info: ${(error as any).message}`);
    } finally {
      if (!reportId) {
        setLoading(false);
      }
    }
  };

  const loadReport = async () => {
    if (!reportId) {
      setLoading(false);
      setIsEditing(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('switchgear_reports')
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
        setFormData(prev => ({
          ...prev,
          ...data.report_info,
          customerName: data.report_info?.customer || prev.customerName,
          customerLocation: data.report_info?.address || prev.customerLocation,
          identifier: data.report_info?.identifier || '',
          userName: data.report_info?.userName || '',
          testEquipmentLocation: data.report_info?.testEquipmentLocation || '',
          visualInspectionItems: data.visual_mechanical?.items || prev.visualInspectionItems,
          insulationResistanceTests: data.insulation_resistance?.tests || prev.insulationResistanceTests,
          temperatureCorrectedTests: data.insulation_resistance?.correctedTests || prev.temperatureCorrectedTests,
          contactResistanceTests: data.contact_resistance?.tests || prev.contactResistanceTests,
          dielectricWithstandTests: data.contact_resistance?.dielectricTests || prev.dielectricWithstandTests,
          comments: data.comments || ''
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

  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    const reportData = {
      job_id: jobId,
      user_id: user.id,
      report_info: {
        customer: formData.customerName,
        address: formData.customerLocation,
        date: formData.date,
        technicians: formData.technicians,
        jobNumber: formData.jobNumber,
        substation: formData.substation,
        eqptLocation: formData.eqptLocation,
        temperature: formData.temperature,
        manufacturer: formData.manufacturer,
        catalogNumber: formData.catalogNumber,
        serialNumber: formData.serialNumber,
        type: formData.type,
        systemVoltage: formData.systemVoltage,
        ratedVoltage: formData.ratedVoltage,
        ratedCurrent: formData.ratedCurrent,
        phaseConfiguration: formData.phaseConfiguration,
        testEquipment: formData.testEquipment,
        identifier: formData.identifier,
        userName: formData.userName,
        testEquipmentLocation: formData.testEquipmentLocation,
        status: formData.status
      },
      visual_mechanical: {
        items: formData.visualInspectionItems
      },
      insulation_resistance: {
        tests: formData.insulationResistanceTests,
        correctedTests: formData.temperatureCorrectedTests
      },
      contact_resistance: {
        tests: formData.contactResistanceTests,
        dielectricTests: formData.dielectricWithstandTests
      },
      comments: formData.comments
    };

    try {
      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('switchgear_reports')
          .update(reportData)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from('switchgear_reports')
          .insert(reportData)
          .select()
          .single();

        // Create asset entry
        if (result.data) {
          const assetData = {
            name: `Switchgear Report - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/switchgear-report/${result.data.id}`,
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

      console.log('Switchgear report saved/updated successfully. Result:', result.data);
      setIsEditing(false); // Exit editing mode after successful save
      alert("Report saved successfully!");
      
      // Use the utility function to navigate back to job with the correct tab
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
    }
  };

  // Update temperature change handlers to round Celsius
  const handleFahrenheitChange = (fahrenheit: number) => {
    const celsius = Math.round(((fahrenheit - 32) * 5) / 9);
    const tcf = getTCF(celsius);
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        fahrenheit,
        celsius,
        tcf
      }
    }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const fahrenheit = Math.round((celsius * 9) / 5 + 32);
    const tcf = getTCF(celsius);
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        celsius,
        fahrenheit,
        tcf
      }
    }));
  };

  const calculateCorrectedValue = (value: string): string => {
    const tcf = getTCF(formData.temperature.celsius);
    return (parseFloat(value) * tcf).toFixed(2);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SWITCHGEAR SWITCHBOARD PANELBOARD INSPECTION & TEST REPORT ATS 21</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isEditing) {
                 setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }))
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-red-600 text-white focus:ring-red-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.status === 'PASS' ? 'PASS' : 'FAIL'}
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
              disabled={!isEditing}
              className={`px-4 py-2 text-sm text-white bg-[#f26722] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26722] ${!isEditing ? 'hidden' : 'hover:bg-[#f26722]/90'}`}
            >
              Save Report
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job #</label>
              <input
                type="text"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, jobNumber: e.target.value }))}
                readOnly={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                readOnly={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <textarea
                value={formData.customerLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, customerLocation: e.target.value }))}
                readOnly={!isEditing}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter Identifier"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label>
              <input
                type="text"
                value={formData.technicians}
                onChange={(e) => setFormData(prev => ({ ...prev, technicians: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
              <input
                type="text"
                value={formData.substation}
                onChange={(e) => setFormData(prev => ({ ...prev, substation: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Equipment Location</label>
              <input
                type="text"
                value={formData.eqptLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, eqptLocation: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
              <input
                type="text"
                id="userName"
                name="userName"
                value={formData.userName}
                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter User Name"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. °F</label>
                <input
                  type="number"
                  value={formData.temperature.fahrenheit}
                  onChange={(e) => handleFahrenheitChange(Number(e.target.value))}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">°C</label>
                <input
                  type="number"
                  value={formData.temperature.celsius}
                  onChange={(e) => handleCelsiusChange(Number(e.target.value))}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TCF</label>
                <input
                  type="number"
                  value={formData.temperature.tcf}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nameplate Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog No.</label>
              <input
                type="text"
                value={formData.catalogNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, catalogNumber: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">System Voltage (V)</label>
              <input
                type="text"
                value={formData.systemVoltage}
                onChange={(e) => setFormData(prev => ({ ...prev, systemVoltage: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (V)</label>
              <input
                type="text"
                value={formData.ratedVoltage}
                onChange={(e) => setFormData(prev => ({ ...prev, ratedVoltage: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Current (A)</label>
              <input
                type="text"
                value={formData.ratedCurrent}
                onChange={(e) => setFormData(prev => ({ ...prev, ratedCurrent: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phase Configuration</label>
              <input
                type="text"
                value={formData.phaseConfiguration}
                onChange={(e) => setFormData(prev => ({ ...prev, phaseConfiguration: e.target.value }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.visualInspectionItems.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={item.result}
                      onChange={(e) => {
                        const newItems = [...formData.visualInspectionItems];
                        newItems[index].result = e.target.value;
                        setFormData({ ...formData, visualInspectionItems: newItems });
                      }}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {visualInspectionOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={item.comments}
                      onChange={(e) => {
                        const newItems = [...formData.visualInspectionItems];
                        newItems[index].comments = e.target.value;
                        setFormData({ ...formData, visualInspectionItems: newItems });
                      }}
                      readOnly={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Electrical Tests */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Measured Insulation Resistance Values</h2>
        <div className="flex justify-end mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.insulationResistanceTests[0]?.testVoltage || ''}
              onChange={(e) => {
                const newTests = formData.insulationResistanceTests.map(test => ({
                  ...test,
                  testVoltage: e.target.value
                }));
                setFormData({ ...formData, insulationResistanceTests: newTests });
              }}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select...</option>
              <option value="250V">250V</option>
              <option value="500V">500V</option>
              <option value="1000V">1000V</option>
              <option value="2500V">2500V</option>
              <option value="5000V">5000V</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Bus Section</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={9}>Insulation Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200"></th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-B</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-C</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-A</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.insulationResistanceTests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={test.busSection}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                  {['ag', 'bg', 'cg', 'ab', 'bc', 'ca', 'an', 'bn', 'cn'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        type="text"
                        value={test.values[key]}
                        onChange={(e) => {
                          const newTests = [...formData.insulationResistanceTests];
                          newTests[index].values[key] = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            insulationResistanceTests: newTests,
                            temperatureCorrectedTests: newTests.map(test => ({
                              ...test,
                              values: {
                                ag: test.values.ag ? (parseFloat(test.values.ag) * prev.temperature.tcf).toFixed(2) : '',
                                bg: test.values.bg ? (parseFloat(test.values.bg) * prev.temperature.tcf).toFixed(2) : '',
                                cg: test.values.cg ? (parseFloat(test.values.cg) * prev.temperature.tcf).toFixed(2) : '',
                                ab: test.values.ab ? (parseFloat(test.values.ab) * prev.temperature.tcf).toFixed(2) : '',
                                bc: test.values.bc ? (parseFloat(test.values.bc) * prev.temperature.tcf).toFixed(2) : '',
                                ca: test.values.ca ? (parseFloat(test.values.ca) * prev.temperature.tcf).toFixed(2) : '',
                                an: test.values.an ? (parseFloat(test.values.an) * prev.temperature.tcf).toFixed(2) : '',
                                bn: test.values.bn ? (parseFloat(test.values.bn) * prev.temperature.tcf).toFixed(2) : '',
                                cn: test.values.cn ? (parseFloat(test.values.cn) * prev.temperature.tcf).toFixed(2) : ''
                              },
                              unit: test.unit
                            }))
                          }));
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={test.unit}
                      onChange={(e) => {
                        const newTests = [...formData.insulationResistanceTests];
                        newTests[index].unit = e.target.value;
                        setFormData(prev => ({ ...prev, insulationResistanceTests: newTests }));
                      }}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
      </div>

      {/* Temperature Corrected Values */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Temperature Corrected Values</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Bus Section</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={9}>Insulation Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200"></th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-B</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-C</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-A</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.temperatureCorrectedTests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={test.busSection}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                  {['ag', 'bg', 'cg', 'ab', 'bc', 'ca', 'an', 'bn', 'cn'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        type="text"
                        value={formData.insulationResistanceTests[index]?.values[key] ? 
                          (parseFloat(formData.insulationResistanceTests[index].values[key]) * formData.temperature.tcf).toFixed(2) : ''}
                        readOnly
                        className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={test.unit}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Contact Resistance</h2>
        <div className="flex justify-end mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.contactResistanceTests[0]?.testVoltage || ''}
              onChange={(e) => {
                const newTests = formData.contactResistanceTests.map(test => ({
                  ...test,
                  testVoltage: e.target.value
                }));
                setFormData({ ...formData, contactResistanceTests: newTests });
              }}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select...</option>
              <option value="250V">250V</option>
              <option value="500V">500V</option>
              <option value="1000V">1000V</option>
              <option value="2500V">2500V</option>
              <option value="5000V">5000V</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Bus Section</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={5}>Contact Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200"></th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A Phase</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B Phase</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C Phase</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Neutral</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ground</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.contactResistanceTests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={test.busSection}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                  {['aPhase', 'bPhase', 'cPhase', 'neutral', 'ground'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        type="text"
                        value={test.values[key]}
                        onChange={(e) => {
                          const newTests = [...formData.contactResistanceTests];
                          if (!newTests[index]) {
                            newTests[index] = {
                              busSection: '',
                              values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
                              testVoltage: newTests[0]?.testVoltage || '',
                              unit: 'µΩ'
                            };
                          }
                          newTests[index].values[key] = e.target.value;
                          setFormData({ ...formData, contactResistanceTests: newTests });
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={test.unit}
                      onChange={(e) => {
                        const newTests = [...formData.contactResistanceTests];
                        newTests[index].unit = e.target.value;
                        setFormData(prev => ({ ...prev, contactResistanceTests: newTests }));
                      }}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {contactResistanceUnits.map(unit => (
                        <option key={unit.symbol} value={unit.symbol} className="dark:bg-dark-100 dark:text-white">{unit.symbol}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dielectric Withstand */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Dielectric Withstand</h2>
        <div className="flex justify-end mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.dielectricWithstandTests[0]?.testVoltage || ''}
              onChange={(e) => {
                const newTests = formData.dielectricWithstandTests.map(test => ({
                  ...test,
                  testVoltage: e.target.value
                }));
                setFormData({ ...formData, dielectricWithstandTests: newTests });
              }}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select...</option>
              <option value="250V">250V</option>
              <option value="500V">500V</option>
              <option value="1000V">1000V</option>
              <option value="2500V">2500V</option>
              <option value="5000V">5000V</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Bus Section</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={3}>Dielectric Withstand</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200"></th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.dielectricWithstandTests.map((test, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={test.busSection}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                  {['ag', 'bg', 'cg'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        type="text"
                        value={test.values[key]}
                        onChange={(e) => {
                          const newTests = [...formData.dielectricWithstandTests];
                          if (!newTests[index]) {
                            newTests[index] = {
                              busSection: '',
                              values: { ag: '', bg: '', cg: '' },
                              testVoltage: newTests[0]?.testVoltage || '',
                              unit: 'µA'
                            };
                          }
                          newTests[index].values[key] = e.target.value;
                          setFormData({ ...formData, dielectricWithstandTests: newTests });
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={test.unit}
                      onChange={(e) => {
                        const newTests = [...formData.dielectricWithstandTests];
                        if (!newTests[index]) {
                          newTests[index] = {
                            busSection: '',
                            values: { ag: '', bg: '', cg: '' },
                            testVoltage: newTests[0]?.testVoltage || '',
                            unit: e.target.value
                          };
                        }
                        newTests[index].unit = e.target.value;
                        setFormData({ ...formData, dielectricWithstandTests: newTests });
                      }}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      <option value="µA">µA</option>
                      <option value="mA">mA</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Equipment Used */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Megohmmeter</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    megohmmeter: { ...prev.testEquipment.megohmmeter, name: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.serialNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    megohmmeter: { ...prev.testEquipment.megohmmeter, serialNumber: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.ampId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    megohmmeter: { ...prev.testEquipment.megohmmeter, ampId: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Resistance</label>
              <input
                type="text"
                value={formData.testEquipment.lowResistance.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    lowResistance: { ...prev.testEquipment.lowResistance, name: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.lowResistance.serialNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    lowResistance: { ...prev.testEquipment.lowResistance, serialNumber: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.lowResistance.ampId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    lowResistance: { ...prev.testEquipment.lowResistance, ampId: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hipot</label>
              <input
                type="text"
                value={formData.testEquipment.hipot.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    hipot: { ...prev.testEquipment.hipot, name: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.hipot.serialNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    hipot: { ...prev.testEquipment.hipot, serialNumber: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.hipot.ampId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testEquipment: {
                    ...prev.testEquipment,
                    hipot: { ...prev.testEquipment.hipot, ampId: e.target.value }
                  }
                }))}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
          onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
          readOnly={!isEditing}
          rows={4}
          className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>
    </div>
  );
};

export default SwitchgearReport; 