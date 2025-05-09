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

// Helper function to get TCF based on rounded Celsius
const getTCF = (celsius: number): number => {
  const roundedCelsius = Math.round(celsius);
  const key = roundedCelsius.toString(); // Use string key for lookup
  return tcfTable[key] !== undefined ? tcfTable[key] : 1; // Default to 1 if not found
};

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

const contactResistanceUnits = [
  { symbol: "µΩ", name: "Micro-Ohms" },
  { symbol: "mΩ", name: "Milli-Ohms" },
  { symbol: "Ω", name: "Ohms" }
];

interface FormData {
  // Job Information
  jobNumber: string;
  customerName: string;
  customerLocation: string;
  date: string;
  technicians: string;
  jobTitle: string;
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
  }[];

  // Contact Resistance Tests
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

  // Test Equipment Used
  testEquipment: {
    megohmmeter: {
      name: string;
      serialNumber: string;
      ampId: string;
    };
  };

  comments: string;
  status: string;

  // Additional fields
  identifier: string;
  userName: string;
  testEquipmentLocation: string;
}

const PanelboardReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  const [formData, setFormData] = useState<FormData>({
    // Initialize with default values
    jobNumber: '',
    customerName: '',
    customerLocation: '',
    date: new Date().toISOString().split('T')[0],
    technicians: '',
    jobTitle: '',
    substation: '',
    eqptLocation: '',
    temperature: {
      celsius: 20,
      fahrenheit: 68,
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
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' }, 
        testVoltage: '', 
        unit: 'MΩ' 
      }
    ],
    temperatureCorrectedTests: [
      {
        values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' }
      }
    ],
    contactResistanceTests: [
      {
        busSection: '',
        values: { aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: '' },
        testVoltage: '',
        unit: 'µΩ'
      }
    ],
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
    },
    comments: '',
    status: 'PASS',
    identifier: '',
    userName: '',
    testEquipmentLocation: '',
  });

  // Load job information
  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
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
      alert(`Failed to load job info: ${(error as Error).message}`);
    } finally {
      if (!reportId) {
        setLoading(false);
      }
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
        .from('panelboard_reports')
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

  // Save report
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
        tests: formData.contactResistanceTests
      },
      comments: formData.comments
    };

    try {
      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('panelboard_reports')
          .update(reportData)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from('panelboard_reports')
          .insert(reportData)
          .select()
          .single();

        // Create asset entry
        if (result.data) {
          const assetData = {
            name: `Panelboard Report - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/panelboard-report/${result.data.id}`,
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
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (jobId) {
      loadJobInfo();
    }
    if (reportId) {
      loadReport();
    }
  }, [jobId, reportId]);

  // Reset isEditing state when reportId changes (e.g., navigating from new to existing)
  useEffect(() => {
    setIsEditing(!reportId);
  }, [reportId]);

  // Handle temperature changes with new logic
  const handleFahrenheitChange = (fahrenheit: number) => {
    const calculatedCelsius = ((fahrenheit - 32) * 5) / 9;
    const roundedCelsius = Math.round(calculatedCelsius);
    const tcf = getTCF(roundedCelsius); // Use helper function with rounded Celsius
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        fahrenheit,
        celsius: roundedCelsius, // Store rounded Celsius
        tcf
      }
    }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const roundedCelsius = Math.round(celsius); // Round input Celsius for consistency and lookup
    const calculatedFahrenheit = (roundedCelsius * 9) / 5 + 32;
    const roundedFahrenheit = Math.round(calculatedFahrenheit);
    const tcf = getTCF(roundedCelsius); // Use helper function with rounded Celsius
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        celsius: roundedCelsius, // Store rounded Celsius
        fahrenheit: roundedFahrenheit, // Store rounded Fahrenheit
        tcf
      }
    }));
  };

  // Calculate temperature corrected values
  const calculateCorrectedValue = (value: string) => {
    if (typeof value === 'string' && (value.includes('>') || value.includes('<') || value === 'N/A')) {
      return value;
    }
    
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    
    return (parseFloat(value) * formData.temperature.tcf).toFixed(2);
  };

  // Handle form field changes
  const handleChange = (section: string | null, field: string, value: any) => {
    setFormData(prev => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  const handleNestedChange = (section: string, subsection: string, field: string, value: any) => {
    setFormData(prev => {
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [field]: value
          }
        }
      };
    });
  };

  const handleAddBusSection = () => {
    setFormData(prev => ({
      ...prev,
      insulationResistanceTests: [
        ...prev.insulationResistanceTests,
        {
          values: { ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' },
          testVoltage: prev.insulationResistanceTests[0]?.testVoltage || '',
          unit: 'MΩ'
        }
      ]
    }));
  };

  const handleRemoveBusSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      insulationResistanceTests: prev.insulationResistanceTests.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PANELBOARD INSPECTION & TEST REPORT</h1>
        <div className="flex gap-2">
          {/* Pass/Fail Button - Always visible, modifies state */}
          <button
            onClick={() => {
              if (isEditing) { // Only allow state change if editing
                 setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }))
              }
            }}
            // Make it visually clear if not editable
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-red-600 text-white focus:ring-red-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`} // Style change when not editing
          >
            {formData.status === 'PASS' ? 'PASS' : 'FAIL'}
          </button>

          {/* Conditional Edit/Save Buttons */}
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
              disabled={!isEditing} // Technically redundant due to conditional render, but good practice
              className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${!isEditing ? 'hidden' : 'hover:bg-orange-700'}`} // Hide when not editing
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
                value={formData.jobNumber}
                readOnly={true}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <input
                type="text"
                value={formData.customerName}
                readOnly={true}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <textarea
                value={formData.customerLocation}
                readOnly={true}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => handleChange(null, 'identifier', e.target.value)}
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
                onChange={(e) => handleChange(null, 'technicians', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
              <input
                type="text"
                value={formData.substation}
                onChange={(e) => handleChange(null, 'substation', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Equipment Location</label>
              <input
                type="text"
                value={formData.eqptLocation}
                onChange={(e) => handleChange(null, 'eqptLocation', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange(null, 'date', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleChange(null, 'userName', e.target.value)}
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
                onChange={(e) => handleChange(null, 'manufacturer', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog No.</label>
              <input
                type="text"
                value={formData.catalogNumber}
                onChange={(e) => handleChange(null, 'catalogNumber', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleChange(null, 'serialNumber', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => handleChange(null, 'type', e.target.value)}
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
                onChange={(e) => handleChange(null, 'systemVoltage', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (V)</label>
              <input
                type="text"
                value={formData.ratedVoltage}
                onChange={(e) => handleChange(null, 'ratedVoltage', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Current (A)</label>
              <input
                type="text"
                value={formData.ratedCurrent}
                onChange={(e) => handleChange(null, 'ratedCurrent', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phase Configuration</label>
              <input
                type="text"
                value={formData.phaseConfiguration}
                onChange={(e) => handleChange(null, 'phaseConfiguration', e.target.value)}
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

      {/* Electrical Tests - Insulation Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance</h2>
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
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={9}>Insulation Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
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
              <tr>
                {['ag', 'bg', 'cg', 'ab', 'bc', 'ca', 'an', 'bn', 'cn'].map((key) => (
                  <td key={key} className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistanceTests[0]?.values[key] || ''}
                      onChange={(e) => {
                        const newTests = [...formData.insulationResistanceTests];
                        newTests[0].values[key] = e.target.value;
                        setFormData({ ...formData, insulationResistanceTests: newTests });
                      }}
                      readOnly={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <select
                    value={formData.insulationResistanceTests[0]?.unit || 'MΩ'}
                    onChange={(e) => {
                      const newTests = [...formData.insulationResistanceTests];
                      newTests[0].unit = e.target.value;
                      setFormData({ ...formData, insulationResistanceTests: newTests });
                    }}
                    disabled={!isEditing}
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  >
                    {insulationResistanceUnits.map(unit => (
                      <option key={unit.symbol} value={unit.symbol}>{unit.symbol}</option>
                    ))}
                  </select>
                </td>
              </tr>
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
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" colSpan={9}>Insulation Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
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
              <tr>
                {['ag', 'bg', 'cg', 'ab', 'bc', 'ca', 'an', 'bn', 'cn'].map((key) => (
                  <td key={key} className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistanceTests[0]?.values[key] ? 
                        (parseFloat(formData.insulationResistanceTests[0].values[key]) * formData.temperature.tcf).toFixed(2) : ''}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={formData.insulationResistanceTests[0]?.unit || 'MΩ'}
                    readOnly
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                  />
                </td>
              </tr>
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
                setFormData(prev => ({ ...prev, contactResistanceTests: newTests }));
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
                  </td>
                  {['aPhase', 'bPhase', 'cPhase', 'neutral', 'ground'].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        type="text"
                        value={test.values[key]}
                        onChange={(e) => {
                          const newTests = [...formData.contactResistanceTests];
                          newTests[index].values[key] = e.target.value;
                          setFormData(prev => ({ ...prev, contactResistanceTests: newTests }));
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
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', 'name', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.serialNumber}
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', 'serialNumber', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.ampId}
                onChange={(e) => handleNestedChange('testEquipment', 'megohmmeter', 'ampId', e.target.value)}
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
          onChange={(e) => handleChange(null, 'comments', e.target.value)}
          readOnly={!isEditing}
          rows={4}
          className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>
    </div>
  );
};

export default PanelboardReport; 