import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Hammer, 
  MapPin, 
  RotateCcw, 
  Wrench,
  AlertTriangle,
  BarChart,
  X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SCHEMAS } from '@/lib/schema';
import equipmentService from '@/lib/services/equipmentService';
import { useDivision } from '@/lib/DivisionContext';
import { Modal } from '@/components/ui/Modal';

// Define a local interface that extends the Equipment fields we need plus our UI-specific fields
interface EquipmentData {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'assigned' | 'maintenance' | 'out-of-service' | 'retired';
  serial_number: string;
  model: string;
  manufacturer: string;
  purchase_date?: string;
  warranty_expiration?: string;
  location?: string;
  notes?: string;
  type: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  condition_rating?: number;
  asset?: {
    id: string;
    name: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
}

interface EquipmentTrackingProps {
  division: string;
  initialFormOpen?: boolean;
  onClose?: () => void;
}

interface EquipmentForm {
  name: string;
  category: string;
  status: 'available' | 'assigned' | 'maintenance' | 'out-of-service';
  serial_number: string;
  model: string;
  manufacturer: string;
  purchase_date?: string;
  warranty_expiration?: string;
  location?: string;
  notes?: string;
  type: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  condition_rating?: number;
}

const equipmentCategories = [
  { value: 'testing', label: 'Testing Equipment' },
  { value: 'metering', label: 'Metering Devices' },
  { value: 'safety', label: 'Safety Equipment' },
  { value: 'tools', label: 'Specialized Tools' },
  { value: 'network', label: 'Network Equipment' },
  { value: 'electrical', label: 'Electrical Equipment' },
  { value: 'computing', label: 'Computer/IT' },
  { value: 'other', label: 'Other' }
];

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'In Maintenance' },
  { value: 'out-of-service', label: 'Out of Service' }
];

const divisionOptions = [
  { value: 'north_alabama', label: 'North Alabama' },
  { value: 'tennessee', label: 'Tennessee' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'international', label: 'International' }
];

// Add interface for the details modal
interface EquipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: EquipmentData | null;
}

// Add a ref interface for imperative handle
export interface EquipmentTrackingRefHandle {
  addEquipment: () => void;
}

