import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Save, Edit, Trash2, Truck, MapPin, RotateCcw, Wrench, X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SCHEMAS } from '@/lib/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Equipment, EquipmentFilter, Vehicle, VehicleWithDetails } from '@/lib/interfaces/equipment';
import equipmentService from '@/lib/services/equipmentService';
import { toast } from 'react-hot-toast';

export interface VehicleTrackingProps {
  division: string;
  initialFormOpen?: boolean;
  onClose?: () => void;
  hideAddButton?: boolean;
}

// Define the status options for the form
export type VehicleStatusType = 'available' | 'assigned' | 'maintenance' | 'retired' | 'out-of-service';

// Update interfaces to reflect direct vehicle structure without equipment reference
interface ExtendedVehicle {
  id: string;
  name: string;
  type: string;
  make: string;
  model: string;
  year: string;
  license_plate: string;
  vin: string;
  status: string;
  division: string;
  current_location: string;
  notes: string;
  manufacturer: string;
  serial_number: string;
  purchase_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

// Update the VehicleForm interface
interface VehicleForm {
  name: string;
  type: string;
  make: string;
  model: string;
  year: string;
  license_plate: string;
  vin: string;
  status: VehicleStatusType;
  current_location: string;
  notes: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
}

// Update the default vehicle form
const defaultVehicleForm: VehicleForm = {
  name: '',
  type: 'sedan',
  make: '',
  model: '',
  year: '',
  license_plate: '',
  vin: '',
  status: 'available',
  current_location: '',
  notes: '',
  last_maintenance_date: '',
  next_maintenance_date: ''
};

// Update the VehicleDetailsModalProps
interface VehicleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: ExtendedVehicle | null;
}

// Map database status to UI status
const mapStatusToVehicleStatus = (status?: string): VehicleStatusType => {
  if (!status) return 'available';
  
  switch (status) {
    case 'assigned':
      return 'assigned';
    case 'maintenance':
      return 'maintenance';
    case 'retired':
      return 'out-of-service';
    default:
      return 'available';
  }
};

// Update mapVehicleForDisplay
const mapVehicleForDisplay = (vehicle: ExtendedVehicle): VehicleForm => {
  return {
    name: vehicle.name || '',
    type: vehicle.type || 'sedan',
    make: vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year || '',
    license_plate: vehicle.license_plate || '',
    vin: vehicle.vin || '',
    status: mapStatusToVehicleStatus(vehicle.status),
    current_location: vehicle.current_location || '',
    notes: vehicle.notes || '',
    last_maintenance_date: vehicle.last_maintenance_date || '',
    next_maintenance_date: vehicle.next_maintenance_date || ''
  };
};

const vehicleTypes = [
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'suv', label: 'SUV' },
  { value: 'car', label: 'Car' },
  { value: 'utility', label: 'Utility Vehicle' },
  { value: 'specialized', label: 'Specialized Equipment' }
];

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'In Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'out-of-service', label: 'Out of Service' }
];

// Update division options to only include Neta Technician Divisions
const divisionOptions = [
  { value: 'north_alabama', label: 'North Alabama' },
  { value: 'tennessee', label: 'Tennessee' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'international', label: 'International' }
];

