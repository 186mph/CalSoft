import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { navigateAfterSave } from './ReportUtils';

// Add dropdown option constants
const INSPECTION_OPTIONS = [
  'Select One',
  'Satisfactory',
  'Unsatisfactory',
  'Cleaned',
  'See Comments',
  'Not Applicable'
];

const INSULATION_RESISTANCE_UNITS = [
  { value: 'kΩ', label: 'kΩ' },
  { value: 'MΩ', label: 'MΩ' },
  { value: 'GΩ', label: 'GΩ' }
];

const INSULATION_TEST_VOLTAGES = [
  '250V',
  '500V',
  '1000V',
  '2500V',
  '5000V'
];

const CONTACT_RESISTANCE_UNITS = [
  { value: 'μΩ', label: 'μΩ' },
  { value: 'mΩ', label: 'mΩ' },
  { value: 'Ω', label: 'Ω' }
];

const DIELECTRIC_WITHSTAND_UNITS = [
  { value: 'μA', label: 'μA' },
  { value: 'mA', label: 'mA' }
];

const VLF_WITHSTAND_TEST_VOLTAGES = [
  { rating: '5', voltage: '10' },
  { rating: '8', voltage: '13' },
  { rating: '15', voltage: '21' },
  { rating: '20', voltage: '26' },
  { rating: '25', voltage: '32' },
  { rating: '28', voltage: '36' },
  { rating: '30', voltage: '38' },
  { rating: '35', voltage: '44' },
  { rating: '46', voltage: '57' },
  { rating: '69', voltage: '84' }
];

const EQUIPMENT_EVALUATION_RESULTS = [
  'PASS',
  'FAIL',
  'LIMITED SERVICE'
];

interface FormData {
  // Customer information
  customer: string;
  address: string;
  user: string;
  date: string;
  identifier: string;
  jobNumber: string;
  technicians: string;
  substation: string;
  equipment: string;
  
  // Temperature data
  temperature: string;
  fahrenheit: boolean;
  tcf: number;
  humidity: string;
  
  // Nameplate data
  manufacturer: string;
  catalogNumber: string;
  serialNumber: string;
  fedFrom: string;
  conductorMaterial: string;
  ratedVoltage: string;
  operatingVoltage: string;
  ampacity: string;
  
  // NETA section results
  netaResults: {
    [key: string]: string;
  };
  
  // Contact/Pole Resistance
  busResistance: {
    p1: string;
    p2: string;
    p3: string;
    neutral: string;
  };
  
  // Insulation Resistance
  testVoltage1: string;
  insulationResistance: {
    [key: string]: string;
  };
  
  // Test Equipment
  megohmmeter: string;
  megohmSerial: string;
  megAmpId: string;
  lowResistanceOhmmeter: string;
  lowResistanceSerial: string;
  lowResistanceAmpId: string;
  
  comments: string;
  
  // Overall status
  status: 'PASS' | 'FAIL' | 'LIMITED SERVICE';
  
  // Add unit selection fields
  insulationResistanceUnit: string;
  contactResistanceUnit: string;
  dielectricWithstandUnit: string;
  
  // VLF withstand test fields
  cableRating: string;
  testVoltage: string;
  
  // Dielectric withstand test fields
  dielectricPhaseA: string;
  dielectricPhaseB: string;
  dielectricPhaseC: string;
}

// Add interface for the report data structure
interface ReportData {
  job_id: string;
  user_id: string;
  report_info: {
    customer: string;
    address: string;
    user: string;
    date: string;
    identifier: string;
    jobNumber: string;
    technicians: string;
    substation: string;
    equipment: string;
    
    temperature: string;
    fahrenheit: boolean;
    tcf: number;
    humidity: string;
    
    manufacturer: string;
    catalogNumber: string;
    serialNumber: string;
    fedFrom: string;
    conductorMaterial: string;
    ratedVoltage: string;
    operatingVoltage: string;
    ampacity: string;
    
    netaResults: { [key: string]: string };
    busResistance: {
      p1: string;
      p2: string;
      p3: string;
      neutral: string;
    };
    
    testVoltage1: string;
    insulationResistance: { [key: string]: string };
    
    insulationResistanceUnit: string;
    contactResistanceUnit: string;
    
    megohmmeter: string;
    megohmSerial: string;
    megAmpId: string;
    lowResistanceOhmmeter: string;
    lowResistanceSerial: string;
    lowResistanceAmpId: string;

    status: 'PASS' | 'FAIL' | 'LIMITED SERVICE';
  };
  comments: string;
  created_at?: string;
  updated_at: string;
}

