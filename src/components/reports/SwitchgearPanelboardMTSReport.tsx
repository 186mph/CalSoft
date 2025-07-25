import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';

// Temperature conversion and correction factor lookup tables
const TCF_TABLE: { [key: string]: number } = {
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
  return TCF_TABLE[roundedCelsius.toString()] ?? 1;
};

// Dropdown Options
const VISUAL_INSPECTION_OPTIONS = ["Select One", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments", "Not Applicable"];
const INSULATION_RESISTANCE_UNITS = ["kΩ", "MΩ", "GΩ"];
const INSULATION_RESISTANCE_TEST_VOLTAGES = ["250V", "500V", "1000V", "2500V", "5000V"];
const CONTACT_RESISTANCE_UNITS = ["µΩ", "mΩ", "Ω"];
const DIELECTRIC_WITHSTAND_UNITS = ["µA", "mA"];
const DIELECTRIC_WITHSTAND_TEST_VOLTAGES = [
  "1.6 kVAC", "2.2 kVAC", "14 kVAC", "27 kVAC", "37 kVAC", "45 kVAC", "60 kVAC", "120 kVAC",
  "2.3 kVDC", "3.1 kVDC", "20 kVDC", "37.5 kVDC"
];
const EQUIPMENT_EVALUATION_RESULTS = ['PASS', 'FAIL'];

interface InsulationResistanceRow {
  busSection: string;
  ag: string;
  bg: string;
  cg: string;
  ab: string;
  bc: string;
  ca: string;
  an: string;
  bn: string;
  cn: string;
}

interface ContactResistanceRow {
  busSection: string;
  aPhase: string;
  bPhase: string;
  cPhase: string;
  neutral: string;
  ground: string;
}

interface DielectricWithstandRow {
  busSection: string;
  ag: string;
  bg: string;
  cg: string;
}

interface FormData {
  customerName: string;
  customerLocation: string;
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
  status: string;

  nameplate: {
    manufacturer: string;
    catalogNumber: string;
    serialNumber: string;
    series: string;
    type: string;
    systemVoltage: string;
    ratedVoltage: string;
    ratedCurrent: string;
    aicRating: string;
    phaseConfiguration: string;
  };

  visualInspectionItems: Array<{
    id: string; // NETA Section
    description: string;
    result: string;
  }>;

  measuredInsulationResistance: InsulationResistanceRow[];
  insulationResistanceUnit: string;
  insulationResistanceTestVoltage: string;
  
  tempCorrectedInsulationResistance: InsulationResistanceRow[];

  contactResistanceTests: ContactResistanceRow[];
  contactResistanceUnit: string;

  dielectricWithstandTests: DielectricWithstandRow[];
  dielectricWithstandUnit: string;
  dielectricWithstandTestVoltage: string;

  testEquipment: {
    megohmmeter: { name: string; serialNumber: string; ampId: string };
    lowResistanceOhmmeter: { name: string; serialNumber: string; ampId: string };
    hipot: { name: string; serialNumber: string; ampId: string };
  };
  comments: string;
}

const initialVisualInspectionItems = [
  { id: '7.1.A.1', description: 'Inspect physical, electrical, and mechanical condition.', result: 'Select One' },
  { id: '7.1.A.2', description: 'Inspect anchorage, alignment, grounding, and required area clearances.', result: 'Select One' },
  { id: '7.1.A.3', description: 'Prior to cleaning the unit, perform as-found tests.', result: 'Select One' },
  { id: '7.1.A.4', description: 'Clean the unit.', result: 'Select One' },
  { id: '7.1.A.5', description: 'Verify that fuse and/or circuit breaker sizes and types correspond to drawings and coordination study as well as to the circuit breaker address for microprocessorcommunication packages.', result: 'Select One' },
  { id: '7.1.A.6', description: 'Verify that current and voltage transformer ratios correspond to drawings.', result: 'Select One' },
  { id: '7.1.A.7', description: 'Verify that wiring connections are tight and that wiring is secure to prevent damage during routine operation of moving parts.', result: 'Select One' },
  { id: '7.1.A.8.1', description: 'Use of a low-resistance ohmmeter in accordance with Section 7.1.B.1.', result: 'Select One' },
  { id: '7.1.A.9', description: 'Confirm correct operation and sequencing of electrical and mechanical interlock systems.', result: 'Select One' },
  { id: '7.1.A.10', description: 'Use appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.', result: 'Select One' },
  { id: '7.1.A.11', description: 'Inspect insulators for evidence of physical damage or contaminated surfaces.', result: 'Select One' },
  { id: '7.1.A.12', description: 'Verify correct barrier and shutter installation and operation.', result: 'Select One' },
  { id: '7.1.A.13', description: 'Exercise all active components.', result: 'Select One' },
  { id: '7.1.A.14', description: 'Inspect mechanical indicating devices for correct operation.', result: 'Select One' },
  { id: '7.1.A.15', description: 'Verify that filters are in place, filters are clean and free from debris, and vents are clear', result: 'Select One' }
];

const initialInsulationRow: InsulationResistanceRow = {
  busSection: '', ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: ''
};

const initialContactResistanceRow: ContactResistanceRow = {
  busSection: '', aPhase: '', bPhase: '', cPhase: '', neutral: '', ground: ''
};

const initialDielectricWithstandRow: DielectricWithstandRow = {
  busSection: '', ag: '', bg: '', cg: ''
};

const defaultBusSections = ['Bus 1', 'Bus 2', 'Bus 3', 'Bus 4', 'Bus 5', 'Bus 6'];

const SwitchgearPanelboardMTSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  const [formData, setFormData] = useState<FormData>({
    customerName: '', customerLocation: '', userName: user?.email || '', date: new Date().toISOString().split('T')[0],
    identifier: '', jobNumber: '', technicians: '',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 50 },
    substation: '', eqptLocation: '', status: 'PASS',
    nameplate: {
      manufacturer: '', catalogNumber: '', serialNumber: '', series: '', type: '',
      systemVoltage: '', ratedVoltage: '', ratedCurrent: '', aicRating: '', phaseConfiguration: ''
    },
    visualInspectionItems: JSON.parse(JSON.stringify(initialVisualInspectionItems)), // Deep copy
    measuredInsulationResistance: defaultBusSections.map(bus => ({ ...initialInsulationRow, busSection: bus })),
    insulationResistanceUnit: 'MΩ',
    insulationResistanceTestVoltage: '1000V',
    tempCorrectedInsulationResistance: defaultBusSections.map(bus => ({ ...initialInsulationRow, busSection: bus })),
    contactResistanceTests: defaultBusSections.map(bus => ({ ...initialContactResistanceRow, busSection: bus })),
    contactResistanceUnit: 'µΩ',
    dielectricWithstandTests: defaultBusSections.map(bus => ({ ...initialDielectricWithstandRow, busSection: bus })),
    dielectricWithstandUnit: 'µA',
    dielectricWithstandTestVoltage: '2.2 kVAC',
    testEquipment: {
      megohmmeter: { name: '', serialNumber: '', ampId: '' },
      lowResistanceOhmmeter: { name: '', serialNumber: '', ampId: '' },
      hipot: { name: '', serialNumber: '', ampId: '' }
    },
    comments: ''
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

      if (jobData) {
        let customerName = '';
        let customerAddress = '';
        if (jobData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('name, company_name, address')
            .eq('id', jobData.customer_id)
            .single();
          if (customerError) throw customerError;
          if (customerData) {
            customerName = customerData.company_name || customerData.name || '';
            customerAddress = customerData.address || '';
          }
        }
        setFormData(prev => ({
          ...prev,
          jobNumber: jobData.job_number || '',
          customerName: customerName,
          customerLocation: customerAddress,
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      alert(`Failed to load job info: ${(error as Error).message}`);
    }
  }, [jobId]);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setIsEditing(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('switchgear_panelboard_mts_reports')
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
        // Ensure all nested structures are present even if DB returns null for some
        const loadedData = data.report_data;
        setFormData(prev => ({
          ...prev, // Start with default structure
          ...loadedData, // Load all top-level fields
          temperature: { ...prev.temperature, ...loadedData.temperature },
          nameplate: { ...prev.nameplate, ...loadedData.nameplate },
          visualInspectionItems: loadedData.visualInspectionItems || JSON.parse(JSON.stringify(initialVisualInspectionItems)),
          measuredInsulationResistance: loadedData.measuredInsulationResistance || defaultBusSections.map(bus => ({ ...initialInsulationRow, busSection: bus })),
          tempCorrectedInsulationResistance: loadedData.tempCorrectedInsulationResistance || defaultBusSections.map(bus => ({ ...initialInsulationRow, busSection: bus })),
          contactResistanceTests: loadedData.contactResistanceTests || defaultBusSections.map(bus => ({ ...initialContactResistanceRow, busSection: bus })),
          dielectricWithstandTests: loadedData.dielectricWithstandTests || defaultBusSections.map(bus => ({ ...initialDielectricWithstandRow, busSection: bus })),
          testEquipment: {
            megohmmeter: { ...prev.testEquipment.megohmmeter, ...loadedData.testEquipment?.megohmmeter },
            lowResistanceOhmmeter: { ...prev.testEquipment.lowResistanceOhmmeter, ...loadedData.testEquipment?.lowResistanceOhmmeter },
            hipot: { ...prev.testEquipment.hipot, ...loadedData.testEquipment?.hipot },
          }
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
  }, [reportId]);

  useEffect(() => {
    loadJobInfo();
    loadReport();
  }, [jobId, reportId, loadJobInfo, loadReport]);
  
  useEffect(() => {
    const { celsius } = formData.temperature;
    const tcf = getTCF(celsius);
    setFormData(prev => {
      const newTempCorrected = prev.measuredInsulationResistance.map(row => {
        const correctedRow: InsulationResistanceRow = { busSection: row.busSection, ag: '', bg: '', cg: '', ab: '', bc: '', ca: '', an: '', bn: '', cn: '' };
        (Object.keys(row) as Array<keyof InsulationResistanceRow>).forEach(key => {
          if (key !== 'busSection') {
            const valStr = String(row[key]); // Ensure it's a string
            if (valStr.startsWith('>') || valStr.startsWith('<') || valStr.toLowerCase() === 'n/a' || valStr.trim() === '') {
                correctedRow[key] = valStr; // Keep special string values
            } else {
                const val = parseFloat(valStr);
                if (!isNaN(val)) {
                    correctedRow[key] = (val * tcf).toFixed(2);
                } else {
                    correctedRow[key] = valStr; // Keep original if not a number
                }
            }
          }
        });
        return correctedRow;
      });
      return {
        ...prev,
        temperature: { ...prev.temperature, tcf },
        tempCorrectedInsulationResistance: newTempCorrected
      };
    });
  }, [formData.temperature.celsius, formData.measuredInsulationResistance]);


  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;
    setLoading(true);

    try {
      const reportPayload = {
        job_id: jobId,
        user_id: user.id,
        report_data: formData
      };

      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('switchgear_panelboard_mts_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from('switchgear_panelboard_mts_reports')
          .insert(reportPayload)
          .select()
          .single();

        // Create asset entry for new reports
        if (result.data) {
          const assetData = {
            name: `Switchgear Panelboard MTS Report - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/switchgear-panelboard-mts-report/${result.data.id}`,
            user_id: user.id,
            template_type: 'MTS'
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

      setIsEditing(false);
      alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      navigateAfterSave(navigate, jobId, location);
    } catch (error) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFahrenheitChange = (f: number) => {
    const c = Math.round(((f - 32) * 5) / 9);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, fahrenheit: f, celsius: c } }));
  };

  const handleCelsiusChange = (c: number) => {
    const f = Math.round((c * 9) / 5 + 32);
    setFormData(prev => ({ ...prev, temperature: { ...prev.temperature, celsius: c, fahrenheit: f } }));
  };

  const handleInputChange = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      let current: any = prev; // Use any for intermediate steps
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}; // Create nested object if it doesn't exist
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...prev };
    });
  };
  
  const handleListInputChange = (listName: keyof FormData, index: number, field: string, value: any) => {
    setFormData(prev => {
      const list = [...(prev[listName] as any[])];
      if(list[index]) { // Check if element exists
        list[index] = { ...list[index], [field]: value };
      }
      return { ...prev, [listName]: list };
    });
  };

  const addRow = (listName: keyof Pick<FormData, 'measuredInsulationResistance' | 'contactResistanceTests' | 'dielectricWithstandTests'>) => {
    setFormData(prev => {
      let newRow;
      if (listName === 'measuredInsulationResistance') newRow = JSON.parse(JSON.stringify(initialInsulationRow));
      else if (listName === 'contactResistanceTests') newRow = JSON.parse(JSON.stringify(initialContactResistanceRow));
      else if (listName === 'dielectricWithstandTests') newRow = JSON.parse(JSON.stringify(initialDielectricWithstandRow));
      else return prev;
      
      // Ensure the list is initialized if it's somehow undefined
      const currentList = prev[listName] ? [...(prev[listName] as any[])] : [];
      return { ...prev, [listName]: [...currentList, newRow] };
    });
  };

  const removeRow = (listName: keyof Pick<FormData, 'measuredInsulationResistance' | 'contactResistanceTests' | 'dielectricWithstandTests'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter((_, i) => i !== index)
    }));
  };

  if (loading && reportId) return <div className="p-4">Loading report data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-white dark:bg-dark-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">1-Switchgear, Switchboard, Panelboard Inspection & Test Report MTS</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => isEditing && setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }))}
            className={`px-4 py-2 rounded-md text-white font-medium ${formData.status === 'PASS' ? 'bg-green-600' : 'bg-red-600'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.status}
          </button>
          {reportId && !isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">Edit Report</button>
          ) : (
            <button onClick={handleSave} disabled={!isEditing || loading} className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50">
              {loading ? 'Saving...' : (reportId ? 'Update Report' : 'Save Report')}
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div><label htmlFor="customerName" className="form-label">Customer:</label><input id="customerName" type="text" value={formData.customerName} readOnly className="form-input bg-gray-100 dark:bg-dark-200" /></div>
          <div><label htmlFor="customerLocation" className="form-label">Address:</label><input id="customerLocation" type="text" value={formData.customerLocation} readOnly className="form-input bg-gray-100 dark:bg-dark-200" /></div>
          <div><label htmlFor="userName" className="form-label">User:</label><input id="userName" type="text" value={formData.userName} onChange={e => handleInputChange('userName', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          <div><label htmlFor="date" className="form-label">Date:</label><input id="date" type="date" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          <div><label htmlFor="identifier" className="form-label">Identifier:</label><input id="identifier" type="text" value={formData.identifier} onChange={e => handleInputChange('identifier', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          <div><label htmlFor="jobNumber" className="form-label">Job #:</label><input id="jobNumber" type="text" value={formData.jobNumber} readOnly className="form-input bg-gray-100 dark:bg-dark-200" /></div>
          <div><label htmlFor="technicians" className="form-label">Technicians:</label><input id="technicians" type="text" value={formData.technicians} onChange={e => handleInputChange('technicians', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          <div><label htmlFor="substation" className="form-label">Substation:</label><input id="substation" type="text" value={formData.substation} onChange={e => handleInputChange('substation', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          <div><label htmlFor="eqptLocation" className="form-label">Eqpt. Location:</label><input id="eqptLocation" type="text" value={formData.eqptLocation} onChange={e => handleInputChange('eqptLocation', e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 items-center border-t pt-4 mt-4 dark:border-gray-700">
            <label htmlFor="tempF" className="form-label text-right">Temp:</label>
            <div className="flex items-center"><input id="tempF" type="number" value={formData.temperature.fahrenheit} onChange={e => handleFahrenheitChange(parseFloat(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /><span className="ml-1 dark:text-white">°F</span></div>
            <input type="number" value={formData.temperature.celsius} onChange={e => handleCelsiusChange(parseFloat(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /><span className="ml-1 dark:text-white">°C</span>
            
            <label htmlFor="humidity" className="form-label text-right">Humidity:</label>
            <div className="flex items-center"><input id="humidity" type="number" value={formData.temperature.humidity} onChange={e => handleInputChange('temperature.humidity', parseFloat(e.target.value))} readOnly={!isEditing} className={`form-input w-20 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /><span className="ml-1 dark:text-white">%</span></div>
            
            <label className="form-label text-right">TCF:</label>
            <input type="text" value={formData.temperature.tcf.toFixed(3)} readOnly className="form-input w-20 bg-gray-100 dark:bg-dark-200" />
          </div>
        </div>
      </section>

      {/* Nameplate Data */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {(Object.keys(formData.nameplate) as Array<keyof FormData['nameplate']>).map(key => (
            <div key={key}>
              <label htmlFor={`nameplate.${key}`} className="form-label capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</label>
              <input id={`nameplate.${key}`} type="text" value={formData.nameplate[key]} onChange={e => handleInputChange(`nameplate.${key}`, e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
          ))}
        </div>
      </section>

      {/* Visual and Mechanical Inspection */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="table-header">NETA Section</th>
                <th className="table-header">Description</th>
                <th className="table-header">Results</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
              {formData.visualInspectionItems.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select value={item.result} onChange={e => handleListInputChange('visualInspectionItems', index, 'result', e.target.value)} disabled={!isEditing} className={`form-select w-48 ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}>
                      {VISUAL_INSPECTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Electrical Tests - Measured Insulation Resistance */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 flex-grow">Electrical Tests - Measured Insulation Resistance Values</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.insulationResistanceTestVoltage}
              onChange={(e) => handleInputChange('insulationResistanceTestVoltage', e.target.value)}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select...</option>
              {INSULATION_RESISTANCE_TEST_VOLTAGES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
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
              {formData.measuredInsulationResistance.map((test, index) => (
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
                        value={test[key]}
                        onChange={(e) => {
                          const newTests = [...formData.measuredInsulationResistance];
                          newTests[index][key] = e.target.value;
                          setFormData(prev => ({ ...prev, measuredInsulationResistance: newTests }));
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={formData.insulationResistanceUnit}
                      onChange={(e) => handleInputChange('insulationResistanceUnit', e.target.value)}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {INSULATION_RESISTANCE_UNITS.map(unit => (
                        <option key={unit} value={unit} className="dark:bg-dark-100 dark:text-white">{unit}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Electrical Tests - Temperature Corrected Insulation Resistance */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
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
              {formData.tempCorrectedInsulationResistance.map((test, index) => (
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
                        value={test[key]}
                        readOnly
                        className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistanceUnit}
                      readOnly
                      className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-sm dark:text-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Electrical Tests - Contact Resistance */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 flex-grow">Contact Resistance</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.insulationResistanceTestVoltage}
              onChange={(e) => handleInputChange('insulationResistanceTestVoltage', e.target.value)}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select...</option>
              {INSULATION_RESISTANCE_TEST_VOLTAGES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
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
                        value={test[key]}
                        onChange={(e) => {
                          const newTests = [...formData.contactResistanceTests];
                          newTests[index][key] = e.target.value;
                          setFormData(prev => ({ ...prev, contactResistanceTests: newTests }));
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={formData.contactResistanceUnit}
                      onChange={(e) => handleInputChange('contactResistanceUnit', e.target.value)}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {CONTACT_RESISTANCE_UNITS.map(unit => (
                        <option key={unit} value={unit} className="dark:bg-dark-100 dark:text-white">{unit}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Electrical Tests - Dielectric Withstand */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 flex-grow">Dielectric Withstand</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white">Test Voltage:</span>
            <select
              value={formData.dielectricWithstandTestVoltage}
              onChange={(e) => handleInputChange('dielectricWithstandTestVoltage', e.target.value)}
              disabled={!isEditing}
              className={`rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              {DIELECTRIC_WITHSTAND_TEST_VOLTAGES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
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
                        value={test[key]}
                        onChange={(e) => {
                          const newTests = [...formData.dielectricWithstandTests];
                          newTests[index][key] = e.target.value;
                          setFormData(prev => ({ ...prev, dielectricWithstandTests: newTests }));
                        }}
                        readOnly={!isEditing}
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <select
                      value={formData.dielectricWithstandUnit}
                      onChange={(e) => handleInputChange('dielectricWithstandUnit', e.target.value)}
                      disabled={!isEditing}
                      className={`block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                    >
                      {DIELECTRIC_WITHSTAND_UNITS.map(unit => (
                        <option key={unit} value={unit} className="dark:bg-dark-100 dark:text-white">{unit}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Test Equipment Used */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        {(Object.keys(formData.testEquipment) as Array<keyof FormData['testEquipment']>).map(equipKey => (
          <div key={equipKey} className="grid grid-cols-1 md:grid-cols-7 gap-x-4 gap-y-2 items-center mb-2">
            <label className="form-label md:col-span-1 capitalize">{equipKey.replace(/([A-Z])/g, ' $1').trim()}:</label>
            <div className="md:col-span-2"><input type="text" placeholder="Name/Model" value={formData.testEquipment[equipKey].name} onChange={e => handleInputChange(`testEquipment.${equipKey}.name`, e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <label className="form-label md:col-span-1 md:text-right">Serial #:</label>
            <div className="md:col-span-1"><input type="text" value={formData.testEquipment[equipKey].serialNumber} onChange={e => handleInputChange(`testEquipment.${equipKey}.serialNumber`, e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
            <label className="form-label md:col-span-1 md:text-right">AMP ID:</label>
            <div className="md:col-span-1"><input type="text" value={formData.testEquipment[equipKey].ampId} onChange={e => handleInputChange(`testEquipment.${equipKey}.ampId`, e.target.value)} readOnly={!isEditing} className={`form-input ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} /></div>
          </div>
        ))}
      </section>

      {/* Comments */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <textarea value={formData.comments} onChange={e => handleInputChange('comments', e.target.value)} readOnly={!isEditing} rows={4} className={`form-textarea w-full ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
      </section>
    </div>
  );
};

export default SwitchgearPanelboardMTSReport;

// Helper CSS (can be moved to a global CSS or index.css if preferred)
const style = document.createElement('style');
style.textContent = `
  .form-label {
    @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
  }
  .form-input, .form-select, .form-textarea {
    @apply mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-dark-100 dark:text-white;
  }
  .form-input-table {
    @apply w-full p-1 border-none bg-transparent text-center dark:text-white focus:ring-0 focus:outline-none;
  }
  .table-header {
    @apply px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider;
  }
`;
document.head.append(style); 