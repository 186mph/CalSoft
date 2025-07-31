import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { navigateAfterSave } from './ReportUtils';
import { toast } from 'react-hot-toast';
import { getNextAssetId, createCalibrationAsset } from '../../lib/services/assetService';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Plus, FileText, Upload, Trash2, Printer } from 'lucide-react';
import { getDivisionAccentClasses } from '../../lib/utils';
import { useDivision } from '../../App';

// Add type definitions for error handling
type SupabaseError = {
    message: string;
    code?: string;
};

// Define table name constant
const CALIBRATION_BUCKET_TRUCK_TABLE = 'calibration_bucket_truck_reports' as const;
const SCHEMA = 'lab_ops' as const;
const ASSETS_TABLE = 'lab_assets' as const;

// Asset interface
interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  template_type?: 'MTS' | 'ATS' | null;
  asset_id?: string;
}

interface EnhancedAsset extends Asset {
  userAssetId?: string;
}

// Interface for form data structure
interface DOTInspectionComponent {
  status?: 'OK' | 'NEEDS_REPAIR';
  repairedDate?: string;
}

interface DOTInspection {
  motorCarrierOperator: string;
  address: string;
  cityStateZip: string;
  inspectorName: string;
  vehicleType: string;
  vehicleTypeOther: string;
  vehicleIdentification: string[];
  inspectorQualified: boolean;
  components: Record<string, DOTInspectionComponent>;
  additionalConditions: string;
  certified: boolean;
}

interface FormData {
  // Job Information
  customer: string;
  address: string;
  date: string;
  technicians: string;
  jobNumber: string;
  userName: string;
  customerId: string;
  customerIdForAsset?: string;
  
  // Bucket Truck Information
  bucketTruckData: {
    assetId: string;
    serialNumber: string;
    truckNumber: string;
    year: string;
    model: string;
    numberOfPlatforms: string;
    platformHeight: string;
    manufacturer: string;
    materialHandling: string;
    designVoltage: string;
    qualificationVoltage: string;
    upperBoomReading: string;
    passFailStatus: string;
  };
  
  // DOT Inspection
  dotInspection: DOTInspection;
  
  // Test Equipment
  testEquipment: {
    name: string;
    serialNumber: string;
    ampId: string;
  };
  
  // Comments
  comments: string;
  status: string;
}

// Add these interfaces at the top of the file with the other interfaces
interface CustomerData {
  id?: string;
  company_id?: string;
  name?: string;
  company_name?: string;
  address?: string;
}

interface JobInfo {
  job_number: string;
  customer_id: string;
  title: string;
  customers: CustomerData;
}

// Add these interfaces after the existing interfaces
interface BucketTruckTestHistory {
  id: string;
  bucket_truck_report_id: string;
  test_result: 'PASS' | 'FAIL';
  tested_by: string;
  test_notes?: string;
  test_date: string;
  created_at: string;
}

interface TestHistoryEntry {
  id: string;
  test_date: string;
  test_result: 'PASS' | 'FAIL';
  tested_by_email: string;
  test_notes?: string;
}

// Manufacturer options
const manufacturerOptions = ["Altec", "Terex", "Versalift", "NY-CONN", "SDP"];

// Material Handling options
const materialHandlingOptions = ["Yes", "No", "NA"];

// Design Voltage options
const designVoltageOptions = ["46 kVAC", "86 kVAC", "345 kVAC", "500 kV", "69 kV", "NA"];

// Qualification Voltage options
const qualificationVoltageOptions = ["46 kVAC", "86 kVAC", "69 kVAC", "69 kV", "16 kV", "NA"];

// Liner Type options