export function VehicleTracking({ division, initialFormOpen = false, onClose, hideAddButton = false }: VehicleTrackingProps) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<ExtendedVehicle[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVehicleDialog, setShowVehicleDialog] = useState(initialFormOpen);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Add state for details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [form, setForm] = useState<VehicleForm>({
    name: '',
    type: 'sedan',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
    status: 'available',
    current_location: '',
    notes: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
  });
  const [selectedVehicle, setSelectedVehicle] = useState<ExtendedVehicle | null>(null);

  useEffect(() => {
    if (initialFormOpen) {
      setShowVehicleDialog(true);
      setEditVehicleId(null);
      setForm(defaultVehicleForm);
    }
  }, [initialFormOpen]);

  useEffect(() => {
    fetchVehicles();
    fetchTechnicians();
  }, [division]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      // Use equipmentService to fetch vehicles from the neta_ops schema
      const { data, error } = await equipmentService.getVehicles({
        division: division
      });
      
      if (error) throw error;
      
      // Use the vehicles directly without transforming them
      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // Use the common.technicians view to fetch technicians
      const { data, error } = await supabase
        .schema('common')
        .from('technicians')
        .select('id, first_name, last_name, email');
        
      if (error) throw error;
      
      setTechnicians(data || []);
    } catch (error: any) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to load technicians: ' + error.message);
    }
  };

  const handleSaveVehicle = async () => {
    setError(null);
    
    // Validation
    if (!form.name) {
      setError('Vehicle name is required');
      return;
    }
    
    try {
      // Map VehicleStatusType to valid status
      let status: 'available' | 'assigned' | 'maintenance' | 'retired' = 'available';
      if (form.status === 'out-of-service') {
        status = 'retired';
      } else if (form.status === 'assigned') {
        status = 'assigned';
      } else if (form.status === 'maintenance') {
        status = 'maintenance';
      } else if (form.status === 'available') {
        status = 'available';
      }
      
      // Prepare complete vehicle data
      const vehicleData = {
        name: form.name,
        type: form.type,
        make: form.make,
        model: form.model || '',
        year: form.year ? parseInt(form.year) : null,
        license_plate: form.license_plate || '',
        vin: form.vin || '',
        status: status,
        division: division || '',
        current_location: form.current_location || '',
        notes: form.notes || '',
        manufacturer: form.make || '',
        serial_number: form.vin || '',
        purchase_date: new Date().toISOString().split('T')[0],
        last_maintenance_date: form.last_maintenance_date || null,
        next_maintenance_date: form.next_maintenance_date || null
      };
      
      if (editVehicleId) {
        // Update existing vehicle
        console.log('Updating vehicle with ID:', editVehicleId, 'and data:', vehicleData);
        const { error: vehicleError } = await equipmentService.updateVehicle(
          editVehicleId,
          vehicleData
        );
        
        if (vehicleError) {
          console.error('Failed to update vehicle:', vehicleError);
          throw vehicleError;
        }
        
        toast.success('Vehicle updated successfully');
      } else {
        // Create new vehicle directly
        console.log('Creating vehicle directly in neta_ops.vehicles with data:', vehicleData);
        const { data: createdVehicle, error: vehicleError } = await equipmentService.createVehicle(vehicleData);
        
        if (vehicleError) {
          console.error('Failed to create vehicle:', vehicleError);
          throw vehicleError;
        }
        
        console.log('Vehicle created successfully:', createdVehicle);
        toast.success('Vehicle added successfully');
      }
      
      // Reset form and reload vehicles
      setForm(defaultVehicleForm);
      setEditVehicleId(null);
      setShowVehicleDialog(false);
      fetchVehicles();
      
      // Close dialog if provided
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      setError('Failed to save vehicle: ' + error.message);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }
    
    try {
      const { error } = await equipmentService.deleteVehicle(id);
      
      if (error) throw error;
      
      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle: ' + error.message);
    }
  };

  const handleEditVehicle = (id: string) => {
    const vehicleToEdit = vehicles.find(v => v.id === id);
    if (!vehicleToEdit) {
      toast.error('Vehicle not found');
      return;
    }
    
    setForm(mapVehicleForDisplay(vehicleToEdit));
    setEditVehicleId(id);
    setShowVehicleDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      case 'out-of-service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Add new function to handle showing vehicle details
  const handleShowDetails = (vehicle: ExtendedVehicle) => {
    setSelectedVehicle(vehicle);
    setDetailsModalOpen(true);
  };
  
  // Add the VehicleDetailsModal component
  const VehicleDetailsModal = ({ isOpen, onClose, vehicle }: VehicleDetailsModalProps) => {
    if (!vehicle) return null;
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{vehicle.name}</span>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(vehicle.status || 'available')}>
                {(vehicle.status || 'available').charAt(0).toUpperCase() + (vehicle.status || 'available').slice(1)}
              </Badge>
              <Badge className="bg-gray-100 text-gray-800">
                {(vehicle.type || 'vehicle').charAt(0).toUpperCase() + (vehicle.type || 'vehicle').slice(1)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Make</span>
                <span className="font-medium">{vehicle.make || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Model</span>
                <span className="font-medium">{vehicle.model || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Year</span>
                <span className="font-medium">{vehicle.year || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">License Plate</span>
                <span className="font-medium">{vehicle.license_plate || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">VIN</span>
                <span className="font-medium">{vehicle.vin || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Division</span>
                <span className="font-medium">{vehicle.current_location || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Purchase Date</span>
                <span className="font-medium">{vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Last Maintenance</span>
                <span className="font-medium">{vehicle.last_maintenance_date ? new Date(vehicle.last_maintenance_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Next Maintenance</span>
                <span className="font-medium">{vehicle.next_maintenance_date ? new Date(vehicle.next_maintenance_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
            
            {vehicle.notes && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Notes</h4>
                <p className="text-sm border border-gray-200 rounded-md p-2 bg-gray-50">{vehicle.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  onClose();
                  handleEditVehicle(vehicle.id);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Vehicle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto px-4 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <CardTitle className="text-xl font-bold">Vehicle Tracking</CardTitle>
          {!showVehicleDialog && !hideAddButton && (
            <Button
              onClick={() => setShowVehicleDialog(true)}
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
              {error}
              <button className="ml-2 text-red-600" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          
          {showVehicleDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
                 onClick={() => {
                   setShowVehicleDialog(false);
                   setEditVehicleId(null);
                   setForm(defaultVehicleForm);
                   if (onClose) onClose();
                 }}>
              <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {editVehicleId ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Name
                        </label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => setForm({...form, name: e.target.value})}
                          placeholder="Enter vehicle name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Type
                        </label>
                        <Select
                          id="type"
                          value={form.type}
                          options={vehicleTypes}
                          onChange={(e) => setForm({...form, type: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700 mb-1">
                          License Plate
                        </label>
                        <Input
                          id="license_plate"
                          value={form.license_plate}
                          onChange={(e) => setForm({...form, license_plate: e.target.value})}
                          placeholder="Enter license plate"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
                          VIN
                        </label>
                        <Input
                          id="vin"
                          value={form.vin}
                          onChange={(e) => setForm({...form, vin: e.target.value})}
                          placeholder="Enter VIN"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                          Year
                        </label>
                        <Input
                          id="year"
                          value={form.year}
                          onChange={(e) => setForm({...form, year: e.target.value})}
                          placeholder="Enter year"
                          type="number"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                          Make
                        </label>
                        <Input
                          id="make"
                          value={form.make}
                          onChange={(e) => setForm({...form, make: e.target.value})}
                          placeholder="Enter make"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                          Model
                        </label>
                        <Input
                          id="model"
                          value={form.model}
                          onChange={(e) => setForm({...form, model: e.target.value})}
                          placeholder="Enter model"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <Select
                          id="status"
                          value={form.status}
                          options={statusOptions}
                          onChange={(e) => setForm({...form, status: e.target.value as VehicleStatusType})}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="current_location" className="block text-sm font-medium text-gray-700 mb-1">
                        Division
                      </label>
                      <Select
                        id="current_location"
                        value={form.current_location || division}
                        options={divisionOptions}
                        onChange={(e) => setForm({...form, current_location: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Input
                        id="notes"
                        value={form.notes}
                        onChange={(e) => setForm({...form, notes: e.target.value})}
                        placeholder="Enter notes"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowVehicleDialog(false);
                        setEditVehicleId(null);
                        setForm(defaultVehicleForm);
                        if (onClose) onClose();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveVehicle}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Vehicle
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {isLoading ? (
              <p>Loading vehicles...</p>
            ) : vehicles.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-md">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium mb-1">No Vehicles Added</h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your division's vehicles by adding them to the system.
                </p>
                {!showVehicleDialog && !hideAddButton && (
                  <Button
                    onClick={() => setShowVehicleDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Vehicle
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {vehicles.map(vehicle => (
                  <Card 
                    key={vehicle.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleShowDetails(vehicle)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 bg-blue-100 rounded-full text-blue-700">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{vehicle.name}</h3>
                            <p className="text-sm text-gray-600">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className={getStatusColor(vehicle.status || 'available')}>
                                {(vehicle.status || 'available').charAt(0).toUpperCase() + (vehicle.status || 'available').slice(1)}
                              </Badge>
                              <Badge className="bg-gray-100 text-gray-800">
                                {(vehicle.type || 'vehicle').charAt(0).toUpperCase() + (vehicle.type || 'vehicle').slice(1)}
                              </Badge>
                              {vehicle.license_plate && (
                                <Badge variant="outline">{vehicle.license_plate}</Badge>
                              )}
                            </div>
                            
                            {vehicle.current_location && (
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{vehicle.current_location}</span>
                              </div>
                            )}
                            
                            {vehicle.next_maintenance_date && (
                              <div className="mt-1 flex items-center text-sm text-gray-600">
                                <Wrench className="h-4 w-4 mr-1" />
                                <span>
                                  Next maintenance: {new Date(vehicle.next_maintenance_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditVehicle(vehicle.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(vehicle.id);
                            }}
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
      {selectedVehicle && (
        <VehicleDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedVehicle(null);
          }}
          vehicle={selectedVehicle}
        />
      )}
    </div>
  );
} 