export const EquipmentTracking = forwardRef<EquipmentTrackingRefHandle, EquipmentTrackingProps>(
  ({ division, initialFormOpen = false, onClose }, ref) => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(initialFormOpen);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  
  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentData | null>(null);
  
  const defaultFormState: EquipmentForm = {
    name: '',
    type: 'equipment',
    category: 'testing',
    status: 'available',
    serial_number: '',
    model: '',
    manufacturer: '',
    purchase_date: '',
    warranty_expiration: '',
    location: '',
    notes: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
    condition_rating: undefined
  };
  
  const [form, setForm] = useState<EquipmentForm>(defaultFormState);

  // Function to open the add equipment form
  const handleAddEquipment = () => {
    setShowForm(true);
    setEditingEquipmentId(null);
    setForm(defaultFormState);
  };
  
  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    addEquipment: handleAddEquipment
  }));

  // Fetch equipment
  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      // Get equipment from the neta_ops schema
      const equip = await equipmentService.getEquipment({ division });

      // Process data if needed
      const processedData = equip.map(item => ({
        ...item,
        // Map status values: convert 'retired' to 'out-of-service' for UI display
        status: item.status === 'retired' ? 'out-of-service' : item.status,
        // Ensure required fields for UI
        category: item.type || ''
      }));

      setEquipment(processedData);
    } catch (error) {
      console.error('Error in fetchEquipment:', error);
      setEquipment([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch technicians for the dropdown
  const fetchTechnicians = async () => {
    try {
      // Query from common schema's technicians view
      const { data, error } = await supabase
        .schema('common')
        .from('technicians')
        .select('id, name, first_name, last_name, email');
      
      if (error) {
        console.error("Error fetching technicians:", error);
        return;
      }
      
      // Format the data for the dropdown - handle either name field directly or compose from first/last name
      const techs = (data || []).map((t: any) => ({
        id: t.id,
        name: t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Unknown'
      }));
      setTechnicians(techs);
    } catch (err) {
      console.error("Exception fetching technicians:", err);
      
      // Set default technicians for development purposes
      const dummyTechs = [
        { id: '1', name: 'Technician 1' },
        { id: '2', name: 'Technician 2' },
        { id: '3', name: 'Technician 3' }
      ];
      
      setTechnicians(dummyTechs);
    }
  };
  
  // Initialize form based on initialFormOpen prop
  useEffect(() => {
    if (initialFormOpen) {
      setShowForm(true);
      setEditingEquipmentId(null);
      setForm(defaultFormState);
    }
  }, [initialFormOpen]);

  // Save equipment
  const handleSaveEquipment = async () => {
    try {
      // Map the 'out-of-service' status to 'retired' to match the service interface
      const formattedStatus = form.status === 'out-of-service' ? 'retired' as const : form.status === 'available' ? 'available' as const : form.status === 'assigned' ? 'assigned' as const : 'maintenance' as const;
      
      // Prepare equipment data with proper null/string handling for the Equipment interface
      const equipmentData = { 
        ...form,
        status: formattedStatus,
        division, // Include division in the data
        purchase_date: form.purchase_date || new Date().toISOString().split('T')[0], // Default to today if not provided
        warranty_expiration: form.warranty_expiration || null,
        location: form.location || '',
        notes: form.notes || null,
        last_maintenance_date: form.last_maintenance_date || null,
        next_maintenance_date: form.next_maintenance_date || null,
        condition_rating: form.condition_rating ? Number(form.condition_rating) : undefined,
      };
      
      if (editingEquipmentId) {
        // Update existing equipment
        await equipmentService.updateEquipment(
          editingEquipmentId,
          equipmentData
        );
      } else {
        // Create new equipment
        await equipmentService.createEquipment({
          ...equipmentData
        });
      }
      
      // Reset form and refresh data
      setForm(defaultFormState);
      setShowForm(false);
      setEditingEquipmentId(null);
      
      // Refetch equipment
      fetchEquipment();
      
      // Call onClose if provided
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving equipment:', err);
      setError('Failed to save equipment. Please try again.');
    }
  };
  
  // Delete equipment
  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) {
      return;
    }
    
    try {
      await equipmentService.deleteEquipment(id);
      
      // Update local state
      setEquipment(equipment.filter(item => item.id !== id));
      
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError('Failed to delete equipment. Please try again.');
    }
  };
  
  // Edit equipment
  const handleEditEquipment = (item: EquipmentData) => {
    setForm({
      name: item.name,
      category: item.category,
      status: item.status === 'retired' ? 'out-of-service' : item.status,
      serial_number: item.serial_number,
      model: item.model,
      manufacturer: item.manufacturer,
      purchase_date: item.purchase_date || '',
      warranty_expiration: item.warranty_expiration || '',
      location: item.location || '',
      notes: item.notes || '',
      type: item.type || 'equipment',
      last_maintenance_date: item.last_maintenance_date || '',
      next_maintenance_date: item.next_maintenance_date || '',
      condition_rating: item.condition_rating
    });
    setEditingEquipmentId(item.id);
    setShowForm(true);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-amber-100 text-amber-800';
      case 'out-of-service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'testing':
        return 'bg-purple-100 text-purple-800';
      case 'metering':
        return 'bg-indigo-100 text-indigo-800';
      case 'safety':
        return 'bg-orange-100 text-orange-800';
      case 'tools':
        return 'bg-blue-100 text-blue-800';
      case 'network':
        return 'bg-teal-100 text-teal-800';
      case 'electrical':
        return 'bg-amber-100 text-amber-800';
      case 'computing':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Check if calibration/maintenance is due
  const isDue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due <= today;
  };
  
  // Check if calibration/maintenance is coming up soon
  const isUpcoming = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 30 && daysUntilDue > 0;
  };
  
  // Show equipment details
  const handleShowDetails = (item: EquipmentData) => {
    setSelectedEquipment(item);
    setDetailsModalOpen(true);
  };
  
  // Add useEffect to trigger fetchEquipment
  useEffect(() => {
    fetchEquipment();
    fetchTechnicians();
  }, [division]);

  // Equipment Details Modal Component
  const EquipmentDetailsModal = ({ isOpen, onClose, equipment }: EquipmentDetailsModalProps) => {
    if (!equipment) return null;
    
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{equipment.name}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium">{equipment.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={getStatusColor(equipment.status)}>
                {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Model</p>
              <p className="font-medium">{equipment.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Manufacturer</p>
              <p className="font-medium">{equipment.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Serial Number</p>
              <p className="font-medium">{equipment.serial_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Division</p>
              <p className="font-medium">{equipment.location || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Calibration Date</p>
              <p className="font-medium">
                {equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Calibration Expiration</p>
              <p className="font-medium">
                {equipment.warranty_expiration ? new Date(equipment.warranty_expiration).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          
          {equipment.notes && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="bg-gray-50 p-3 rounded">{equipment.notes}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                handleEditEquipment(equipment);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                handleDeleteEquipment(equipment.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // Update form cancel button to call onClose
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEquipmentId(null);
    setForm(defaultFormState);
    
    // Call onClose if provided
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="container mx-auto px-4 space-y-8" data-equipment-tracking>
      <button 
        className="hidden"
        data-add-equipment
        onClick={handleAddEquipment}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <CardTitle className="text-xl font-bold">Equipment Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
              {error}
              <button className="ml-2 text-red-600" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
                 onClick={() => {
                   setShowForm(false);
                   setEditingEquipmentId(null);
                   setForm(defaultFormState);
                   if (onClose) onClose();
                 }}>
              <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {editingEquipmentId ? 'Edit Equipment' : 'Add New Equipment'}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Equipment Name
                      </label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Equipment identifier"
                        className="w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <Select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        options={equipmentCategories}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <Select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        options={statusOptions}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serial Number
                      </label>
                      <Input
                        value={form.serial_number}
                        onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                        placeholder="Serial number"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Model
                      </label>
                      <Input
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        placeholder="Equipment model"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Manufacturer
                      </label>
                      <Input
                        value={form.manufacturer}
                        onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                        placeholder="Manufacturer name"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Calibration Date
                      </label>
                      <Input
                        type="date"
                        value={form.purchase_date || ''}
                        onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Calibration Expiration
                      </label>
                      <Input
                        type="date"
                        value={form.warranty_expiration || ''}
                        onChange={(e) => setForm({ ...form, warranty_expiration: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Current Division
                      </label>
                      <Select
                        value={form.location || division}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        options={divisionOptions}
                      />
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Maintenance history, issues, etc."
                        className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelForm}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEquipment}
                      disabled={isLoading || !form.name}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {editingEquipmentId ? 'Update Equipment' : 'Save Equipment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {isLoading ? (
              <p>Loading equipment...</p>
            ) : equipment.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">No equipment found. Use the "Add Equipment" button above to add items.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {equipment.map((item) => (
                  <Card 
                    key={item.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleShowDetails(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <Hammer className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              {item.manufacturer} {item.model}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </Badge>
                              <Badge className={getCategoryColor(item.category)}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </Badge>
                              {item.serial_number && (
                                <Badge className="bg-blue-50 text-blue-800">
                                  SN: {item.serial_number}
                                </Badge>
                              )}
                            </div>
                            
                            {item.location && (
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            
                            {/* Equipment alerts */}
                            {(isDue(item.next_maintenance_date) || isUpcoming(item.next_maintenance_date)) && (
                              <div className={`mt-1 flex items-center text-sm ${
                                isDue(item.next_maintenance_date) ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                <Wrench className="h-4 w-4 mr-1" />
                                <span>
                                  {isDue(item.next_maintenance_date) 
                                    ? 'Maintenance overdue' 
                                    : 'Maintenance due soon'}: {new Date(item.next_maintenance_date!).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEquipment(item);
                            }}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEquipment(item.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Render the equipment details modal */}
      <EquipmentDetailsModal 
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        equipment={selectedEquipment}
      />
    </div>
  );
}); 