export default function CalibrationBucketTruckReport() {
  const { id: jobId, reportId: urlReportId } = useParams<{ id: string; reportId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debug URL parameters
  console.log('URL Parameters Debug:', { 
    jobId, 
    urlReportId, 
    pathname: location.pathname,
    search: location.search 
  });

  // Check URL parameters for return navigation
  const searchParams = new URLSearchParams(location.search);
  const returnPath = searchParams.get('returnPath');

  // Handle back navigation
  const handleBackNavigation = () => {
    if (returnPath) {
      // Navigate to the specified return path (e.g., All Assets page)
      navigate(returnPath);
    } else {
      // Default navigation back to job
      navigate(`/jobs/${jobId}?tab=assets`);
    }
  };

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!urlReportId);
  const [reportId, setReportId] = useState<string | null>(urlReportId || null);
  
  // Asset management state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobAssets, setJobAssets] = useState<EnhancedAsset[]>([]);
  const [filteredJobAssets, setFilteredJobAssets] = useState<EnhancedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<EnhancedAsset | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    customer: '', 
    address: '', 
    date: new Date().toISOString().split('T')[0], 
    technicians: '',
    jobNumber: '', 
    userName: '',
    customerId: '',
    customerIdForAsset: '',
    bucketTruckData: {
      assetId: '',
      serialNumber: '',
      truckNumber: '',
      year: '',
      model: '',
      numberOfPlatforms: '',
      platformHeight: '',
      manufacturer: '',
      materialHandling: '',
      designVoltage: '',
      qualificationVoltage: '',
              upperBoomReading: '',
      passFailStatus: 'PASS'
    },
    dotInspection: {
      motorCarrierOperator: '',
      address: '',
      cityStateZip: '',
      inspectorName: '',
      vehicleType: '',
      vehicleTypeOther: '',
      vehicleIdentification: [],
      inspectorQualified: false,
      components: {},
      additionalConditions: '',
      certified: false
    },
    testEquipment: { 
      name: '', 
      serialNumber: '', 
      ampId: '' 
    },
    comments: '', 
    status: 'PASS'
  });
  const [status, setStatus] = useState<'PASS' | 'FAIL'>('PASS');

  const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
  const [loadingTestHistory, setLoadingTestHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { division } = useDivision();
  const accentClasses = getDivisionAccentClasses(division);

  // Default assets that are always available
  const defaultAssets: Asset[] = [
    {
      id: 'calibration-gloves',
      name: 'Glove Report',
      file_url: `report:/jobs/${jobId}/calibration-gloves?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-sleeve',
      name: 'Sleeve Report',
      file_url: `report:/jobs/${jobId}/calibration-sleeve?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-blanket',
      name: 'Blanket Report',
      file_url: `report:/jobs/${jobId}/calibration-blanket?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-line-hose',
      name: 'Line Hose Report',
      file_url: `report:/jobs/${jobId}/calibration-line-hose?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-hotstick',
      name: 'Hotstick Report',
      file_url: `report:/jobs/${jobId}/calibration-hotstick?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-ground-cable',
      name: 'Ground Cable Report',
      file_url: `report:/jobs/${jobId}/calibration-ground-cable?returnToAssets=true`,
      created_at: new Date().toISOString(),
    },
    {
      id: 'calibration-bucket-truck',
      name: 'Bucket Truck Report',
      file_url: `report:/jobs/${jobId}/calibration-bucket-truck?returnToAssets=true`,
      created_at: new Date().toISOString(),
    }
  ];

  const handleChange = (section: keyof FormData | null, field: string, value: any) => {
    setFormData(prev => {
      if (section) {
        const currentSection = prev[section];
        if (typeof currentSection !== 'object' || currentSection === null) return prev;
        return { ...prev, [section]: { ...(currentSection as object), [field]: value } };
      } else {
        if (!(field in prev)) return prev;
        return { ...prev, [field]: value };
      }
    });
  };

  const handleBucketTruckDataChange = (field: keyof FormData['bucketTruckData'], value: string) => {
    setFormData(prev => ({
      ...prev,
      bucketTruckData: {
        ...prev.bucketTruckData,
        [field]: value
      }
    }));
  };

  const handleTestEquipmentChange = (field: keyof FormData['testEquipment'], value: string) => {
    setFormData(prev => ({
      ...prev,
      testEquipment: {
        ...prev.testEquipment,
        [field]: value
      }
    }));
  };

  // Update Pass/Fail status in the Bucket Truck Data when overall status changes
  const updatePassFailStatus = (newStatus: string) => {
    setStatus(newStatus as 'PASS' | 'FAIL');
    handleChange(null, 'status', newStatus);
    handleBucketTruckDataChange('passFailStatus', newStatus);
  };

  // Update Liner Pass/Fail status


  // DOT Inspection handlers
  const handleDOTInspectionChange = (field: keyof DOTInspection, value: any) => {
    setFormData(prev => ({
      ...prev,
      dotInspection: {
        ...prev.dotInspection,
        [field]: value
      }
    }));
  };

  const handleDOTComponentChange = (sectionIndex: number, itemIndex: number, field: 'OK' | 'NEEDS_REPAIR' | 'repairedDate', value: any) => {
    setFormData(prev => {
      const key = `${sectionIndex}-${itemIndex}`;
      const currentComponent = prev.dotInspection.components[key] || {};
      
      let updatedComponent;
      if (field === 'repairedDate') {
        updatedComponent = { ...currentComponent, repairedDate: value };
      } else {
        // For OK or NEEDS_REPAIR, we need to handle mutual exclusivity
        if (value) {
          updatedComponent = { ...currentComponent, status: field };
        } else {
          updatedComponent = { ...currentComponent, status: undefined };
        }
      }

      return {
        ...prev,
        dotInspection: {
          ...prev.dotInspection,
          components: {
            ...prev.dotInspection.components,
            [key]: updatedComponent
          }
        }
      };
    });
  };

  const handleSaveDOTInspection = async () => {
    if (!jobId || !user?.id || !isEditing) return;

    try {
      // Save DOT Inspection data to the bucket truck report
      if (reportId) {
        // Update existing report - store DOT Inspection data in report_info
        const { error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .update({
            report_info: {
              ...formData,
              dotInspection: formData.dotInspection
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId);

        if (error) throw error;
        alert('DOT Inspection data saved successfully!');
      } else {
        // For new reports, save the entire report with DOT Inspection data
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .insert({
            job_id: jobId,
            user_id: user.id,
            report_info: {
              customer: formData.customer,
              address: formData.address,
              date: formData.date,
              technicians: formData.technicians,
              jobNumber: formData.jobNumber,
              userName: formData.userName,
              bucketTruckData: formData.bucketTruckData,
              testEquipment: formData.testEquipment,
              comments: formData.comments,
              status: formData.status,
              dotInspection: formData.dotInspection
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Create asset entry for the report
        if (data) {
          const assetData = {
            name: `Bucket Truck Report - ${formData.bucketTruckData.truckNumber || 'Unnamed'}`,
            file_url: `report:/jobs/${jobId}/bucket-truck-report/${data.id}`,
            user_id: user.id
          };

          const { data: assetResult, error: assetError } = await supabase
            .schema('lab_ops')
            .from('assets')
            .insert(assetData)
            .select()
            .single();

          if (assetError) throw assetError;

          // Link asset to job
          await supabase
            .schema('lab_ops')
            .from('job_assets')
            .insert({
              job_id: jobId,
              asset_id: assetResult.id,
              user_id: user.id
            });
        }

        alert('DOT Inspection data saved successfully!');
      }
    } catch (error: any) {
      console.error('Error saving DOT Inspection data:', error);
      alert(`Failed to save DOT Inspection data: ${error?.message || 'Unknown error'}`);
    }
  };

  const handlePrintDOTInspection = async () => {
    if (!isEditing) return;
    
    try {
      const dotInspectionHTML = generateDOTInspectionHTML();
      const element = document.createElement('div');
      element.innerHTML = dotInspectionHTML;
      document.body.appendChild(element);
      
      const opt = {
        margin: 0.5,
        filename: `DOT_Inspection_${formData.bucketTruckData.truckNumber || 'Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error printing DOT inspection:', error);
      alert('Error generating DOT inspection PDF');
    }
  };

  const handlePrintDOTInspectionExact = async () => {
    if (!isEditing) return;
    
    try {
      const exactDOTHTML = generateExactDOTInspectionHTML();
      const element = document.createElement('div');
      element.innerHTML = exactDOTHTML;
      document.body.appendChild(element);
      
      const opt = {
        margin: 0.25,
        filename: `DOT_Exact_Form_${formData.bucketTruckData.truckNumber || 'Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error printing exact DOT inspection:', error);
      alert('Error generating exact DOT form PDF');
    }
  };

  const handlePrintOriginalImageForm = async () => {
    if (!isEditing) return;
    
    try {
      const originalImageHTML = generateOriginalImageHTML();
      const element = document.createElement('div');
      element.innerHTML = originalImageHTML;
      document.body.appendChild(element);
      
      const opt = {
        margin: 0.1, // Minimal margin to maximize image size
        filename: `DOT_Original_Image_${formData.bucketTruckData.truckNumber || 'Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error printing original image DOT form:', error);
      alert('Error generating original image DOT form PDF');
    }
  };

  const handlePrintExactHTML = async () => {
    if (!isEditing) return;
    
    try {
      // Fetch the exact HTML from the dot-inspec.html file
      const response = await fetch('/dot-inspec.html');
      if (!response.ok) {
        throw new Error('Failed to fetch DOT form template');
      }
      let html = await response.text();
      
      // Populate the HTML with form data from DOT Inspection section
      
      // Text fields at the top
      html = html.replace(/MOTOR CARRIER OPERATOR<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
        (match, originalText) => {
          return match.replace(originalText, formData.dotInspection.motorCarrierOperator || '');
        });
      
      html = html.replace(/ADDRESS<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
        (match, originalText) => {
          return match.replace(originalText, formData.dotInspection.address || '');
        });
      
      html = html.replace(/CITY, STATE, ZIP CODE<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
        (match, originalText) => {
          return match.replace(originalText, formData.dotInspection.cityStateZip || '');
        });
      
      html = html.replace(/INSPECTOR'S NAME<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
        (match, originalText) => {
          return match.replace(originalText, formData.dotInspection.inspectorName || '');
        });
      
      html = html.replace(/VEHICLE TYPE<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
        (match, originalText) => {
          return match.replace(originalText, formData.dotInspection.vehicleType || '');
        });
      
      // Vehicle Identification checkboxes
      if (formData.dotInspection.vehicleIdentification?.includes('Truck')) {
        html = html.replace(/<div class="ff1"[^>]*>TRUCK<\/div>/g, 
          '<div class="ff1" style="left:200px;top:295px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      if (formData.dotInspection.vehicleIdentification?.includes('Tractor')) {
        html = html.replace(/<div class="ff1"[^>]*>TRACTOR<\/div>/g, 
          '<div class="ff1" style="left:280px;top:295px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      if (formData.dotInspection.vehicleIdentification?.includes('Trailer')) {
        html = html.replace(/<div class="ff1"[^>]*>TRAILER<\/div>/g, 
          '<div class="ff1" style="left:360px;top:295px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      if (formData.dotInspection.vehicleIdentification?.includes('Bus')) {
        html = html.replace(/<div class="ff1"[^>]*>BUS<\/div>/g, 
          '<div class="ff1" style="left:440px;top:295px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      if (formData.dotInspection.vehicleIdentification?.includes('Other')) {
        html = html.replace(/<div class="ff1"[^>]*>OTHER<\/div>/g, 
          '<div class="ff1" style="left:520px;top:295px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      
      // Inspector Qualification checkbox
      if (formData.dotInspection.inspectorQualified) {
        html = html.replace(/<div class="ff1"[^>]*>This inspector meets the qualification requirements in Section 396.19<\/div>/g, 
          '<div class="ff1" style="left:200px;top:335px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      
      // Vehicle Components - populate checkboxes based on form data
      dotInspectionItems.forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
          const componentKey = `${sectionIndex}-${itemIndex}`;
          const component = formData.dotInspection.components[componentKey];
          
          if (component?.status === 'OK') {
            // Find and mark OK checkbox for this item
            const itemRegex = new RegExp(`<div class="ff1"[^>]*>${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/div>`, 'g');
            html = html.replace(itemRegex, (match) => {
              return match + '<div class="ff1" style="left:400px;top:' + (400 + sectionIndex * 120 + itemIndex * 20) + 'px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>';
            });
          } else if (component?.status === 'NEEDS_REPAIR') {
            // Find and mark NEEDS REPAIR checkbox for this item
            const itemRegex = new RegExp(`<div class="ff1"[^>]*>${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/div>`, 'g');
            html = html.replace(itemRegex, (match) => {
              return match + '<div class="ff1" style="left:460px;top:' + (400 + sectionIndex * 120 + itemIndex * 20) + 'px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>';
            });
            
            // Add repair date if provided
            if (component.repairedDate) {
              html = html.replace(itemRegex, (match) => {
                return match + '<div class="ff1" style="left:540px;top:' + (400 + sectionIndex * 120 + itemIndex * 20) + 'px;width:80px;height:16px;border-bottom:1px solid black;">' + component.repairedDate + '</div>';
              });
            }
          }
        });
      });
      
      // Additional Conditions
      if (formData.dotInspection.additionalConditions) {
        html = html.replace(/<div class="ff1"[^>]*>ADDITIONAL CONDITIONS<\/div>[\s\S]*?<div class="ff1"[^>]*>([^<]*)<\/div>/g, 
          (match, originalText) => {
            return match.replace(originalText, formData.dotInspection.additionalConditions);
          });
      }
      
      // Certification checkbox
      if (formData.dotInspection.certified) {
        html = html.replace(/<div class="ff1"[^>]*>I certify that this inspection was performed in accordance with DOT standards and regulations.<\/div>/g, 
          '<div class="ff1" style="left:30px;top:1020px;width:12px;height:12px;border:1px solid black;background:black;color:white;text-align:center;line-height:12px;">X</div>');
      }
      
      // Create a new window and load the populated HTML
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }
      
      // Write the populated HTML to the new window
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for the content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 1000);
      };
      
    } catch (error) {
      console.error('Error printing exact HTML:', error);
      alert('Error printing exact HTML DOT form');
    }
  };

  // DOT Inspection data structure
  const dotInspectionItems = [
    {
      title: '1. BRAKE SYSTEM',
      items: [
        'a. Service Brakes',
        'b. Parking Brake System',
        'c. Brake Drums or Rotors',
        'd. Brake Hose',
        'e. Brake Tubing',
        'f. Low Pressure Warning Device',
        'g. Tractor Protection Valve',
        'h. Air Compressor',
        'i. Electric Brakes',
        'j. Hydraulic Brakes',
        'k. Vacuum Systems'
      ]
    },
    {
      title: '2. COUPLING DEVICES',
      items: [
        'a. Fifth Wheels',
        'b. Pintle Hooks',
        'c. Drawbar/Towbar Eye',
        'd. Drawbar/Towbar Tongue',
        'e. Safety Devices',
        'f. Saddle-Mounts'
      ]
    },
    {
      title: '3. EXHAUST SYSTEM',
      items: [
        'a. Any exhaust system determined to be leaking at a point forward of or directly below the driver/sleeper compartment.',
        'b. A bus exhaust system leaking or discharging to the atmosphere in violation of standards (1), (2) or (3).',
        'c. No part of the exhaust system of any motor vehicle shall be so located as would be likely to result in burning, charring, or damaging the electrical wiring, the fuel supply, or any combustible part of the motor vehicle.'
      ]
    },
    {
      title: '4. FUEL SYSTEM',
      items: [
        'a. Visible leak',
        'b. Fuel tank filler cap missing',
        'c. Fuel tank securely attached'
      ]
    },
    {
      title: '5. LIGHTING DEVICES',
      items: [
        'All lighting devices and reflectors required by Section 393 shall be operable.'
      ]
    },
    {
      title: '6. SAFE LOADING',
      items: [
        'a. Part(s) of vehicle or condition of loading such that the spare tire or any part of the load or dunnage can fall onto the roadway.',
        'b. Protection against shifting cargo'
      ]
    },
    {
      title: '7. STEERING MECHANISM',
      items: [
        'a. Steering Wheel Free Play',
        'b. Steering Column',
        'c. Front Axle Beam and All Steering Components Other Than Steering Column',
        'd. Steering Gear Box',
        'e. Pitman Arm',
        'f. Power Steering',
        'g. Ball and Socket Joints',
        'h. Tie Rods and Drag Links',
        'i. Nuts',
        'j. Steering System'
      ]
    },
    {
      title: '8. SUSPENSION',
      items: [
        'a. Any U-bolt(s), spring hanger(s), or other axle positioning part(s) cracked, broken, loose or missing resulting in shifting of an axle from its normal position.',
        'b. Spring Assembly',
        'c. Torque, Radius or Tracking Components.'
      ]
    },
    {
      title: '9. FRAME',
      items: [
        'a. Frame Members',
        'b. Tire and Wheel Clearance',
        'c. Adjustable Axle Assemblies (Sliding Subframes)'
      ]
    },
    {
      title: '10. TIRES',
      items: [
        'a. Tires on any steering axle of a power unit.',
        'b. All other tires.'
      ]
    },
    {
      title: '11. WHEELS AND RIMS',
      items: [
        'a. Lock or Side Ring',
        'b. Wheels and Rims',
        'c. Fasteners',
        'd. Welds'
      ]
    },
    {
      title: '12. WINDSHIELD GLAZING',
      items: [
        'Requirements and exceptions as stated pertaining to any crack, discoloration or vision reducing matter (reference 393.60 for exceptions)'
      ]
    },
    {
      title: '13. WINDSHIELD WIPERS',
      items: [
        'Any power unit that has an inoperative wiper, or missing or damaged parts that render it ineffective.'
      ]
    }
  ];

  const generateDOTInspectionHTML = (): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ANNUAL VEHICLE INSPECTION REPORT</title>
        <style>
          @page { margin: 0.5in; }
          body { 
            font-family: "Times New Roman", serif; 
            font-size: 10pt; 
            line-height: 1.2; 
            margin: 0; 
            padding: 0;
            color: #000;
          }
          .page-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.25in;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.3in;
          }
          .main-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 0.2in;
            text-transform: uppercase;
          }
          .vehicle-history {
            border: 1px solid #000;
            padding: 0.1in;
            width: 2.5in;
            font-size: 8pt;
          }
          .vehicle-history h3 {
            margin: 0 0 0.1in 0;
            font-size: 9pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
          }
          .history-field {
            margin-bottom: 0.05in;
          }
          .history-field label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.02in;
          }
          .history-field input {
            width: 100%;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 8pt;
          }
          .content-sections {
            display: flex;
            justify-content: space-between;
            gap: 0.3in;
            margin-bottom: 0.3in;
          }
          .left-section {
            width: 60%;
          }
          .right-section {
            width: 35%;
          }
          .field-group {
            margin-bottom: 0.15in;
          }
          .field-group label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .field-group input {
            width: 100%;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 9pt;
            padding: 0.02in 0;
          }
          .checkbox-group {
            margin-bottom: 0.15in;
          }
          .checkbox-group label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            margin-bottom: 0.03in;
          }
          .checkbox {
            display: inline-block;
            width: 0.12in;
            height: 0.12in;
            border: 1px solid #000;
            margin-right: 0.05in;
            position: relative;
          }
          .checkbox.checked::after {
            content: "X";
            position: absolute;
            top: -0.02in;
            left: 0.01in;
            font-size: 8pt;
            font-weight: bold;
          }
          .checkbox-label {
            font-size: 9pt;
            text-transform: uppercase;
          }
          .other-input {
            margin-left: 0.1in;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 8pt;
            width: 1in;
          }
          .inspection-title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin: 0.2in 0;
            text-transform: uppercase;
          }
          .inspection-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0.3in;
            font-size: 8pt;
          }
          .inspection-table th {
            border: 1px solid #000;
            padding: 0.05in;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #f0f0f0;
          }
          .inspection-table td {
            border: 1px solid #000;
            padding: 0.05in;
            vertical-align: top;
          }
          .section-header {
            background-color: #e0e0e0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .component-cell {
            width: 60%;
          }
          .checkbox-cell {
            width: 10%;
            text-align: center;
          }
          .date-cell {
            width: 20%;
          }
          .additional-conditions {
            margin-bottom: 0.3in;
          }
          .additional-conditions label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .additional-conditions textarea {
            width: 100%;
            height: 0.8in;
            border: 1px solid #000;
            padding: 0.05in;
            font-size: 8pt;
            resize: none;
            background: transparent;
          }
          .instructions {
            font-size: 8pt;
            margin-bottom: 0.2in;
            font-style: italic;
          }
          .certification {
            margin-bottom: 0.3in;
          }
          .certification .checkbox-row {
            align-items: flex-start;
          }
          .certification .checkbox-label {
            font-size: 9pt;
            line-height: 1.3;
          }
          .footer {
            text-align: center;
            font-size: 7pt;
            margin-top: 0.5in;
            line-height: 1.2;
          }
          .document-id {
            position: absolute;
            bottom: 0.3in;
            right: 0.5in;
            font-size: 7pt;
          }
          .original-label {
            position: absolute;
            bottom: 0.2in;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="header-section">
            <div class="main-title">Annual Vehicle Inspection Report</div>
            <div class="vehicle-history">
              <h3>Vehicle History Record</h3>
              <div class="history-field">
                <label>Report Number:</label>
                <input type="text" value="" readonly>
              </div>
              <div class="history-field">
                <label>Fleet Unit Number:</label>
                <input type="text" value="" readonly>
              </div>
              <div class="history-field">
                <label>Date:</label>
                <input type="text" value="${new Date().toLocaleDateString()}" readonly>
              </div>
            </div>
          </div>
          
          <div class="content-sections">
            <div class="left-section">
              <div class="field-group">
                <label>Motor Carrier Operator:</label>
                <input type="text" value="${formData.dotInspection.motorCarrierOperator}" readonly>
              </div>
              <div class="field-group">
                <label>Address:</label>
                <input type="text" value="${formData.dotInspection.address}" readonly>
              </div>
              <div class="field-group">
                <label>City, State, Zip Code:</label>
                <input type="text" value="${formData.dotInspection.cityStateZip}" readonly>
              </div>
              <div class="checkbox-group">
                <label>Vehicle Type:</label>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRACTOR' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Tractor</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRAILER' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Trailer</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRUCK' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Truck</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'OTHER' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Other</span>
                  <input type="text" class="other-input" value="${formData.dotInspection.vehicleTypeOther}" readonly>
                </div>
              </div>
            </div>
            
            <div class="right-section">
              <div class="field-group">
                <label>Inspector's Name (Print or Type):</label>
                <input type="text" value="${formData.dotInspection.inspectorName}" readonly>
              </div>
              <div class="checkbox-row">
                <span class="checkbox ${formData.dotInspection.inspectorQualified ? 'checked' : ''}"></span>
                <span class="checkbox-label">This inspector meets the qualification requirements in Section 306.19.</span>
              </div>
              <div class="checkbox-group">
                <label>Vehicle Identification (✓) and Complete:</label>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('LIC. PLATE NO.') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Lic. Plate No.</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('VIN') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">VIN</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('OTHER') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">Other</span>
                </div>
              </div>
              <div class="field-group">
                <label>Inspection Agency Location (Optional):</label>
                <input type="text" value="" readonly>
              </div>
            </div>
          </div>
          
          <div class="inspection-title">Vehicle Components Inspected</div>
          
          <table class="inspection-table">
            <thead>
              <tr>
                <th class="component-cell">Component</th>
                <th class="checkbox-cell">OK</th>
                <th class="checkbox-cell">Needs Repair</th>
                <th class="date-cell">Repaired Date</th>
              </tr>
            </thead>
            <tbody>
              ${dotInspectionItems.map((section, sectionIndex) => `
                <tr class="section-header">
                  <td colspan="4">${section.title}</td>
                </tr>
                ${section.items.map((item, itemIndex) => {
                  const key = `${sectionIndex}-${itemIndex}`;
                  const component = formData.dotInspection.components[key] || {};
                  return `
                    <tr>
                      <td class="component-cell">${item}</td>
                      <td class="checkbox-cell">
                        <span class="checkbox ${component.status === 'OK' ? 'checked' : ''}"></span>
                      </td>
                      <td class="checkbox-cell">
                        <span class="checkbox ${component.status === 'NEEDS_REPAIR' ? 'checked' : ''}"></span>
                      </td>
                      <td class="date-cell">${component.repairedDate || ''}</td>
                    </tr>
                  `;
                }).join('')}
              `).join('')}
            </tbody>
          </table>
          
          <div class="additional-conditions">
            <label>List any other condition which may prevent safe operation of this vehicle:</label>
            <textarea readonly>${formData.dotInspection.additionalConditions}</textarea>
          </div>
          
          <div class="instructions">
            Mark column entries to verify inspection: X OK, X NEEDS REPAIR, NA IF ITEMS DO NOT APPLY, ______ REPAIRED DATE
          </div>
          
          <div class="certification">
            <div class="checkbox-row">
              <span class="checkbox ${formData.dotInspection.certified ? 'checked' : ''}"></span>
              <span class="checkbox-label">This vehicle has passed all the inspection items for the Annual Vehicle Inspection Report in accordance with 49 CFR 396.</span>
            </div>
          </div>
          
          <div class="footer">
            © Copyright 1994 & Published by J. J. KELLER & ASSOCIATES, INC. • Neenah, WI 54057-0368 PRINTED IN THE U.S.A.
          </div>
          
          <div class="document-id">200-FS-C3 Rev. 3/94</div>
          <div class="original-label">Original</div>
        </div>
      </body>
      </html>
    `;
  };

  const generateExactDOTInspectionHTML = (): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ANNUAL VEHICLE INSPECTION REPORT</title>
        <style>
          @page { margin: 0.5in; }
          body { 
            font-family: "Times New Roman", serif; 
            font-size: 10pt; 
            line-height: 1.2; 
            margin: 0; 
            padding: 0;
            color: #000;
          }
          .page-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.25in;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.3in;
          }
          .main-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 0.2in;
            text-transform: uppercase;
          }
          .vehicle-history {
            border: 1px solid #000;
            padding: 0.1in;
            width: 2.5in;
            font-size: 8pt;
          }
          .vehicle-history h3 {
            margin: 0 0 0.1in 0;
            font-size: 9pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
          }
          .history-field {
            margin-bottom: 0.05in;
          }
          .history-field label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.02in;
          }
          .history-field input {
            width: 100%;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 8pt;
          }
          .content-sections {
            display: flex;
            justify-content: space-between;
            gap: 0.3in;
            margin-bottom: 0.3in;
          }
          .left-section {
            width: 60%;
          }
          .right-section {
            width: 35%;
          }
          .field-group {
            margin-bottom: 0.15in;
          }
          .field-group label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .field-group input {
            width: 100%;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 9pt;
            padding: 0.02in 0;
          }
          .checkbox-group {
            margin-bottom: 0.15in;
          }
          .checkbox-group label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            margin-bottom: 0.03in;
          }
          .checkbox {
            display: inline-block;
            width: 0.12in;
            height: 0.12in;
            border: 1px solid #000;
            margin-right: 0.05in;
            position: relative;
          }
          .checkbox.checked::after {
            content: "X";
            position: absolute;
            top: -0.02in;
            left: 0.01in;
            font-size: 8pt;
            font-weight: bold;
          }
          .checkbox-label {
            font-size: 9pt;
            text-transform: uppercase;
          }
          .other-input {
            margin-left: 0.1in;
            border: none;
            border-bottom: 1px solid #000;
            background: transparent;
            font-size: 8pt;
            width: 1in;
          }
          .inspection-title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin: 0.2in 0;
            text-transform: uppercase;
          }
          .inspection-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0.3in;
            font-size: 8pt;
          }
          .inspection-table th {
            border: 1px solid #000;
            padding: 0.05in;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #f0f0f0;
          }
          .inspection-table td {
            border: 1px solid #000;
            padding: 0.05in;
            vertical-align: top;
          }
          .section-header {
            background-color: #e0e0e0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .component-cell {
            width: 60%;
          }
          .checkbox-cell {
            width: 10%;
            text-align: center;
          }
          .date-cell {
            width: 20%;
          }
          .additional-conditions {
            margin-bottom: 0.3in;
          }
          .additional-conditions label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.05in;
            text-transform: uppercase;
          }
          .additional-conditions textarea {
            width: 100%;
            height: 0.8in;
            border: 1px solid #000;
            padding: 0.05in;
            font-size: 8pt;
            resize: none;
            background: transparent;
          }
          .instructions {
            font-size: 8pt;
            margin-bottom: 0.2in;
            font-style: italic;
          }
          .certification {
            margin-bottom: 0.3in;
          }
          .certification .checkbox-row {
            align-items: flex-start;
          }
          .certification .checkbox-label {
            font-size: 9pt;
            line-height: 1.3;
          }
          .footer {
            text-align: center;
            font-size: 7pt;
            margin-top: 0.5in;
            line-height: 1.2;
          }
          .document-id {
            position: absolute;
            bottom: 0.3in;
            right: 0.5in;
            font-size: 7pt;
          }
          .original-label {
            position: absolute;
            bottom: 0.2in;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="header-section">
            <div class="main-title">ANNUAL VEHICLE INSPECTION REPORT</div>
            <div class="vehicle-history">
              <h3>VEHICLE HISTORY RECORD</h3>
              <div class="history-field">
                <label>REPORT NUMBER:</label>
                <input type="text" value="" readonly>
              </div>
              <div class="history-field">
                <label>FLEET UNIT NUMBER:</label>
                <input type="text" value="" readonly>
              </div>
              <div class="history-field">
                <label>DATE:</label>
                <input type="text" value="${new Date().toLocaleDateString()}" readonly>
              </div>
            </div>
          </div>
          
          <div class="content-sections">
            <div class="left-section">
              <div class="field-group">
                <label>MOTOR CARRIER OPERATOR:</label>
                <input type="text" value="${formData.dotInspection.motorCarrierOperator}" readonly>
              </div>
              <div class="field-group">
                <label>ADDRESS:</label>
                <input type="text" value="${formData.dotInspection.address}" readonly>
              </div>
              <div class="field-group">
                <label>CITY, STATE, ZIP CODE:</label>
                <input type="text" value="${formData.dotInspection.cityStateZip}" readonly>
              </div>
              <div class="checkbox-group">
                <label>VEHICLE TYPE:</label>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRACTOR' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">TRACTOR</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRAILER' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">TRAILER</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'TRUCK' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">TRUCK</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleType === 'OTHER' ? 'checked' : ''}"></span>
                  <span class="checkbox-label">(OTHER)</span>
                  <input type="text" class="other-input" value="${formData.dotInspection.vehicleTypeOther}" readonly>
                </div>
              </div>
            </div>
            
            <div class="right-section">
              <div class="field-group">
                <label>INSPECTOR'S NAME (PRINT OR TYPE):</label>
                <input type="text" value="${formData.dotInspection.inspectorName}" readonly>
              </div>
              <div class="checkbox-row">
                <span class="checkbox ${formData.dotInspection.inspectorQualified ? 'checked' : ''}"></span>
                <span class="checkbox-label">THIS INSPECTOR MEETS THE QUALIFICATION REQUIREMENTS IN SECTION 306.19.</span>
              </div>
              <div class="checkbox-group">
                <label>VEHICLE IDENTIFICATION (✓) AND COMPLETE:</label>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('LIC. PLATE NO.') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">LIC. PLATE NO.</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('VIN') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">VIN</span>
                </div>
                <div class="checkbox-row">
                  <span class="checkbox ${formData.dotInspection.vehicleIdentification.includes('OTHER') ? 'checked' : ''}"></span>
                  <span class="checkbox-label">OTHER</span>
                </div>
              </div>
              <div class="field-group">
                <label>INSPECTION AGENCY LOCATION (OPTIONAL):</label>
                <input type="text" value="" readonly>
              </div>
            </div>
          </div>
          
          <div class="inspection-title">VEHICLE COMPONENTS INSPECTED</div>
          
          <table class="inspection-table">
            <thead>
              <tr>
                <th class="component-cell">Component</th>
                <th class="checkbox-cell">OK</th>
                <th class="checkbox-cell">NEEDS REPAIR</th>
                <th class="date-cell">REPAIRED DATE</th>
              </tr>
            </thead>
            <tbody>
              ${dotInspectionItems.map((section, sectionIndex) => `
                <tr class="section-header">
                  <td colspan="4">${section.title}</td>
                </tr>
                ${section.items.map((item, itemIndex) => {
                  const key = `${sectionIndex}-${itemIndex}`;
                  const component = formData.dotInspection.components[key] || {};
                  return `
                    <tr>
                      <td class="component-cell">${item}</td>
                      <td class="checkbox-cell">
                        <span class="checkbox ${component.status === 'OK' ? 'checked' : ''}"></span>
                      </td>
                      <td class="checkbox-cell">
                        <span class="checkbox ${component.status === 'NEEDS_REPAIR' ? 'checked' : ''}"></span>
                      </td>
                      <td class="date-cell">${component.repairedDate || ''}</td>
                    </tr>
                  `;
                }).join('')}
              `).join('')}
            </tbody>
          </table>
          
          <div class="additional-conditions">
            <label>List any other condition which may prevent safe operation of this vehicle.</label>
            <textarea readonly>${formData.dotInspection.additionalConditions}</textarea>
          </div>
          
          <div class="instructions">
            MARK COLUMN ENTRIES TO VERIFY INSPECTION: X OK, X NEEDS REPAIR, NA IF ITEMS DO NOT APPLY, ______ REPAIRED DATE
          </div>
          
          <div class="certification">
            <div class="checkbox-row">
              <span class="checkbox ${formData.dotInspection.certified ? 'checked' : ''}"></span>
              <span class="checkbox-label">THIS VEHICLE HAS PASSED ALL THE INSPECTION ITEMS FOR THE ANNUAL VEHICLE INSPECTION REPORT IN ACCORDANCE WITH 49 CFR 396.</span>
            </div>
          </div>
          
          <div class="footer">
            © Copyright 1994 & Published by J. J. KELLER & ASSOCIATES, INC. • Neenah, WI 54057-0368 PRINTED IN THE U.S.A.
          </div>
          
          <div class="document-id">200-FS-C3 Rev. 3/94</div>
          <div class="original-label">ORIGINAL</div>
        </div>
      </body>
      </html>
    `;
  };

  const generateOriginalImageHTML = (): string => {
    // This function will use the exact DOT form template and populate it with form data
    const template = `
      <!DOCTYPE html>
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="utf-8"/>
        <title>DOT Inspection Form</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
          .form-container { width: 8.5in; height: 11in; margin: 0 auto; position: relative; background: white; }
          .form-field { position: absolute; border-bottom: 1px solid black; min-height: 16px; padding: 1px 3px; }
          .checkbox { position: absolute; width: 12px; height: 12px; border: 1px solid black; }
          .checkbox.checked::after { content: "X"; position: absolute; top: -2px; left: 1px; font-weight: bold; font-size: 10px; }
          .form-text { position: absolute; font-size: 10pt; }
          @media print { body { margin: 0; } .form-container { width: 100%; height: 100%; } }
        </style>
      </head>
      <body>
        <div class="form-container">
          <!-- Header -->
          <div class="form-text" style="top: 20px; left: 50%; transform: translateX(-50%); font-size: 24pt; font-weight: bold; text-align: center;">
            ANNUAL VEHICLE INSPECTION REPORT
          </div>
          
          <!-- Motor Carrier/Operator -->
          <div class="form-text" style="top: 80px; left: 30px; font-size: 10pt;">MOTOR CARRIER OPERATOR</div>
          <div class="form-field" style="top: 95px; left: 200px; width: 300px;">${formData.dotInspection.motorCarrierOperator || ''}</div>
          
          <!-- Address -->
          <div class="form-text" style="top: 120px; left: 30px; font-size: 10pt;">ADDRESS</div>
          <div class="form-field" style="top: 135px; left: 200px; width: 300px;">${formData.dotInspection.address || ''}</div>
          
          <!-- City, State, ZIP -->
          <div class="form-text" style="top: 160px; left: 30px; font-size: 10pt;">CITY, STATE, ZIP CODE</div>
          <div class="form-field" style="top: 175px; left: 200px; width: 300px;">${formData.dotInspection.cityStateZip || ''}</div>
          
          <!-- Inspector Name -->
          <div class="form-text" style="top: 200px; left: 30px; font-size: 10pt;">INSPECTOR'S NAME</div>
          <div class="form-field" style="top: 215px; left: 200px; width: 300px;">${formData.dotInspection.inspectorName || ''}</div>
          
          <!-- Vehicle Type -->
          <div class="form-text" style="top: 240px; left: 30px; font-size: 10pt;">VEHICLE TYPE</div>
          <div class="form-field" style="top: 255px; left: 200px; width: 300px;">${formData.dotInspection.vehicleType || ''}</div>
          
          <!-- Vehicle Identification Checkboxes -->
          <div class="form-text" style="top: 280px; left: 30px; font-size: 10pt;">VEHICLE IDENTIFICATION</div>
          <div class="checkbox ${formData.dotInspection.vehicleIdentification?.includes('Truck') ? 'checked' : ''}" style="top: 295px; left: 200px;"></div>
          <div class="form-text" style="top: 295px; left: 220px; font-size: 10pt;">TRUCK</div>
          <div class="checkbox ${formData.dotInspection.vehicleIdentification?.includes('Tractor') ? 'checked' : ''}" style="top: 295px; left: 280px;"></div>
          <div class="form-text" style="top: 295px; left: 300px; font-size: 10pt;">TRACTOR</div>
          <div class="checkbox ${formData.dotInspection.vehicleIdentification?.includes('Trailer') ? 'checked' : ''}" style="top: 295px; left: 360px;"></div>
          <div class="form-text" style="top: 295px; left: 380px; font-size: 10pt;">TRAILER</div>
          <div class="checkbox ${formData.dotInspection.vehicleIdentification?.includes('Bus') ? 'checked' : ''}" style="top: 295px; left: 440px;"></div>
          <div class="form-text" style="top: 295px; left: 460px; font-size: 10pt;">BUS</div>
          <div class="checkbox ${formData.dotInspection.vehicleIdentification?.includes('Other') ? 'checked' : ''}" style="top: 295px; left: 520px;"></div>
          <div class="form-text" style="top: 295px; left: 540px; font-size: 10pt;">OTHER</div>
          
          <!-- Inspector Qualification -->
          <div class="form-text" style="top: 320px; left: 30px; font-size: 10pt;">INSPECTOR QUALIFICATION</div>
          <div class="checkbox ${formData.dotInspection.inspectorQualified ? 'checked' : ''}" style="top: 335px; left: 200px;"></div>
          <div class="form-text" style="top: 335px; left: 220px; font-size: 10pt;">This inspector meets the qualification requirements in Section 396.19</div>
          
          <!-- Vehicle Components Inspection -->
          <div class="form-text" style="top: 360px; left: 30px; font-size: 12pt; font-weight: bold;">VEHICLE COMPONENTS INSPECTED</div>
          
          <!-- Component sections -->
          ${dotInspectionItems.map((section, sectionIndex) => `
            <div class="form-text" style="top: ${385 + sectionIndex * 120}px; left: 30px; font-size: 11pt; font-weight: bold;">${section.title}</div>
            ${section.items.map((item, itemIndex) => {
              const componentKey = `${sectionIndex}-${itemIndex}`;
              const component = formData.dotInspection.components[componentKey];
              const yPos = 400 + sectionIndex * 120 + itemIndex * 20;
              return `
                <div class="form-text" style="top: ${yPos}px; left: 50px; font-size: 9pt;">${item}</div>
                <div class="checkbox ${component?.status === 'OK' ? 'checked' : ''}" style="top: ${yPos}px; left: 400px;"></div>
                <div class="form-text" style="top: ${yPos}px; left: 420px; font-size: 9pt;">OK</div>
                <div class="checkbox ${component?.status === 'NEEDS_REPAIR' ? 'checked' : ''}" style="top: ${yPos}px; left: 460px;"></div>
                <div class="form-text" style="top: ${yPos}px; left: 480px; font-size: 9pt;">NEEDS REPAIR</div>
                <div class="form-field" style="top: ${yPos}px; left: 540px; width: 80px; font-size: 8pt;">${component?.repairedDate || ''}</div>
              `;
            }).join('')}
          `).join('')}
          
          <!-- Additional Conditions -->
          <div class="form-text" style="top: 900px; left: 30px; font-size: 11pt; font-weight: bold;">ADDITIONAL CONDITIONS</div>
          <div class="form-field" style="top: 920px; left: 30px; width: 500px; height: 60px; border: 1px solid black; padding: 5px;">${formData.dotInspection.additionalConditions || ''}</div>
          
          <!-- Certification -->
          <div class="form-text" style="top: 1000px; left: 30px; font-size: 11pt; font-weight: bold;">CERTIFICATION</div>
          <div class="checkbox ${formData.dotInspection.certified ? 'checked' : ''}" style="top: 1020px; left: 30px;"></div>
          <div class="form-text" style="top: 1020px; left: 50px; font-size: 10pt;">I certify that this inspection was performed in accordance with DOT standards and regulations.</div>
          
          <!-- Footer -->
          <div class="form-text" style="top: 1050px; left: 30px; font-size: 8pt; text-align: center; width: 100%;">
            © Copyright 1994 & Published by J. J. KELLER & ASSOCIATES, INC. • Neenah, WI 54957-0368 • 200-FS-C3 • Rev. 3/94
          </div>
        </div>
      </body>
      </html>
    `;
    
    return template;
  };

  const loadJobInfo = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      console.log('Loading job info for job ID:', jobId);
      
      // Step 1: Get basic job data first
      const { data: jobInfo, error: jobError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('job_number, customer_id, title')
        .eq('id', jobId)
        .single();

      if (jobError) {
        console.error('Error fetching basic job info:', jobError);
        throw jobError;
      }

      console.log('Basic job info retrieved:', jobInfo);

      if (!jobInfo?.customer_id) {
        console.error('No customer_id found in job data');
        throw new Error('No customer ID found for this job');
      }

      // Step 2: Try to get customer data from lab_customers table
      let customerData: CustomerData | null = null;
      let customerIdForAssetGen = '1'; // Default value
      
      try {
        // First try with schema
        console.log('Trying to fetch lab customer with schema...');
        const { data: labCustomer, error: labCustomerError } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .select('id, company_id, name, company_name, address')
          .eq('id', jobInfo.customer_id)
          .maybeSingle();

        if (labCustomerError) {
          console.warn('Error fetching lab customer with schema, trying without schema:', labCustomerError);
          
          // Try without schema
          const { data: labCustomerNoSchema, error: labCustomerNoSchemaError } = await supabase
            .from('lab_customers')
            .select('id, company_id, name, company_name, address')
            .eq('id', jobInfo.customer_id)
            .maybeSingle();
            
          if (labCustomerNoSchemaError) {
            console.warn('Error fetching lab customer without schema:', labCustomerNoSchemaError);
          } else if (labCustomerNoSchema) {
            console.log('Found lab customer without schema:', labCustomerNoSchema);
            customerData = labCustomerNoSchema as CustomerData;
            
            // If we have a company_id, use it for asset generation
            if (labCustomerNoSchema.company_id) {
              customerIdForAssetGen = labCustomerNoSchema.company_id;
              console.log('Using company_id from lab customer for asset generation:', customerIdForAssetGen);
            }
          }
        } else if (labCustomer) {
          console.log('Found lab customer with schema:', labCustomer);
          customerData = labCustomer as CustomerData;
          
          // If we have a company_id, use it for asset generation
          if (labCustomer.company_id) {
            customerIdForAssetGen = labCustomer.company_id;
            console.log('Using company_id from lab customer for asset generation:', customerIdForAssetGen);
          }
        } else {
          console.log('No lab customer found for ID:', jobInfo.customer_id);
        }
      } catch (error) {
        console.warn('Error in lab customer fetch, will try fallback:', error);
      }

      // Step 3: If lab_customer not found, try common.customers as fallback
      if (!customerData) {
        try {
          const { data: commonCustomer, error: commonCustomerError } = await supabase
            .from('customers') // Try without schema first
            .select('id, company_id, name, company_name, address')
            .eq('id', jobInfo.customer_id)
            .maybeSingle();

          if (!commonCustomerError && commonCustomer) {
            console.log('Found common customer as fallback:', commonCustomer);
            customerData = commonCustomer as CustomerData;
            
            // If we have a company_id, use it for asset generation
            if (commonCustomer.company_id) {
              customerIdForAssetGen = commonCustomer.company_id;
              console.log('Using company_id from common customer for asset generation:', customerIdForAssetGen);
            }
          } else {
            console.log('No common customer found either, using defaults');
          }
        } catch (error) {
          console.warn('Error in common customer fallback:', error);
        }
      }

      // Update form data with job and customer info - with fallbacks for everything
      setFormData(prevData => ({
        ...prevData,
        customer: customerData?.company_name || customerData?.name || 'Unknown Customer',
        address: customerData?.address || '',
        jobNumber: jobInfo.job_number || '',
        customerId: jobInfo.customer_id || '',
        customerIdForAsset: customerIdForAssetGen // Store the company_id or default
      }));

    } catch (error) {
      console.error('Error loading job info:', error);
      setError('Failed to load job information');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    if (!reportId) { 
      setLoading(false); 
      setIsEditing(true); 
      console.log('No reportId found - setting isEditing to true for new report');
      return; 
    }

    try {
      setLoading(true);
      console.log('Loading existing report with ID:', reportId);
      const { data: reportData, error: reportError } = await supabase
        .schema(SCHEMA)
        .from(CALIBRATION_BUCKET_TRUCK_TABLE)
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      if (reportData) {
        console.log('Loaded report data:', reportData);
        setFormData(prev => ({
          ...prev,
          ...reportData.report_info,
          status: reportData.report_info.status || reportData.status || 'PASS'
        }));
        
        // Set the status from the loaded data
        const loadedStatus = reportData.report_info.status || reportData.status || 'PASS';
        console.log('Setting status to:', loadedStatus);
        setStatus(loadedStatus as 'PASS' | 'FAIL');
        
        // Only set editing to false for existing reports
        setIsEditing(false);
        console.log('Existing report loaded - setting isEditing to false');
      }
    } catch (error) {
      const err = error as SupabaseError;
      console.error('Error loading report:', err);
      toast.error(`Failed to load report: ${err.message}`);
      
      // If loading fails and this is a new report, ensure we stay in edit mode
      if (!reportId) {
        setIsEditing(true);
        console.log('Error loading but no reportId - setting isEditing to true');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('handleSave called!', { 
      jobId, 
      userId: user?.id, 
      isEditing, 
      reportId,
      status: status,
      formDataStatus: formData.bucketTruckData.passFailStatus
    });
    
    if (!jobId || !user?.id) {
      toast.error('Missing job or user information');
      return null;
    }

    if (!isEditing) {
      console.log('Cannot save: not in editing mode');
      toast.error('Cannot save: report is not in editing mode');
      return null;
    }

    setLoading(true);

    try {
      // Make sure we have a valid customerIdForAsset, defaulting to '1' if not available
      // Use any stored value, or extract it from customerId if possible
      let idForAssetGeneration = formData.customerIdForAsset || '1';
      
      // If it's a UUID (contains hyphens), use '1' as default
      if (idForAssetGeneration.includes('-')) {
        console.log('Customer ID appears to be a UUID, using default "1" instead');
        idForAssetGeneration = '1';
      }
      
      console.log('Starting save process with:', {
        customerId: formData.customerId,
        customerIdForAsset: idForAssetGeneration
      });

      // For new reports, only generate an asset ID at save time
      let assetIdToUse = formData.bucketTruckData.assetId;
      
      if (!reportId && !assetIdToUse) {
        try {
          console.log('Generating Asset ID for new report');
          const nextAssetId = await getNextAssetId(idForAssetGeneration);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            assetIdToUse = nextAssetId;
          } else {
            console.error('Failed to generate Asset ID');
          }
        } catch (error) {
          console.error('Error generating Asset ID:', error);
        }
      }

      // Update the form data with the asset ID if we have one
      const reportData = {
        ...formData,
        bucketTruckData: {
          ...formData.bucketTruckData,
          assetId: assetIdToUse
        }
      };

      let savedReportId = reportId;

      // Save or update the report
      if (reportId) {
        console.log('Updating existing report:', reportId);
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .update({
            report_info: reportData,
            updated_at: new Date().toISOString(),
            status: reportData.bucketTruckData.passFailStatus
          })
          .eq('id', reportId)
          .select('id')
          .single();

        if (error) throw error;
        savedReportId = data.id;
      } else {
        console.log('Creating new report');
        const { data, error } = await supabase
          .schema('lab_ops')
          .from('calibration_bucket_truck_reports')
          .insert({
            job_id: jobId,
            report_info: reportData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: user.id,
            status: reportData.bucketTruckData.passFailStatus
          })
          .select('id')
          .single();

        if (error) throw error;
        savedReportId = data.id;
        console.log('New report created with ID:', savedReportId);
      }

      // Create asset record only for new reports
      if (savedReportId && !reportId) {
        const assetName = `Bucket Truck Report - ${formData.bucketTruckData.manufacturer || ''} - ${new Date().toLocaleDateString()}`;
        const assetUrl = `report:/jobs/${jobId}/calibration-bucket-truck/${savedReportId}`;

        console.log('Creating asset record with name:', assetName);
        console.log('Asset URL:', assetUrl);

        try {
          const assetResult = await createCalibrationAsset(
            jobId,
            formData.customerId,  // UUID for database relations
            assetName,
            assetUrl,
            user.id,
            idForAssetGeneration,  // Pass the numeric ID for asset generation
            // Don't pass parent report ID for bucket truck itself since it's the main report
            undefined
          );

          if (!assetResult) {
            console.error('Failed to create asset, but report was saved');
            toast.error('Report saved, but there was an issue creating the asset record');
          } else {
            console.log('Asset created successfully:', assetResult);
          }
        } catch (assetError) {
          console.error('Error creating asset:', assetError);
          toast.error('Report saved, but there was an issue creating the asset record');
        }
      }

      setLoading(false);
      toast.success(reportId ? 'Report updated!' : 'Report saved!');

      // Only exit edit mode and update reportId when saving a new report
      if (!reportId && savedReportId) {
        setIsEditing(false);
        setReportId(savedReportId);
      }

      // Don't navigate away automatically - let user click back button when ready
      
      return savedReportId;
    } catch (error: any) {
      console.error('Failed to save report:', error);
      setLoading(false);
      toast.error(`Error: ${error.message || 'Failed to save report'}`);
      return null;
    }
  };

  const handlePrint = async () => {
    console.log('Print button clicked!');
    
    // Create a custom PDF layout
    const pdfContent = document.createElement('div');
    pdfContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: black; background: white; font-size: 12px;">
        <!-- Header -->
        <div style="margin-bottom: 15px;">
          <!-- AMP CALIBRATION Logo Area -->
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <img src="/img/amp-cal-logo.png" 
                 alt="AMP Calibration Logo" 
                 style="height: 60px; margin-right: 8px;" />
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; color: black;">Bucket Truck Test Certificate</h2>
        </div>

        <!-- Main Content - Two Column Layout -->
        <div style="display: flex; margin-bottom: 15px;">
          <!-- Left Column - Overview -->
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Overview</h3>
            
            <div style="margin-bottom: 6px;"><strong>Customer Name:</strong></div>
            <div style="margin-bottom: 8px;">${formData.customer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Project #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.jobNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>AMP ID:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.assetId}</div>
            
            <div style="margin-bottom: 6px;"><strong>Manufacturer:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.manufacturer}</div>
            
            <div style="margin-bottom: 6px;"><strong>Model:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.model}</div>
            
            <div style="margin-bottom: 6px;"><strong>Serial #:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.serialNumber}</div>
            
            <div style="margin-bottom: 6px;"><strong>Year:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.year}</div>
          </div>

          <!-- Right Column - Result -->
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black;">Result <span style="color: ${status === 'PASS' ? 'green' : 'red'};">${status}</span></h3>
            
            <div style="margin-bottom: 6px;"><strong>Test Date:</strong></div>
            <div style="margin-bottom: 8px;">${formData.date}</div>
            
            <div style="margin-bottom: 6px;"><strong>Test Voltage:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.qualificationVoltage}</div>
            
            <div style="margin-bottom: 6px;"><strong>Upper Boom Reading:</strong></div>
            <div style="margin-bottom: 8px;">${formData.bucketTruckData.upperBoomReading}</div>
          </div>
        </div>

        <!-- Equipment Used Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Equipment Used</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Calibration Standard</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Serial #</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Date</th>
                <th style="padding: 4px; border: 1px solid #ccc; text-align: left; font-weight: bold;">Cal Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment.name || 'Hipotronics 880PL-A'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">${formData.testEquipment.serialNumber || 'M010164'}</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2025</td>
                <td style="padding: 4px; border: 1px solid #ccc;">6/1/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Quality Assurance Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Quality Assurance</h3>
          
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 6px;"><strong>Reviewed By:</strong> Kirk Crupi</div>
          </div>
        </div>

        <!-- Comments Section -->
        ${formData.comments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: black; text-decoration: underline;">Comments</h3>
          <div style="padding: 6px; border: 1px solid #ccc; background: #f9f9f9; min-height: 30px; font-size: 11px;">
            ${formData.comments}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="position: relative; margin-top: 40px;">
          <!-- Signature Image -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/img/signature.png" 
                 alt="Signature" 
                 style="height: 150px; width: auto; display: block; margin: 0 auto;" />
          </div>
          
          <!-- Limited Liability -->
          <div style="margin-top: 10px;">
            <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: black; text-decoration: underline;">Limited Liability</h4>
            <p style="font-size: 10px; line-height: 1.3; margin: 0; color: #333;">
              The tests guarantee the equipment is functioning within product specifications when it leaves the AMP Calibration Services Lab. AMP and/or any of our partners will not assume any liability incurred during the use of this unit should it not perform properly for any reason.
            </p>
          </div>
        </div>
      </div>
    `;

    console.log('Starting PDF generation with custom layout...');

    const options = {
      margin: 0.5,
      filename: `Bucket_Truck_Report_${formData.bucketTruckData.assetId || 'New'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait'
      }
    };

    try {
      console.log('Calling html2pdf with custom content...');
      await html2pdf().from(pdfContent).set(options).save();
      console.log('PDF generated successfully');
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const loadTestHistory = async (reportId: string) => {
    if (!reportId) return;
    
    try {
      setLoadingTestHistory(true);
      const { data, error } = await supabase
        .schema('lab_ops')
        .from('bucket_truck_test_history')
        .select(`
          id,
          test_date,
          test_result,
          tested_by,
          test_notes,
          created_at
        `)
        .eq('bucket_truck_report_id', reportId)
        .order('test_date', { ascending: false });

      if (error) throw error;

      if (data) {
        // For now, let's use a simpler approach - just show the user ID
        // We can improve this later when the profiles table is properly set up
        const historyWithNames: TestHistoryEntry[] = data.map(entry => ({
          id: entry.id,
          test_date: entry.test_date,
          test_result: entry.test_result,
          tested_by_email: `User ${entry.tested_by?.slice(0, 8)}...` || 'Unknown User',
          test_notes: entry.test_notes
        }));

        setTestHistory(historyWithNames);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
      setError(`Failed to load test history: ${(error as Error).message}`);
    } finally {
      setLoadingTestHistory(false);
    }
  };

  const addTestHistoryEntry = async (testResult: 'PASS' | 'FAIL', notes?: string, reportIdToUse?: string) => {
    const targetReportId = reportIdToUse || reportId;
    if (!targetReportId || !user?.id) {
      console.warn('Cannot add test history entry: missing reportId or user.id', { targetReportId, userId: user?.id });
      return;
    }

    try {
      console.log('Adding test history entry:', { targetReportId, testResult, userId: user.id, notes });
      
      const { data, error } = await supabase
        .schema('lab_ops')
        .from('bucket_truck_test_history')
        .insert({
          bucket_truck_report_id: targetReportId,
          test_result: testResult,
          tested_by: user.id,
          test_notes: notes || null
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding test history:', error);
        throw error;
      }

      console.log('Successfully added test history entry:', data);

      // Use the current user's email or a shortened user ID
      const userName = user.email || `User ${user.id.slice(0, 8)}...`;

      // Add the new entry to the local state immediately with the user's name
      const newEntry: TestHistoryEntry = {
        id: data.id,
        test_date: data.test_date,
        test_result: data.test_result,
        tested_by_email: userName, // Now displays the user's email or shortened ID
        test_notes: data.test_notes
      };

      setTestHistory(prev => [newEntry, ...prev]); // Add to the beginning of the list
    } catch (error) {
      console.error('Error adding test history entry:', error);
      setError(`Failed to add test history entry: ${(error as Error).message}`);
    }
  };

  useEffect(() => { 
    const fetchData = async () => { 
      await loadJobInfo(); 
      await loadReport(); 
      
      // Load test history if report exists
      if (reportId) {
        await loadTestHistory(reportId);
      }
    }; 
    fetchData(); 
  }, [jobId, reportId]);

  // Debug state values
  useEffect(() => {
    console.log('State Debug:', { 
      isEditing, 
      urlReportId, 
      reportId, 
      loading, 
      jobId,
      hasUser: !!user?.id 
    });
  }, [isEditing, urlReportId, reportId, loading, jobId, user]);

  // Ensure new reports start in edit mode
  useEffect(() => {
    if (!urlReportId && !reportId && !loading) {
      console.log('Ensuring new report starts in edit mode');
      setIsEditing(true);
    }
  }, [urlReportId, reportId, loading]);

  // Sync the top-level status with the passFailStatus in form data
  useEffect(() => {
    handleBucketTruckDataChange('passFailStatus', status);
  }, [status]);

  // Sync status state variables when form data changes (for loaded reports)
  useEffect(() => {
    if (formData.bucketTruckData.passFailStatus && formData.bucketTruckData.passFailStatus !== status) {
      setStatus(formData.bucketTruckData.passFailStatus as 'PASS' | 'FAIL');
    }
  }, [formData.bucketTruckData.passFailStatus]);

  // Sync URL parameter with state when URL changes
  useEffect(() => {
    setReportId(urlReportId || null);
    
    // Don't clear the Asset ID for new reports - let the generation logic handle it
  }, [urlReportId]);

  // Add an effect to generate the Asset ID on load for new reports
  useEffect(() => {
    // Only run for new reports (no reportId) after we have customer data
    if (!urlReportId && formData.customerIdForAsset && !formData.bucketTruckData.assetId) {
      console.log('Triggering Asset ID generation - customerIdForAsset:', formData.customerIdForAsset);
      const generateAssetId = async () => {
        try {
          // Ensure we have a string value for the customer ID
          const customerIdForAssetGen = formData.customerIdForAsset || '1';
          console.log('Generating Asset ID on form load for:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          } else {
            console.log('Failed to generate Asset ID - nextAssetId is null/undefined');
          }
        } catch (error) {
          console.error('Error generating Asset ID on load:', error);
        }
      };
      
      generateAssetId();
    } else {
      console.log('Asset ID generation skipped:', {
        urlReportId,
        customerIdForAsset: formData.customerIdForAsset,
        currentAssetId: formData.bucketTruckData.assetId
      });
    }
  }, [urlReportId, formData.customerIdForAsset, formData.bucketTruckData.assetId]);

  // Additional effect to generate Asset ID when customer data becomes available
  useEffect(() => {
    // Generate Asset ID for new reports when customer data is loaded
    if (!urlReportId && formData.customerId && !formData.bucketTruckData.assetId) {
      console.log('Triggering Asset ID generation - customerId:', formData.customerId);
      const generateAssetId = async () => {
        try {
          const customerIdForAssetGen = formData.customerId || '1';
          console.log('Generating Asset ID after customer data load for:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          } else {
            console.log('Failed to generate Asset ID - nextAssetId is null/undefined');
          }
        } catch (error) {
          console.error('Error generating Asset ID after customer load:', error);
        }
      };
      
      generateAssetId();
    } else {
      console.log('Asset ID generation (customer) skipped:', {
        urlReportId,
        customerId: formData.customerId,
        currentAssetId: formData.bucketTruckData.assetId
      });
    }
  }, [urlReportId, formData.customerId, formData.bucketTruckData.assetId]);

  // Fallback effect to generate Asset ID if it's still missing after a delay
  useEffect(() => {
    if (!urlReportId && !formData.bucketTruckData.assetId) {
      const timer = setTimeout(() => {
        console.log('Fallback Asset ID generation triggered');
        const generateAssetId = async () => {
          try {
            // Use a default customer ID if none is available
            const customerIdForAssetGen = formData.customerId || formData.customerIdForAsset || '1';
            console.log('Fallback generating Asset ID for:', customerIdForAssetGen);
            const nextAssetId = await getNextAssetId(customerIdForAssetGen);
            
            if (nextAssetId) {
              console.log('Fallback generated Asset ID:', nextAssetId);
              setFormData(prev => ({
                ...prev,
                bucketTruckData: {
                  ...prev.bucketTruckData,
                  assetId: nextAssetId
                }
              }));
            }
          } catch (error) {
            console.error('Error in fallback Asset ID generation:', error);
          }
        };
        
        generateAssetId();
      }, 1000); // Wait 1 second for customer data to load
      
      return () => clearTimeout(timer);
    }
  }, [urlReportId, formData.bucketTruckData.assetId, formData.customerId, formData.customerIdForAsset]);

  // Asset management effects and functions
  useEffect(() => {
    if (jobId) {
      fetchJobAssets();
    }
  }, [jobId, reportId]);

  useEffect(() => {
    // Filter job assets when search query changes
    if (searchQuery.trim() === '') {
      setFilteredJobAssets(jobAssets);
    } else {
      const filtered = jobAssets.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobAssets(filtered);
    }
  }, [searchQuery, jobAssets]);

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter report templates based on search
  const filteredReportTemplates = reportSearchQuery.trim() === '' 
    ? defaultAssets        .filter(asset => 
          !['calibration-gloves', 'calibration-sleeve', 'calibration-bucket-truck', 'calibration-digger'].includes(asset.id)
        )
    : defaultAssets.filter(asset => 
        asset.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) &&
        !['calibration-gloves', 'calibration-sleeve', 'calibration-bucket-truck', 'calibration-digger'].includes(asset.id)
      );

  // Fetch job assets function - only for this specific bucket truck report
  async function fetchJobAssets() {
    if (!jobId) return;
    
    try {
      console.log(`Fetching assets for Bucket Truck Report ${urlReportId || 'new'}`);
      
      // For calibration jobs, fetch assets linked to this specific bucket truck report
      let query = supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('*')
        .eq('job_id', jobId)
        .is('deleted_at', null); // Exclude soft-deleted assets
      
      // If we have a reportId, only show assets linked to this specific report
      if (urlReportId) {
        query = query.eq('report_id', urlReportId);
      } else {
        // For new reports, don't show any assets yet
        setJobAssets([]);
        setFilteredJobAssets([]);
        return;
      }
        
      const { data, error } = await query;
        
      if (error) {
        console.error('Error fetching bucket truck report assets:', error);
        throw error;
      }
      
      const assetsData = data || [];
      console.log(`Retrieved ${assetsData.length} bucket truck report assets:`, assetsData);
      
      // Transform the assets
      const transformedAssets: Asset[] = [];
      
      for (const asset of assetsData) {
        transformedAssets.push({
          id: asset.id,
          name: asset.name,
          file_url: asset.file_url,
          created_at: asset.created_at,
          asset_id: asset.asset_id
        });
      }
      
      // Process the assets to add userAssetId
      const enhancedAssets: EnhancedAsset[] = await Promise.all(
        transformedAssets.map(async (asset: Asset): Promise<EnhancedAsset> => {
          let userAssetId = '';
          
          // Use asset_id if available
          if (asset.asset_id) {
            userAssetId = asset.asset_id;
          }
          
          return {
            ...asset,
            userAssetId
          };
        })
      );
      
      setJobAssets(enhancedAssets);
      setFilteredJobAssets(enhancedAssets);
      
    } catch (error) {
      console.error('Error fetching bucket truck report assets:', error);
    }
  }

  // Handle file change for asset upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle file upload for adding a new asset
  const handleFileUpload = async () => {
    if (!jobId) {
      toast.error('Job ID is missing');
      return;
    }

    // For document uploads
    if (!selectedFile || !newAssetName.trim()) {
      toast.error('Please provide a file and asset name');
      return;
    }

    // If this is a new report, save it first to get a reportId
    if (!urlReportId) {
      toast.error('Please save the report first before adding assets');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `job-assets/${jobId}/${fileName}`;

      setUploadProgress(10);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      setUploadProgress(70);

      // 2. Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 2.5. Generate Asset ID for the uploaded document
      const customerIdForAsset = formData.customerId || formData.customerIdForAsset || '1';
      console.log('Generating Asset ID for uploaded document, customer:', customerIdForAsset);
      const generatedAssetId = await getNextAssetId(customerIdForAsset);
      console.log('Generated Asset ID for document:', generatedAssetId);

      // 3. Create asset record in lab_assets linked to both job and this specific report
      const { data: assetData, error: assetError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .insert({
          name: newAssetName,
          file_url: publicUrl,
          job_id: jobId,
          report_id: urlReportId, // Link to this specific bucket truck report
          user_id: user?.id,
          asset_id: generatedAssetId, // Add the generated Asset ID
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (assetError) throw assetError;

      setUploadProgress(100);
      toast.success('Asset added successfully!');
      
      // Reset form
      setNewAssetName('');
      setSelectedFile(null);
      setShowUploadDialog(false);
      
      // Refresh job assets
      fetchJobAssets();
    } catch (error) {
      console.error('Error uploading asset:', error);
      toast.error('Failed to upload asset');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete asset function
  const handleDeleteAsset = async () => {
    if (!assetToDelete || !jobId) {
      toast.error('Unable to delete asset');
      return;
    }

    try {
      console.log('Deleting asset:', assetToDelete);
      
      // For calibration division, soft delete by setting deleted_at timestamp
      const { error: deleteError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assetToDelete.id);

      if (deleteError) {
        console.error('Error deleting lab asset:', deleteError);
        throw deleteError;
      }
      
      // If this is a document (not a report), also delete the file from storage
      if (!assetToDelete.file_url.startsWith('report:')) {
        const url = new URL(assetToDelete.file_url);
        const filePath = url.pathname.substring(url.pathname.indexOf('assets/') + 7);
        
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('assets')
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      }

      // Refresh the UI
      fetchJobAssets();
      
      // Reset state and notify user
      setShowDeleteConfirm(false);
      setAssetToDelete(null);
      toast.success('Asset deleted successfully');
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  // Get report edit path function
  const getReportEditPath = (asset: Asset) => {
    const urlContent = asset.file_url.split(':/')[1];
    const pathSegments = urlContent.split('/');

    if (pathSegments[0] !== 'jobs' || !pathSegments[1] || !pathSegments[2]) {
      return `/jobs/${jobId}`;
    }

    const jobIdSegment = pathSegments[1];
    let reportNameSlug = pathSegments[2];
    const reportIdFromUrl = pathSegments[3];

    if (reportNameSlug.includes('?')) {
      reportNameSlug = reportNameSlug.split('?')[0];
    }
    
    const reportPathMap: { [key: string]: string } = {
      'calibration-gloves': 'calibration-gloves',
      'calibration-sleeve': 'calibration-sleeve',
      'calibration-blanket': 'calibration-blanket',
      'calibration-line-hose': 'calibration-line-hose',
      'calibration-hotstick': 'calibration-hotstick',
      'calibration-ground-cable': 'calibration-ground-cable',
      'calibration-bucket-truck': 'calibration-bucket-truck'
    };

    const mappedReportName = reportPathMap[reportNameSlug];
    if (!mappedReportName) {
      return `/jobs/${jobId}`;
    }

    const isTemplate = defaultAssets.some(da => da.id === asset.id && da.file_url.startsWith('report:'));

    if (isTemplate) {
      return `/jobs/${jobIdSegment}/${mappedReportName}`;
    } else if (reportIdFromUrl) {
      return `/jobs/${jobIdSegment}/${mappedReportName}/${reportIdFromUrl}`;
    } else {
      return `/jobs/${jobIdSegment}/${mappedReportName}`;
    }
  };

  // Initial load effect - generate Asset ID immediately for new reports
  useEffect(() => {
    const initializeNewReport = async () => {
      // For new reports, generate Asset ID immediately
      if (!urlReportId && !formData.bucketTruckData.assetId) {
        console.log('Initializing new bucket truck report - generating Asset ID immediately');
        try {
          // Use customer ID if available, otherwise use default
          const customerIdForAssetGen = formData.customerId || formData.customerIdForAsset || '1';
          console.log('Generating Asset ID immediately for customer:', customerIdForAssetGen);
          const nextAssetId = await getNextAssetId(customerIdForAssetGen);
          
          if (nextAssetId) {
            console.log('Immediately generated Asset ID:', nextAssetId);
            setFormData(prev => ({
              ...prev,
              bucketTruckData: {
                ...prev.bucketTruckData,
                assetId: nextAssetId
              }
            }));
          }
        } catch (error) {
          console.error('Error generating Asset ID immediately:', error);
        }
      }
    };

    initializeNewReport();
  }, []); // Run only once when component mounts

  if (loading) return <div className="p-4">Loading Report Data...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBackNavigation}
            className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 min-w-[20px] flex-shrink-0 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {urlReportId ? 'Edit Bucket Truck Report' : 'New Bucket Truck Report'}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={async () => {
              setStatus('PASS');
              updatePassFailStatus('PASS');
              const savedReportId = await handleSave();
              // Add test history entry after successful save
              if (savedReportId) {
                await addTestHistoryEntry('PASS', undefined, savedReportId);
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            PASS
          </button>
          <button
            onClick={async () => {
              setStatus('FAIL');
              updatePassFailStatus('FAIL');
              const savedReportId = await handleSave();
              // Add test history entry after successful save
              if (savedReportId) {
                await addTestHistoryEntry('FAIL', undefined, savedReportId);
              }
            }}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              status === 'FAIL' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            FAIL
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14H4v-3h1v3zm7 2v-2H8v2h4zm0-4h1v-3h-1v3z" clipRule="evenodd" />
            </svg>
            Print PDF
          </button>
          {urlReportId && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-white bg-[#339C5E] hover:bg-[#2d8a52] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#339C5E]"
            >
              Edit Report
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate(`/jobs/${jobId}/calibration-bucket-truck`)}
                className={`${accentClasses.bg} ${accentClasses.bgHover} text-white font-medium px-3 py-2 rounded-md flex items-center justify-center`}
                title="Create New Bucket Truck Report"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>

            </>
          )}
        </div>
      </div>

      {/* Truck Information */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Truck Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset ID</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.assetId || "(Will be generated when saved)"}
              readOnly={true}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-accent-color focus:ring-accent-color cursor-not-allowed ${
                formData.bucketTruckData.assetId 
                  ? 'bg-gray-100 dark:bg-dark-200 text-gray-900 dark:text-white font-medium' 
                  : 'bg-gray-50 dark:bg-dark-100 text-gray-600 dark:text-gray-300 italic'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Truck #</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.truckNumber}
              onChange={(e) => handleBucketTruckDataChange('truckNumber', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label>
            <select
              value={formData.bucketTruckData.manufacturer}
              onChange={(e) => handleBucketTruckDataChange('manufacturer', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Manufacturer</option>
              {manufacturerOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.model}
              onChange={(e) => handleBucketTruckDataChange('model', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.serialNumber}
              onChange={(e) => handleBucketTruckDataChange('serialNumber', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300"># of Platforms</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.numberOfPlatforms}
              onChange={(e) => handleBucketTruckDataChange('numberOfPlatforms', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Height</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.platformHeight}
              onChange={(e) => handleBucketTruckDataChange('platformHeight', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Material Handling</label>
            <select
              value={formData.bucketTruckData.materialHandling}
              onChange={(e) => handleBucketTruckDataChange('materialHandling', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Material Handling</option>
              {materialHandlingOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qualification Voltage</label>
            <select
              value={formData.bucketTruckData.qualificationVoltage}
              onChange={(e) => handleBucketTruckDataChange('qualificationVoltage', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Qualification Voltage</option>
              {qualificationVoltageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Design Voltage</label>
            <select
              value={formData.bucketTruckData.designVoltage}
              onChange={(e) => handleBucketTruckDataChange('designVoltage', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            >
              <option value="">Select Design Voltage</option>
              {designVoltageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.year}
              onChange={(e) => handleBucketTruckDataChange('year', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Boom Test */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Boom Test</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upper Boom Reading</label>
            <input 
              type="text" 
              value={formData.bucketTruckData.upperBoomReading}
              onChange={(e) => handleBucketTruckDataChange('upperBoomReading', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
        </div>
      </div>



      {/* DOT Inspection */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">DOT Inspection</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSaveDOTInspection}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm text-white bg-[#f26722] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26722] ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e55611]'}`}
            >
              Save DOT Inspection
            </button>
            <button
              onClick={handlePrintExactHTML}
              disabled={!isEditing}
              className={`px-4 py-2 text-sm text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                !isEditing
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
              title={!isEditing ? 'Must be in editing mode to print' : 'Print Exact HTML from dot-inspec.html'}
            >
              <Printer className="h-4 w-4 inline mr-2" />
              Print Exact HTML
            </button>
          </div>
        </div>
        
        {/* General Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motor Carrier Operator</label>
            <input 
              type="text" 
              value={formData.dotInspection?.motorCarrierOperator || ''}
              onChange={(e) => handleDOTInspectionChange('motorCarrierOperator', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
            <input 
              type="text" 
              value={formData.dotInspection?.address || ''}
              onChange={(e) => handleDOTInspectionChange('address', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City, State, Zip Code</label>
            <input 
              type="text" 
              value={formData.dotInspection?.cityStateZip || ''}
              onChange={(e) => handleDOTInspectionChange('cityStateZip', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Inspector's Name</label>
            <input 
              type="text" 
              value={formData.dotInspection?.inspectorName || ''}
              onChange={(e) => handleDOTInspectionChange('inspectorName', e.target.value)}
              disabled={!isEditing}
              className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
            />
          </div>
        </div>

        {/* Vehicle Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vehicle Type</label>
          <div className="flex flex-wrap gap-4">
            {['TRACTOR', 'TRAILER', 'TRUCK'].map(type => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.dotInspection?.vehicleType === type}
                  onChange={(e) => handleDOTInspectionChange('vehicleType', e.target.checked ? type : '')}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-accent-color focus:ring-accent-color"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{type}</span>
              </label>
            ))}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.dotInspection?.vehicleType === 'OTHER'}
                onChange={(e) => handleDOTInspectionChange('vehicleType', e.target.checked ? 'OTHER' : '')}
                disabled={!isEditing}
                className="rounded border-gray-300 text-accent-color focus:ring-accent-color"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">OTHER</span>
              <input
                type="text"
                value={formData.dotInspection?.vehicleTypeOther || ''}
                onChange={(e) => handleDOTInspectionChange('vehicleTypeOther', e.target.value)}
                disabled={!isEditing}
                placeholder="Specify"
                className="ml-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Identification */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vehicle Identification</label>
          <div className="flex flex-wrap gap-4">
            {['LIC. PLATE NO.', 'VIN', 'OTHER'].map(idType => (
              <label key={idType} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.dotInspection?.vehicleIdentification?.includes(idType) || false}
                  onChange={(e) => {
                    const current = formData.dotInspection?.vehicleIdentification || [];
                    const updated = e.target.checked 
                      ? [...current, idType]
                      : current.filter(item => item !== idType);
                    handleDOTInspectionChange('vehicleIdentification', updated);
                  }}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-accent-color focus:ring-accent-color"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{idType}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Inspector Qualification */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.dotInspection?.inspectorQualified || false}
              onChange={(e) => handleDOTInspectionChange('inspectorQualified', e.target.checked)}
              disabled={!isEditing}
              className="rounded border-gray-300 text-accent-color focus:ring-accent-color"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              THIS INSPECTOR MEETS THE QUALIFICATION REQUIREMENTS IN SECTION 306.19.
            </span>
          </label>
        </div>

        {/* Vehicle Components Inspection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Vehicle Components Inspected</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Component</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">OK</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Needs Repair</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Repaired Date</th>
                </tr>
              </thead>
              <tbody>
                {dotInspectionItems.map((section, sectionIndex) => (
                  <React.Fragment key={sectionIndex}>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-medium text-gray-900 dark:text-white">
                        {section.title}
                      </td>
                    </tr>
                    {section.items.map((item, itemIndex) => (
                      <tr key={`${sectionIndex}-${itemIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white">
                          {item}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={formData.dotInspection?.components?.[`${sectionIndex}-${itemIndex}`]?.status === 'OK'}
                            onChange={(e) => handleDOTComponentChange(sectionIndex, itemIndex, 'OK', e.target.checked)}
                            disabled={!isEditing}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={formData.dotInspection?.components?.[`${sectionIndex}-${itemIndex}`]?.status === 'NEEDS_REPAIR'}
                            onChange={(e) => handleDOTComponentChange(sectionIndex, itemIndex, 'NEEDS_REPAIR', e.target.checked)}
                            disabled={!isEditing}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                          <input
                            type="date"
                            value={formData.dotInspection?.components?.[`${sectionIndex}-${itemIndex}`]?.repairedDate || ''}
                            onChange={(e) => handleDOTComponentChange(sectionIndex, itemIndex, 'repairedDate', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Conditions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            List any other condition which may prevent safe operation of this vehicle
          </label>
          <textarea
            value={formData.dotInspection?.additionalConditions || ''}
            onChange={(e) => handleDOTInspectionChange('additionalConditions', e.target.value)}
            disabled={!isEditing}
            rows={3}
            className={`w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
          />
        </div>

        {/* Certification */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.dotInspection?.certified || false}
              onChange={(e) => handleDOTInspectionChange('certified', e.target.checked)}
              disabled={!isEditing}
              className="rounded border-gray-300 text-accent-color focus:ring-accent-color"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              THIS VEHICLE HAS PASSED ALL THE INSPECTION ITEMS FOR THE ANNUAL VEHICLE INSPECTION REPORT IN ACCORDANCE WITH 49 CFR 396.
            </span>
          </label>
        </div>
      </div>



      {/* Comments */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Comments
        </h2>
        <textarea
          value={formData.comments}
          onChange={(e) => handleChange(null, 'comments', e.target.value)}
          rows={4}
          readOnly={!isEditing}
          className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white ${!isEditing ? 'bg-gray-100 dark:bg-dark-200' : ''}`}
        />
      </div>

      {/* Test History */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
          Test History
        </h2>
        {!reportId ? (
          <div className="text-center py-4">
            <div className="text-gray-500 dark:text-gray-400">Test history will appear here after saving the report</div>
          </div>
        ) : loadingTestHistory ? (
          <div className="text-center py-4">
            <div className="text-gray-500 dark:text-gray-400">Loading test history...</div>
          </div>
        ) : testHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Test Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
                {testHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(entry.test_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.test_result === 'PASS' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {entry.test_result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {entry.tested_by_email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {entry.test_notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-500 dark:text-gray-400">No test history available</div>
          </div>
        )}
      </div>
      
      {/* Assets Section */}
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Bucket Truck Assets</h2>
          <div className="flex space-x-2 relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 ${accentClasses.bg} ${accentClasses.bgHover} text-white px-4 py-2 rounded-md`}
            >
              <Plus className="h-5 w-5 min-w-[20px] flex-shrink-0" />
              Add Asset
            </button>
            
            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-12 w-96 bg-white dark:bg-dark-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 z-50">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-2 bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
                  />
                  
                  {/* Calibration Division Reports */}
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                      Calibration Reports
                    </div>
                    {filteredReportTemplates.map((template) => (
                      <Link 
                        key={template.id}
                        to={`/jobs/${jobId}/${template.id.replace('calibration-', 'calibration-')}?returnToReport=${urlReportId || 'new'}&returnToReportType=bucket-truck`}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                          <span className="truncate">{template.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Document Upload Option */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 mt-2">
                    Upload Document
                  </div>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowUploadDialog(true);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <Upload className="h-5 w-5 min-w-[20px] mr-2 flex-shrink-0" />
                      <span>Upload New Document</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linked assets section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>Linked Assets</CardTitle>
                <CardDescription>
                  Assets and documents that have been linked to this bucket truck report
                </CardDescription>
              </div>
              <div className="w-1/3">
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-[#339C5E]/30 focus:border-[#339C5E] rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors duration-200"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobAssets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No assets have been linked to this bucket truck report yet.</p>
              </div>
            ) : filteredJobAssets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No matching assets found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredJobAssets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {asset.userAssetId || asset.asset_id || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {asset.name}
                      </TableCell>
                      <TableCell>
                        {asset.template_type ? (
                          <Badge>{asset.template_type}</Badge>
                        ) : (
                          'Document'
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(asset.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {asset.file_url.startsWith('report:') ? (
                            <Link 
                              to={getReportEditPath(asset)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Open Report
                            </Link>
                          ) : (
                            <a 
                              href={asset.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetToDelete(asset);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload file dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to associate with this job.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="document-name" className="text-sm font-medium">Document Name</label>
              <Input
                id="document-name"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Technical Documentation"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="document-file" className="text-sm font-medium">Select File</label>
              <Input
                id="document-file"
                type="file"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center">{uploadProgress}% Uploaded</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleFileUpload}
              disabled={isUploading || !selectedFile || !newAssetName.trim()}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this {assetToDelete?.file_url.startsWith('report:') ? 'report' : 'document'} from the job?
            </DialogDescription>
          </DialogHeader>
          
          {assetToDelete && (
            <div className="py-4">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <FileText className="h-5 w-5 min-w-[20px] flex-shrink-0 text-gray-500 mr-2" />
                <span className="font-medium">{assetToDelete.name}</span>
              </div>
              
              {assetToDelete.file_url.startsWith('report:') ? (
                <p className="mt-2 text-sm text-gray-500">
                  This will only remove the link between the report and this job. The report will still be accessible from its direct URL.
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete this document from the system.
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setAssetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAsset}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style>{`
         .input-field { @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .input-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .select-field { @apply mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .select-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .textarea-field { @apply block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-dark-100 shadow-sm focus:border-accent-color focus:ring-accent-color text-gray-900 dark:text-white; }
         .textarea-disabled { @apply bg-gray-100 dark:bg-dark-200 cursor-not-allowed; }
         .radio-input { @apply focus:ring-accent-color h-4 w-4 text-accent-color border-gray-300 dark:border-gray-700; }
         .radio-label { @apply ml-2 block text-sm text-gray-700 dark:text-gray-300; }
       `}</style>
    </div>
  );
} 