import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TanDeltaDataPoint {
  voltageLabel: string;
  kV: number;
  phaseA: number;
  phaseAStdDev: number | null;
  phaseB: number;
  phaseBStdDev: number | null;
  phaseC: number;
  phaseCStdDev: number | null;
}

interface TestEquipment {
  megohmeterSerial: string;
  megohmmeterAmpId: string;
  vlfHipotSerial: string;
  vlfHipotAmpId: string;
}

// Initial data based on the image
const initialData: TanDeltaDataPoint[] = [
  { voltageLabel: '0.5 Uo', kV: 7.200, phaseA: 4.0, phaseAStdDev: null, phaseB: 4.4, phaseBStdDev: null, phaseC: 5.0, phaseCStdDev: null },
  { voltageLabel: '1.0 Uo', kV: 14.400, phaseA: 4.0, phaseAStdDev: null, phaseB: 4.5, phaseBStdDev: null, phaseC: 5.1, phaseCStdDev: null },
  { voltageLabel: '1.5 Uo', kV: 21.600, phaseA: 4.1, phaseAStdDev: null, phaseB: 4.5, phaseBStdDev: null, phaseC: 5.2, phaseCStdDev: null },
  { voltageLabel: '2.0 Uo', kV: 28.800, phaseA: 4.1, phaseAStdDev: null, phaseB: 4.7, phaseBStdDev: null, phaseC: 5.3, phaseCStdDev: null },
];

