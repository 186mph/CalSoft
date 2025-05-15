import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import _ from 'lodash';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const LARGE_DRY_TYPE_XFMR_MTS_TABLE = 'large_dry_type_xfmr_mts_reports' as const;

// Temperature conversion and TCF tables (same as DryTypeTransformer)
const tempConvTable = [
  [-11.2, -24], [-9.4, -23], [-7.6, -22], [-5.8, -21], [-4, -20], [-2.2, -19], [1.4, -17], [3.2, -16], [5, -15], [6.8, -14], [8.6, -13], [10.4, -12], [12.2, -11], [14, -10], [15.8, -9], [17.6, -8], [19.4, -7], [21.2, -6], [23, -5], [24.8, -4], [26.6, -3], [28.4, -2], [30.2, -1], [32, 0], [33.8, 1], [35.6, 2], [37.4, 3], [39.2, 4], [41, 5], [42.8, 6], [44.6, 7], [46.4, 8], [48.2, 9], [50, 10], [51.8, 11], [53.6, 12], [55.4, 13], [57.2, 14], [59, 15], [60.8, 16], [62.6, 17], [64.4, 18], [66.2, 19], [68, 20], [70, 21], [72, 22], [73.4, 23], [75.2, 24], [77, 25], [78.8, 26], [80.6, 27], [82.4, 28], [84.2, 29], [86, 30], [87.8, 31], [89.6, 32], [91.4, 33], [93.2, 34], [95, 35], [96.8, 36], [98.6, 37], [100.4, 38], [102.2, 39], [104, 40], [105.8, 41], [107.6, 42], [109.4, 43], [111.2, 44], [113, 45], [114.8, 46], [116.6, 47], [118.4, 48], [120.2, 49], [122, 50], [123.8, 51], [125.6, 52], [127.4, 53], [129.2, 54], [131, 55], [132.8, 56], [134.6, 57], [136.4, 58], [138.2, 59], [140, 60], [141.8, 61], [143.6, 62], [145.4, 63], [147.2, 64], [149, 65]
];

const tcfTable = [
  [-24, 0.054], [-23, 0.068], [-22, 0.082], [-21, 0.096], [-20, 0.11], [-19, 0.124], [-18, 0.138], [-17, 0.152], [-16, 0.166], [-15, 0.18], [-14, 0.194], [-13, 0.208], [-12, 0.222], [-11, 0.236], [-10, 0.25], [-9, 0.264], [-8, 0.278], [-7, 0.292], [-6, 0.306], [-5, 0.32], [-4, 0.336], [-3, 0.352], [-2, 0.368], [-1, 0.384], [0, 0.4], [1, 0.42], [2, 0.44], [3, 0.46], [4, 0.48], [5, 0.5], [6, 0.526], [7, 0.552], [8, 0.578], [9, 0.604], [10, 0.63], [11, 0.666], [12, 0.702], [13, 0.738], [14, 0.774], [15, 0.81], [16, 0.848], [17, 0.886], [18, 0.924], [19, 0.962], [20, 1], [21, 1.05], [22, 1.1], [23, 1.15], [24, 1.2], [25, 1.25], [26, 1.316], [27, 1.382], [28, 1.448], [29, 1.514], [30, 1.58], [31, 1.664], [32, 1.748], [33, 1.832], [34, 1.872], [35, 2], [36, 2.1], [37, 2.2], [38, 2.3], [39, 2.4], [40, 2.5], [41, 2.628], [42, 2.756], [43, 2.884], [44, 3.012], [45, 3.15], [46, 3.316], [47, 3.482], [48, 3.648], [49, 3.814], [50, 3.98], [51, 4.184], [52, 4.388], [53, 4.592], [54, 4.796], [55, 5], [56, 5.26], [57, 5.52], [58, 5.78], [59, 6.04], [60, 6.3], [61, 6.62], [62, 6.94], [63, 7.26], [64, 7.58], [65, 7.9], [66, 8.32], [67, 8.74], [68, 9.16], [69, 9.58], [70, 10], [71, 10.52], [72, 11.04], [73, 11.56], [74, 12.08], [75, 12.6], [76, 13.24], [77, 13.88], [78, 14.52], [79, 15.16], [80, 15.8], [81, 16.64], [82, 17.48], [83, 18.32], [84, 19.16], [85, 20], [86, 21.04], [87, 22.08], [88, 23.12], [89, 24.16], [90, 25.2], [91, 26.45], [92, 27.7], [93, 28.95], [94, 30.2], [95, 31.6], [96, 33.28], [97, 34.96], [98, 36.64], [99, 38.32], [100, 40], [101, 42.08], [102, 44.16], [103, 46.24], [104, 48.32], [105, 50.4], [106, 52.96], [107, 55.52], [108, 58.08], [109, 60.64], [110, 63.2]
];

// Dropdown options
const visualInspectionOptions = [ // As per screenshot
  "Select One", "Yes", "No", "N/A", "Satisfactory", "Unsatisfactory", "Cleaned", "See Comments",
];

const insulationResistanceUnits = [
  { symbol: "kΩ", name: "Kilo-Ohms" },
  { symbol: "MΩ", name: "Mega-Ohms" },
  { symbol: "GΩ", name: "Giga-Ohms" }
];

