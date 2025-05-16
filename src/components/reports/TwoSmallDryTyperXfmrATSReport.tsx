import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
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

const visualInspectionOptions = [
  "Select One", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments", "Not Applicable"
];

const insulationResistanceUnitsOptions = ["kΩ", "MΩ", "GΩ"];
const testVoltageOptions = ["250V", "500V", "1000V", "2500V", "5000V"];
const passFailOptions = ["PASS", "FAIL", "N/A"];
const connectionOptions = ["Delta", "Wye", "Single Phase"];
const materialOptions = ["Aluminum", "Copper"];


interface FormData {
  // Job Information
  customer: string;
  address: string;
  user: string;
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

  // Nameplate Data
  nameplate: {
    manufacturer: string;
    kvaBase: string;
    kvaCooling: string; 
    voltsPrimary: string;
    voltsSecondary: string;
    connectionsPrimary: string; 
    connectionsSecondary: string; 
    windingMaterialPrimary: string; 
    windingMaterialSecondary: string; 
    catalogNumber: string;
    tempRise: string;
    serialNumber: string;
    impedance: string;
    tapVoltages: string[]; 
    tapPosition: string; 
    tapPositionLeftVolts: string;
    tapPositionLeftPercent: string;
  };

  // Indicator Gauge Values
  indicatorGauges: {
    liquidLevel: string;
    temperature: string;
    pressureVacuum: string;
  };

  // Visual and Mechanical Inspection
  visualInspectionItems: Array<{
    netaSection: string;
    description: string;
    result: string;
  }>;
  visualInspectionComments: string;

  // Electrical Tests - Measured Insulation Resistance
  insulationResistance: {
    tests: Array<{
      winding: string;
      testVoltage: string;
      measured0_5Min: string;
      measured1Min: string;
      units: string;
      corrected0_5Min: string;
      corrected1Min: string;
      correctedUnits: string; 
      tableMinimum: string;
      tableMinimumUnits: string;
    }>;
    dielectricAbsorptionRatio: {
      calculatedAs: string;
      priToGnd: string;
      secToGnd: string;
      priToSec: string;
      passFail: string;
      minimumDAR: string;
    };
  };

  // Electrical Tests - Turns Ratio
  turnsRatio: {
    secondaryWindingVoltage: string;
    tests: Array<{
      tap: string; 
      nameplateVoltage: string;
      calculatedRatio: string;
      measuredH1H2: string;
      devH1H2: string;
      passFailH1H2: string;
      measuredH2H3: string;
      devH2H3: string;
      passFailH2H3: string;
      measuredH3H1: string;
      devH3H1: string;
      passFailH3H1: string;
    }>;
  };
  
  // Test Equipment Used
  testEquipment: {
    megohmmeter: { name: string; serialNumber: string; ampId: string };
    ttrTestSet: { name: string; serialNumber: string; ampId: string };
  };

  comments: string;
  status: 'PASS' | 'FAIL';
}

const initialVisualInspectionItems = [
  { netaSection: '7.2.1.1.A.1', description: 'Inspect physical and mechanical condition.', result: '' },
  { netaSection: '7.2.1.1.A.2', description: 'Inspect anchorage, alignment, and grounding.', result: '' },
  { netaSection: '7.2.1.1.A.3', description: '*Prior to cleaning the unit, perform as-found tests.', result: '' },
  { netaSection: '7.2.1.1.A.4', description: 'Clean the unit.', result: '' },
  { netaSection: '7.2.1.1.A.5', description: 'Inspect bolted electrical connections for high resistance using a low-resistance ohmmeter', result: '' },
  { netaSection: '7.2.1.1.A.6.1', description: 'Perform as-left tests.', result: '' },
  { netaSection: '7.2.1.1.A.7', description: 'Verify that as-left tap connections are as specified.', result: '' },
];

const initialInsulationResistanceTests = [
  { winding: 'Primary to Ground', testVoltage: '1000V', measured0_5Min: '', measured1Min: '', units: 'GΩ', corrected0_5Min: '', corrected1Min: '', correctedUnits: 'GΩ', tableMinimum: '100.5', tableMinimumUnits: 'GΩ' },
  { winding: 'Secondary to Ground', testVoltage: '500V', measured0_5Min: '', measured1Min: '', units: 'GΩ', corrected0_5Min: '', corrected1Min: '', correctedUnits: 'GΩ', tableMinimum: '', tableMinimumUnits: 'GΩ' },
  { winding: 'Primary to Secondary', testVoltage: '1000V', measured0_5Min: '', measured1Min: '', units: 'GΩ', corrected0_5Min: '', corrected1Min: '', correctedUnits: 'GΩ', tableMinimum: '', tableMinimumUnits: 'GΩ' },
];

const TwoSmallDryTyperXfmrATSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  const [formData, setFormData] = useState<FormData>({
    customer: '',
    address: '',
    user: user?.email || '',
    date: new Date().toISOString().split('T')[0],
    identifier: '',
    jobNumber: '',
    technicians: '',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 50 },
    substation: '',
    eqptLocation: '',
    nameplate: {
      manufacturer: '', kvaBase: '', kvaCooling: '', voltsPrimary: '', voltsSecondary: '',
      connectionsPrimary: 'Delta', connectionsSecondary: 'Wye',
      windingMaterialPrimary: 'Aluminum', windingMaterialSecondary: 'Copper',
      catalogNumber: '', tempRise: '', serialNumber: '', impedance: '',
      tapVoltages: Array(7).fill(''), tapPosition: '1',
      tapPositionLeftVolts: '', tapPositionLeftPercent: ''
    },
    indicatorGauges: { liquidLevel: '', temperature: '', pressureVacuum: '' },
    visualInspectionItems: JSON.parse(JSON.stringify(initialVisualInspectionItems)),
    visualInspectionComments: '',
    insulationResistance: {
      tests: JSON.parse(JSON.stringify(initialInsulationResistanceTests)),
      dielectricAbsorptionRatio: {
        calculatedAs: '1 Min. / 0.5 Min. Values', priToGnd: '', secToGnd: '', priToSec: '', passFail: '', minimumDAR: '1.0'
      }
    },
    turnsRatio: {
      secondaryWindingVoltage: '',
      tests: Array(1).fill(null).map(() => ({ 
        tap: '3', nameplateVoltage: '', calculatedRatio: '',
        measuredH1H2: '', devH1H2: '', passFailH1H2: '',
        measuredH2H3: '', devH2H3: '', passFailH2H3: '',
        measuredH3H1: '', devH3H1: '', passFailH3H1: ''
      }))
    },
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
      ttrTestSet: { name: '', serialNumber: '', ampId: '' }
    },
    comments: '',
    status: 'PASS',
  });

  const loadJobInfo = useCallback(async () => {
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
        if (customerError) throw customerError;
        customerName = customerData?.company_name || customerData?.name || '';
        customerAddress = customerData?.address || '';
      }
      setFormData(prev => ({
        ...prev,
        jobNumber: jobData?.job_number || '',
        customer: customerName,
        address: customerAddress,
      }));
    } catch (error) {
      console.error('Error loading job info:', error);
      alert(\`Failed to load job info: \${(error as Error).message}\`);
    }
  }, [jobId]);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setIsEditing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('two_small_dry_type_xfmr_ats_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { 
          setIsEditing(true);
        } else {
          throw error;
        }
      }
      if (data) {
        setFormData(prev => ({
          ...prev, 
          ...(data.report_info || {}), 
          nameplate: data.nameplate_data || prev.nameplate,
          indicatorGauges: data.indicator_gauges || prev.indicatorGauges,
          visualInspectionItems: data.visual_inspection_items || prev.visualInspectionItems,
          visualInspectionComments: data.visual_inspection_comments || prev.visualInspectionComments,
          insulationResistance: data.insulation_resistance_tests || prev.insulationResistance,
          turnsRatio: data.turns_ratio_tests || prev.turnsRatio,
          testEquipment: data.test_equipment_used || prev.testEquipment,
          comments: data.comments || prev.comments,
          status: data.report_info?.status || prev.status,
        }));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert(\`Failed to load report: \${(error as Error).message}\`);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  }, [reportId]);
  
  useEffect(() => {
    loadJobInfo();
    loadReport();
  }, [jobId, reportId, loadJobInfo, loadReport]);

  useEffect(() => {
    setIsEditing(!reportId);
  }, [reportId]);

  const handleFahrenheitChange = (fahrenheit: number) => {
    const celsius = Math.round(((fahrenheit - 32) * 5) / 9);
    const tcf = getTCF(celsius);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, fahrenheit, celsius, tcf } }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const roundedCelsius = Math.round(celsius);
    const fahrenheit = Math.round((roundedCelsius * 9) / 5 + 32);
    const tcf = getTCF(roundedCelsius);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, celsius: roundedCelsius, fahrenheit, tcf } }));
  };
  
  const calculateCorrectedValue = useCallback((value: string, tcf: number) => {
    if (!value || isNaN(parseFloat(value))) return '';
    return (parseFloat(value) * tcf).toFixed(2);
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const tcf = formData.temperature.tcf;
    setFormData(prev => ({
      ...prev,
      insulationResistance: {
        ...prev.insulationResistance,
        tests: prev.insulationResistance.tests.map(test => ({
          ...test,
          corrected0_5Min: calculateCorrectedValue(test.measured0_5Min, tcf),
          corrected1Min: calculateCorrectedValue(test.measured1Min, tcf),
        }))
      }
    }));
  }, [formData.temperature.tcf, formData.insulationResistance.tests, calculateCorrectedValue, isEditing]);

  const handleChange = (path: string, value: any) => {
    if (!isEditing) return;
    setFormData(prev => {
      const keys = path.split('.');
      let current: any = prev;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...prev };
    });
  };
  
  // Generalized handler for array of objects
  const handleArrayChange = (section: keyof FormData, index: number, field: string, value: any) => {
    if (!isEditing) return;
    setFormData(prev => {
      const newArray = [...(prev[section] as any[])];
      if (newArray[index]) {
        newArray[index] = { ...newArray[index], [field]: value };
      }
      return { ...prev, [section]: newArray };
    });
  };

  const handleNestedArrayChange = (section: keyof Pick<FormData, 'insulationResistance' | 'turnsRatio'>, testIndex: number, field: string, value: any) => {
    if (!isEditing) return;
    setFormData(prev => {
      const newSectionData = JSON.parse(JSON.stringify(prev[section])); 
      newSectionData.tests[testIndex][field] = value;
      return { ...prev, [section]: newSectionData };
    });
  };


  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    const reportPayload = {
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
        temperature: formData.temperature,
        substation: formData.substation,
        eqptLocation: formData.eqptLocation,
        status: formData.status,
      },
      nameplate_data: formData.nameplate,
      indicator_gauges: formData.indicatorGauges,
      visual_inspection_items: formData.visualInspectionItems,
      visual_inspection_comments: formData.visualInspectionComments,
      insulation_resistance_tests: formData.insulationResistance,
      turns_ratio_tests: formData.turnsRatio,
      test_equipment_used: formData.testEquipment,
      comments: formData.comments,
    };

    try {
      let result;
      let currentReportId = reportId;

      if (reportId) {
        result = await supabase
          .schema('neta_ops')
          .from('two_small_dry_type_xfmr_ats_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        result = await supabase
          .schema('neta_ops')
          .from('two_small_dry_type_xfmr_ats_reports')
          .insert(reportPayload)
          .select()
          .single();
        
        if (result.data) {
            currentReportId = result.data.id; // Get new report ID
        }
      }

      if (result.error) throw result.error;
      
      if (result.data && !reportId) { // Only create asset if it's a new report
        const assetData = {
          name: \`2-Small Dry Type Xfmr. ATS - \${formData.identifier || formData.eqptLocation || 'Unnamed'}\`,
          file_url: \`report:/jobs/\${jobId}/two-small-dry-typer-xfmr-ats-report/\${currentReportId}\`,
          user_id: user.id,
        };
        const { data: assetResult, error: assetError } = await supabase.schema('neta_ops').from('assets').insert(assetData).select().single();
        if (assetError) throw assetError;
        
        if (assetResult) {
            await supabase.schema('neta_ops').from('job_assets').insert({
                job_id: jobId,
                asset_id: assetResult.id, 
                user_id: user.id
            });
        }
      }

      setIsEditing(false);
      alert(\`Report \${reportId ? 'updated' : 'saved'} successfully!\`);
      if (!reportId && currentReportId) {
        // If it was a new report, navigate to the new report's edit page (now view page)
        navigate(\`/jobs/\${jobId}/two-small-dry-typer-xfmr-ats-report/\${currentReportId}\`, { replace: true });
      } else {
        navigateAfterSave(navigate, jobId, location);
      }
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(\`Failed to save report: \${error?.message || 'Unknown error'}\`);
    }
  };

  if (loading && reportId) { 
    return <div className="p-4 dark:text-white">Loading report data...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 dark:text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">2-Small Dry Typer XFMR. Inspection and Test ATS</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => isEditing && setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }))}
            className={\`px-4 py-2 rounded-md text-white font-medium \${
              formData.status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } \${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}\`}
            disabled={!isEditing}
          >
            {formData.status}
          </button>
          {reportId && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Edit Report
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isEditing && !!reportId} // Disable if not editing existing report
              className="px-4 py-2 text-sm text-white bg-[#f26722] hover:bg-[#e55611] rounded-md disabled:opacity-50"
            >
              {reportId ? 'Update Report' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Job Information Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="customer" className="form-label">Customer:</label>
            <input id="customer" type="text" value={formData.customer} readOnly className="form-input bg-gray-100 dark:bg-dark-200" />
          </div>
          <div>
            <label htmlFor="date" className="form-label">Date:</label>
            <input id="date" type="date" name="date" value={formData.date} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
           <div>
            <label htmlFor="technicians" className="form-label">Technicians:</label>
            <input id="technicians" type="text" name="technicians" value={formData.technicians} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
          <div>
            <label htmlFor="address" className="form-label">Address:</label>
            <input id="address" type="text" value={formData.address} readOnly className="form-input bg-gray-100 dark:bg-dark-200" />
          </div>
          <div>
            <label htmlFor="identifier" className="form-label">Identifier:</label>
            <input id="identifier" type="text" name="identifier" value={formData.identifier} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
          <div className="grid grid-cols-2 gap-x-2">
            <div>
                <label htmlFor="tempF" className="form-label">Temp:</label>
                <div className="flex items-center">
                <input id="tempF" type="number" value={formData.temperature.fahrenheit} onChange={(e) => handleFahrenheitChange(parseFloat(e.target.value))} readOnly={!isEditing} className={\`form-input w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                <span className="ml-1">°F</span>
                </div>
            </div>
            <div>
                <label htmlFor="tempC" className="form-label">&nbsp;</label> {/* Spacer for alignment */}
                <div className="flex items-center">
                <input id="tempC" type="number" value={formData.temperature.celsius} onChange={(e) => handleCelsiusChange(parseFloat(e.target.value))} readOnly={!isEditing} className={\`form-input w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                <span className="ml-1">°C</span>
                </div>
            </div>
          </div>
          <div>
            <label htmlFor="user" className="form-label">User:</label>
            <input id="user" type="text" name="user" value={formData.user} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
           <div>
            <label htmlFor="jobNumber" className="form-label">Job #:</label>
            <input id="jobNumber" type="text" value={formData.jobNumber} readOnly className="form-input bg-gray-100 dark:bg-dark-200" />
          </div>
           <div className="grid grid-cols-2 gap-x-2">
            <div>
                <label htmlFor="tcf" className="form-label">TCF:</label>
                <input id="tcf" type="number" value={formData.temperature.tcf} readOnly className="form-input bg-gray-100 dark:bg-dark-200 w-full" />
            </div>
            <div>
                <label htmlFor="humidity" className="form-label">Humidity:</label>
                <div className="flex items-center">
                <input id="humidity" type="number" name="temperature.humidity" value={formData.temperature.humidity} onChange={(e) => handleChange(e.target.name, parseFloat(e.target.value))} readOnly={!isEditing} className={\`form-input w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                <span className="ml-1">%</span>
                </div>
            </div>
          </div>
          <div></div> {/* Empty div for alignment if needed */}
          <div>
            <label htmlFor="substation" className="form-label">Substation:</label>
            <input id="substation" type="text" name="substation" value={formData.substation} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
          <div>
            <label htmlFor="eqptLocation" className="form-label">Eqpt. Location:</label>
            <input id="eqptLocation" type="text" name="eqptLocation" value={formData.eqptLocation} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
          </div>
        </div>
      </section>

      {/* Nameplate Data Section */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            <div>
                <label htmlFor="nameplate.manufacturer" className="form-label">Manufacturer</label>
                <input id="nameplate.manufacturer" type="text" name="nameplate.manufacturer" value={formData.nameplate.manufacturer} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div>
                <label htmlFor="nameplate.catalogNumber" className="form-label">Catalog Number</label>
                <input id="nameplate.catalogNumber" type="text" name="nameplate.catalogNumber" value={formData.nameplate.catalogNumber} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div>
                <label htmlFor="nameplate.serialNumber" className="form-label">Serial Number</label>
                <input id="nameplate.serialNumber" type="text" name="nameplate.serialNumber" value={formData.nameplate.serialNumber} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div> {/* Empty for alignment */} </div>
            <div>
                <label htmlFor="nameplate.kva" className="form-label">KVA</label>
                <div className="flex items-center">
                    <input id="nameplate.kvaBase" type="text" name="nameplate.kvaBase" value={formData.nameplate.kvaBase} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <span className="mx-1">/</span>
                    <input id="nameplate.kvaCooling" type="text" name="nameplate.kvaCooling" value={formData.nameplate.kvaCooling} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                </div>
            </div>
             <div>
                <label htmlFor="nameplate.tempRise" className="form-label">Temp. Rise</label>
                <input id="nameplate.tempRise" type="text" name="nameplate.tempRise" value={formData.nameplate.tempRise} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div>
                <label htmlFor="nameplate.impedance" className="form-label">Impedance</label>
                <input id="nameplate.impedance" type="text" name="nameplate.impedance" value={formData.nameplate.impedance} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
             <div> {/* Empty for alignment */} </div>
            <div>
                <label className="form-label">Volts</label>
                <div className="flex items-center">
                    <input type="text" name="nameplate.voltsPrimary" placeholder="Primary" value={formData.nameplate.voltsPrimary} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <span className="mx-1">/</span>
                    <input type="text" name="nameplate.voltsSecondary" placeholder="Secondary" value={formData.nameplate.voltsSecondary} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                </div>
            </div>
            <div>
                <label className="form-label">Connections</label>
                 <div className="flex items-center">
                    <select name="nameplate.connectionsPrimary" value={formData.nameplate.connectionsPrimary} onChange={(e) => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                        {connectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <span className="mx-1">/</span>
                     <select name="nameplate.connectionsSecondary" value={formData.nameplate.connectionsSecondary} onChange={(e) => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                        {connectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="form-label">Winding Material</label>
                 <div className="flex items-center">
                    <select name="nameplate.windingMaterialPrimary" value={formData.nameplate.windingMaterialPrimary} onChange={(e) => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                        {materialOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <span className="mx-1">/</span>
                     <select name="nameplate.windingMaterialSecondary" value={formData.nameplate.windingMaterialSecondary} onChange={(e) => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                        {materialOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>
        </div>
        <div className="mt-4">
            <label className="form-label">Tap Voltages</label>
            <div className="grid grid-cols-7 gap-2 mt-1">
                {formData.nameplate.tapVoltages.map((tv, index) => (
                    <div key={index}>
                        <label htmlFor={\`tapVoltage-\${index}\`} className="form-label text-center block">\${index + 1}</label>
                        <input id={\`tapVoltage-\${index}\`} type="text" value={tv} 
                               onChange={(e) => {
                                   const newTaps = [...formData.nameplate.tapVoltages];
                                   newTaps[index] = e.target.value;
                                   handleChange('nameplate.tapVoltages', newTaps);
                               }}
                               readOnly={!isEditing} className={\`form-input text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    </div>
                ))}
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 mt-4 items-end">
            <div>
                 <label htmlFor="nameplate.tapPosition" className="form-label">Tap Position</label>
                 <select id="nameplate.tapPosition" name="nameplate.tapPosition" value={formData.nameplate.tapPosition} onChange={(e) => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                    {Array.from({length: 7}, (_, i) => i + 1).map(num => <option key={num} value={num.toString()}>{num}</option>)}
                 </select>
            </div>
            <div>
                <label htmlFor="nameplate.tapPositionLeftVolts" className="form-label">Tap Position Left</label>
                <div className="flex items-center">
                    <input id="nameplate.tapPositionLeftVolts" type="text" name="nameplate.tapPositionLeftVolts" value={formData.nameplate.tapPositionLeftVolts} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /> <span className="ml-1">Volts</span>
                    <input id="nameplate.tapPositionLeftPercent" type="text" name="nameplate.tapPositionLeftPercent" value={formData.nameplate.tapPositionLeftPercent} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-1/2 ml-2 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /> <span className="ml-1">Percent</span>
                </div>
            </div>
        </div>
      </section>
      
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Indicator Gauge Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label htmlFor="indicatorGauges.liquidLevel" className="form-label">Liquid Level</label>
                <input id="indicatorGauges.liquidLevel" type="text" name="indicatorGauges.liquidLevel" value={formData.indicatorGauges.liquidLevel} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div>
                <label htmlFor="indicatorGauges.temperature" className="form-label">Temperature</label>
                <input id="indicatorGauges.temperature" type="text" name="indicatorGauges.temperature" value={formData.indicatorGauges.temperature} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
            <div>
                <label htmlFor="indicatorGauges.pressureVacuum" className="form-label">Pressure / Vacuum</label>
                <input id="indicatorGauges.pressureVacuum" type="text" name="indicatorGauges.pressureVacuum" value={formData.indicatorGauges.pressureVacuum} onChange={(e) => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
            </div>
        </div>
      </section>

      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="form-label text-left py-2 pr-2 w-1/5">NETA Section</th>
                <th className="form-label text-left py-2 pr-2 w-3/5">Description</th>
                <th className="form-label text-left py-2 w-1/5">Results</th>
              </tr>
            </thead>
            <tbody>
              {formData.visualInspectionItems.map((item, index) => (
                <tr key={index}>
                  <td className="py-1 pr-2">{item.netaSection}</td>
                  <td className="py-1 pr-2">{item.description}</td>
                  <td className="py-1">
                    <select
                      value={item.result}
                      onChange={(e) => handleArrayChange('visualInspectionItems', index, 'result', e.target.value)}
                      disabled={!isEditing}
                      className={\`form-select w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}
                    >
                      {visualInspectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label htmlFor="visualInspectionComments" className="form-label mt-4">Visual and Mechanical Inspection Comments:</label>
        <textarea 
            id="visualInspectionComments"
            name="visualInspectionComments" 
            value={formData.visualInspectionComments} 
            onChange={(e) => handleChange(e.target.name, e.target.value)} 
            readOnly={!isEditing} 
            rows={3} 
            className={\`form-textarea w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}
        />
      </section>

      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Measured Insulation Resistance</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr>
                        <th className="form-label text-left py-2 pr-1">Winding Under Test</th>
                        <th className="form-label text-center py-2 px-1">Test Voltage</th>
                        <th className="form-label text-center py-2 px-1">0.5 Min.</th>
                        <th className="form-label text-center py-2 px-1">1 Min.</th>
                        <th className="form-label text-center py-2 px-1">Units</th>
                        <th className="form-label text-center py-2 px-1">0.5 Min.</th>
                        <th className="form-label text-center py-2 px-1">1 Min.</th>
                        <th className="form-label text-center py-2 px-1">Units</th>
                        <th className="form-label text-center py-2 px-1">Table Minimum</th>
                        <th className="form-label text-center py-2 pl-1">Units</th>
                    </tr>
                    <tr>
                        <th className="form-label text-left py-1 pr-1"></th>
                        <th className="form-label text-center py-1 px-1"></th>
                        <th colSpan={3} className="form-label text-center py-1 px-1 border-b border-gray-400 dark:border-gray-600">Measured Values</th>
                        <th colSpan={3} className="form-label text-center py-1 px-1 border-b border-gray-400 dark:border-gray-600">Temperature Corrected Values</th>
                        <th className="form-label text-center py-1 px-1"></th>
                        <th className="form-label text-center py-1 pl-1"></th>
                    </tr>
                </thead>
                <tbody>
                    {formData.insulationResistance.tests.map((test, index) => (
                        <tr key={index}>
                            <td className="py-1 pr-1">{test.winding}</td>
                            <td className="py-1 px-1">
                                <select value={test.testVoltage} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'testVoltage', e.target.value)} disabled={!isEditing} className={\`form-select w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {testVoltageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                            <td className="py-1 px-1"><input type="text" value={test.measured0_5Min} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'measured0_5Min', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1"><input type="text" value={test.measured1Min} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'measured1Min', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1">
                                <select value={test.units} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'units', e.target.value)} disabled={!isEditing} className={\`form-select w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {insulationResistanceUnitsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                            <td className="py-1 px-1"><input type="text" value={test.corrected0_5Min} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                            <td className="py-1 px-1"><input type="text" value={test.corrected1Min} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                             <td className="py-1 px-1">
                                <select value={test.correctedUnits} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'correctedUnits', e.target.value)} disabled={!isEditing} className={\`form-select w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {insulationResistanceUnitsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                            <td className="py-1 px-1"><input type="text" value={test.tableMinimum} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'tableMinimum', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 pl-1">
                                <select value={test.tableMinimumUnits} onChange={(e) => handleNestedArrayChange('insulationResistance', index, 'tableMinimumUnits', e.target.value)} disabled={!isEditing} className={\`form-select w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {insulationResistanceUnitsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="grid grid-cols-6 gap-2 mt-4 items-end">
                <div>
                    <label className="form-label block text-center">Dielectric Absorption Ratio</label>
                    <input type="text" value={formData.insulationResistance.dielectricAbsorptionRatio.calculatedAs} readOnly className="form-input text-center bg-gray-100 dark:bg-dark-200"/>
                </div>
                 <div>
                    <label className="form-label block text-center">Pri to Gnd</label>
                    <input type="text" name="insulationResistance.dielectricAbsorptionRatio.priToGnd" value={formData.insulationResistance.dielectricAbsorptionRatio.priToGnd} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}/>
                </div>
                <div>
                    <label className="form-label block text-center">Sec to Gnd</label>
                    <input type="text" name="insulationResistance.dielectricAbsorptionRatio.secToGnd" value={formData.insulationResistance.dielectricAbsorptionRatio.secToGnd} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}/>
                </div>
                <div>
                    <label className="form-label block text-center">Pri to Sec</label>
                    <input type="text" name="insulationResistance.dielectricAbsorptionRatio.priToSec" value={formData.insulationResistance.dielectricAbsorptionRatio.priToSec} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}/>
                </div>
                <div>
                    <label className="form-label block text-center">Pass/Fail</label>
                     <select name="insulationResistance.dielectricAbsorptionRatio.passFail" value={formData.insulationResistance.dielectricAbsorptionRatio.passFail} onChange={e => handleChange(e.target.name, e.target.value)} disabled={!isEditing} className={\`form-select text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                        {passFailOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="form-label block text-center">Minimum DAR</label>
                    <input type="text" value={formData.insulationResistance.dielectricAbsorptionRatio.minimumDAR} readOnly className="form-input text-center bg-gray-100 dark:bg-dark-200"/>
                </div>
            </div>
        </div>
      </section>

      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Turns Ratio</h2>
        <div className="flex justify-end mb-2">
            <label htmlFor="turnsRatio.secondaryWindingVoltage" className="form-label mr-2">Secondary Winding Voltage (L-N for Wye, L-L for Delta):</label>
            <input id="turnsRatio.secondaryWindingVoltage" type="text" name="turnsRatio.secondaryWindingVoltage" value={formData.turnsRatio.secondaryWindingVoltage} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input w-24 \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /> <span className="ml-1">V</span>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr>
                        <th rowSpan={2} className="form-label text-center py-2 px-1 border-r">Tap</th>
                        <th rowSpan={2} className="form-label text-center py-2 px-1 border-r">Nameplate Voltage</th>
                        <th rowSpan={2} className="form-label text-center py-2 px-1 border-r">Calculated Ratio</th>
                        <th colSpan={3} className="form-label text-center py-2 px-1 border-b border-r">Measured H1-H2</th>
                        <th colSpan={3} className="form-label text-center py-2 px-1 border-b border-r">Measured H2-H3</th>
                        <th colSpan={3} className="form-label text-center py-2 px-1 border-b">Measured H3-H1</th>
                    </tr>
                    <tr>
                        <th className="form-label text-center py-1 px-1 border-r">% Dev.</th>
                        <th className="form-label text-center py-1 px-1 border-r">Pass/Fail</th>
                        <th className="form-label text-center py-1 px-1 border-r"></th> {/* Empty for Measured H1-H2 */}
                        <th className="form-label text-center py-1 px-1 border-r">% Dev.</th>
                        <th className="form-label text-center py-1 px-1 border-r">Pass/Fail</th>
                        <th className="form-label text-center py-1 px-1 border-r"></th> {/* Empty for Measured H2-H3 */}
                        <th className="form-label text-center py-1 px-1 border-r">% Dev.</th>
                        <th className="form-label text-center py-1 px-1 border-r">Pass/Fail</th>
                        <th className="form-label text-center py-1 px-1"></th> {/* Empty for Measured H3-H1 */}
                    </tr>
                </thead>
                <tbody>
                    {formData.turnsRatio.tests.map((test, index) => (
                        <tr key={index}>
                            <td className="py-1 px-1 border-r">
                                <select value={test.tap} onChange={e => handleNestedArrayChange('turnsRatio', index, 'tap', e.target.value)} disabled={!isEditing} className={\`form-select w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {Array.from({length: 7}, (_, i) => i + 1).map(num => <option key={num} value={num.toString()}>{num}</option>)}
                                </select>
                            </td>
                            <td className="py-1 px-1 border-r"><input type="text" value={test.nameplateVoltage} onChange={e => handleNestedArrayChange('turnsRatio', index, 'nameplateVoltage', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1 border-r"><input type="text" value={test.calculatedRatio} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                            
                            <td className="py-1 px-1 border-r"><input type="text" value={test.measuredH1H2} onChange={e => handleNestedArrayChange('turnsRatio', index, 'measuredH1H2', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1 border-r"><input type="text" value={test.devH1H2} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                            <td className="py-1 px-1 border-r">
                                <select value={test.passFailH1H2} onChange={e => handleNestedArrayChange('turnsRatio', index, 'passFailH1H2', e.target.value)} disabled={!isEditing} className={\`form-select w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {passFailOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>

                            <td className="py-1 px-1 border-r"><input type="text" value={test.measuredH2H3} onChange={e => handleNestedArrayChange('turnsRatio', index, 'measuredH2H3', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1 border-r"><input type="text" value={test.devH2H3} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                            <td className="py-1 px-1 border-r">
                                <select value={test.passFailH2H3} onChange={e => handleNestedArrayChange('turnsRatio', index, 'passFailH2H3', e.target.value)} disabled={!isEditing} className={\`form-select w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {passFailOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>

                            <td className="py-1 px-1 border-r"><input type="text" value={test.measuredH3H1} onChange={e => handleNestedArrayChange('turnsRatio', index, 'measuredH3H1', e.target.value)} readOnly={!isEditing} className={\`form-input w-full text-center \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} /></td>
                            <td className="py-1 px-1 border-r"><input type="text" value={test.devH3H1} readOnly className="form-input w-full text-center bg-gray-100 dark:bg-dark-200" /></td>
                            <td className="py-1 px-1">
                                <select value={test.passFailH3H1} onChange={e => handleNestedArrayChange('turnsRatio', index, 'passFailH3H1', e.target.value)} disabled={!isEditing} className={\`form-select w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}>
                                    {passFailOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>

      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-medium mb-1">Megohmmeter:</h3>
                <div className="grid grid-cols-3 gap-2">
                    <input type="text" name="testEquipment.megohmmeter.name" placeholder="Name" value={formData.testEquipment.megohmmeter.name} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <input type="text" name="testEquipment.megohmmeter.serialNumber" placeholder="Serial Number" value={formData.testEquipment.megohmmeter.serialNumber} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <input type="text" name="testEquipment.megohmmeter.ampId" placeholder="AMP ID" value={formData.testEquipment.megohmmeter.ampId} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                </div>
            </div>
             <div>
                <h3 className="font-medium mb-1">TTR Test Set:</h3>
                <div className="grid grid-cols-3 gap-2">
                    <input type="text" name="testEquipment.ttrTestSet.name" placeholder="Name" value={formData.testEquipment.ttrTestSet.name} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <input type="text" name="testEquipment.ttrTestSet.serialNumber" placeholder="Serial Number" value={formData.testEquipment.ttrTestSet.serialNumber} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                    <input type="text" name="testEquipment.ttrTestSet.ampId" placeholder="AMP ID" value={formData.testEquipment.ttrTestSet.ampId} onChange={e => handleChange(e.target.name, e.target.value)} readOnly={!isEditing} className={\`form-input \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`} />
                </div>
            </div>
        </div>
      </section>

      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <textarea 
            name="comments" 
            value={formData.comments} 
            onChange={(e) => handleChange(e.target.name, e.target.value)} 
            readOnly={!isEditing} 
            rows={4} 
            className={\`form-textarea w-full \${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}\`}
        />
      </section>
    </div>
  );
};

export default TwoSmallDryTyperXfmrATSReport; 