// Add TCF conversion table
const TCF_TABLE = {
  '-24': 0.054,
  '-23': 0.068,
  '-22': 0.082,
  '-21': 0.096,
  '-20': 0.110,
  '-19': 0.124,
  '-18': 0.138,
  '-17': 0.152,
  '-16': 0.166,
  '-15': 0.180,
  '-14': 0.194,
  '-13': 0.208,
  '-12': 0.222,
  '-11': 0.236,
  '-10': 0.250,
  '-9': 0.264,
  '-8': 0.278,
  '-7': 0.292,
  '-6': 0.306,
  '-5': 0.320,
  '-4': 0.336,
  '-3': 0.352,
  '-2': 0.368,
  '-1': 0.384,
  '0': 0.400,
  '1': 0.420,
  '2': 0.440,
  '3': 0.460,
  '4': 0.480,
  '5': 0.500,
  '6': 0.526,
  '7': 0.552,
  '8': 0.578,
  '9': 0.604,
  '10': 0.630,
  '11': 0.666,
  '12': 0.702,
  '13': 0.738,
  '14': 0.774,
  '15': 0.810,
  '16': 0.848,
  '17': 0.886,
  '18': 0.924,
  '19': 0.962,
  '20': 1.000,
  '21': 1.050,
  '22': 1.100,
  '23': 1.150,
  '24': 1.200,
  '25': 1.250,
  '26': 1.316,
  '27': 1.382,
  '28': 1.448,
  '29': 1.514,
  '30': 1.580,
  '31': 1.664,
  '32': 1.748,
  '33': 1.832,
  '34': 1.872,
  '35': 2.000,
  '36': 2.100,
  '37': 2.200,
  '38': 2.300,
  '39': 2.400,
  '40': 2.500,
  '41': 2.628,
  '42': 2.756,
  '43': 2.884,
  '44': 3.012,
  '45': 3.150,
  '46': 3.316,
  '47': 3.482,
  '48': 3.648,
  '49': 3.814,
  '50': 3.980,
  '51': 4.184,
  '52': 4.388,
  '53': 4.592,
  '54': 4.796,
  '55': 5.000,
  '56': 5.260,
  '57': 5.520,
  '58': 5.780,
  '59': 6.040,
  '60': 6.300,
  '61': 6.620,
  '62': 6.940,
  '63': 7.260,
  '64': 7.580,
  '65': 7.900,
  '66': 8.320,
  '67': 8.740,
  '68': 9.160,
  '69': 9.580,
  '70': 10.000,
  '71': 10.520,
  '72': 11.040,
  '73': 11.560,
  '74': 12.080,
  '75': 12.600,
  '76': 13.240,
  '77': 13.880,
  '78': 14.520,
  '79': 15.160,
  '80': 15.800,
  '81': 16.640,
  '82': 17.480,
  '83': 18.320,
  '84': 19.160,
  '85': 20.000,
  '86': 21.040,
  '87': 22.080,
  '88': 23.120,
  '89': 24.160,
  '90': 25.200,
  '91': 26.450,
  '92': 27.700,
  '93': 28.950,
  '94': 30.200,
  '95': 31.600,
  '96': 33.280,
  '97': 34.960,
  '98': 36.640,
  '99': 38.320,
  '100': 40.000,
  '101': 42.080,
  '102': 44.160,
  '103': 46.240,
  '104': 48.320,
  '105': 50.400,
  '106': 52.960,
  '107': 55.520,
  '108': 58.080,
  '109': 60.640,
  '110': 63.200
} as const;

const MetalEnclosedBuswayReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    // Customer information
    customer: '',
    address: '',
    user: '',
    date: '',
    identifier: '',
    jobNumber: '',
    technicians: '',
    substation: '',
    equipment: '',
    
    // Temperature data
    temperature: '',
    fahrenheit: true,
    tcf: 0.138,
    humidity: '',
    
    // Nameplate data
    manufacturer: '',
    catalogNumber: '',
    serialNumber: '',
    fedFrom: '',
    conductorMaterial: '',
    ratedVoltage: '',
    operatingVoltage: '',
    ampacity: '',
    
    // NETA section results
    netaResults: {
      '7.4.A.1': '',
      '7.4.A.2': '',
      '7.4.A.3': '',
      '7.4.A.4': '',
      '7.4.A.5.1': '',
      '7.4.A.6': '',
      '7.4.A.7': '',
      '7.4.A.8': '',
      '7.4.A.9': ''
    },
    
    // Contact/Pole Resistance
    busResistance: {
      p1: '',
      p2: '',
      p3: '',
      neutral: ''
    },
    
    // Insulation Resistance
    testVoltage1: '',
    insulationResistance: {
      'A-B': '',
      'B-C': '',
      'C-A': '',
      'A-N': '',
      'B-N': '',
      'C-N': '',
      'A-G': '',
      'B-G': '',
      'C-G': '',
      'N-G': ''
    },
    
    // Test Equipment
    megohmmeter: '',
    megohmSerial: '',
    megAmpId: '',
    lowResistanceOhmmeter: '',
    lowResistanceSerial: '',
    lowResistanceAmpId: '',
    
    comments: '',
    
    // Overall status
    status: 'PASS',
    
    // Add unit selection fields
    insulationResistanceUnit: 'MΩ',
    contactResistanceUnit: 'μΩ',
    dielectricWithstandUnit: 'mA',
    
    // VLF withstand test fields
    cableRating: '',
    testVoltage: '',
    
    // Dielectric withstand test fields
    dielectricPhaseA: '',
    dielectricPhaseB: '',
    dielectricPhaseC: '',
  });
  
  // Temperature conversion functions
  const convertFtoC = (f: string): string => {
    const fValue = parseFloat(f);
    if (isNaN(fValue)) return '';
    return ((fValue - 32) * 5/9).toFixed(1);
  };
  
  // Update getTCF function to use the lookup table
  const getTCF = (temp: string): number => {
    const tempValue = parseFloat(temp);
    if (isNaN(tempValue)) return 0.138;
    
    // Convert Fahrenheit to Celsius
    const tempC = Math.round(parseFloat(convertFtoC(temp))).toString();
    
    // If temperature is below table minimum, return lowest value
    if (parseInt(tempC) < -24) return 0.054;
    
    // If temperature is above table maximum, return highest value
    if (parseInt(tempC) > 110) return 63.200;
    
    // Return exact value from table
    return TCF_TABLE[tempC as keyof typeof TCF_TABLE] || 0.138;
  };
  
  // Handle temperature change
  useEffect(() => {
    if (formData.temperature) {
      const tcf = getTCF(formData.temperature);
      setFormData(prev => ({...prev, tcf}));
    }
  }, [formData.temperature]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle NETA section results
  const handleNetaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      netaResults: {
        ...formData.netaResults,
        [name]: value
      }
    });
  };
  
  // Handle bus resistance changes
  const handleBusResistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      busResistance: {
        ...formData.busResistance,
        [name]: value
      }
    });
  };
  
  // Handle insulation resistance changes
  const handleInsulationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      insulationResistance: {
        ...formData.insulationResistance,
        [name]: value
      }
    });
  };
  
  // Toggle pass/fail status
  const toggleStatus = () => {
    setFormData({
      ...formData,
      status: formData.status === 'PASS' ? 'FAIL' : 'PASS'
    });
  };

  // Load job information
  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
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
        // Then fetch customer data
        let customerName = '';
        let customerAddress = '';
        
        if (jobData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select(`
              name,
              address
            `)
            .eq('id', jobData.customer_id)
            .single();

          if (!customerError && customerData) {
            customerName = customerData.name;
            customerAddress = customerData.address;
          }
        }

        setFormData(prev => ({
          ...prev,
          jobNumber: jobData.job_number || '',
          customer: customerName,
          address: customerAddress
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load report data
  const loadReport = async () => {
    if (!reportId || !user?.id) {
      setLoading(false);
      setIsEditing(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('metal_enclosed_busway_reports')
        .select('*')
        .eq('id', reportId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`Report with ID ${reportId} not found or access denied.`);
          alert('Report not found or you do not have permission to view it.');
          navigate(`/jobs/${jobId}/reports`);
          return;
        }
        throw error;
      }

      if (data) {
        setFormData({
          customer: data.report_info?.customer || '',
          address: data.report_info?.address || '',
          user: data.report_info?.user || '',
          date: data.report_info?.date || '',
          identifier: data.report_info?.identifier || '',
          jobNumber: data.report_info?.jobNumber || '',
          technicians: data.report_info?.technicians || '',
          substation: data.report_info?.substation || '',
          equipment: data.report_info?.equipment || '',
          
          temperature: data.report_info?.temperature || '',
          fahrenheit: data.report_info?.fahrenheit ?? true,
          tcf: data.report_info?.tcf || 0.138,
          humidity: data.report_info?.humidity || '',
          
          manufacturer: data.report_info?.manufacturer || '',
          catalogNumber: data.report_info?.catalogNumber || '',
          serialNumber: data.report_info?.serialNumber || '',
          fedFrom: data.report_info?.fedFrom || '',
          conductorMaterial: data.report_info?.conductorMaterial || '',
          ratedVoltage: data.report_info?.ratedVoltage || '',
          operatingVoltage: data.report_info?.operatingVoltage || '',
          ampacity: data.report_info?.ampacity || '',
          
          netaResults: data.report_info?.netaResults || {},
          busResistance: data.report_info?.busResistance || {
            p1: '',
            p2: '',
            p3: '',
            neutral: ''
          },
          
          testVoltage1: data.report_info?.testVoltage1 || '',
          insulationResistance: data.report_info?.insulationResistance || {},
          
          megohmmeter: data.report_info?.megohmmeter || '',
          megohmSerial: data.report_info?.megohmSerial || '',
          megAmpId: data.report_info?.megAmpId || '',
          lowResistanceOhmmeter: data.report_info?.lowResistanceOhmmeter || '',
          lowResistanceSerial: data.report_info?.lowResistanceSerial || '',
          lowResistanceAmpId: data.report_info?.lowResistanceAmpId || '',
          
          comments: data.comments || '',
          status: data.status || 'PASS',
          
          insulationResistanceUnit: data.report_info?.insulationResistanceUnit || 'MΩ',
          contactResistanceUnit: data.report_info?.contactResistanceUnit || 'μΩ',
          dielectricWithstandUnit: data.report_info?.dielectricWithstandUnit || 'mA',
          
          cableRating: data.report_info?.cableRating || '',
          testVoltage: data.report_info?.testVoltage || '',
          
          dielectricPhaseA: data.report_info?.dielectricPhaseA || '',
          dielectricPhaseB: data.report_info?.dielectricPhaseB || '',
          dielectricPhaseC: data.report_info?.dielectricPhaseC || '',
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Error loading report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save report
  const handleSave = async () => {
    if (!jobId || !user?.id) {
      console.error('Missing required job ID or user ID');
      alert('Error: Missing required information. Please try again.');
      return;
    }

    try {
      setIsEditing(false); // Disable editing while saving
      
      const reportData: ReportData = {
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
          substation: formData.substation,
          equipment: formData.equipment,
          
          temperature: formData.temperature,
          fahrenheit: formData.fahrenheit,
          tcf: formData.tcf,
          humidity: formData.humidity,
          
          manufacturer: formData.manufacturer,
          catalogNumber: formData.catalogNumber,
          serialNumber: formData.serialNumber,
          fedFrom: formData.fedFrom,
          conductorMaterial: formData.conductorMaterial,
          ratedVoltage: formData.ratedVoltage,
          operatingVoltage: formData.operatingVoltage,
          ampacity: formData.ampacity,
          
          netaResults: formData.netaResults,
          busResistance: formData.busResistance,
          
          testVoltage1: formData.testVoltage1,
          insulationResistance: formData.insulationResistance,
          
          insulationResistanceUnit: formData.insulationResistanceUnit,
          contactResistanceUnit: formData.contactResistanceUnit,
          
          megohmmeter: formData.megohmmeter,
          megohmSerial: formData.megohmSerial,
          megAmpId: formData.megAmpId,
          lowResistanceOhmmeter: formData.lowResistanceOhmmeter,
          lowResistanceSerial: formData.lowResistanceSerial,
          lowResistanceAmpId: formData.lowResistanceAmpId,

          status: formData.status
        },
        comments: formData.comments,
        updated_at: new Date().toISOString()
      };

      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('metal_enclosed_busway_reports')
          .update(reportData)
          .eq('id', reportId)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Insert new report
        reportData.created_at = new Date().toISOString();
        result = await supabase
          .schema('neta_ops')
          .from('metal_enclosed_busway_reports')
          .insert(reportData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // If this was a new report, create and link an asset
      if (!reportId && result.data) {
        // Create asset entry
        const assetData = {
          name: `Metal Enclosed Busway - ${formData.identifier || formData.substation || 'Unnamed'}`,
          file_url: `report:/jobs/${jobId}/metal-enclosed-busway/${result.data.id}`,
          user_id: user.id
        };

        const { data: assetResult, error: assetError } = await supabase
          .schema('neta_ops')
          .from('assets')
          .insert(assetData)
          .select('id')
          .single();

        if (assetError) throw assetError;

        // Link asset to job
        const { error: linkError } = await supabase
          .schema('neta_ops')
          .from('job_assets')
          .insert({
            job_id: jobId,
            asset_id: assetResult.id,
            user_id: user.id
          });

        if (linkError) throw linkError;

        // Navigate to the new report URL
        navigate(`/jobs/${jobId}/metal-enclosed-busway/${result.data.id}`);
      }

      setIsEditing(false); // Exit editing mode
      alert('Report saved successfully!');
      navigateAfterSave(navigate, jobId, location);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Error saving report. Please try again.');
      setIsEditing(true); // Re-enable editing if save failed
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadJobInfo();
    loadReport();
  }, [jobId, reportId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metal Enclosed Busway ATS Inspection Form</h1>
        <div className="flex gap-2">
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'PASS' | 'FAIL' | 'LIMITED SERVICE' }))}
            disabled={!isEditing}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.status === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : formData.status === 'FAIL'
                ? 'bg-red-600 text-white focus:ring-red-500'
                : 'bg-yellow-600 text-white focus:ring-yellow-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {EQUIPMENT_EVALUATION_RESULTS.map(result => (
              <option key={result} value={result}>{result}</option>
            ))}
          </select>

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
              className={`px-4 py-2 text-sm text-white bg-accent-color rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color ${!isEditing ? 'hidden' : 'hover:bg-accent-color/90'}`}
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
                onChange={handleInputChange}
                readOnly={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                readOnly={!isEditing}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label>
              <input
                type="text"
                name="technicians"
                value={formData.technicians}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
              <input
                type="text"
                name="substation"
                value={formData.substation}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Equipment Location</label>
              <input
                type="text"
                name="equipment"
                value={formData.equipment}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-baseline space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temp.</span>
                <input
                  type="number"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  className={`w-16 py-0 px-1 text-right border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0 dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-transparent dark:bg-transparent' : ''}`}
                />
                <span className="text-gray-500 dark:text-gray-400">°F</span>
              </div>

              <div className="flex items-baseline space-x-2">
                <input
                  type="text"
                  value={formData.temperature ? convertFtoC(formData.temperature) : ''}
                  readOnly
                  className="w-12 py-0 px-1 text-right border-b border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">°C</span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TCF</span>
                <input
                  type="text"
                  value={formData.tcf.toFixed(3)}
                  readOnly
                  className="w-12 py-0 px-1 text-right border-b border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                />
              </div>

              <div className="flex items-baseline space-x-2">
                <input
                  type="number"
                  name="humidity"
                  value={formData.humidity}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  className={`w-16 py-0 px-1 text-right border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0 dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-transparent dark:bg-transparent' : ''}`}
                />
                <span className="text-gray-500 dark:text-gray-400">%</span>
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
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Number</label>
              <input
                type="text"
                name="catalogNumber"
                value={formData.catalogNumber}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fed From</label>
              <input
                type="text"
                name="fedFrom"
                value={formData.fedFrom}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conductor Material</label>
              <input
                type="text"
                name="conductorMaterial"
                value={formData.conductorMaterial}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (kV)</label>
              <input
                type="text"
                name="ratedVoltage"
                value={formData.ratedVoltage}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Operating Voltage (kV)</label>
              <input
                type="text"
                name="operatingVoltage"
                value={formData.operatingVoltage}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ampacity (A)</label>
              <input
                type="text"
                name="ampacity"
                value={formData.ampacity}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(formData.netaResults).map(([id, result]) => (
                <tr key={id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {(() => {
                      switch(id) {
                        case '7.4.A.1': return 'Compare equipment nameplate data with drawings and specifications.';
                        case '7.4.A.2': return 'Inspect physical and mechanical condition.';
                        case '7.4.A.3': return 'Inspect anchorage, alignment, and grounding.';
                        case '7.4.A.4': return 'Verify correct connection in accordance with single-line diagram.';
                        case '7.4.A.5.1': return 'Use of a low-resistance ohmmeter in accordance with Section 7.4.B.';
                        case '7.4.A.6': return 'Confirm physical orientation in accordance with manufacturer\'s labels to insure adequate cooling.';
                        case '7.4.A.7': return 'Verify "weep-hole" plugs are in accordance with manufacturer\'s published data.';
                        case '7.4.A.8': return 'Verify correct installation of joint shield.';
                        case '7.4.A.9': return 'Verify ventilating openings are clean.';
                        default: return '';
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      name={id}
                      value={result}
                      onChange={handleNetaChange}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {INSPECTION_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Electrical Tests - Contact/Pole Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Contact/Pole Resistance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th colSpan={5} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bus Resistance</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">P1</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">P2</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">P3</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Neutral</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Units</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    name="p1"
                    value={formData.busResistance.p1}
                    onChange={handleBusResistanceChange}
                    readOnly={!isEditing}
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    name="p2"
                    value={formData.busResistance.p2}
                    onChange={handleBusResistanceChange}
                    readOnly={!isEditing}
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    name="p3"
                    value={formData.busResistance.p3}
                    onChange={handleBusResistanceChange}
                    readOnly={!isEditing}
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    name="neutral"
                    value={formData.busResistance.neutral}
                    onChange={handleBusResistanceChange}
                    readOnly={!isEditing}
                    className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                </td>
                <td className="px-3 py-2 text-center text-sm text-gray-900 dark:text-white">
                  {formData.contactResistanceUnit}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Electrical Tests - Insulation Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Insulation Resistance</h2>
        <div className="flex justify-end mb-2 space-x-4">
          <div className="w-48 border border-gray-300 dark:border-gray-700 p-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Voltage:</label>
            <select
              name="testVoltage1"
              value={formData.testVoltage1}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Voltage</option>
              {INSULATION_TEST_VOLTAGES.map(voltage => (
                <option key={voltage} value={voltage}>{voltage}</option>
              ))}
            </select>
          </div>
          <div className="w-48 border border-gray-300 dark:border-gray-700 p-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit:</label>
            <select
              name="insulationResistanceUnit"
              value={formData.insulationResistanceUnit}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {INSULATION_RESISTANCE_UNITS.map(unit => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th colSpan={10} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Insulation Resistance</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-B</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-C</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-A</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">N-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                {['A-B', 'B-C', 'C-A', 'A-N', 'B-N', 'C-N', 'A-G', 'B-G', 'C-G', 'N-G'].map((key) => (
                  <td key={key} className="px-3 py-2">
                    <input
                      type="text"
                      name={key}
                      value={formData.insulationResistance[key]}
                      onChange={handleInsulationChange}
                      readOnly={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-sm text-gray-900 dark:text-white">
                  {formData.insulationResistanceUnit}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Electrical Tests - Temperature Corrected Insulation Resistance Values */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Temperature Corrected Insulation Resistance Values</h2>
        <div className="flex justify-end mb-2">
          <div className="w-48 border border-gray-300 dark:border-gray-700 p-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Voltage:</label>
            <input
              type="text"
              value={formData.testVoltage1}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th colSpan={10} className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Temperature Corrected Values</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-B</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-C</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-A</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-N</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">A-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">B-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">C-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">N-G</th>
                <th className="px-3 py-2 bg-gray-50 dark:bg-dark-200 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                {['A-B', 'B-C', 'C-A', 'A-N', 'B-N', 'C-N', 'A-G', 'B-G', 'C-G', 'N-G'].map((key) => (
                  <td key={key} className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistance[key] ? calculateTempCorrectedValue(formData.insulationResistance[key], formData.tcf) : ''}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-sm text-gray-900 dark:text-white">
                  {formData.insulationResistanceUnit}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Megohmmeter</label>
              <input
                type="text"
                name="megohmmeter"
                value={formData.megohmmeter}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                name="megohmSerial"
                value={formData.megohmSerial}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                name="megAmpId"
                value={formData.megAmpId}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Resistance Ohmmeter</label>
              <input
                type="text"
                name="lowResistanceOhmmeter"
                value={formData.lowResistanceOhmmeter}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                name="lowResistanceSerial"
                value={formData.lowResistanceSerial}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                name="lowResistanceAmpId"
                value={formData.lowResistanceAmpId}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <textarea
          name="comments"
          value={formData.comments}
          onChange={handleInputChange}
          readOnly={!isEditing}
          rows={4}
          className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>
    </div>
  );
};

// Add this function to calculate temperature-corrected insulation resistance values
const calculateTempCorrectedValue = (value: string, tcf: number): string => {
  if (!value || !tcf) return '';
  return (parseFloat(value) * parseFloat(tcf.toFixed(3))).toFixed(2);
};

export default MetalEnclosedBuswayReport;