import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import { toast } from 'react-toastify';

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

const visualInspectionResultOptions = ["Select One", "Satisfactory", "Unsatisfactory", "Cleaned", "Adjusted", "Repaired", "Replaced", "See Comments", "N/A"];
const poleOptions = ["", "1", "2", "3"];
const electricalTestOrderingOptions = ["Sequential", "Other"];

interface BreakerTestData {
  result?: 'PASS' | 'FAIL' | '';
  circuitNumber: string;
  poles: string;
  manuf: string;
  type: string;
  frameA: string;
  tripA: string;
  ratedCurrentA: string;
  testCurrentA: string;
  tripToleranceMin: string;
  tripToleranceMax: string;
  tripTime: string;
  insulationLL: string;
  insulationLP: string;
  insulationPP: string;
}

interface CustomerData {
  name: string;
  company_name: string;
  address: string;
}

interface JobData {
  title: string;
  job_number: string;
  customer_id: string;
}

interface JobWithCustomer extends JobData {
  customers: CustomerData;
}

// Add interface for the join query result
interface JobQueryResult {
  job_number: string;
  customer_id: string;
  title: string;
  customers: {
    name: string;
    company_name: string;
    address: string;
  }[];
}

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
  temperature: {
    fahrenheit: number;
    celsius: number;
    tcf: number;
  };
  humidity: number;

  // Nameplate Data
  panelboardManufacturer: string;
  panelboardTypeCat: string;
  panelboardSizeA: string;
  panelboardVoltageV: string;
  panelboardSCCRkA: string;
  mainBreakerManufacturer: string;
  mainBreakerType: string;
  mainBreakerFrameSizeA: string;
  mainBreakerRatingPlugA: string;
  mainBreakerICRatingkA: string;

  // Visual and Mechanical Inspection
  visualInspectionItems: {
    netaSection: string;
    description: string;
    results: string;
  }[];

  // Test Equipment Used
  megohmmeterName: string;
  megohmmeterSerial: string;
  megohmmeterAmpId: string;
  lowResistanceOhmmeterName: string;
  lowResistanceOhmmeterSerial: string;
  lowResistanceOhmmeterAmpId: string;
  primaryInjectionTestSetName: string;
  primaryInjectionTestSetSerial: string;
  primaryInjectionTestSetAmpId: string;

  // Comments
  comments: string;

  // Electrical Tests
  numberOfCircuitSpaces: string;
  electricalTestOrdering: string;
  tripCurveNumbers: string;
  breakers: BreakerTestData[];
}

// Add temperature type
type TemperatureField = 'fahrenheit' | 'celsius' | 'tcf';

const initialBreakerData = (circuitNum: number): BreakerTestData => ({
  circuitNumber: circuitNum.toString(), result: '', poles: '1', manuf: '', type: '', frameA: '', tripA: '',
  ratedCurrentA: '', testCurrentA: '', tripToleranceMin: '', tripToleranceMax: '', tripTime: '',
  insulationLL: '', insulationLP: '', insulationPP: ''
});

