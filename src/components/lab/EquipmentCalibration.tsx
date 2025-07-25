import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { 
  Plus, 
  Save, 
  Edit, 
  Trash2, 
  Wrench,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { labService, LabEquipment, Calibration } from '@/lib/services/labService';

interface EquipmentCalibrationProps {
  division?: string;
}

const equipmentCategories = [
  { value: 'analyzer', label: 'Analyzers' },
  { value: 'meter', label: 'Meters' },
  { value: 'tester', label: 'Testing Equipment' },
  { value: 'tool', label: 'Calibrated Tools' },
  { value: 'monitor', label: 'Monitoring Equipment' },
  { value: 'sensor', label: 'Sensors' },
  { value: 'reference', label: 'Reference Standards' },
  { value: 'other', label: 'Other Equipment' }
];

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'calibration', label: 'Under Calibration' },
  { value: 'out-of-service', label: 'Out of Service' }
];

export function EquipmentCalibration({ division }: EquipmentCalibrationProps) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<LabEquipment | null>(null);
  const [labTechnicians, setLabTechnicians] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Forms
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  
  const defaultEquipmentForm: Partial<LabEquipment> = {
    name: '',
    category: 'analyzer',
    status: 'available',
    serial_number: '',
    model: '',
    manufacturer: '',
    purchase_date: '',
    warranty_expiration: '',
    location: '',
    responsible_user: '',
    notes: '',
    last_calibration_date: '',
    next_calibration_date: '',
    calibration_frequency: 365, // Default to annual
    accuracy_rating: '',
    measurement_range: ''
  };
  
  const defaultCalibrationForm: Partial<Calibration> = {
    equipment_id: '',
    calibration_date: new Date().toISOString().split('T')[0], // Today
    performed_by: user?.id,
    calibration_standard: '',
    result: 'pass',
    certificate_number: '',
    notes: '',
    next_calibration_date: ''
  };
  
  const [equipmentForm, setEquipmentForm] = useState<Partial<LabEquipment>>(defaultEquipmentForm);
  const [calibrationForm, setCalibrationForm] = useState<Partial<Calibration>>(defaultCalibrationForm);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Check if lab tables exist
        const tablesExist = await labService.checkLabTablesExist();
        
        // Fetch equipment
        const { data: equipmentData, error: equipmentError } = await labService.getEquipment();
        
        if (equipmentError) {
          setError("Failed to load lab equipment. Please try again.");
        } else if (equipmentData) {
          setEquipment(equipmentData);
        }
        
        // Fetch technicians
        // In a real implementation, we would fetch lab technicians here
      } catch (err) {
        console.error("Exception in equipment calibration:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Further implementation of equipment and calibration management
  // The full implementation would include:
  // - handleEquipmentSubmit for saving equipment
  // - handleCalibrationSubmit for recording calibrations
  // - handleDeleteEquipment for removing equipment
  // - handleSelectEquipment for viewing equipment details
  // - renderCalibrationHistory to show past calibrations
  // - renderEquipmentDetails to show equipment information
  // - Form rendering for both equipment and calibrations
  
  // For now, we'll just render a placeholder UI
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Equipment Calibration Tracking</h2>
        <Button onClick={() => {
          setEditingEquipmentId(null);
          setEquipmentForm(defaultEquipmentForm);
          setShowEquipmentForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <p>Loading equipment data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p>No equipment found. Add your first piece of equipment to get started.</p>
            </div>
          ) : (
            equipment.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{item.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{item.manufacturer} {item.model}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Serial Number:</span>
                      <span className="text-sm">{item.serial_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Last Calibration:</span>
                      <span className="text-sm">{item.last_calibration_date || 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Next Calibration:</span>
                      <span className={`text-sm ${isDue(item.next_calibration_date) ? 'text-red-600 font-bold' : 
                                      isUpcoming(item.next_calibration_date) ? 'text-amber-600 font-bold' : ''}`}>
                        {item.next_calibration_date || 'Not scheduled'}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-end space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditEquipment(item)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCalibrate(item)}>
                        <Wrench className="h-4 w-4 mr-1" />
                        Calibrate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Forms would be rendered here */}
    </div>
  );
  
  // Helper functions
  function isDue(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date <= today;
  }
  
  function isUpcoming(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return date > today && date <= thirtyDaysFromNow;
  }
  
  function handleEditEquipment(item: LabEquipment) {
    setEditingEquipmentId(item.id);
    setEquipmentForm({
      ...item
    });
    setShowEquipmentForm(true);
  }
  
  function handleCalibrate(item: LabEquipment) {
    setSelectedEquipment(item);
    // Calculate next calibration date based on frequency
    const nextDate = new Date();
    if (item.calibration_frequency) {
      nextDate.setDate(nextDate.getDate() + item.calibration_frequency);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1); // Default to one year
    }
    
    setCalibrationForm({
      ...defaultCalibrationForm,
      equipment_id: item.id,
      next_calibration_date: nextDate.toISOString().split('T')[0]
    });
    setShowCalibrationForm(true);
  }

  // Get status badge variant for equipment status
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    switch (status) {
      case 'available': return 'secondary'; // instead of 'success'
      case 'in-use': return 'default'; // instead of 'primary'
      case 'maintenance': return 'outline'; // instead of 'warning'
      case 'calibration': return 'secondary'; // instead of 'info'
      case 'out-of-service': return 'destructive'; // instead of 'danger'
      default: return 'default';
    }
  };
} 