import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';

interface FormData {
  // General Info
  customer: string;
  address: string;
  date: string;
  inspector: string;
  description: string;
  userName: string;
  jobNumber: string;
  technicians: string;
  substation: string;
  eqptLocation: string;
  identifier: string;
  
  // Temperature Data
  temperature: {
    celsius: number;
    fahrenheit: number;
    humidity: number;
    tcf: number;
  };
  
  // Enclosure Data
  manufacturer: string;
  catalogNo: string;
  systemVoltage: string;
  serialNumber: string;
  ratedVoltage: string;
  type: string;
  ratedCurrent: string;
  acRating: string;
  series: string;
  phaseConfiguration: string;
  
  // Switch Data
  switchData: SwitchData[];
  
  // Fuse Data
  fuseData: FuseData[];
  
  // Visual and Mechanical Inspection
  visualInspection: {
    items: Array<{
      identifier: string;
      values: { [key: string]: string };
    }>;
    satisfactory: { [key: string]: string };
  };
  
  // Electrical Tests - Measured Insulation Resistance
  insulationResistance: Array<{
    positionIdentifier: string;
    polesPhaseValues: { [key: string]: string };
    polesGroundValues: { [key: string]: string };
    lineLoadValues: { [key: string]: string };
    unit: string;
    testVoltage: string;
  }>;
  
  // Electrical Tests - Temperature Corrected Insulation
  tempCorrectedInsulation: Array<{
    positionIdentifier: string;
    polesPhaseValues: { [key: string]: string };
    polesGroundValues: { [key: string]: string };
    lineLoadValues: { [key: string]: string };
    unit: string;
    testVoltage: string;
  }>;
  
  // Electrical Tests - Contact Resistance
  contactResistance: ContactResistanceItem[];
  
  // Test Equipment
  testEquipment: {
    megaohmmeter: {
      model: string;
      serialNumber: string;
      ampId: string;
    };
    lowResistance: {
      model: string;
      serialNumber: string;
      ampId: string;
    };
  };
  
  // Comments
  comments: string;
  
  // Meta Reference
  metaReference: Array<{
    section: string;
    description: string;
  }>;
  
  // Test Result
  testResult: string;
  
  // New fields
  status: string;
  insulationTestVoltage: string;
}

interface SwitchData {
  positionIdentifier: string;
  manufacturer: string;
  catalogNo: string;
  serialNo: string;
  type: string;
  ratedAmp: string;
  ratedVoltage: string;
}

interface FuseData {
  positionIdentifier: string;
  manufacturer: string;
  catalogNo: string;
  class: string;
  ampRating: string;
  aic: string;
  voltage: string;
}

// Add interface for contact resistance at the top with other interfaces
interface ContactResistanceItem {
  positionIdentifier: string;
  switchValues: Record<string, string>;
  fuseValues: Record<string, string>;
  switchFuseValues: Record<string, string>;
  unit: string;
}

// Constants for dropdown options
const VISUAL_INSPECTION_OPTIONS = ['Y', 'N', 'N/A'];

const INSULATION_RESISTANCE_UNITS = ['kΩ', 'MΩ', 'GΩ'];

const INSULATION_TEST_VOLTAGES = ['250V', '500V', '1000V', '2500V', '5000V'];

const CONTACT_RESISTANCE_UNITS = ['μΩ', 'mΩ', 'Ω'];

const EQUIPMENT_EVALUATION_RESULTS = ['PASS', 'FAIL', 'LIMITED SERVICE'];

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