const testVoltageOptions = [
  "250V", "500V", "1000V",
  "2500V", "5000V", "10000V"
];

// Interface for form data structure
interface FormData {
  // Job Information
  customer: string;
  address: string;
  date: string;
  technicians: string;
  jobNumber: string;
  substation: string;
  eqptLocation: string;
  identifier: string;
  userName: string;
  temperature: {
    ambient: number;
    celsius: number;
    fahrenheit: number;
    correctionFactor: number;
    humidity?: number; // Make humidity optional as it's not always present
  };

  // Nameplate Data
  nameplateData: {
    manufacturer: string;
    catalogNumber: string;
    serialNumber: string;
    kva: string;
    tempRise: string;
    impedance: string;
    primary: {
      volts: string;
      voltsSecondary: string;
      connection: string;
      material: string;
    };
    secondary: {
      volts: string;
      voltsSecondary: string;
      connection: string;
      material: string;
    };
    tapConfiguration: {
      positions: number[];
      voltages: string[];
      currentPosition: number;
      currentPositionSecondary: string;
      tapVoltsSpecific: string;
      tapPercentSpecific: string;
    };
  };

  // Visual Inspection
  visualInspection: {
    [key: string]: string | undefined; // Allow for string results and optional comments
  };

  // Insulation Resistance
  insulationResistance: {
    temperature: string; 
    primaryToGround: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    secondaryToGround: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    primaryToSecondary: {
      testVoltage: string;
      unit: string;
      readings: { halfMinute: string; oneMinute: string; tenMinute: string; };
      corrected: { halfMinute: string; oneMinute: string; tenMinute: string; };
      dielectricAbsorption: string; polarizationIndex: string;
    };
    dielectricAbsorptionAcceptable: string;
    polarizationIndexAcceptable: string;
  };

  // Test Equipment
  testEquipment: {
    megohmmeter: { name: string; serialNumber: string; ampId: string; };
  };

  // Comments
  comments: string;
  status: string;
}

// Helper function to calculate corrected value
const calculateCorrectedValue = (readingStr: string, tcf: number): string => {
   if (typeof readingStr === 'string' && (readingStr.includes('>') || readingStr.includes('<'))) {
      return readingStr;
   }
  const readingNum = parseFloat(readingStr);
  if (isNaN(readingNum) || !isFinite(readingNum)) return '';
  return (readingNum * tcf).toFixed(2);
};

// Helper function to calculate DA/PI ratio
const calculateDAPRatio = (numeratorStr: string, denominatorStr: string): string => {
   if (typeof numeratorStr === 'string' && (numeratorStr.includes('>') || numeratorStr.includes('<'))) return '';
   if (typeof denominatorStr === 'string' && (denominatorStr.includes('>') || denominatorStr.includes('<'))) return '';
   const numerator = parseFloat(numeratorStr);
   const denominator = parseFloat(denominatorStr);
   if (isNaN(numerator) || isNaN(denominator) || !isFinite(numerator) || !isFinite(denominator) || denominator === 0) return '';
   return (numerator / denominator).toFixed(2);
};

// Helper function to calculate TCF
const calculateTCF = (celsius: number): number => {
  // Find exact match first
  const exactMatch = tcfTable.find(([temp]) => temp === celsius);
  if (exactMatch) return exactMatch[1];

  // If no exact match, find closest temperature value
  const closestTemp = tcfTable.reduce((prev, curr) => {
    return Math.abs(curr[0] - celsius) < Math.abs(prev[0] - celsius) ? curr : prev;
  });

  return closestTemp[1];
};

const visualInspectionItemsConfig = [
  { id: '7.2.1.2.A.1', description: "Inspect physical and mechanical condition." },
  { id: '7.2.1.2.A.2', description: "Inspect anchorage, alignment, and grounding." },
  { id: '7.2.1.2.A.3*', description: "Prior to cleaning the unit, perform as-found tests." },
  { id: '7.2.1.2.A.4', description: "Clean the unit." },
  { id: '7.2.1.2.A.5*', description: "Verify that control and alarm settings on temperature indicators are as specified." },
  { id: '7.2.1.2.A.6', description: "Verify that cooling fans operate correctly." },
  { id: '7.2.1.2.A.7', description: "Inspect bolted electrical connections for high resistance using a low-resistance ohmmeter." },
  { id: '7.2.1.2.A.8', description: "Perform specific inspections and mechanical tests as recommended by the manufacturer." },
  { id: '7.2.1.2.A.9', description: "Perform as-left tests." },
  { id: '7.2.1.2.A.10', description: "Verify that as-left tap connections are as specified." },
  { id: '7.2.1.2.A.11', description: "Verify the presence of surge arresters." },
];