const TanDeltaChartMTS: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!reportId);
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [data, setData] = useState<TanDeltaDataPoint[]>(initialData);
  const [editingData, setEditingData] = useState<boolean>(false);
  const [testDate, setTestDate] = useState<string>('');
  const [cableType, setCableType] = useState<string>('');
  const [systemVoltage, setSystemVoltage] = useState<string>('14.400');
  const [equipment, setEquipment] = useState<TestEquipment>({
    megohmeterSerial: '',
    megohmmeterAmpId: '',
    vlfHipotSerial: '',
    vlfHipotAmpId: ''
  });

  useEffect(() => {
    if (jobId) {
      loadJobInfo();
    }
    if (reportId) {
      loadReport();
    }
    setIsEditing(!reportId);
  }, [jobId, reportId]);

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

      // Additional job data loading as needed
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
      setLoading(true);
      const { data: reportData, error } = await supabase
        .schema('neta_ops')
        .from('tandelta_reports') // Assuming the same table for now, or this might need to be tandelta_mts_reports
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

      if (reportData) {
        // Load report data from database
        setData(reportData.test_data?.points || initialData);
        setTestDate(reportData.report_info?.date || '');
        setCableType(reportData.report_info?.cableType || '');
        setSystemVoltage(reportData.report_info?.systemVoltage || '14.400');
        setEquipment(reportData.report_info?.testEquipment || {
          megohmeterSerial: '',
          megohmmeterAmpId: '',
          vlfHipotSerial: '',
          vlfHipotAmpId: ''
        });
        setStatus(reportData.report_info?.status || 'PASS');
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

    try {
      setLoading(true);
      
      const reportData = {
        job_id: jobId,
        user_id: user.id,
        report_info: {
          date: testDate,
          cableType: cableType,
          systemVoltage: systemVoltage,
          testEquipment: equipment,
          status: status
        },
        test_data: {
          points: data
        }
      };

      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('tandelta_reports') // Assuming the same table for now
          .update(reportData)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from('tandelta_reports') // Assuming the same table for now
          .insert(reportData)
          .select()
          .single();

        // Create asset entry
        if (result.data) {
          const assetData = {
            name: `Tan Delta Test MTS - ${cableType || 'Cable'}`,
            file_url: `report:/jobs/${jobId}/medium-voltage-vlf-tan-delta-mts/${result.data.id}`,
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

      setIsEditing(false);
      alert("Report saved successfully!");
      
      // Navigate back to job page
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleEditMode = () => {
    setEditingData(!editingData);
  };

  const handleDataChange = (
    index: number,
    field: keyof TanDeltaDataPoint,
    value: string
  ) => {
    const newData = [...data];
    if (field === 'voltageLabel') {
      newData[index][field] = value;
    } else if (field === 'phaseAStdDev' || field === 'phaseBStdDev' || field === 'phaseCStdDev') {
      // For standard deviation fields, use null for empty values
      newData[index][field] = value === '' ? null : parseFloat(value) || 0;
    } else {
      newData[index][field] = parseFloat(value) || 0;
    }
    setData(newData);
  };

  const handleEquipmentChange = (field: keyof TestEquipment, value: string) => {
    setEquipment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>4-Medium Voltage Cable VLF Tan Delta MTS</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isEditing) {
                setStatus(status === 'PASS' ? 'FAIL' : 'PASS');
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              status === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-red-600 text-white focus:ring-red-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {status === 'PASS' ? 'PASS' : 'FAIL'}
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
              className={`px-4 py-2 text-sm text-white bg-accent-color rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color ${!isEditing ? 'hidden' : 'hover:bg-accent-color/90'}`}
            >
              Save Report
            </button>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
        <button 
          style={{ 
            backgroundColor: '#4a90e2', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          onClick={toggleEditMode}
        >
          {editingData ? 'Lock Data' : 'Edit Data'}
        </button>
      </div>

      {/* Add System Voltage Input */}
      <div className="mb-6 p-4 bg-white dark:bg-dark-150 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            System Voltage Line to Ground (kV RMS):
          </label>
          <input
            type="number"
            step="0.001"
            value={systemVoltage}
            onChange={(e) => setSystemVoltage(e.target.value)}
            disabled={!isEditing}
            className="mt-1 block w-32 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
          />
        </div>
      </div>

      {/* Data Table - Always visible */}
      <div style={{ marginBottom: '30px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>Voltage Steps</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>kV</th>
              <th colSpan={2} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>A Phase</th>
              <th colSpan={2} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>B Phase</th>
              <th colSpan={2} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>C Phase</th>
            </tr>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}></th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}></th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>TD [E-3]</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>Std. Dev</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>TD [E-3]</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>Std. Dev</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>TD [E-3]</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f2f2f2' }}>Std. Dev</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="text"
                      value={row.voltageLabel}
                      onChange={(e) => handleDataChange(index, 'voltageLabel', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.voltageLabel
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      value={row.kV}
                      onChange={(e) => handleDataChange(index, 'kV', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.kV
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.1"
                      value={row.phaseA}
                      onChange={(e) => handleDataChange(index, 'phaseA', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseA
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.01"
                      value={row.phaseAStdDev === null ? '' : row.phaseAStdDev}
                      onChange={(e) => handleDataChange(index, 'phaseAStdDev', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseAStdDev === null ? '' : row.phaseAStdDev
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.1"
                      value={row.phaseB}
                      onChange={(e) => handleDataChange(index, 'phaseB', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseB
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.01"
                      value={row.phaseBStdDev === null ? '' : row.phaseBStdDev}
                      onChange={(e) => handleDataChange(index, 'phaseBStdDev', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseBStdDev === null ? '' : row.phaseBStdDev
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.1"
                      value={row.phaseC}
                      onChange={(e) => handleDataChange(index, 'phaseC', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseC
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {editingData ? (
                    <input
                      type="number"
                      step="0.01"
                      value={row.phaseCStdDev === null ? '' : row.phaseCStdDev}
                      onChange={(e) => handleDataChange(index, 'phaseCStdDev', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  ) : (
                    row.phaseCStdDev === null ? '' : row.phaseCStdDev
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart - Always visible below the table */}
      <div style={{ height: '400px', border: '1px solid #ddd', padding: '15px', marginBottom: '30px', background: '#f9f9f9' }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 30, right: 40, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="kV" 
              label={{ value: 'Test Voltage (kV)', position: 'bottom', offset: 10 }} 
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              label={{ value: 'Tan Delta (E-3)', angle: -90, position: 'insideLeft', offset: -10 }}
              domain={[0, 'auto']}
              padding={{ top: 20 }}
            />
            <Tooltip formatter={(value) => [`${value}`, 'Tan Delta (E-3)']} />
            <Legend 
              layout="horizontal" 
              verticalAlign="top" 
              align="center"
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            <Line
              type="monotone"
              dataKey="phaseA"
              name="A Phase"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="phaseB"
              name="B Phase"
              stroke="#82ca9d"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="phaseC"
              name="C Phase"
              stroke="#ff7300"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Megohmmeter</label>
              <input
                type="text"
                value={equipment.megohmeterSerial}
                onChange={(e) => handleEquipmentChange('megohmeterSerial', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={equipment.megohmmeterAmpId}
                onChange={(e) => handleEquipmentChange('megohmmeterAmpId', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">VLF Hipot</label>
              <input
                type="text"
                value={equipment.vlfHipotSerial}
                onChange={(e) => handleEquipmentChange('vlfHipotSerial', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={equipment.vlfHipotAmpId}
                onChange={(e) => handleEquipmentChange('vlfHipotAmpId', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TanDeltaChartMTS; 