const LowVoltageSwitchMultiDeviceTest: React.FC = () => {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(!reportId);
  const [formData, setFormData] = useState<FormData>({
    // General Info
    customer: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    inspector: '',
    description: '',
    userName: user?.email || '',
    jobNumber: '',
    technicians: '',
    substation: '',
    eqptLocation: '',
    identifier: '',
    
    // Temperature Data
    temperature: {
      celsius: 20,
      fahrenheit: 68,
      humidity: 0,
      tcf: 1
    },
    
    // Enclosure Data
    manufacturer: '',
    catalogNo: '',
    systemVoltage: '',
    serialNumber: '',
    ratedVoltage: '',
    type: '',
    ratedCurrent: '',
    acRating: '',
    series: '',
    phaseConfiguration: '',
    
    // Switch Data
    switchData: [{
      positionIdentifier: '',
      manufacturer: '',
      catalogNo: '',
      serialNo: '',
      type: '',
      ratedAmp: '',
      ratedVoltage: ''
    }],
    
    // Fuse Data
    fuseData: [{
      positionIdentifier: '',
      manufacturer: '',
      catalogNo: '',
      class: '',
      ampRating: '',
      aic: '',
      voltage: ''
    }],
    
    // Visual Inspection
    visualInspection: {
      items: Array(12).fill({
        identifier: '',
        values: {}
      }),
      satisfactory: {
        YES: '',
        NO: '',
        NA: ''
      }
    },
    
    // Insulation Resistance
    insulationResistance: [{
      positionIdentifier: '',
      polesPhaseValues: { 'P1-P2': '', 'P2-P3': '', 'P3-P1': '' },
      polesGroundValues: { 'P1-G': '', 'P2-G': '', 'P3-G': '' },
      lineLoadValues: { 'P1': '', 'P2': '', 'P3': '' },
      unit: 'MΩ',
      testVoltage: '1000V'
    }],
    
    // Temperature Corrected Insulation
    tempCorrectedInsulation: [{
      positionIdentifier: '',
      polesPhaseValues: { 'P1-P2': '', 'P2-P3': '', 'P3-P1': '' },
      polesGroundValues: { 'P1-G': '', 'P2-G': '', 'P3-G': '' },
      lineLoadValues: { 'P1': '', 'P2': '', 'P3': '' },
      unit: 'MΩ',
      testVoltage: '1000V'
    }],
    
    // Contact Resistance
    contactResistance: [{
      positionIdentifier: '',
      switchValues: { 'P1': '', 'P2': '', 'P3': '' },
      fuseValues: { 'P1': '', 'P2': '', 'P3': '' },
      switchFuseValues: { 'P1': '', 'P2': '', 'P3': '' },
      unit: 'μΩ'
    }],
    
    // Test Equipment
    testEquipment: {
      megaohmmeter: {
        model: '',
        serialNumber: '',
        ampId: ''
      },
      lowResistance: {
        model: '',
        serialNumber: '',
        ampId: ''
      }
    },
    
    // Comments
    comments: '',
    
    // Meta Reference
    metaReference: [
      { section: '7.5.1.1.A.1', description: 'Compare equipment data with drawings & specifications' },
      { section: '7.5.1.1.A.2', description: 'Inspect physical & mechanical condition' },
      { section: '7.5.1.1.A.3', description: 'Inspect anchorage, alignment, grounding & required clearances' },
      { section: '7.5.1.1.A.4', description: 'Verify the unit is clean' },
      { section: '7.5.1.1.A.5', description: 'Verify correct blade alignment, blade penetration, travel stops, & mechanical operation' },
      { section: '7.5.1.1.A.6', description: 'Verify fuse sizes & types are in accordance with drawings, short circuit, & coordination study' },
      { section: '7.5.1.1.A.7', description: 'Verify that each fuse has adequate mechanical support & contact integrity' },
      { section: '7.5.1.1.A.8.1', description: 'Inspect bolted electrical connections for resistance utilizing a low resistance ohmmeter' },
      { section: '7.5.1.1.A.9', description: 'Verify operation & sequencing of interlocking systems' },
      { section: '7.5.1.1.A.10', description: 'Verify correct phase barrier installation' },
      { section: '7.5.1.1.A.11', description: 'Verify correct operation of all indicating & control devices' },
      { section: '7.5.1.1.A.12', description: 'Verify appropriate lubrication on moving current carrying parts & on moving and sliding surfaces' }
    ],
    
    // Test Result and Status
    testResult: 'PASS',
    status: 'PASS',
    insulationTestVoltage: '1000V'
  });
  
  // Function to handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, section?: string, index?: number, field?: string, subfield?: string) => {
    const { name, value } = e.target;

    setFormData(prevState => {
      // Handle switch data
      if (section === 'switchData' && typeof index === 'number') {
        const newSwitchData = [...prevState.switchData];
        // Ensure the array has enough elements
        while (newSwitchData.length <= index) {
          newSwitchData.push({
            positionIdentifier: '',
            manufacturer: '',
            catalogNo: '',
            serialNo: '',
            type: '',
            ratedAmp: '',
            ratedVoltage: ''
          });
        }
        newSwitchData[index] = {
          ...newSwitchData[index],
          [field as keyof SwitchData]: value
        };
        return {
          ...prevState,
          switchData: newSwitchData
        };
      }

      // Handle fuse data
      if (section === 'fuseData' && typeof index === 'number') {
        const newFuseData = [...prevState.fuseData];
        // Ensure the array has enough elements
        while (newFuseData.length <= index) {
          newFuseData.push({
            positionIdentifier: '',
            manufacturer: '',
            catalogNo: '',
            class: '',
            ampRating: '',
            aic: '',
            voltage: ''
          });
        }
        newFuseData[index] = {
          ...newFuseData[index],
          [field as keyof FuseData]: value
        };
        return {
          ...prevState,
          fuseData: newFuseData
        };
      }

      // Handle nested section data with subfields
      if (section && typeof index === 'number' && field && subfield) {
        const sectionData = [...(prevState[section as keyof FormData] as any[])];
        // Ensure the array has enough elements
        while (sectionData.length <= index) {
          // Initialize based on section type
          if (section === 'insulationResistance') {
            sectionData.push({
              positionIdentifier: '',
              polesPhaseValues: { 'P1-P2': '', 'P2-P3': '', 'P3-P1': '' },
              polesGroundValues: { 'P1-G': '', 'P2-G': '', 'P3-G': '' },
              lineLoadValues: { 'P1': '', 'P2': '', 'P3': '' },
              unit: 'MΩ',
              testVoltage: ''
            });
          } else if (section === 'contactResistance') {
            sectionData.push({
              positionIdentifier: '',
              switchValues: { 'P1': '', 'P2': '', 'P3': '' },
              fuseValues: { 'P1': '', 'P2': '', 'P3': '' },
              switchFuseValues: { 'P1': '', 'P2': '', 'P3': '' },
              unit: 'μΩ'
            });
          }
        }
        
        sectionData[index] = {
          ...sectionData[index],
          [field]: {
            ...sectionData[index][field],
            [subfield]: value
          }
        };
        return {
          ...prevState,
          [section]: sectionData
        };
      }

      // Handle dot notation for nested objects
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prevState,
          [parent]: {
            ...(prevState[parent as keyof FormData] as any),
            [child]: value
          }
        };
      }

      // Handle simple field updates
      return {
        ...prevState,
        [name]: value
      };
    });
  };

  // Handle temperature changes with TCF calculation
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
    const roundedCelsius = Math.round(celsius);
    const fahrenheit = Math.round((roundedCelsius * 9) / 5 + 32);
    const tcf = getTCF(roundedCelsius);
    
    setFormData(prev => ({
      ...prev,
      temperature: {
        ...prev.temperature,
        celsius: roundedCelsius,
        fahrenheit,
        tcf
      }
    }));
  };
  
  // Function to handle Visual Inspection changes
  const handleVisualInspectionChange = (index: number, field: string, value: string) => {
    setFormData(prevState => {
      const newVisualInspection = {
        ...prevState.visualInspection,
        items: prevState.visualInspection.items.map((item, i) => {
          if (i === index) {
            if (field === 'identifier') {
              return {
                ...item,
                identifier: value
              };
            } else {
              return {
                ...item,
                values: {
                  ...item.values,
                  [field]: value
                }
              };
            }
          }
          return item;
        })
      };
      
      return {
        ...prevState,
        visualInspection: newVisualInspection
      };
    });
  };
  
  // Temperature correction formula for insulation resistance
  const calculateTempCorrectedValue = (insulationValue: string, temperature: number): string => {
    if (!insulationValue || isNaN(parseFloat(insulationValue))) {
      return '';
    }

    const tcf = getTCF(temperature);
    const value = parseFloat(insulationValue);
    return (value * tcf).toFixed(2);
  };

  // Update temperature corrected values when insulation resistance or temperature changes
  useEffect(() => {
    if (!isEditing) return;

    const updatedInsulationResistance = formData.insulationResistance.map(item => {
      const updatedPolesPhaseValues: { [key: string]: string } = {};
      const updatedPolesGroundValues: { [key: string]: string } = {};
      const updatedLineLoadValues: { [key: string]: string } = {};

      // Calculate corrected values for pole-to-pole measurements
      Object.entries(item.polesPhaseValues).forEach(([key, value]) => {
        updatedPolesPhaseValues[key] = calculateTempCorrectedValue(value, formData.temperature.celsius);
      });

      // Calculate corrected values for pole-to-ground measurements
      Object.entries(item.polesGroundValues).forEach(([key, value]) => {
        updatedPolesGroundValues[key] = calculateTempCorrectedValue(value, formData.temperature.celsius);
      });

      // Calculate corrected values for line-to-load measurements
      Object.entries(item.lineLoadValues || {}).forEach(([key, value]) => {
        updatedLineLoadValues[key] = calculateTempCorrectedValue(value, formData.temperature.celsius);
      });

      return {
        ...item,
        polesPhaseValues: updatedPolesPhaseValues,
        polesGroundValues: updatedPolesGroundValues,
        lineLoadValues: updatedLineLoadValues
      };
    });

    setFormData(prev => ({
      ...prev,
      tempCorrectedInsulation: updatedInsulationResistance
    }));
  }, [formData.insulationResistance, formData.temperature.celsius, isEditing]);
  
  // Function to generate PDF or print report
  const generateReport = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    const reportData = {
      job_id: jobId,
      user_id: user.id,
      report_info: {
        // General Info
        customer: formData.customer,
        address: formData.address,
        date: formData.date,
        inspector: formData.inspector,
        description: formData.description,
        userName: formData.userName,
        jobNumber: formData.jobNumber,
        technicians: formData.technicians,
        substation: formData.substation,
        eqptLocation: formData.eqptLocation,
        identifier: formData.identifier,
        
        // Temperature Data
        temperature: formData.temperature,
        
        // Enclosure Data
        manufacturer: formData.manufacturer,
        catalogNo: formData.catalogNo,
        systemVoltage: formData.systemVoltage,
        serialNumber: formData.serialNumber,
        ratedVoltage: formData.ratedVoltage,
        type: formData.type,
        ratedCurrent: formData.ratedCurrent,
        acRating: formData.acRating,
        series: formData.series,
        phaseConfiguration: formData.phaseConfiguration,
        
        // Status
        status: formData.status,
        insulationTestVoltage: formData.insulationTestVoltage
      },
      switch_data: formData.switchData,
      fuse_data: formData.fuseData,
      visual_inspection: formData.visualInspection,
      insulation_resistance: formData.insulationResistance,
      temp_corrected_insulation: formData.tempCorrectedInsulation,
      contact_resistance: formData.contactResistance,
      test_equipment: formData.testEquipment,
      comments: formData.comments,
      meta_reference: formData.metaReference
    };

    try {
      let result;
      if (reportId) {
        // Update existing report
        result = await supabase
          .schema('neta_ops')
          .from('low_voltage_switch_multi_device_reports')
          .update(reportData)
          .eq('id', reportId)
          .select()
          .single();
      } else {
        // Create new report
        result = await supabase
          .schema('neta_ops')
          .from('low_voltage_switch_multi_device_reports')
          .insert(reportData)
          .select()
          .single();

        // Create asset entry if this is a new report
        if (result.data) {
          const assetData = {
            name: `Low Voltage Switch Multi-Device Test - ${formData.identifier || formData.eqptLocation || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/low-voltage-switch-multi-device-test/${result.data.id}`,
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

      console.log('Report saved successfully:', result.data);
      setIsEditing(false);
      alert(`Report ${reportId ? 'updated' : 'saved'} successfully!`);
      navigateAfterSave(navigate, jobId, location);
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(`Failed to save report: ${error?.message || 'Unknown error'}`);
    }
  };
  
  // Update the insulation resistance input handling
  const handleInsulationResistanceChange = (index: number, type: 'positionIdentifier' | 'polesPhaseValues' | 'polesGroundValues' | 'lineLoadValues', key: string, value: string) => {
    if (!isEditing) return;

    setFormData(prev => {
      // Update the insulation resistance value
      const newInsulationResistance = [...prev.insulationResistance];
      if (!newInsulationResistance[index]) {
        newInsulationResistance[index] = {
          positionIdentifier: '',
          polesPhaseValues: {},
          polesGroundValues: {},
          lineLoadValues: {},
          unit: 'MΩ',
          testVoltage: prev.insulationTestVoltage
        };
      }

      if (type === 'positionIdentifier') {
        newInsulationResistance[index] = {
          ...newInsulationResistance[index],
          positionIdentifier: value
        };
      } else {
        newInsulationResistance[index] = {
          ...newInsulationResistance[index],
          [type]: {
            ...newInsulationResistance[index][type],
            [key]: value
          }
        };
      }

      // Calculate temperature corrected value if needed
      const newTempCorrectedInsulation = [...prev.tempCorrectedInsulation];
      if (!newTempCorrectedInsulation[index]) {
        newTempCorrectedInsulation[index] = {
          positionIdentifier: newInsulationResistance[index].positionIdentifier,
          polesPhaseValues: {},
          polesGroundValues: {},
          lineLoadValues: {},
          unit: newInsulationResistance[index].unit,
          testVoltage: prev.insulationTestVoltage
        };
      }

      // Always update the position identifier in temp corrected table
      newTempCorrectedInsulation[index] = {
        ...newTempCorrectedInsulation[index],
        positionIdentifier: newInsulationResistance[index].positionIdentifier
      };

      // If it's a value change, calculate the temperature corrected value
      if (type !== 'positionIdentifier' && value) {
        const tcf = getTCF(prev.temperature.celsius);
        const numericValue = parseFloat(value) || 0;
        const correctedValue = (numericValue * tcf).toFixed(2);

        newTempCorrectedInsulation[index] = {
          ...newTempCorrectedInsulation[index],
          [type]: {
            ...newTempCorrectedInsulation[index][type],
            [key]: correctedValue
          }
        };
      }

      return {
        ...prev,
        insulationResistance: newInsulationResistance,
        tempCorrectedInsulation: newTempCorrectedInsulation
      };
    });
  };
  
  // Update the test voltage handling
  const handleTestVoltageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isEditing) return;
    
    const newVoltage = e.target.value;
    setFormData(prev => ({
      ...prev,
      insulationTestVoltage: newVoltage,
      insulationResistance: prev.insulationResistance.map(item => ({
        ...item,
        testVoltage: newVoltage
      })),
      tempCorrectedInsulation: prev.tempCorrectedInsulation.map(item => ({
        ...item,
        testVoltage: newVoltage
      }))
    }));
  };

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
          jobNumber: jobData.job_number || prev.jobNumber,
          customer: customerName || prev.customer,
          address: customerAddress || prev.address,
          description: jobData.title || prev.description // Using title as description since that's what we have in the interface
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
        .from('low_voltage_switch_multi_device_reports')
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
        // Create a complete formData object with all fields
        setFormData(prev => ({
          ...prev,
          // General Info
          customer: data.report_info?.customer || prev.customer,
          address: data.report_info?.address || prev.address,
          date: data.report_info?.date || prev.date,
          inspector: data.report_info?.inspector || prev.inspector,
          description: data.report_info?.description || prev.description,
          userName: data.report_info?.userName || prev.userName,
          jobNumber: data.report_info?.jobNumber || prev.jobNumber,
          technicians: data.report_info?.technicians || prev.technicians,
          substation: data.report_info?.substation || prev.substation,
          eqptLocation: data.report_info?.location || prev.eqptLocation,
          identifier: data.report_info?.identifier || prev.identifier,

          // Temperature Data
          temperature: {
            celsius: parseFloat(data.report_info?.temp) || prev.temperature.celsius,
            fahrenheit: (parseFloat(data.report_info?.temp) * 9/5 + 32) || prev.temperature.fahrenheit,
            humidity: parseFloat(data.report_info?.humidity) || prev.temperature.humidity,
            tcf: getTCF(parseFloat(data.report_info?.temp) || prev.temperature.celsius)
          },

          // Enclosure Data
          manufacturer: data.report_info?.manufacturer || prev.manufacturer,
          catalogNo: data.report_info?.catalogNo || prev.catalogNo,
          systemVoltage: data.report_info?.systemVoltage || prev.systemVoltage,
          serialNumber: data.report_info?.serialNumber || prev.serialNumber,
          ratedVoltage: data.report_info?.ratedVoltage || prev.ratedVoltage,
          type: data.report_info?.type || prev.type,
          ratedCurrent: data.report_info?.ratedCurrent || prev.ratedCurrent,
          acRating: data.report_info?.acRating || prev.acRating,
          series: data.report_info?.series || prev.series,
          phaseConfiguration: data.report_info?.phaseConfiguration || prev.phaseConfiguration,

          // Switch Data
          switchData: Array.isArray(data.switch_data) ? data.switch_data : prev.switchData,

          // Fuse Data
          fuseData: Array.isArray(data.fuse_data) ? data.fuse_data : prev.fuseData,

          // Visual Inspection
          visualInspection: data.visual_inspection || prev.visualInspection,

          // Insulation Resistance
          insulationResistance: Array.isArray(data.insulation_resistance) ? 
            data.insulation_resistance : prev.insulationResistance,

          // Temperature Corrected Insulation
          tempCorrectedInsulation: Array.isArray(data.temp_corrected_insulation) ?
            data.temp_corrected_insulation : prev.tempCorrectedInsulation,

          // Contact Resistance
          contactResistance: Array.isArray(data.contact_resistance) ?
            data.contact_resistance : prev.contactResistance,

          // Test Equipment
          testEquipment: {
            megaohmmeter: {
              model: data.test_equipment?.megaohmmeter?.model || prev.testEquipment.megaohmmeter.model,
              serialNumber: data.test_equipment?.megaohmmeter?.serialNumber || prev.testEquipment.megaohmmeter.serialNumber,
              ampId: data.test_equipment?.megaohmmeter?.ampId || prev.testEquipment.megaohmmeter.ampId
            },
            lowResistance: {
              model: data.test_equipment?.lowResistance?.model || prev.testEquipment.lowResistance.model,
              serialNumber: data.test_equipment?.lowResistance?.serialNumber || prev.testEquipment.lowResistance.serialNumber,
              ampId: data.test_equipment?.lowResistance?.ampId || prev.testEquipment.lowResistance.ampId
            }
          },

          // Comments
          comments: data.comments || prev.comments,

          // Meta Reference
          metaReference: Array.isArray(data.meta_reference) ? data.meta_reference : prev.metaReference,

          // Test Result and Status
          testResult: data.report_info?.status || prev.testResult,
          status: data.report_info?.status || prev.status,
          insulationTestVoltage: data.report_info?.insulationTestVoltage || prev.insulationTestVoltage
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
        customer: prev.customer || '',
        address: prev.address || '',
      }));
    }
    setIsEditing(!reportId);
  }, [jobId, reportId]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Update the handleContactResistanceChange function
  const handleContactResistanceChange = (index: number, field: string, value: string, subfield?: string) => {
    setFormData(prev => {
      const newContactResistance = [...prev.contactResistance];
      
      // Ensure the index exists
      while (newContactResistance.length <= index) {
        newContactResistance.push({
          positionIdentifier: '',
          switchValues: { 'P1': '', 'P2': '', 'P3': '' },
          fuseValues: { 'P1': '', 'P2': '', 'P3': '' },
          switchFuseValues: { 'P1': '', 'P2': '', 'P3': '' },
          unit: 'μΩ'
        });
      }

      if (subfield) {
        // Handle nested values (switch, fuse, or switchFuse values)
        const values = newContactResistance[index][field] as Record<string, string>;
        if (values) {
          values[subfield] = value;
        }
      } else {
        // Handle direct fields (positionIdentifier, unit)
        newContactResistance[index] = {
          ...newContactResistance[index],
          [field]: value
        };
      }

      return {
        ...prev,
        contactResistance: newContactResistance
      };
    });
  };
  
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LOW VOLTAGE SWITCH MULTI-DEVICE TEST REPORT</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isEditing) {
                const currentIndex = EQUIPMENT_EVALUATION_RESULTS.indexOf(formData.testResult);
                const nextIndex = (currentIndex + 1) % EQUIPMENT_EVALUATION_RESULTS.length;
                setFormData(prev => ({ ...prev, testResult: EQUIPMENT_EVALUATION_RESULTS[nextIndex] }));
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              formData.testResult === 'PASS'
                ? 'bg-green-600 text-white focus:ring-green-500'
                : formData.testResult === 'FAIL'
                ? 'bg-red-600 text-white focus:ring-red-500'
                : 'bg-yellow-600 text-white focus:ring-yellow-500'
            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {formData.testResult}
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

      {/* Job Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Job Information</h2>
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-6 space-y-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => handleInputChange(e)}
                name="customer"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange(e)}
                name="address"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleInputChange(e)}
                name="userName"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                        type="date"
                value={formData.date}
                onChange={(e) => handleInputChange(e)}
                name="date"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identifier</label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => handleInputChange(e)}
                name="identifier"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-6 space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technicians</label>
                <input
                  type="text"
                value={formData.technicians}
                onChange={(e) => handleInputChange(e)}
                name="technicians"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Substation</label>
                <input
                  type="text"
                value={formData.substation}
                onChange={(e) => handleInputChange(e)}
                name="substation"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Eqpt. Location</label>
                <input
                  type="text"
                value={formData.eqptLocation}
                onChange={(e) => handleInputChange(e)}
                name="eqptLocation"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                />
              </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</label>
                <div className="flex items-center space-x-2">
              <input
                    type="number"
                    value={formData.temperature.fahrenheit}
                    onChange={(e) => handleFahrenheitChange(parseFloat(e.target.value))}
                    name="temperature.fahrenheit"
                    readOnly={!isEditing}
                    className={`mt-1 block w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-700 dark:text-gray-300">°F</span>
                  <input
                    type="number"
                    value={formData.temperature.celsius}
                    onChange={(e) => handleCelsiusChange(parseFloat(e.target.value))}
                    name="temperature.celsius"
                    readOnly={!isEditing}
                    className={`mt-1 block w-16 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-700 dark:text-gray-300">°C</span>
                  <span className="text-gray-700 dark:text-gray-300">TCF</span>
                  <input
                    type="number"
                    value={formData.temperature.tcf}
                    readOnly
                    className="mt-1 block w-16 rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm dark:text-white"
              />
            </div>
              </div>
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Humidity</label>
                <div className="flex items-center space-x-2">
              <input
                    type="number"
                    value={formData.temperature.humidity}
                    onChange={(e) => handleInputChange(e)}
                    name="temperature.humidity"
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
                  />
                  <span className="text-gray-700 dark:text-gray-300">%</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
        
      {/* Enclosure Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Enclosure Data</h2>
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange(e)}
                name="manufacturer"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catalog No.</label>
              <input
                type="text"
                value={formData.catalogNo}
                onChange={(e) => handleInputChange(e)}
                name="catalogNo"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange(e)}
                name="serialNumber"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Series</label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => handleInputChange(e)}
                name="series"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => handleInputChange(e)}
                name="type"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">System Voltage (V)</label>
              <input
                type="text"
                value={formData.systemVoltage}
                onChange={(e) => handleInputChange(e)}
                name="systemVoltage"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Voltage (V)</label>
              <input
                type="text"
                value={formData.ratedVoltage}
                onChange={(e) => handleInputChange(e)}
                name="ratedVoltage"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rated Current (A)</label>
              <input
                type="text"
                value={formData.ratedCurrent}
                onChange={(e) => handleInputChange(e)}
                name="ratedCurrent"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">A/C Rating (kA)</label>
              <input
                type="text"
                value={formData.acRating}
                onChange={(e) => handleInputChange(e)}
                name="acRating"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phase Configuration</label>
              <input
                type="text"
                value={formData.phaseConfiguration}
                onChange={(e) => handleInputChange(e)}
                name="phaseConfiguration"
                readOnly={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color dark:bg-dark-100 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
              />
            </div>
            </div>
          </div>
        </div>
        
      {/* Switch Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Switch Data</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Position / Identifier</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Manufacturer</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Catalog No.</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Serial No.</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Type</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={2}>
                  <div className="text-center">Rated</div>
                  <div className="grid grid-cols-2">
                    <div className="border-t border-r border-gray-300 dark:border-gray-700 p-1">Amperage</div>
                    <div className="border-t border-gray-300 dark:border-gray-700 p-1">Voltage</div>
                  </div>
                </th>
                </tr>
              </thead>
              <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`switch-${index}`}>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.positionIdentifier || ''}
                        onChange={(e) => handleInputChange(e, 'switchData', index, 'positionIdentifier')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.manufacturer || ''}
                        onChange={(e) => handleInputChange(e, 'switchData', index, 'manufacturer')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.catalogNo || ''}
                        onChange={(e) => handleInputChange(e, 'switchData', index, 'catalogNo')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.serialNo || ''}
                      onChange={(e) => handleInputChange(e, 'switchData', index, 'serialNo')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.type || ''}
                      onChange={(e) => handleInputChange(e, 'switchData', index, 'type')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.switchData[index]?.ratedAmp || ''}
                      onChange={(e) => handleInputChange(e, 'switchData', index, 'ratedAmp')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                    <input
                      type="text"
                      value={formData.switchData[index]?.ratedVoltage || ''}
                      onChange={(e) => handleInputChange(e, 'switchData', index, 'ratedVoltage')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      {/* Fuse Data */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Fuse Data</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Position / Identifier</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Manufacturer</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Catalog No.</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Class</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>
                  <div className="text-center">Rated</div>
                  <div className="grid grid-cols-3">
                    <div className="border-t border-r border-gray-300 dark:border-gray-700 p-1">Amperage</div>
                    <div className="border-t border-r border-gray-300 dark:border-gray-700 p-1">AIC</div>
                    <div className="border-t border-gray-300 dark:border-gray-700 p-1">Voltage</div>
                  </div>
                </th>
                </tr>
              </thead>
              <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`fuse-${index}`}>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.positionIdentifier || ''}
                        onChange={(e) => handleInputChange(e, 'fuseData', index, 'positionIdentifier')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.manufacturer || ''}
                        onChange={(e) => handleInputChange(e, 'fuseData', index, 'manufacturer')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.catalogNo || ''}
                        onChange={(e) => handleInputChange(e, 'fuseData', index, 'catalogNo')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.class || ''}
                      onChange={(e) => handleInputChange(e, 'fuseData', index, 'class')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.ampRating || ''}
                      onChange={(e) => handleInputChange(e, 'fuseData', index, 'ampRating')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.aic || ''}
                      onChange={(e) => handleInputChange(e, 'fuseData', index, 'aic')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                      value={formData.fuseData[index]?.voltage || ''}
                      onChange={(e) => handleInputChange(e, 'fuseData', index, 'voltage')}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual and Mechanical Inspection */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Visual and Mechanical Inspection</h2>
        <div className="overflow-x-auto">
          <div className="flex">
            <div className="flex-grow">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr>
                    <th colSpan={13} className="border border-gray-300 dark:border-gray-700 p-2 text-center bg-gray-50 dark:bg-gray-800">
                      Visual and Mechanical Tests for NETA ATS Section 7.5.1.1.A
                    </th>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 p-2 text-left w-[25%]">Position / Identifier</th>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <th key={i} className="border border-gray-300 dark:border-gray-700 p-2 text-center w-[6.25%]">{i === 7 ? '8.1' : i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`visual-${rowIndex}`}>
                      <td className="border border-gray-300 dark:border-gray-700 p-2 w-[25%]">
                        {rowIndex === 4 ? 'P1-' : (
                          <input
                            type="text"
                            value={formData.visualInspection.items[rowIndex]?.identifier || ''}
                            onChange={(e) => handleVisualInspectionChange(rowIndex, 'identifier', e.target.value)}
                            readOnly={!isEditing}
                            className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                          />
                        )}
                      </td>
                      {Array.from({ length: 12 }).map((_, colIndex) => (
                        <td key={`visual-${rowIndex}-${colIndex}`} className="border border-gray-300 dark:border-gray-700 p-2 w-[6.25%]">
                          <select
                            value={formData.visualInspection.items[rowIndex]?.values[`${colIndex + 1}`] || ''}
                            onChange={(e) => handleVisualInspectionChange(rowIndex, `${colIndex + 1}`, e.target.value)}
                            disabled={!isEditing}
                            className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                          >
                            <option value=""></option>
                            {VISUAL_INSPECTION_OPTIONS.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-4 flex-shrink-0">
              <table className="border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th colSpan={3} className="border border-gray-300 dark:border-gray-700 p-2 text-center">Satisfactory?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">Yes</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">=</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">Y</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">No</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">=</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">N</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">Not</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">=</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
        
      {/* Electrical Tests - Measured Insulation Resistance Values */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Measured Insulation Resistance Values</h2>
          <div className="overflow-x-auto">
          <div className="flex justify-end mb-2">
            <div className="border border-gray-300 dark:border-gray-700 p-2">
              <span className="font-medium">Test Voltage:</span>
              <select
                value={formData.insulationTestVoltage}
                onChange={handleTestVoltageChange}
                disabled={!isEditing}
                className={`ml-2 bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
              >
                {INSULATION_TEST_VOLTAGES.map(voltage => (
                  <option key={voltage} value={voltage}>{voltage}</option>
                ))}
              </select>
            </div>
          </div>
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
              <tr>
                <th colSpan={11} className="border border-gray-300 dark:border-gray-700 p-2 text-center bg-gray-50 dark:bg-gray-800">
                  Insulation Resistance
                </th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left" rowSpan={2}>Position / Identifier</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Pole to Pole (switch open)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Pole to Frame (switch closed)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Line to Load (switch closed)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" rowSpan={2}>Units</th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1-P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2-P3</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3-P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
                </tr>
              </thead>
              <tbody>
              {Array.from({ length: 4 }).map((_, index) => (
                <tr key={`insulation-${index}`}>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                    <input
                      type="text"
                      value={formData.insulationResistance[index]?.positionIdentifier || ''}
                      onChange={(e) => handleInsulationResistanceChange(index, 'positionIdentifier', '', e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </td>
                  {/* Pole to Pole values */}
                  {['P1-P2', 'P2-P3', 'P3-P1'].map(key => (
                    <td key={`pole-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.insulationResistance[index]?.polesPhaseValues[key] || ''}
                        onChange={(e) => handleInsulationResistanceChange(index, 'polesPhaseValues', key, e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  {/* Pole to Frame values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`frame-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.insulationResistance[index]?.polesGroundValues[`${key}-G`] || ''}
                        onChange={(e) => handleInsulationResistanceChange(index, 'polesGroundValues', `${key}-G`, e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  {/* Line to Load values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`load-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.insulationResistance[index]?.lineLoadValues[key] || ''}
                        onChange={(e) => handleInsulationResistanceChange(index, 'lineLoadValues', key, e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-700 p-2 text-center">
                    <select
                      value={formData.insulationResistance[index]?.unit || 'MΩ'}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          insulationResistance: prev.insulationResistance.map((item, i) => 
                            i === index ? { ...item, unit: newValue } : item
                          )
                        }));
                      }}
                      disabled={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      {INSULATION_RESISTANCE_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Electrical Tests - Temperature Corrected Insulation */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Temperature Corrected Insulation Resistance Values</h2>
        <div className="overflow-x-auto">
          <div className="flex justify-end mb-2">
            <div className="border border-gray-300 dark:border-gray-700 p-2">
              <span className="font-medium">Test Voltage:</span>
              <span className="ml-2">{formData.insulationTestVoltage}</span>
            </div>
          </div>
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left" rowSpan={2}>Position / Identifier</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Pole to Pole (switch open)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Pole to Frame (switch closed)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Line to Load (switch closed)</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" rowSpan={2}>Units</th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1-P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2-P3</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3-P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
              </tr>
            </thead>
            <tbody>
              {formData.tempCorrectedInsulation.map((item, index) => (
                <tr key={`temp-corr-${index}`}>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                    <input
                      type="text"
                      value={item.positionIdentifier}
                      readOnly
                      className="w-full bg-transparent border-none focus:ring-0"
                      />
                    </td>
                  {/* Pole to Pole values */}
                  {['P1-P2', 'P2-P3', 'P3-P1'].map(key => (
                    <td key={`pole-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={item.polesPhaseValues[key] || ''}
                        readOnly
                        className="w-full bg-transparent border-none focus:ring-0 text-center"
                      />
                    </td>
                  ))}
                  {/* Pole to Frame values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`frame-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={item.polesGroundValues[`${key}-G`] || ''}
                        readOnly
                        className="w-full bg-transparent border-none focus:ring-0 text-center"
                      />
                    </td>
                  ))}
                  {/* Line to Load values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`load-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={item.lineLoadValues[key] || ''}
                        readOnly
                        className="w-full bg-transparent border-none focus:ring-0 text-center"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-700 p-2 text-center">
                    {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Electrical Tests - Contact Resistance */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Electrical Tests - Contact Resistance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th colSpan={10} className="border border-gray-300 dark:border-gray-700 p-2 text-center bg-gray-50 dark:bg-gray-800">
                  Contact Resistance
                </th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-left" rowSpan={2}>Position / Identifier</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Switch</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Fuse</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" colSpan={3}>Switch + Fuse</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center" rowSpan={2}>Units</th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {/* Switch columns */}
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
                {/* Fuse columns */}
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
                {/* Switch + Fuse columns */}
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P1</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P2</th>
                <th className="border border-gray-300 dark:border-gray-700 p-2 text-center">P3</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, index) => (
                <tr key={`contact-${index}`}>
                  <td className="border border-gray-300 dark:border-gray-700 p-2">
                    <input
                      type="text"
                      value={formData.contactResistance[index]?.positionIdentifier || ''}
                      onChange={(e) => handleContactResistanceChange(index, 'positionIdentifier', e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </td>
                  {/* Switch values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`switch-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.contactResistance[index]?.switchValues?.[key] || ''}
                        onChange={(e) => handleInputChange(e, 'contactResistance', index, 'switchValues', key)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  {/* Fuse values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`fuse-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.contactResistance[index]?.fuseValues?.[key] || ''}
                        onChange={(e) => handleInputChange(e, 'contactResistance', index, 'fuseValues', key)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  {/* Switch + Fuse values */}
                  {['P1', 'P2', 'P3'].map(key => (
                    <td key={`switch-fuse-${key}`} className="border border-gray-300 dark:border-gray-700 p-2">
                      <input
                        type="text"
                        value={formData.contactResistance[index]?.switchFuseValues?.[key] || ''}
                        onChange={(e) => handleInputChange(e, 'contactResistance', index, 'switchFuseValues', key)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none focus:ring-0 text-center ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-700 p-2 text-center">
                    <select
                      value={formData.contactResistance[index]?.unit || 'μΩ'}
                      onChange={(e) => handleInputChange(e, 'contactResistance', index, 'unit')}
                      disabled={!isEditing}
                      className={`w-full bg-transparent border-none focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      {CONTACT_RESISTANCE_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        
        {/* NETA Reference */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">NETA Reference</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-dark-200 border">
              <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border p-2 text-left" style={{ width: '20%' }}>Section</th>
                  <th className="border p-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {formData.metaReference.map((item, index) => (
                  <tr key={`meta-${index}`}>
                    <td className="border p-2">{item.section}</td>
                    <td className="border p-2">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Test Equipment Used */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Test Equipment Used</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 text-right">
              <span className="font-medium">Megohmmeter:</span>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={formData.testEquipment.megaohmmeter.model}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
          testEquipment: {
                      ...prev.testEquipment,
            megaohmmeter: {
                        ...prev.testEquipment.megaohmmeter,
                        model: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Fluke 1587FC"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
            <div className="col-span-1 text-right">
              <span className="font-medium">Serial Number:</span>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={formData.testEquipment.megaohmmeter.serialNumber}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    testEquipment: {
                      ...prev.testEquipment,
                      megaohmmeter: {
                        ...prev.testEquipment.megaohmmeter,
                        serialNumber: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Test"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
            <div className="col-span-1 text-right">
              <span className="font-medium">AMP ID:</span>
            </div>
            <div className="col-span-2">
              <input
                type="text"
                value={formData.testEquipment.megaohmmeter.ampId}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    testEquipment: {
                      ...prev.testEquipment,
                      megaohmmeter: {
                        ...prev.testEquipment.megaohmmeter,
                        ampId: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Test"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 text-right">
              <span className="font-medium">Low Resistance:</span>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={formData.testEquipment.lowResistance.model}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    testEquipment: {
                      ...prev.testEquipment,
            lowResistance: {
                        ...prev.testEquipment.lowResistance,
                        model: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Megger DLRO"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
            <div className="col-span-1 text-right">
              <span className="font-medium">Serial Number:</span>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={formData.testEquipment.lowResistance.serialNumber}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    testEquipment: {
                      ...prev.testEquipment,
                      lowResistance: {
                        ...prev.testEquipment.lowResistance,
                        serialNumber: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Test"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
            <div className="col-span-1 text-right">
              <span className="font-medium">AMP ID:</span>
            </div>
            <div className="col-span-2">
              <input
                type="text"
                value={formData.testEquipment.lowResistance.ampId}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    testEquipment: {
                      ...prev.testEquipment,
                      lowResistance: {
                        ...prev.testEquipment.lowResistance,
                        ampId: e.target.value
                      }
                    }
                  }));
                }}
                placeholder="Test"
                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>
        
        {/* Comments */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Comments</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium mr-2">Enclosure:</span>
            <div className="flex-grow">
              <input
                type="text"
                value={formData.comments}
                onChange={(e) => handleInputChange(e)}
                name="comments"
                readOnly={!isEditing}
                className={`w-full bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-accent-color focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
          {/* Add 6 more empty comment lines */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`comment-line-${index}`} className="flex items-center">
              <div className="flex-grow">
                <div className="w-full border-b border-gray-300 dark:border-gray-700 h-6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
        
        {/* Footer */}
        <div className="mt-8 flex justify-between">
          <div>
            <p className="text-sm">Low Voltage Switch Multi-Device</p>
            <p className="text-sm">Sheet 1 of 1</p>
          </div>
          <div>
            <p className="text-sm">Document No.: {formData.serialNumber || '000000'}</p>
        </div>
      </div>
    </div>
  );
};

// CSS for print functionality
const PrintStyles = () => (
  <style>{`
    @media print {
      body {
        font-size: 12pt;
      }
      
      .container {
        max-width: 100%;
        padding: 0;
      }
      
      button {
        display: none;
      }
      
      input, textarea, select {
        border: none !important;
        padding: 2px !important;
      }
      
      table {
        page-break-inside: avoid;
      }
      
      @page {
        size: portrait;
        margin: 0.5cm;
      }
    }
  `}</style>
);

// Wrap the component with PrintStyles
const LowVoltageSwitchWithPrint: React.FC = () => (
  <>
    <PrintStyles />
    <LowVoltageSwitchMultiDeviceTest />
  </>
);

export default LowVoltageSwitchWithPrint;