const LargeDryTypeXfmrMTSReport: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [error, setError] = useState<string | null>(null); // Error state

  const [formData, setFormData] = useState<FormData>(() => {
    const initialVisualInspection: { [key: string]: string } = {};
    visualInspectionItemsConfig.forEach(item => {
      initialVisualInspection[`${item.id}_result`] = 'Select One'; // Default for dropdown
      initialVisualInspection[`${item.id}_comment`] = '';       // Default for comment
    });

    return {
      customer: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      technicians: '',
      jobNumber: '',
      substation: '',
      eqptLocation: '',
      identifier: '',
      userName: user?.email || '',
      temperature: {
        ambient: 68, 
        celsius: 20,
        fahrenheit: 68,
        correctionFactor: 1, 
        humidity: 50, 
      },
      nameplateData: {
        manufacturer: '', catalogNumber: '', serialNumber: '', kva: '', tempRise: '', impedance: '',
        primary: { volts: '', voltsSecondary: '', connection: '', material: '' },
        secondary: { volts: '', voltsSecondary: '', connection: '', material: '' },
        tapConfiguration: {
          positions: Array.from({ length: 7 }, (_, i) => i + 1), // Default 7 positions
          voltages: Array(7).fill(''),
          currentPosition: 1, // Default to position 1
          currentPositionSecondary: '',
          tapVoltsSpecific: '',
          tapPercentSpecific: '',
        },
      },
      visualInspection: initialVisualInspection,
      insulationResistance: {
        temperature: '20', // Default to 20C
        primaryToGround: { testVoltage: '1000V', unit: 'GΩ', readings: { halfMinute: '', oneMinute: '', tenMinute: '' }, corrected: { halfMinute: '', oneMinute: '', tenMinute: '' }, dielectricAbsorption: '', polarizationIndex: '' },
        secondaryToGround: { testVoltage: '1000V', unit: 'GΩ', readings: { halfMinute: '', oneMinute: '', tenMinute: '' }, corrected: { halfMinute: '', oneMinute: '', tenMinute: '' }, dielectricAbsorption: '', polarizationIndex: '' },
        primaryToSecondary: { testVoltage: '1000V', unit: 'GΩ', readings: { halfMinute: '', oneMinute: '', tenMinute: '' }, corrected: { halfMinute: '', oneMinute: '', tenMinute: '' }, dielectricAbsorption: '', polarizationIndex: '' },
        dielectricAbsorptionAcceptable: 'N/A',
        polarizationIndexAcceptable: 'N/A',
      },
      testEquipment: {
        megohmmeter: { name: '', serialNumber: '', ampId: '' },
      },
      comments: '',
      status: 'PASS',
    };
  });
  const getVisualInspectionDescription = (id: string): string => {
    const item = visualInspectionItemsConfig.find(item => item.id === id);
    return item ? item.description : 'Unknown Inspection Item';
  };
  const handleTemperatureChange = (fahrenheit: number) => {
    const celsius = parseFloat(((fahrenheit - 32) * 5 / 9).toFixed(1));
    const roundedCelsius = Math.round(celsius); // Round to nearest integer for TCF lookup
    const correctionFactor = calculateTCF(roundedCelsius);
    
    setFormData(prev => ({
      ...prev,
      temperature: { 
        ...prev.temperature, 
        fahrenheit, 
        celsius, 
        correctionFactor 
      }
    }));
  };

   const handleChange = (section: keyof FormData | null, field: string, value: any) => {
    setFormData(prev => {
      if (section) {
        return { ...prev, [section]: { ...(prev[section] as any), [field]: value } };
      }
      return { ...prev, [field]: value };
    });
  };

   const handleNestedChange = (section: keyof FormData, subsection: string, value: any) => {
       setFormData(prev => ({
           ...prev,
           [section]: { ...(prev[section] as any), [subsection]: value }
       }));
   };

   const handleDeepNestedChange = (section: keyof FormData, subsection: string, nestedSection: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [subsection]: {
          ...((prev[section] as any)[subsection] as any),
          [nestedSection]: { ...((prev[section]as any)[subsection][nestedSection] as any), [field]:value}
        }
      }
    }));
  };

    const handleVisualInspectionChange = (id: string, type: 'result' | 'comment', value: string) => {
    setFormData(prev => ({
      ...prev,
      visualInspection: {
        ...prev.visualInspection,
        [`${id}_${type}`]: value,
      }
    }));
  };

      const updateCalculatedValues = (testId: keyof FormData['insulationResistance']) => {
         if (testId === "temperature" || testId === "dielectricAbsorptionAcceptable" || testId === "polarizationIndexAcceptable" ) return;
        setFormData(prev => {
            const testData = prev.insulationResistance[testId] as typeof prev.insulationResistance.primaryToGround; // Type assertion
            if (!testData || !testData.readings) return prev; // Guard against undefined

            const tcf = prev.temperature.correctionFactor;
            const correctedHalfMinute = calculateCorrectedValue(testData.readings.halfMinute, tcf);
            const correctedOneMinute = calculateCorrectedValue(testData.readings.oneMinute, tcf);
            const correctedTenMinute = calculateCorrectedValue(testData.readings.tenMinute, tcf);
            const dielectricAbsorption = calculateDAPRatio(correctedOneMinute, correctedHalfMinute);
            const polarizationIndex = calculateDAPRatio(correctedTenMinute, correctedOneMinute);

            return {
                ...prev,
                insulationResistance: {
                    ...prev.insulationResistance,
                    [testId]: {
                        ...testData,
                        corrected: {
                            halfMinute: correctedHalfMinute,
                            oneMinute: correctedOneMinute,
                            tenMinute: correctedTenMinute,
                        },
                        dielectricAbsorption,
                        polarizationIndex,
                    }
                }
            };
        });
    };


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
      if (jobData) {
        setFormData(prev => ({
          ...prev,
          jobNumber: jobData.job_number || '',
          customer: jobData.customer_id || '', // Will be replaced by customer name
        }));

        if (jobData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('name, company_name, address')
            .eq('id', jobData.customer_id)
            .single();

          if (customerError) throw customerError;
          if (customerData) {
            setFormData(prev => ({
              ...prev,
              customer: customerData.company_name || customerData.name || '',
              address: customerData.address || '',
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error loading job info:", err);
      const supabaseErr = err as SupabaseError;
      setError(`Failed to load job info: ${supabaseErr.message}`);
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
      const { data, error: fetchError } = await supabase
        .schema('neta_ops')
        .from(LARGE_DRY_TYPE_XFMR_MTS_TABLE)
        .select('*')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;
      if (data && data.report_data) {
        // Deep merge existing visualInspection data with config to ensure all items are present
        const loadedVisualInspection = data.report_data.visualInspection || {};
        const initialVisualInspectionState: { [key: string]: string } = {};
        visualInspectionItemsConfig.forEach(item => {
          initialVisualInspectionState[`${item.id}_result`] = loadedVisualInspection[`${item.id}_result`] || 'Select One';
          initialVisualInspectionState[`${item.id}_comment`] = loadedVisualInspection[`${item.id}_comment`] || '';
        });
        
        setFormData(prev => ({
          ...prev,
          ...data.report_data,
          visualInspection: initialVisualInspectionState,
          userName: data.user_name || user?.email || '',
          status: data.report_data.status || 'PASS',
          // Ensure temperature object and its fields are correctly populated
          temperature: {
            ...prev.temperature,
            ...(data.report_data.temperature || {}),
            // Recalculate celsius and correctionFactor if fahrenheit is present
            ...(data.report_data.temperature?.fahrenheit !== undefined && {
              celsius: parseFloat(((data.report_data.temperature.fahrenheit - 32) * 5 / 9).toFixed(1)),
              correctionFactor: calculateTCF(Math.round(parseFloat(((data.report_data.temperature.fahrenheit - 32) * 5 / 9).toFixed(1))))
            })
          },
          // Ensure all nested objects are properly populated
          nameplateData: {
            ...prev.nameplateData,
            ...(data.report_data.nameplateData || {})
          },
          insulationResistance: {
            ...prev.insulationResistance,
            ...(data.report_data.insulationResistance || {})
          },
          testEquipment: {
            ...prev.testEquipment,
            ...(data.report_data.testEquipment || {})
          }
        }));
        setStatus(data.report_data.status || 'PASS');
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error loading report:", err);
      const supabaseErr = err as SupabaseError;
      setError(`Failed to load report: ${supabaseErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save report
  const handleSave = async () => {
      if (!jobId || !user?.id || !isEditing) {
          console.warn("Save condition not met:", { jobId, userId: user?.id, isEditing });
          return;
      }

       const reportData = {
           job_id: jobId,
           user_id: user.id,
           report_data: {
               customer: formData.customer,
               address: formData.address,
               date: formData.date,
               technicians: formData.technicians,
               jobNumber: formData.jobNumber,
               substation: formData.substation,
               eqptLocation: formData.eqptLocation,
               identifier: formData.identifier,
               userName: formData.userName,
               temperature: formData.temperature,
               nameplateData: formData.nameplateData,
               status: formData.status,
               visualInspection: formData.visualInspection,
               insulationResistance: formData.insulationResistance,
               testEquipment: formData.testEquipment,
               comments: formData.comments,
               isLargeType: true,
               isMTS: true,
               reportType: 'large_dry_type_xfmr_mts'
           }
       };

       console.log('Saving report data:', reportData);

       try {
           setLoading(true);
           let result;
           let currentReportId = reportId;

           if (currentReportId) {
               // Update existing report
               result = await supabase
                   .schema('neta_ops')
                   .from('large_dry_type_xfmr_mts_reports')
                   .update(reportData)
                   .eq('id', currentReportId)
                   .select()
                   .single();
           } else {
               // Create new report
               result = await supabase
                   .schema('neta_ops')
                   .from('large_dry_type_xfmr_mts_reports')
                   .insert(reportData)
                   .select()
                   .single();

               if (result.data?.id) {
                   currentReportId = result.data.id;
                   console.log(`New report created with ID: ${currentReportId}`);

                   // Create corresponding asset entry
                   const assetName = `Large Dry Type Transformer MTS - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`;
                   const assetUrl = `report:/jobs/${jobId}/large-dry-type-xfmr-mts-report/${currentReportId}?returnToAssets=true`;

                   const assetData = {
                       name: assetName,
                       file_url: assetUrl,
                       user_id: user.id,
                       template_type: 'large_dry_type_xfmr_mts'
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
               }
           }

           if (result.error) throw result.error;

           setIsEditing(false);
           alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
           navigateAfterSave(navigate, jobId, location);

       } catch (error) {
           const err = error as SupabaseError;
           console.error('Error saving report:', err);
           alert(`Failed to save report: ${err.message}`);
       } finally {
           setLoading(false);
       }
   };

  useEffect(() => { const fetchData = async () => { await loadJobInfo(); await loadReport(); }; fetchData(); }, [jobId, reportId]);
  
  // Effect to re-calculate corrected values when temperature or readings change
   useEffect(() => {
    const tcf = formData.temperature.correctionFactor;
    const updateCalculatedValues = (testId: keyof FormData['insulationResistance']) => {
      if (testId === "temperature" || testId === "dielectricAbsorptionAcceptable" || testId === "polarizationIndexAcceptable") return;
      
      setFormData(prev => {
        const testData = prev.insulationResistance[testId] as typeof prev.insulationResistance.primaryToGround;
        if (!testData || !testData.readings) return prev;

        const correctedHalfMinute = calculateCorrectedValue(testData.readings.halfMinute, tcf);
        const correctedOneMinute = calculateCorrectedValue(testData.readings.oneMinute, tcf);
        const correctedTenMinute = calculateCorrectedValue(testData.readings.tenMinute, tcf);
        
        // Use corrected values for DA/PI calculations as per NETA standard
        const dielectricAbsorption = calculateDAPRatio(correctedOneMinute, correctedHalfMinute);
        const polarizationIndex = calculateDAPRatio(correctedTenMinute, correctedOneMinute);

        // Calculate Acceptable values
        const daValues = [
          prev.insulationResistance.primaryToGround?.dielectricAbsorption,
          prev.insulationResistance.secondaryToGround?.dielectricAbsorption,
          prev.insulationResistance.primaryToSecondary?.dielectricAbsorption
        ].map(v => parseFloat(v));
        const daAcceptable = daValues.some(v => !isNaN(v)) && daValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';

        const piValues = [
          prev.insulationResistance.primaryToGround?.polarizationIndex,
          prev.insulationResistance.secondaryToGround?.polarizationIndex,
          prev.insulationResistance.primaryToSecondary?.polarizationIndex
        ].map(v => parseFloat(v));
        const piAcceptable = piValues.some(v => !isNaN(v)) && piValues.every(v => isNaN(v) || v > 1.0) ? 'Yes' : 'No';

        return {
          ...prev,
          insulationResistance: {
            ...prev.insulationResistance,
            [testId]: {
              ...testData,
              corrected: {
                halfMinute: correctedHalfMinute,
                oneMinute: correctedOneMinute,
                tenMinute: correctedTenMinute,
              },
              dielectricAbsorption,
              polarizationIndex,
            },
            dielectricAbsorptionAcceptable: daAcceptable,
            polarizationIndexAcceptable: piAcceptable
          }
        };
      });
    };

    if (formData.insulationResistance) {
      updateCalculatedValues('primaryToGround');
      updateCalculatedValues('secondaryToGround');
      updateCalculatedValues('primaryToSecondary');
    }
  }, [formData.insulationResistance?.primaryToGround?.readings, formData.insulationResistance?.secondaryToGround?.readings, formData.insulationResistance?.primaryToSecondary?.readings, formData.temperature.correctionFactor]);


  const renderHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        2-Large Dry Type Xfmr. Visual, Mechanical, Insulation Resistance Test MTS
      </h1>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => { if (isEditing) setStatus(status === 'PASS' ? 'FAIL' : 'PASS'); }}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors
                        ${status === 'PASS' ? 'bg-green-600' : 'bg-red-600'}
                        ${isEditing ? (status === 'PASS' ? 'hover:bg-green-700' : 'hover:bg-red-700') : 'opacity-70 cursor-not-allowed'}`}
          disabled={!isEditing}
        >
          {status}
        </button>
        {reportId && !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Edit Report
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={loading || !isEditing}
            className="bg-[#f26722] hover:bg-[#e55611] text-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (reportId ? 'Update Report' : 'Save Report')}
          </button>
        )}
      </div>
    </div>
  );

  if (loading && !reportId) return <div className="p-6 text-center">Loading job information...</div>;
  if (loading && reportId) return <div className="p-6 text-center">Loading report data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;


  return (
    <div className="p-6 flex justify-center report-container dark:bg-dark-200">
      <div className="max-w-7xl w-full space-y-6">
        {renderHeader()}

        {/* Job Information Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
                <input type="text" value={formData.customer} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input type="text" value={formData.address} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                <input type="text" value={formData.userName} onChange={(e) => handleChange(null, 'userName', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder="Enter User Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
                <input type="text" value={formData.identifier} onChange={(e) => handleChange(null, 'identifier', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} placeholder="Transformer ID / Name" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. °F</label>
                  <input type="number" value={formData.temperature.fahrenheit} onChange={(e) => handleTemperatureChange(Number(e.target.value))} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">°C</label>
                  <input type="number" value={formData.temperature.celsius} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TCF</label>
                  <input type="number" value={formData.temperature.correctionFactor} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white cursor-not-allowed" />
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job #</label>
                <input type="text" value={formData.jobNumber} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label>
                <input type="text" value={formData.technicians} onChange={(e) => handleChange(null, 'technicians', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <input type="date" value={formData.date} onChange={(e) => handleChange(null, 'date', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
                <input type="text" value={formData.substation} onChange={(e) => handleChange(null, 'substation', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eqpt. Location</label>
                <input type="text" value={formData.eqptLocation} onChange={(e) => handleChange(null, 'eqptLocation', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Humidity %</label>
                <input type="number" value={formData.temperature.humidity || ''} onChange={(e) => handleChange('temperature', 'humidity', Number(e.target.value))} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Nameplate Data Section */}
        <section className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Nameplate Data</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
              <input type="text" value={formData.nameplateData.manufacturer} onChange={(e) => handleNestedChange('nameplateData', 'manufacturer', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Number</label>
              <input type="text" value={formData.nameplateData.catalogNumber} onChange={(e) => handleNestedChange('nameplateData', 'catalogNumber', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input type="text" value={formData.nameplateData.serialNumber} onChange={(e) => handleNestedChange('nameplateData', 'serialNumber', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">KVA</label>
              <input type="text" value={formData.nameplateData.kva} onChange={(e) => handleNestedChange('nameplateData', 'kva', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temp. Rise (°C)</label>
              <input type="text" value={formData.nameplateData.tempRise} onChange={(e) => handleNestedChange('nameplateData', 'tempRise', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Impedance (%)</label>
              <input type="text" value={formData.nameplateData.impedance} onChange={(e) => handleNestedChange('nameplateData', 'impedance', e.target.value)} readOnly={!isEditing} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center font-medium text-gray-700 dark:text-gray-300">Volts</div>
            <div className="text-center font-medium text-gray-700 dark:text-gray-300">Connections</div>
            <div className="text-center font-medium text-gray-700 dark:text-gray-300">Winding Material</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-2 items-center">
            <div className="flex items-center">
              <div className="w-20 font-medium text-gray-700 dark:text-gray-300">Primary</div>
              <div className="flex-1 flex items-center space-x-2">
                <input type="text" value={formData.nameplateData.primary.volts} onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, volts: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
                <span>/</span>
                <input type="text" value={formData.nameplateData.primary.voltsSecondary || ''} onChange={(e) => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, voltsSecondary: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
            </div>
            <div className="flex justify-around">
              <label className="inline-flex items-center">
                <input type="radio" name="primary-connection" value="Delta" checked={formData.nameplateData.primary.connection === 'Delta'} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, connection: 'Delta' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Delta</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="primary-connection" value="Wye" checked={formData.nameplateData.primary.connection === 'Wye'} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, connection: 'Wye' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Wye</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="primary-connection" value="Single Phase" checked={formData.nameplateData.primary.connection === 'Single Phase'} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, connection: 'Single Phase' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Single Phase</span>
              </label>
            </div>
            <div className="flex justify-around">
              <label className="inline-flex items-center">
                <input type="radio" name="primary-material" value="Aluminum" checked={formData.nameplateData.primary.material === 'Aluminum'} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, material: 'Aluminum' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Aluminum</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="primary-material" value="Copper" checked={formData.nameplateData.primary.material === 'Copper'} onChange={() => handleNestedChange('nameplateData', 'primary', { ...formData.nameplateData.primary, material: 'Copper' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Copper</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6 items-center">
            <div className="flex items-center">
              <div className="w-20 font-medium text-gray-700 dark:text-gray-300">Secondary</div>
              <div className="flex-1 flex items-center space-x-2">
                <input type="text" value={formData.nameplateData.secondary.volts} onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, volts: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
                <span>/</span>
                <input type="text" value={formData.nameplateData.secondary.voltsSecondary || ''} onChange={(e) => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, voltsSecondary: e.target.value })} readOnly={!isEditing} className={`w-24 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} />
              </div>
            </div>
            <div className="flex justify-around">
              <label className="inline-flex items-center">
                <input type="radio" name="secondary-connection" value="Delta" checked={formData.nameplateData.secondary.connection === 'Delta'} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, connection: 'Delta' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Delta</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="secondary-connection" value="Wye" checked={formData.nameplateData.secondary.connection === 'Wye'} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, connection: 'Wye' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Wye</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="secondary-connection" value="Single Phase" checked={formData.nameplateData.secondary.connection === 'Single Phase'} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, connection: 'Single Phase' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Single Phase</span>
              </label>
            </div>
            <div className="flex justify-around">
              <label className="inline-flex items-center">
                <input type="radio" name="secondary-material" value="Aluminum" checked={formData.nameplateData.secondary.material === 'Aluminum'} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, material: 'Aluminum' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Aluminum</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="secondary-material" value="Copper" checked={formData.nameplateData.secondary.material === 'Copper'} onChange={() => handleNestedChange('nameplateData', 'secondary', { ...formData.nameplateData.secondary, material: 'Copper' })} disabled={!isEditing} className="form-radio h-4 w-4 text-[#f26722] border-gray-300 dark:border-gray-700 focus:ring-[#f26722]" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Copper</span>
              </label>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white border-t dark:border-gray-700 pt-4">Tap Configuration</h3>
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tap Voltages</div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {formData.nameplateData.tapConfiguration.positions.map((position, index) => (
                <div key={`tap-pos-${position}`} className="text-center">{position}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {formData.nameplateData.tapConfiguration.voltages.map((voltage, index) => (
                <input
                  key={`tap-volt-${index}`}
                  type="text"
                  value={voltage}
                  onChange={(e) => {
                    const newVoltages = [...formData.nameplateData.tapConfiguration.voltages];
                    newVoltages[index] = e.target.value;
                    handleNestedChange('nameplateData', 'tapConfiguration', {
                      ...formData.nameplateData.tapConfiguration,
                      voltages: newVoltages
                    });
                  }}
                  readOnly={!isEditing}
                  className={`w-full text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="flex items-center">
              <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Tap Position Left</div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.nameplateData.tapConfiguration.currentPosition}
                  onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', {
                    ...formData.nameplateData.tapConfiguration,
                    currentPosition: parseInt(e.target.value) || 1
                  })}
                  min="1"
                  max="7"
                  readOnly={!isEditing}
                  className={`w-12 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
                <span>/</span>
                <input
                  type="text"
                  value={formData.nameplateData.tapConfiguration.currentPositionSecondary || ''}
                  onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', {
                    ...formData.nameplateData.tapConfiguration,
                    currentPositionSecondary: e.target.value
                  })}
                  readOnly={!isEditing}
                  className={`w-12 text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volts</div>
                <input
                  type="text"
                  value={formData.nameplateData.tapConfiguration.tapVoltsSpecific || ''}
                  onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', {
                    ...formData.nameplateData.tapConfiguration,
                    tapVoltsSpecific: e.target.value
                  })}
                  readOnly={!isEditing}
                  className={`w-full text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Percent</div>
                <input
                  type="text"
                  value={formData.nameplateData.tapConfiguration.tapPercentSpecific || ''}
                  onChange={(e) => handleNestedChange('nameplateData', 'tapConfiguration', {
                    ...formData.nameplateData.tapConfiguration,
                    tapPercentSpecific: e.target.value
                  })}
                  readOnly={!isEditing}
                  className={`w-full text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            </div>
          </div>
        </section>


        {/* Visual and Mechanical Inspection */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NETA SECTION</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DESCRIPTION</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">RESULTS</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {visualInspectionItemsConfig.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{item.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.description}</td>
                    <td className="px-4 py-2">
                      <select
                        value={formData.visualInspection[`${item.id}_result`] || 'Select One'}
                        onChange={(e) => handleVisualInspectionChange(item.id, 'result', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full text-sm rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                      >
                        {visualInspectionOptions.map(option => (
                          <option key={option} value={option} className="dark:bg-dark-100 dark:text-white">{option}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Electrical Tests - Insulation Resistance */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
            Electrical Tests - Insulation Resistance
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Insulation Resistance Values */}
            <div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <div className="bg-gray-50 dark:bg-dark-200 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-center text-sm font-medium text-gray-700 dark:text-white">Insulation Resistance Values</div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Test</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">kV</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">0.5 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">1 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">10 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Primary to Ground */}
                    <tr>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">Primary to Ground</td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.primaryToGround.testVoltage}
                          onChange={(e) => handleNestedChange('insulationResistance', 'primaryToGround', { ...formData.insulationResistance.primaryToGround, testVoltage: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {testVoltageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToGround.readings.halfMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToGround', 'readings', 'halfMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToGround.readings.oneMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToGround', 'readings', 'oneMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToGround.readings.tenMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToGround', 'readings', 'tenMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.primaryToGround.unit}
                          onChange={(e) => handleNestedChange('insulationResistance', 'primaryToGround', { ...formData.insulationResistance.primaryToGround, unit: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {insulationResistanceUnits.map(u => <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>)}
                        </select>
                      </td>
                    </tr>
                    {/* Secondary to Ground */}
                    <tr>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">Secondary to Ground</td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.secondaryToGround.testVoltage}
                          onChange={(e) => handleNestedChange('insulationResistance', 'secondaryToGround', { ...formData.insulationResistance.secondaryToGround, testVoltage: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {testVoltageOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.secondaryToGround.readings.halfMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'secondaryToGround', 'readings', 'halfMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.secondaryToGround.readings.oneMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'secondaryToGround', 'readings', 'oneMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.secondaryToGround.readings.tenMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'secondaryToGround', 'readings', 'tenMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.secondaryToGround.unit}
                          onChange={(e) => handleNestedChange('insulationResistance', 'secondaryToGround', { ...formData.insulationResistance.secondaryToGround, unit: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {insulationResistanceUnits.map(unit => (
                            <option key={unit.symbol} value={unit.symbol}>{unit.symbol}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {/* Primary to Secondary */}
                    <tr>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">Primary to Secondary</td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.primaryToSecondary.testVoltage}
                          onChange={(e) => handleNestedChange('insulationResistance', 'primaryToSecondary', { ...formData.insulationResistance.primaryToSecondary, testVoltage: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                        >
                          {testVoltageOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToSecondary.readings.halfMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToSecondary', 'readings', 'halfMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToSecondary.readings.oneMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToSecondary', 'readings', 'oneMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <input 
                          type="text" 
                          value={formData.insulationResistance.primaryToSecondary.readings.tenMinute} 
                          onChange={(e) => handleDeepNestedChange('insulationResistance', 'primaryToSecondary', 'readings', 'tenMinute', e.target.value)} 
                          readOnly={!isEditing} 
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`} 
                        />
                      </td>
                      <td className="px-1 py-2">
                        <select
                          value={formData.insulationResistance.primaryToSecondary.unit}
                          onChange={(e) => handleNestedChange('insulationResistance', 'primaryToSecondary', { ...formData.insulationResistance.primaryToSecondary, unit: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
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
            <div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <div className="bg-gray-50 dark:bg-dark-200 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-center text-sm font-medium text-gray-700 dark:text-white">Temperature Corrected Values</div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-200">
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">0.5 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">1 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">10 Min.</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Primary to Ground */}
                    <tr>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToGround.corrected.halfMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToGround.corrected.oneMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToGround.corrected.tenMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToGround.unit} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                    </tr>
                    {/* Secondary to Ground */}
                    <tr>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.secondaryToGround.corrected.halfMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.secondaryToGround.corrected.oneMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.secondaryToGround.corrected.tenMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.secondaryToGround.unit} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                    </tr>
                    {/* Primary to Secondary */}
                    <tr>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToSecondary.corrected.halfMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToSecondary.corrected.oneMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToSecondary.corrected.tenMinute} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-1 py-2">
                        <input type="text" value={formData.insulationResistance.primaryToSecondary.unit} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Calculated Values */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Calculated Values</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Primary</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Secondary</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Pri-Sec</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300">Acceptable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    <div>Dielectric Absorption</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">(Ratio of 1 Min. to 0.5 Minute Result)</div>
                  </td>
                  <td className="px-1 py-2">
                    <input type="text" value={formData.insulationResistance.primaryToGround.dielectricAbsorption} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="text" value={formData.insulationResistance.secondaryToGround.dielectricAbsorption} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="text" value={formData.insulationResistance.primaryToSecondary.dielectricAbsorption} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistance.dielectricAbsorptionAcceptable}
                      readOnly
                      className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm ${
                        formData.insulationResistance.dielectricAbsorptionAcceptable === 'Yes'
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : formData.insulationResistance.dielectricAbsorptionAcceptable === 'No'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-2 text-sm text-gray-900 dark:text-white border-r dark:border-gray-700">
                    Polarization Index
                    <div className="text-xs text-gray-500 dark:text-gray-400">(Ratio of 10 Min. to 1 Min. Result)</div>
                  </td>
                  <td className="px-1 py-2 border-r dark:border-gray-700">
                    <input type="text" value={formData.insulationResistance.primaryToGround.polarizationIndex} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2 border-r dark:border-gray-700">
                    <input type="text" value={formData.insulationResistance.secondaryToGround.polarizationIndex} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2 border-r dark:border-gray-700">
                    <input type="text" value={formData.insulationResistance.primaryToSecondary.polarizationIndex} readOnly className="w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm text-gray-900 dark:text-white" />
                  </td>
                  <td className="px-1 py-2">
                    <input
                      type="text"
                      value={formData.insulationResistance.polarizationIndexAcceptable}
                      readOnly
                      className={`w-full text-sm text-center rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm ${
                        formData.insulationResistance.polarizationIndexAcceptable === 'Yes'
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : formData.insulationResistance.polarizationIndexAcceptable === 'No'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Equipment Section */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Megohmmeter</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.name}
                onChange={(e) => handleDeepNestedChange('testEquipment', 'megohmmeter', 'name', '', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter megohmmeter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.serialNumber}
                onChange={(e) => handleDeepNestedChange('testEquipment', 'megohmmeter', 'serialNumber', '', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter serial number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AMP ID</label>
              <input
                type="text"
                value={formData.testEquipment.megohmmeter.ampId}
                onChange={(e) => handleDeepNestedChange('testEquipment', 'megohmmeter', 'ampId', '', e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                placeholder="Enter AMP ID"
              />
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
          <div>
            <textarea
              value={formData.comments}
              onChange={(e) => handleChange(null, 'comments', e.target.value)}
              readOnly={!isEditing}
              rows={4}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-[#f26722] focus:ring-[#f26722] dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              placeholder="Enter any additional comments or observations"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LargeDryTypeXfmrMTSReport;

// Helper styles (can be moved to a global CSS or Tailwind config)
// .form-label { @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1; }
// .form-input, .form-select, .form-textarea {
//   @apply mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
//   focus:outline-none focus:ring-[#f26722] focus:border-[#f26722]
//   bg-white dark:bg-dark-100 text-gray-900 dark:text-white;
// }
// .form-input[readonly], .form-select[disabled], .form-textarea[readonly] {
//   @apply bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-gray-400 cursor-not-allowed;
// }
// .table-header { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-dark-200; }
// .table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white; }
