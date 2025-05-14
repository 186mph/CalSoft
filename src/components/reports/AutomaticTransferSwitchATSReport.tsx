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

const visualInspectionResultOptions = [
  "Select One", "Satisfactory", "Unsatisfactory", "Cleaned", "Repaired", "Adjusted", "See Comments", "N/A"
];
const insulationResistanceUnitsOptions = ["kΩ", "MΩ", "GΩ"];
const contactResistanceUnitsOptions = ["µΩ", "mΩ", "Ω"];
const testVoltageOptions = ["Select", "250V", "500V", "1000V", "2500V", "5000V", "Other"];

const initialVisualInspectionItems = [
  { netaSection: '7.22.3.A.1', description: 'Compare equipment nameplate data with drawings and specifications.', result: 'Select One' },
  { netaSection: '7.22.3.A.2', description: 'Inspect physical and mechanical condition.', result: 'Select One' },
  { netaSection: '7.22.3.A.3', description: 'Inspect anchorage, alignment, grounding, and required clearances.', result: 'Select One' },
  { netaSection: '7.22.3.A.4', description: 'Verify the unit is clean.', result: 'Select One' },
  { netaSection: '7.22.3.A.5', description: 'Verify appropriate lubrication on moving current-carrying parts and on moving and sliding surfaces.', result: 'Select One' },
  { netaSection: '7.22.3.A.6', description: 'Verify that manual transfer warnings are attached and visible.', result: 'Select One' },
  { netaSection: '7.22.3.A.7', description: 'Verify tightness of all control connections.', result: 'Select One' },
  { netaSection: '7.22.3.A.8.1', description: 'Use of low-resistance ohmmeter in accordance with Section 7.22.3.B.1.', result: 'Select One' },
  { netaSection: '7.22.3.A.9', description: 'Perform manual transfer operation.', result: 'Select One' },
  { netaSection: '7.22.3.A.10', description: 'Verify positive mechanical interlocking between normal and alternate sources.', result: 'Select One' },
];

interface InsulationResistanceRow {
  p1Reading: string; p1Corrected: string;
  p2Reading: string; p2Corrected: string;
  p3Reading: string; p3Corrected: string;
  neutralReading?: string; neutralCorrected?: string;
  units: string;
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

  nameplateManufacturer: string;
  nameplateModelType: string;
  nameplateCatalogNo: string;
  nameplateSerialNumber: string;
  nameplateSystemVoltage: string;
  nameplateRatedVoltage: string;
  nameplateRatedCurrent: string;
  nameplateSCCR: string;

  visualInspectionItems: Array<{ netaSection: string; description: string; result: string; }>;

  insulationTestVoltage: string;
  insulationResistance: {
    poleToPoleNormalClosed: InsulationResistanceRow;
    poleToPoleEmergencyClosed: InsulationResistanceRow;
    poleToNeutralNormalClosed: InsulationResistanceRow;
    poleToNeutralEmergencyClosed: InsulationResistanceRow;
    poleToGroundNormalClosed: InsulationResistanceRow;
    poleToGroundEmergencyClosed: InsulationResistanceRow;
    lineToLoadNormalOpen: InsulationResistanceRow;
    lineToLoadEmergencyOpen: InsulationResistanceRow;
  };

  contactResistance: {
    normal: { p1: string; p2: string; p3: string; neutral: string; units: string; };
    emergency: { p1: string; p2: string; p3: string; neutral: string; units: string; };
  };

  megohmmeterName: string;
  megohmmeterSerialNumber: string;
  megohmmeterAmpId: string;
  lowResistanceOhmmeterName: string;
  lowResistanceOhmmeterSerialNumber: string;
  lowResistanceOhmmeterAmpId: string;

  comments: string;
  status: 'PASS' | 'FAIL';
}

const AutomaticTransferSwitchATSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);

  const initialInsulationRow: InsulationResistanceRow = {
    p1Reading: '', p1Corrected: '',
    p2Reading: '', p2Corrected: '',
    p3Reading: '', p3Corrected: '',
    neutralReading: '', neutralCorrected: '',
    units: 'MΩ',
  };
  
  const [formData, setFormData] = useState<FormData>(() => ({
    customerName: '', customerLocation: '', userName: user?.email || '', date: new Date().toISOString().split('T')[0], identifier: '',
    jobNumber: '', technicians: '', substation: '', eqptLocation: '',
    temperature: { fahrenheit: 68, celsius: 20, tcf: 1, humidity: 50 },
    nameplateManufacturer: '', nameplateModelType: '', nameplateCatalogNo: '', nameplateSerialNumber: '',
    nameplateSystemVoltage: '', nameplateRatedVoltage: '', nameplateRatedCurrent: '', nameplateSCCR: '',
    visualInspectionItems: JSON.parse(JSON.stringify(initialVisualInspectionItems)),
    insulationTestVoltage: '1000V',
    insulationResistance: {
      poleToPoleNormalClosed: { ...initialInsulationRow },
      poleToPoleEmergencyClosed: { ...initialInsulationRow },
      poleToNeutralNormalClosed: { ...initialInsulationRow },
      poleToNeutralEmergencyClosed: { ...initialInsulationRow },
      poleToGroundNormalClosed: { ...initialInsulationRow, neutralReading: '', neutralCorrected: '' },
      poleToGroundEmergencyClosed: { ...initialInsulationRow, neutralReading: '', neutralCorrected: '' },
      lineToLoadNormalOpen: { ...initialInsulationRow, neutralReading: '', neutralCorrected: '' },
      lineToLoadEmergencyOpen: { ...initialInsulationRow, neutralReading: '', neutralCorrected: '' },
    },
    contactResistance: {
      normal: { p1: '', p2: '', p3: '', neutral: '', units: 'µΩ' },
      emergency: { p1: '', p2: '', p3: '', neutral: '', units: 'µΩ' },
    },
    megohmmeterName: '', megohmmeterSerialNumber: '', megohmmeterAmpId: '',
    lowResistanceOhmmeterName: '', lowResistanceOhmmeterSerialNumber: '', lowResistanceOhmmeterAmpId: '',
    comments: '', status: 'PASS',
  }));

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
        }));
      }
    } catch (error) {
      console.error('Error loading job info:', error);
      alert('Failed to load job info: ' + (error as Error).message);
    }
  }, [jobId]);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      setIsEditing(true);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('automatic_transfer_switch_ats_reports')
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
          visualInspectionItems: data.visual_inspection_items || JSON.parse(JSON.stringify(initialVisualInspectionItems)),
          insulationResistance: data.insulation_resistance || prev.insulationResistance,
          contactResistance: data.contact_resistance || prev.contactResistance,
          comments: data.comments || '',
          status: data.report_info?.status || 'PASS',
        }));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Failed to load report: ' + (error as Error).message);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadJobInfo();
    if (reportId) {
      loadReport();
    } else {
      setLoading(false);
      setIsEditing(true);
    }
  }, [jobId, reportId, loadJobInfo, loadReport]);
  
  const handleFahrenheitChange = (fahrenheit: number) => {
    const celsius = ((fahrenheit - 32) * 5) / 9;
    const tcf = getTCF(celsius);
    setFormData(prev => ({
      ...prev,
      temperature: { ...prev.temperature, fahrenheit, celsius: parseFloat(celsius.toFixed(1)), tcf }
    }));
  };

  const handleCelsiusChange = (celsius: number) => {
    const fahrenheit = (celsius * 9) / 5 + 32;
    const tcf = getTCF(celsius);
    setFormData(prev => ({
      ...prev,
      temperature: { ...prev.temperature, celsius, fahrenheit: parseFloat(fahrenheit.toFixed(1)), tcf }
    }));
  };
  
  const calculateCorrectedValue = useCallback((value: string, tcf: number): string => {
    if (value === "" || value === null || value === undefined || isNaN(parseFloat(value))) {
      return "";
    }
    return (parseFloat(value) * tcf).toFixed(2);
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const tcf = formData.temperature.tcf;
    setFormData(prev => {
      const newIR = JSON.parse(JSON.stringify(prev.insulationResistance));
      (Object.keys(newIR) as Array<keyof typeof newIR>).forEach(key => {
        const row = newIR[key];
        row.p1Corrected = calculateCorrectedValue(row.p1Reading, tcf);
        row.p2Corrected = calculateCorrectedValue(row.p2Reading, tcf);
        row.p3Corrected = calculateCorrectedValue(row.p3Reading, tcf);
        if (row.neutralReading !== undefined) {
          row.neutralCorrected = calculateCorrectedValue(row.neutralReading, tcf);
        }
      });
      return { ...prev, insulationResistance: newIR };
    });
  }, [formData.temperature.tcf, isEditing, calculateCorrectedValue, formData.insulationResistance]);


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
  
  const handleVisualInspectionChange = (index: number, value: string) => {
    if (!isEditing) return;
    setFormData(prev => {
      const newItems = prev.visualInspectionItems.map((item, i) => 
        i === index ? { ...item, result: value } : item
      );
      return { ...prev, visualInspectionItems: newItems };
    });
  };

  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    const reportPayload = {
      job_id: jobId,
      user_id: user.id,
      report_info: { 
        customerName: formData.customerName, customerLocation: formData.customerLocation, userName: formData.userName,
        date: formData.date, identifier: formData.identifier, jobNumber: formData.jobNumber, technicians: formData.technicians,
        temperature: formData.temperature, substation: formData.substation, eqptLocation: formData.eqptLocation,
        nameplateManufacturer: formData.nameplateManufacturer, nameplateModelType: formData.nameplateModelType,
        nameplateCatalogNo: formData.nameplateCatalogNo, nameplateSerialNumber: formData.nameplateSerialNumber,
        nameplateSystemVoltage: formData.nameplateSystemVoltage, nameplateRatedVoltage: formData.nameplateRatedVoltage,
        nameplateRatedCurrent: formData.nameplateRatedCurrent, nameplateSCCR: formData.nameplateSCCR,
        megohmmeterName: formData.megohmmeterName, megohmmeterSerialNumber: formData.megohmmeterSerialNumber, megohmmeterAmpId: formData.megohmmeterAmpId,
        lowResistanceOhmmeterName: formData.lowResistanceOhmmeterName, lowResistanceOhmmeterSerialNumber: formData.lowResistanceOhmmeterSerialNumber, lowResistanceOhmmeterAmpId: formData.lowResistanceOhmmeterAmpId,
        status: formData.status, insulationTestVoltage: formData.insulationTestVoltage,
      },
      visual_inspection_items: formData.visualInspectionItems,
      insulation_resistance: formData.insulationResistance,
      contact_resistance: formData.contactResistance,
      comments: formData.comments,
    };

    try {
      let result;
      if (reportId) {
        result = await supabase
          .schema('neta_ops')
          .from('automatic_transfer_switch_ats_reports')
          .update(reportPayload)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        result = await supabase
          .schema('neta_ops')
          .from('automatic_transfer_switch_ats_reports')
          .insert(reportPayload)
          .select()
          .single();

        if (result.data) {
          const assetData = {
            name: '35-Automatic Transfer Switch ATS - ' + (formData.identifier || formData.eqptLocation || 'Unnamed'),
            file_url: 'report:/jobs/' + jobId + '/automatic-transfer-switch-ats-report/' + result.data.id,
            user_id: user.id,
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
      alert('Report ' + (reportId ? 'updated' : 'saved') + ' successfully!');
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert('Failed to save report: ' + (error?.message || 'Unknown error'));
    }
  };
  
  if (loading) return <div className="p-4 text-center text-lg text-gray-700 dark:text-gray-300">Loading report data...</div>;

  const renderInsulationRow = (stateKey: keyof FormData['insulationResistance'], title: string, hasNeutral: boolean = false) => {
    const rowData = formData.insulationResistance[stateKey];
    return (
      <tr className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
        <td className="border px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{title}</td>
        {(['p1', 'p2', 'p3'] as const).map(pole => (
          <React.Fragment key={pole}>
            <td className="border px-1 py-1">
              <input type="text" value={rowData[pole + 'Reading']} onChange={e => handleChange('insulationResistance.' + stateKey + '.' + pole + 'Reading', e.target.value)} readOnly={!isEditing} className={`w-full text-center p-1.5 rounded text-sm ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]'}`} />
            </td>
            <td className="border px-1 py-1">
              <input type="text" value={rowData[pole + 'Corrected']} readOnly className="w-full text-center p-1.5 rounded text-sm bg-gray-100 dark:bg-dark-200 cursor-not-allowed" />
            </td>
          </React.Fragment>
        ))}
        {hasNeutral ? (
           <React.Fragment>
            <td className="border px-1 py-1">
              <input type="text" value={rowData.neutralReading || ''} onChange={e => handleChange('insulationResistance.' + stateKey + '.neutralReading', e.target.value)} readOnly={!isEditing} className={`w-full text-center p-1.5 rounded text-sm ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]'}`} />
            </td>
            <td className="border px-1 py-1">
              <input type="text" value={rowData.neutralCorrected || ''} readOnly className="w-full text-center p-1.5 rounded text-sm bg-gray-100 dark:bg-dark-200 cursor-not-allowed" />
            </td>
          </React.Fragment>
        ) : (
          <><td className="border px-1 py-1 bg-gray-50 dark:bg-dark-200"></td><td className="border px-1 py-1 bg-gray-50 dark:bg-dark-200"></td></>
        )}
        <td className="border px-1 py-1">
          <select value={rowData.units} onChange={e => handleChange('insulationResistance.' + stateKey + '.units', e.target.value)} disabled={!isEditing} className={`w-full p-1.5 rounded text-sm ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]'}`}>
            {insulationResistanceUnitsOptions.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </td>
      </tr>
    );
  };

  const commonInputClass = 'mt-1 block w-full p-2 rounded-md shadow-sm text-sm focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]';
  const editableInputClass = 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600';
  const readOnlyInputClass = 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed';
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";


  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">AUTOMATIC TRANSFER SWITCH ATS REPORT</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => isEditing && setFormData(prev => ({ ...prev, status: prev.status === 'PASS' ? 'FAIL' : 'PASS' }))}
            className={`px-4 py-2 rounded-md text-white font-medium text-sm ${formData.status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {formData.status}
          </button>
          {reportId && !isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm">Edit Report</button>
          ) : (
            <button onClick={handleSave} disabled={!isEditing} className={`px-4 py-2 bg-[#f26722] hover:bg-[#e55611] text-white font-medium rounded-md text-sm ${!isEditing ? 'hidden' : ''}`}>
              {reportId ? 'Update Report' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Job Information */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Left Column */}
          <div>
            {[
              { label: 'Customer', field: 'customerName', readOnly: true, type: 'text' },
              { label: 'Address', field: 'customerLocation', readOnly: true, type: 'textarea' },
              { label: 'User', field: 'userName', type: 'text' },
              { label: 'Date', field: 'date', type: 'date' },
              { label: 'Identifier', field: 'identifier', type: 'text' },
            ].map(item => (
              <div className="mb-3" key={item.field}>
                <label className={labelClass}>{item.label}:</label>
                {item.type === 'textarea' ? (
                  <textarea value={formData[item.field as keyof FormData] as string} readOnly={item.readOnly || !isEditing} onChange={e => handleChange(item.field, e.target.value)} className={`${commonInputClass} ${item.readOnly || !isEditing ? readOnlyInputClass : editableInputClass}`} rows={2}/>
                ) : (
                  <input type={item.type} value={formData[item.field as keyof FormData] as string} readOnly={item.readOnly || !isEditing} onChange={e => handleChange(item.field, e.target.value)} className={`${commonInputClass} ${item.readOnly || !isEditing ? readOnlyInputClass : editableInputClass}`} />
                )}
              </div>
            ))}
          </div>
          {/* Right Column */}
          <div>
            {[
              { label: 'Job #', field: 'jobNumber', readOnly: true, type: 'text' },
              { label: 'Technicians', field: 'technicians', type: 'text' },
            ].map(item => (
              <div className="mb-3" key={item.field}>
                <label className={labelClass}>{item.label}:</label>
                <input type={item.type} value={formData[item.field as keyof FormData] as string} readOnly={item.readOnly || !isEditing} onChange={e => handleChange(item.field, e.target.value)} className={`${commonInputClass} ${item.readOnly || !isEditing ? readOnlyInputClass : editableInputClass}`} />
              </div>
            ))}
            <div className="mb-3 grid grid-cols-4 gap-2 items-end">
              <div>
                <label className={labelClass}>Temp.</label>
                <input type="number" value={formData.temperature.fahrenheit} onChange={e => handleFahrenheitChange(parseFloat(e.target.value))} readOnly={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
                <span className="ml-1 text-xs dark:text-gray-300">°F</span>
              </div>
              <div>
                <label className={labelClass}>&nbsp;</label> {/* Spacer for alignment */}
                <input type="number" value={formData.temperature.celsius} onChange={e => handleCelsiusChange(parseFloat(e.target.value))} readOnly={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
                 <span className="ml-1 text-xs dark:text-gray-300">°C</span>
              </div>
              <div>
                <label className={labelClass}>TCF</label>
                <input type="number" value={formData.temperature.tcf} readOnly className={`${commonInputClass} ${readOnlyInputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Humidity</label>
                <input type="number" value={formData.temperature.humidity} onChange={e => handleChange('temperature.humidity', parseFloat(e.target.value))} readOnly={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
                 <span className="ml-1 text-xs dark:text-gray-300">%</span>
              </div>
            </div>
             {[
              { label: 'Substation', field: 'substation', type: 'text' },
              { label: 'Eqpt. Location', field: 'eqptLocation', type: 'text' },
            ].map(item => (
              <div className="mb-3" key={item.field}>
                <label className={labelClass}>{item.label}:</label>
                <input type={item.type} value={formData[item.field as keyof FormData] as string} readOnly={!isEditing} onChange={e => handleChange(item.field, e.target.value)} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nameplate Data */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Nameplate Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            {[
              { label: 'Manufacturer', field: 'nameplateManufacturer' }, { label: 'Model / Type', field: 'nameplateModelType' },
              { label: 'Catalog No.', field: 'nameplateCatalogNo' }, { label: 'Serial Number', field: 'nameplateSerialNumber' },
            ].map(item => (
              <div className="mb-3" key={item.field}>
                <label className={labelClass}>{item.label}:</label>
                <input type="text" value={formData[item.field as keyof FormData] as string} onChange={e => handleChange(item.field, e.target.value)} readOnly={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
              </div>
            ))}
          </div>
          <div>
            {[
              { label: 'System Voltage (V)', field: 'nameplateSystemVoltage' }, { label: 'Rated Voltage (V)', field: 'nameplateRatedVoltage' },
              { label: 'Rated Current (A)', field: 'nameplateRatedCurrent' }, { label: 'SCCR (kA)', field: 'nameplateSCCR' },
            ].map(item => (
              <div className="mb-3" key={item.field}>
                <label className={labelClass}>{item.label}:</label>
                <input type="text" value={formData[item.field as keyof FormData] as string} onChange={e => handleChange(item.field, e.target.value)} readOnly={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual and Mechanical Inspection */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NETA Section</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {formData.visualInspectionItems.map((item, index) => (
                <tr key={item.netaSection} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{item.netaSection}</td>
                  <td className="px-3 py-2 text-sm">{item.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select value={item.result} onChange={e => handleVisualInspectionChange(index, e.target.value)} disabled={!isEditing} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass} w-full`}>
                      {visualInspectionResultOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Electrical Tests - Insulation Resistance */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Electrical Tests - Insulation Resistance</h2>
            <div className="flex items-center">
                <label htmlFor="insulationTestVoltage" className="mr-2 text-sm font-medium">Test Voltage:</label>
                <select 
                    id="insulationTestVoltage"
                    value={formData.insulationTestVoltage} 
                    onChange={e => handleChange('insulationTestVoltage', e.target.value)} 
                    disabled={!isEditing} 
                    className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass} w-32`}
                >
                    {testVoltageOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th rowSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Test Points</th>
                <th colSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P1</th>
                <th colSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P2</th>
                <th colSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P3</th>
                <th colSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Neutral</th>
                <th rowSpan={2} className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-28">Units</th>
              </tr>
              <tr>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Reading</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">@20°C</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Reading</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">@20°C</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Reading</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">@20°C</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Reading</th>
                <th className="border px-1 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">@20°C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {renderInsulationRow('poleToPoleNormalClosed', 'Pole to Pole (Normal Closed)')}
              {renderInsulationRow('poleToPoleEmergencyClosed', 'Pole to Pole (Emergency Closed)')}
              {renderInsulationRow('poleToNeutralNormalClosed', 'Pole to Neutral (Normal Closed)')}
              {renderInsulationRow('poleToNeutralEmergencyClosed', 'Pole to Neutral (Emergency Closed)')}
              {renderInsulationRow('poleToGroundNormalClosed', 'Pole to Ground (Normal Closed)', true)}
              {renderInsulationRow('poleToGroundEmergencyClosed', 'Pole to Ground (Emergency Closed)', true)}
              {renderInsulationRow('lineToLoadNormalOpen', 'Line to Load (Normal Open)', true)}
              {renderInsulationRow('lineToLoadEmergencyOpen', 'Line to Load (Emergency Open)', true)}
            </tbody>
          </table>
        </div>
      </section>

      {/* Electrical Tests - Contact/Pole Resistance */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Electrical Tests - Contact/Pole Resistance</h2>
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P1</th>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P2</th>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">P3</th>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Neutral</th>
                <th className="border px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-28">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(['normal', 'emergency'] as const).map(state => (
                <tr key={state} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
                  <td className="border px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{state.charAt(0).toUpperCase() + state.slice(1)}</td>
                  {(['p1', 'p2', 'p3', 'neutral'] as const).map(pole => (
                    <td key={pole} className="border px-1 py-1">
                      <input type="text" value={formData.contactResistance[state][pole]} onChange={e => handleChange(`contactResistance.${state}.${pole}`, e.target.value)} readOnly={!isEditing} className={`w-full text-center p-1.5 rounded text-sm ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]'}`} />
                    </td>
                  ))}
                  <td className="border px-1 py-1">
                    <select value={formData.contactResistance[state].units} onChange={e => handleChange(`contactResistance.${state}.units`, e.target.value)} disabled={!isEditing} className={`w-full p-1.5 rounded text-sm ${!isEditing ? 'bg-gray-100 dark:bg-dark-200 cursor-not-allowed' : 'bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-[#f26722] focus:border-[#f26722]'}`}>
                      {contactResistanceUnitsOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Test Equipment Used */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="space-y-4">
          {[
            { type: 'Megohmmeter', nameField: 'megohmmeterName', serialField: 'megohmmeterSerialNumber', ampIdField: 'megohmmeterAmpId' },
            { type: 'Low Resistance Ohmmeter', nameField: 'lowResistanceOhmmeterName', serialField: 'lowResistanceOhmmeterSerialNumber', ampIdField: 'lowResistanceOhmmeterAmpId' },
          ].map(equip => (
            <div key={equip.type} className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-center">
              <label className={`sm:col-span-1 ${labelClass} sm:text-right`}>{equip.type}:</label>
              <input type="text" placeholder="Name/Model" value={formData[equip.nameField as keyof FormData] as string} onChange={e => handleChange(equip.nameField, e.target.value)} readOnly={!isEditing} className={`sm:col-span-2 ${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
              <label className={`sm:col-span-1 ${labelClass} sm:text-right`}>Serial #:</label>
              <input type="text" placeholder="Serial #" value={formData[equip.serialField as keyof FormData] as string} onChange={e => handleChange(equip.serialField, e.target.value)} readOnly={!isEditing} className={`sm:col-span-1 ${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
              <label className={`sm:col-span-1 ${labelClass} sm:text-right`}>AMP ID:</label>
              <input type="text" placeholder="AMP ID" value={formData[equip.ampIdField as keyof FormData] as string} onChange={e => handleChange(equip.ampIdField, e.target.value)} readOnly={!isEditing} className={`sm:col-span-1 ${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass}`} />
            </div>
          ))}
        </div>
      </section>
      
      {/* Comments */}
      <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">Comments</h2>
        <textarea value={formData.comments} onChange={e => handleChange('comments', e.target.value)} readOnly={!isEditing} rows={4} className={`${commonInputClass} ${!isEditing ? readOnlyInputClass : editableInputClass} w-full`} />
      </section>
    </div>
  );
};

export default AutomaticTransferSwitchATSReport; 