const LowVoltagePanelboardSmallBreakerTestATSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [isEditMode, setIsEditMode] = useState(!reportId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tcf, setTcf] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>(() => {
    const initialSpaces = 120;
    return {
      customer: '', 
      address: '', 
      user: user?.email || '', 
      date: new Date().toISOString().split('T')[0], 
      identifier: '',
      jobNumber: '', 
      technicians: '',
      temperature: {
        fahrenheit: 68,
        celsius: 20,
        tcf: 1
      },
      humidity: 0,
      substation: '', 
      eqptLocation: '',
      panelboardManufacturer: '', 
      panelboardTypeCat: '', 
      panelboardSizeA: '', 
      panelboardVoltageV: '', 
      panelboardSCCRkA: '',
      mainBreakerManufacturer: '', 
      mainBreakerType: '', 
      mainBreakerFrameSizeA: '', 
      mainBreakerRatingPlugA: '', 
      mainBreakerICRatingkA: '',
      visualInspectionItems: [
        { netaSection: '7.6.1.2.A.1', description: 'Compare equipment nameplate data with drawings and specifications.', results: '' },
        { netaSection: '7.6.1.2.A.2', description: 'Inspect physical and mechanical condition.', results: '' },
        { netaSection: '7.6.1.2.A.3', description: 'Inspect anchorage and alignment [and grounding].', results: '' },
        { netaSection: '7.6.1.2.A.4', description: 'Verify that all maintenance devices are available for servicing and operating the breaker.', results: '' },
        { netaSection: '7.6.1.2.A.5', description: 'Verify the unit is clean.', results: '' },
        { netaSection: '7.6.1.2.A.6', description: 'Verify the arc chutes are intact. [For insulated-case/molded-case breakers, only perform if unsealed]', results: '' },
        { netaSection: '7.6.1.2.A.7', description: 'Inspect moving and stationary contacts for condition and alignment [For insulated-case/molded-case breakers, only perform if unsealed]', results: '' },
        { netaSection: '7.6.1.2.A.10.1', description: 'Use of a low-resistance ohmmeter in accordance with Section 7.6.1.2.B.1.', results: '' },
        { netaSection: '7.6.1.2.A.14', description: 'Perform adjustments for final protective device settings in accordance with coordination study provided by end user.', results: '' },
      ],
      megohmmeterName: '', 
      megohmmeterSerial: '', 
      megohmmeterAmpId: '',
      lowResistanceOhmmeterName: '', 
      lowResistanceOhmmeterSerial: '', 
      lowResistanceOhmmeterAmpId: '',
      primaryInjectionTestSetName: '', 
      primaryInjectionTestSetSerial: '', 
      primaryInjectionTestSetAmpId: '',
      comments: 'Some items specific to switchgear draw-out breakers were removed from the above list.',
      numberOfCircuitSpaces: initialSpaces.toString(),
      electricalTestOrdering: 'Sequential',
      tripCurveNumbers: '',
      breakers: Array(initialSpaces).fill(null).map((_, i) => ({
        result: '',
        circuitNumber: (i + 1).toString(),
        poles: '1',
        manuf: '',
        type: '',
        frameA: '',
        tripA: '',
        ratedCurrentA: '',
        testCurrentA: '',
        tripToleranceMin: '',
        tripToleranceMax: '',
        tripTime: '',
        insulationLL: '',
        insulationLP: '',
        insulationPP: ''
      }))
    };
  });

  // Update TCF when temperature changes
  useEffect(() => {
    setTcf(calculateTCF(formData.temperature.fahrenheit));
  }, [formData.temperature]);

  // Load job info
  useEffect(() => {
    const loadJobInfo = async () => {
      if (!jobId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const { data, error: jobError } = await supabase
          .schema('neta_ops')
          .from('jobs')
          .select('job_number, customer_id, title')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        const jobData = data as JobData;

        if (jobData?.customer_id) {
          const { data: customerResult, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('name, company_name, address')
            .eq('id', jobData.customer_id)
            .single();
            
          if (!customerError && customerResult) {
            const customerData = customerResult as CustomerData;
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
        setError(`Failed to load job info: ${(error as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadJobInfo();
  }, [jobId]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (jobId) {
        try {
          const { data: jobData, error: jobError } = await supabase
            .schema('neta_ops')
            .from('jobs')
            .select('job_number, customer_id, title, customers!inner(name, company_name, address)')
            .eq('id', jobId)
            .single();

          if (jobError) throw jobError;

          if (jobData) {
            const typedJobData = jobData as unknown as JobQueryResult;
            const customerData = typedJobData.customers[0]; // Get first customer from array
            setFormData(prev => ({
              ...prev,
              jobNumber: typedJobData.job_number || '',
              customer: customerData?.company_name || customerData?.name || '',
              address: customerData?.address || '',
            }));
          }
        } catch (error) {
          console.error("Error loading job info:", error);
        }
      }

      if (reportId) {
        try {
          const { data: reportData, error: reportError } = await supabase
            .schema('neta_ops')
            .from('low_voltage_panelboard_small_breaker_reports') // Ensure this table name is correct
            .select('*')
            .eq('id', reportId)
            .single();

          if (reportError) throw reportError;

          if (reportData) {
            const loadedReportInfo = reportData.report_info || {};
            const loadedElectricalTests = reportData.electrical_tests || {};
            setFormData(prev => ({
              ...prev,
              ...loadedReportInfo,
              temperature: loadedReportInfo.temperature || prev.temperature, // Ensure temperature object is fully populated
              visualInspectionItems: reportData.visual_mechanical_inspection || prev.visualInspectionItems,
              breakers: loadedElectricalTests.breakers || Array(parseInt(loadedElectricalTests.numberOfCircuitSpaces || prev.numberOfCircuitSpaces, 10) || 120).fill(null).map((_,i) => initialBreakerData(i+1)),
              numberOfCircuitSpaces: loadedElectricalTests.numberOfCircuitSpaces || prev.numberOfCircuitSpaces,
              electricalTestOrdering: loadedElectricalTests.electricalTestOrdering || prev.electricalTestOrdering,
              tripCurveNumbers: loadedElectricalTests.tripCurveNumbers || prev.tripCurveNumbers,
              comments: reportData.comments_text || prev.comments,
            }));
            setIsEditMode(false);
          }
        } catch (error) {
          console.error("Error loading report data:", error);
          setIsEditMode(true); 
        }
      } else {
        setIsEditMode(true); 
      }
      setLoading(false);
    };
    loadInitialData();
  }, [jobId, reportId, user]);
  
  useEffect(() => {
    const numSpaces = parseInt(formData.numberOfCircuitSpaces, 10);
    if (!isNaN(numSpaces) && numSpaces >= 0 && numSpaces <= 120) { // Allow 0 for empty
      setFormData(prev => {
        const currentBreakers = prev.breakers;
        if (currentBreakers.length < numSpaces) {
          const newBreakersToAdd = Array(numSpaces - currentBreakers.length).fill(null).map((_, i) => initialBreakerData(currentBreakers.length + i + 1));
          return { ...prev, breakers: [...currentBreakers, ...newBreakersToAdd] };
        } else if (currentBreakers.length > numSpaces) {
          return { ...prev, breakers: currentBreakers.slice(0, numSpaces) };
        }
        return prev;
      });
    } else if (formData.numberOfCircuitSpaces === '' ) { // If input is cleared, default to 0 breakers
        setFormData(prev => ({...prev, breakers: [] }));
    } else if (numSpaces > 120) {
        setFormData(prev => ({...prev, numberOfCircuitSpaces: '120', breakers: Array(120).fill(null).map((_, i) => initialBreakerData(i + 1)) }));
    }

  }, [formData.numberOfCircuitSpaces]);


  const handleChange = (field: string, value: any, index?: number, subField?: string) => {
    if (!isEditMode) return;
    setFormData(prev => {
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy

      if (field === 'breakers' && index !== undefined && subField) {
        if (!newState.breakers[index]) newState.breakers[index] = initialBreakerData(index+1);
        
        // Special handling for rated current to auto-calculate test current
        if (subField === 'ratedCurrentA') {
          (newState.breakers[index] as any)[subField] = value;
          // Calculate test current as 3x rated current if rated current is a valid number
          const ratedCurrent = parseFloat(value);
          if (!isNaN(ratedCurrent)) {
            (newState.breakers[index] as any)['testCurrentA'] = (ratedCurrent * 3).toString();
          }
        } else {
          (newState.breakers[index] as any)[subField] = value;
        }
      } else if (field === 'visualInspectionItems' && index !== undefined && subField) {
        if (!newState.visualInspectionItems[index]) newState.visualInspectionItems[index] = { netaSection: '', description: '', results: '' };
        (newState.visualInspectionItems[index] as any)[subField] = value;
      } else if (field === 'temperature.fahrenheit') {
        const fahrenheit = Number(value);
        const celsius = Math.round((fahrenheit - 32) * 5 / 9);
        const tcf = getTCF(celsius);
        newState.temperature = {
          fahrenheit,
          celsius,
          tcf
        };
      } else if (field === 'temperature.celsius') {
        const celsius = Number(value);
        const fahrenheit = Math.round((celsius * 9 / 5) + 32);
        const tcf = getTCF(celsius);
        newState.temperature = {
          fahrenheit,
          celsius,
          tcf
        };
      } else {
        // For top-level fields or simple nested (e.g. panelboardManufacturer)
        const keys = field.split('.');
        let currentLevel: any = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentLevel[keys[i]]) currentLevel[keys[i]] = {};
            currentLevel = currentLevel[keys[i]];
        }
        currentLevel[keys[keys.length - 1]] = value;
      }
      return newState;
    });
  };

  const handleBreakerChange = (index: number, field: string, value: any) => {
    if (!isEditMode) return;
    setFormData(prev => {
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
      if (field === 'poles') {
        if (!newState.breakers[index]) newState.breakers[index] = initialBreakerData(index+1);
        (newState.breakers[index] as any)[field] = value;
      } else {
        (newState.breakers[index] as any)[field] = value;
      }
      return newState;
    });
  };

  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditMode) return;

    const { breakers, visualInspectionItems, comments, ...reportInfoSubset } = formData;

    const reportPayload = {
      job_id: jobId,
      user_id: user.id,
      report_info: reportInfoSubset,
      visual_mechanical_inspection: formData.visualInspectionItems,
      electrical_tests: {
        numberOfCircuitSpaces: formData.numberOfCircuitSpaces,
        electricalTestOrdering: formData.electricalTestOrdering,
        tripCurveNumbers: formData.tripCurveNumbers,
        breakers: formData.breakers,
      },
      comments_text: formData.comments,
      status: status
    };

    try {
      let result;
      if (reportId) {
        result = await supabase
          .schema('neta_ops')
          .from('low_voltage_panelboard_small_breaker_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        result = await supabase
          .schema('neta_ops')
          .from('low_voltage_panelboard_small_breaker_reports')
          .insert(reportPayload)
          .select()
          .single();

        if (result.data && result.data.id) {
          const newReportId = result.data.id;
          const assetData = {
            name: `8-Low Voltage Panelboard Small Breaker Test ATS - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/low-voltage-panelboard-small-breaker-report/${newReportId}`,
            user_id: user.id,
            template_type: 'ATS'
          };

          const { data: assetResult, error: assetError } = await supabase
            .schema('neta_ops')
            .from('assets')
            .insert(assetData)
            .select('id')
            .single();

          if (assetError) throw assetError;

          if (assetResult && assetResult.id) {
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
      }

      if (result.error) throw result.error;
      
      toast.success('Report saved successfully!');
      setIsEditMode(false);
      
      // Use the navigateAfterSave utility function
      navigateAfterSave(navigate, jobId, location);
      
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(`Failed to save report: ${(error as Error).message}`);
    }
  };
  
  const renderInputField = (label: string, fieldKey: string, placeholder = "", type = "text", colSpan = "md:col-span-1", isReadOnly?: boolean) => {
    // Utility to get deeply nested values
    const getValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    
    return (
        <div className={`mb-2 ${colSpan}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}:</label>
        <input
            type={type}
            value={getValue(formData, fieldKey) || ''}
            onChange={(e) => handleChange(fieldKey, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
            readOnly={!isEditMode || isReadOnly}
            placeholder={placeholder}
            className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${(!isEditMode || isReadOnly) ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
        />
        </div>
    );
  };

  // Temperature conversion and TCF calculation functions
  const calculateTCF = (fahrenheit: number): number => {
    const celsius = Math.round((fahrenheit - 32) * 5 / 9);
    return getTCF(celsius);
  };

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading report data...</div>;

  return (
    <div className="p-6 flex justify-center">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Low Voltage Panelboard Small Breaker Test ATS Report
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
              <button onClick={() => setIsEditMode(true)} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">Edit Report</button>
            ) : (
              <button onClick={handleSave} disabled={!isEditMode} className={`px-4 py-2 text-sm text-white bg-orange-600 rounded-md ${!isEditMode ? 'hidden' : 'hover:bg-orange-700'}`}>Save Report</button>
            )}
          </div>
        </div>

        {/* Job Information Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {renderInputField("Customer", "customer", "", "text", "md:col-span-1", true)}
              {renderInputField("Job #", "jobNumber", "", "text", "md:col-span-1", true)}
              {renderInputField("Address", "address", "", "text", "md:col-span-1", true)}
              {renderInputField("Technicians", "technicians")}
              {renderInputField("User", "user")}
              <div className="flex items-end space-x-2 md:col-span-1 mb-2">
                  {renderInputField("Temp.", "temperature.fahrenheit", "", "number", "flex-grow")}
                  <span className="pb-1">°F</span>
                  <input type="text" value={formData.temperature.celsius} readOnly className="form-input mt-1 w-16 bg-gray-100 dark:bg-dark-200 text-center cursor-not-allowed" />
                  <span className="pb-1">°C</span>
                  <label className="form-label inline-block pb-1 ml-2">TCF:</label>
                  <input type="text" value={formData.temperature.tcf.toFixed(3)} readOnly className="form-input mt-1 w-20 bg-gray-100 dark:bg-dark-200 text-center cursor-not-allowed" />
              </div>
              {renderInputField("Date", "date", "", "date")}
              <div className="flex items-center space-x-2 md:col-span-1 mb-2">
               {renderInputField("Humidity", "humidity", "", "number", "w-20")}
               <span className="pt-7">%</span>
              </div>
              {renderInputField("Identifier", "identifier")}
              {renderInputField("Substation", "substation")}
              <div className="md:col-span-1"></div>
              {renderInputField("Eqpt. Location", "eqptLocation")}
          </div>
        </section>

        {/* Nameplate Data Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div>
                  <h3 className="text-lg font-medium mb-2 dark:text-gray-200">Panelboard</h3>
                  {renderInputField("Manufacturer", "panelboardManufacturer")}
                  {renderInputField("Type / Cat #", "panelboardTypeCat")}
                  {renderInputField("Size (A)", "panelboardSizeA")}
                  {renderInputField("Voltage (V)", "panelboardVoltageV")}
                  {renderInputField("SCCR (kA)", "panelboardSCCRkA")}
              </div>
              <div>
                  <h3 className="text-lg font-medium mb-2 dark:text-gray-200">Main Breaker</h3>
                  {renderInputField("Manufacturer", "mainBreakerManufacturer")}
                  {renderInputField("Type", "mainBreakerType")}
                  {renderInputField("Frame Size (A)", "mainBreakerFrameSizeA")}
                  {renderInputField("Rating Plug (A)", "mainBreakerRatingPlugA")}
                  {renderInputField("I.C. Rating (kA)", "mainBreakerICRatingkA")}
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">NETA Section</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-3/5">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">Results</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {formData.visualInspectionItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-1 text-sm">{item.netaSection}</td>
                    <td className="px-3 py-1 text-sm">{item.description}</td>
                    <td className="px-3 py-1 text-sm">
                      <select
                        value={item.results}
                        onChange={(e) => handleChange('visualInspectionItems', e.target.value, index, 'results')}
                        disabled={!isEditMode}
                        className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
                      >
                        {visualInspectionResultOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Test Equipment Used Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
              {renderInputField("Megohmmeter", "megohmmeterName")}
              {renderInputField("Serial Number", "megohmmeterSerial")}
              {renderInputField("AMP ID", "megohmmeterAmpId")}

              {renderInputField("Low-Resistance Ohmmeter", "lowResistanceOhmmeterName")}
              {renderInputField("Serial Number", "lowResistanceOhmmeterSerial")}
              {renderInputField("AMP ID", "lowResistanceOhmmeterAmpId")}

              {renderInputField("Primary Injection Test Set", "primaryInjectionTestSetName")}
              {renderInputField("Serial Number", "primaryInjectionTestSetSerial")}
              {renderInputField("AMP ID", "primaryInjectionTestSetAmpId")}
          </div>
        </section>

        {/* Comments Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange('comments', e.target.value)}
            readOnly={!isEditMode}
            rows={3}
            className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}
          />
        </section>

        {/* Electrical Tests Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Electrical Tests</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 mb-4">
              <div className="flex items-center">
                  <label className="text-sm font-medium mr-2"># of circuit spaces:</label>
                  <input type="number" min="0" max="120" value={formData.numberOfCircuitSpaces} onChange={(e) => handleChange('numberOfCircuitSpaces', e.target.value)} readOnly={!isEditMode} className={`form-input mt-1 w-20 ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}/>
              </div>
              <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Ordering:</label>
                  <select value={formData.electricalTestOrdering} onChange={(e) => handleChange('electricalTestOrdering', e.target.value)} disabled={!isEditMode} className={`form-input mt-1 ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}>
                      {electricalTestOrderingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </div>
              <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Trip Curve #'s:</label>
                  <input type="text" value={formData.tripCurveNumbers} onChange={(e) => handleChange('tripCurveNumbers', e.target.value)} readOnly={!isEditMode} className={`form-input mt-1 ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : ''}`}/>
              </div>
          </div>
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600 text-sm">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-20">Result</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-12">Circuit</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-16"># of Poles</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-24">Manuf.</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-24">Type</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-20">Frame (A)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-20">Trip (A)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-24">Rated Current (A)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-24">Test Current (A)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-32" colSpan={2}>Trip Tolerance (sec.)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-24">Trip Time (sec.)</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 text-center w-48" colSpan={3}>Insulation Resist (MΩ)</th>
                </tr>
                <tr>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 text-center w-16">Min</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 text-center w-16">Max</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600"></th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 text-center w-16">L-L</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 text-center w-16">L-P</th>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-300 text-center w-16">P-P</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {formData.breakers.map((breaker, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-200">
                    <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                      <select
                        value={breaker.result || ''}
                        onChange={(e) => handleChange('breakers', e.target.value, index, 'result')}
                        disabled={!isEditMode}
                        className={`w-full text-xs rounded-md border-gray-300 dark:border-gray-600 
                          ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : 'bg-white dark:bg-dark-100'} 
                          ${breaker.result === 'FAIL' ? 'text-red-600' : 'text-green-600'}`}
                      >
                        <option value="">Select...</option>
                        <option value="PASS" className="text-green-600">PASS</option>
                        <option value="FAIL" className="text-red-600">FAIL</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600 text-center">{breaker.circuitNumber}</td>
                    <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                      <select
                        value={breaker.poles || ''}
                        onChange={(e) => handleBreakerChange(index, 'poles', e.target.value)}
                        disabled={!isEditMode}
                        className={`w-full text-xs rounded-md border-gray-300 dark:border-gray-600 
                          ${!isEditMode ? 'bg-gray-100 dark:bg-dark-200' : 'bg-white dark:bg-dark-100'} 
                          ${breaker.poles ? '' : 'text-gray-400'}`}
                      >
                        <option value="">Select</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </td>
                    {['manuf', 'type', 'frameA', 'tripA', 'ratedCurrentA'].map(field => (
                      <td key={field} className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                        <input 
                          type="text" 
                          value={(breaker as any)[field]} 
                          onChange={(e) => handleChange('breakers', e.target.value, index, field)} 
                          readOnly={!isEditMode} 
                          className={`w-full text-sm border-0 focus:ring-0 ${!isEditMode ? 'cursor-not-allowed bg-transparent' : ''}`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                      <input 
                        type="text" 
                        value={breaker.testCurrentA} 
                        readOnly={true} 
                        className="w-full text-sm border-0 focus:ring-0 bg-gray-50 cursor-not-allowed"
                      />
                    </td>
                    {['tripToleranceMin', 'tripToleranceMax', 'tripTime', 'insulationLL', 'insulationLP', 'insulationPP'].map(field => (
                      <td key={field} className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                        <input 
                          type="text" 
                          value={(breaker as any)[field]} 
                          onChange={(e) => handleChange('breakers', e.target.value, index, field)} 
                          readOnly={!isEditMode} 
                          className={`w-full text-sm border-0 focus:ring-0 ${!isEditMode ? 'cursor-not-allowed bg-transparent' : ''}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LowVoltagePanelboardSmallBreakerTestATSReport; 