import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { equipmentService } from '@/lib/services/equipmentService';
import { 
  Equipment, 
  Vehicle, 
  MaintenanceRecord,
  EquipmentAssignment,
  EquipmentStatus,
  EquipmentCategory
} from '@/lib/types/equipment';
import { PortalType } from '@/lib/types/scheduling';
import { Button } from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { 
  Truck, 
  Search, 
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  User,
  Settings,
  FileText,
  Wrench
} from 'lucide-react';
import dayjs from 'dayjs';

// Extended Equipment interface to include missing properties
interface ExtendedEquipment extends Equipment {
  location?: string;
  portal_type: string;
  assignedTo?: any;
}

// Props interface
interface EquipmentTrackingProps {
  portalType: PortalType;
  division?: string;
}

export function EquipmentTracking({ portalType, division }: EquipmentTrackingProps) {
  const { user } = useAuth();
  
  // States
  const [equipment, setEquipment] = useState<ExtendedEquipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<ExtendedEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | ''>('');
  
  // Equipment form dialog
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState<Partial<ExtendedEquipment>>({
    name: '',
    description: '',
    category: 'tool',
    status: 'available',
    condition_rating: 5,
    location: '',
    portal_type: portalType,
    division
  });
  
  // Vehicle-specific form fields
  const [isVehicle, setIsVehicle] = useState(false);
  const [vehicleFields, setVehicleFields] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    mileage: 0
  });
  
  // Selected equipment for details view
  const [selectedEquipment, setSelectedEquipment] = useState<ExtendedEquipment | null>(null);
  const [showEquipmentDetails, setShowEquipmentDetails] = useState(false);
  
  // Maintenance records
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<Partial<MaintenanceRecord>>({
    maintenance_date: dayjs().format('YYYY-MM-DD'),
    maintenance_type: 'routine',
    description: '',
    performed_by: user?.id || '',
  });
  
  // Equipment assignments
  const [assignments, setAssignments] = useState<EquipmentAssignment[]>([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<Partial<EquipmentAssignment>>({
    checkout_date: dayjs().format('YYYY-MM-DD'),
    expected_return_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    user_id: '',
    condition_before: 5
  });
  
  // Fetch equipment on component mount
  useEffect(() => {
    fetchEquipment();
  }, [portalType, division]);
  
  // Filter equipment based on search and filter criteria
  useEffect(() => {
    if (equipment.length > 0) {
      let filtered = [...equipment];
      
      // Filter by category if set
      if (categoryFilter) {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }
      
      // Filter by status if set
      if (statusFilter) {
        filtered = filtered.filter(item => item.status === statusFilter);
      }
      
      // Filter by search term
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(
          item => 
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
        );
      }
      
      setFilteredEquipment(filtered);
    }
  }, [equipment, categoryFilter, statusFilter, searchTerm]);
  
  // Fetch equipment data
  const fetchEquipment = async () => {
    setLoading(true);
    try {
      // Create filters object for compatibility with equipmentService
      const filters = {
        status: statusFilter || undefined,
        searchTerm: searchTerm || undefined,
        portalType,
        division
      };
      
      const { data, error } = await equipmentService.getAllEquipment(filters);
      
      if (error) {
        console.error('Error fetching equipment:', error);
        setError('Failed to load equipment. Please try again.');
      } else {
        setEquipment(data || []);
        setFilteredEquipment(data || []);
      }
    } catch (err) {
      console.error('Exception fetching equipment:', err);
      setError('An unexpected error occurred while loading equipment.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input change for equipment form
  const handleEquipmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle checkbox
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEquipmentForm(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Handle category change for vehicle
    if (name === 'category') {
      setIsVehicle(value === 'vehicle');
    }
    
    // Handle number inputs
    if (type === 'number') {
      setEquipmentForm(prev => ({ ...prev, [name]: parseFloat(value) }));
      return;
    }
    
    // Handle regular inputs
    setEquipmentForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle input change for vehicle specific fields
  const handleVehicleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs
    if (type === 'number') {
      setVehicleFields(prev => ({ ...prev, [name]: parseFloat(value) }));
      return;
    }
    
    // Handle regular inputs
    setVehicleFields(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit equipment form
  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!equipmentForm.name || !equipmentForm.category || !equipmentForm.status) {
      toast({
        title: 'Error',
        description: 'Please fill out all required fields.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      // Merge vehicle fields if equipment is a vehicle
      const equipmentData = isVehicle
        ? { ...equipmentForm, ...vehicleFields }
        : equipmentForm;
      
      // Save equipment using createEquipment method
      const { data, error } = await equipmentService.createEquipment({
        ...equipmentData,
        portal_type: portalType,
        division
      } as any);
      
      if (error) {
        console.error('Error saving equipment:', error);
        toast({
          title: 'Error',
          description: 'Failed to save equipment. Please try again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: 'Equipment saved successfully!'
        });
        
        // Reset form and close dialog
        setEquipmentForm({
          name: '',
          description: '',
          category: 'tool',
          status: 'available',
          condition_rating: 5,
          location: '',
          portal_type: portalType,
          division
        });
        setVehicleFields({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          license_plate: '',
          vin: '',
          mileage: 0
        });
        setShowEquipmentForm(false);
        
        // Refresh equipment list
        fetchEquipment();
      }
    } catch (err) {
      console.error('Exception saving equipment:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'in-use': return 'bg-blue-500';
      case 'maintenance': return 'bg-amber-500';
      case 'retired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vehicle': return <Truck className="h-5 w-5" />;
      case 'tool': return <Wrench className="h-5 w-5" />;
      case 'testing-equipment': return <Settings className="h-5 w-5" />;
      case 'safety-equipment': return <AlertTriangle className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };
  
  // Check if user can edit equipment
  const canEditEquipment = user?.user_metadata?.role === 'Admin' ||
                          user?.user_metadata?.role === 'Scheduler';
  
  // Render equipment cards
  const renderEquipmentCards = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading equipment...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      );
    }
    
    if (filteredEquipment.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Settings className="h-8 w-8 mx-auto mb-2" />
          <p>No equipment found. Add some equipment to get started.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.map((item) => (
          <Card 
            key={item.id} 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => {
              setSelectedEquipment(item);
              setShowEquipmentDetails(true);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className={`${getStatusBadgeColor(item.status)} text-white mb-2`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Badge>
                <div className="p-2 rounded-full bg-gray-100">
                  {getCategoryIcon(item.category)}
                </div>
              </div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                )}
                
                {item.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{item.location}</span>
                  </div>
                )}
                
                {item.assigned_to && (
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Assigned to user</span>
                  </div>
                )}
                
                {item.condition_rating && (
                  <div className="flex items-center text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Condition: {item.condition_rating}/5</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative max-w-xs">
            <Input
              placeholder="Search equipment"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
          
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EquipmentCategory | '')}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'vehicle', label: 'Vehicles' },
              { value: 'tool', label: 'Tools' },
              { value: 'testing-equipment', label: 'Testing Equipment' },
              { value: 'safety-equipment', label: 'Safety Equipment' },
              { value: 'other', label: 'Other' }
            ]}
          />
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | '')}
            options={[
              { value: '', label: 'All Status' },
              { value: 'available', label: 'Available' },
              { value: 'in-use', label: 'In Use' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'retired', label: 'Retired' },
              { value: 'lost', label: 'Lost' }
            ]}
          />
        </div>
        
        {canEditEquipment && (
          <Button onClick={() => setShowEquipmentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Equipment</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {renderEquipmentCards()}
        </TabsContent>
        
        <TabsContent value="vehicles" className="mt-6">
          {/* Vehicle-specific view */}
        </TabsContent>
        
        <TabsContent value="maintenance" className="mt-6">
          {/* Maintenance records view */}
        </TabsContent>
        
        <TabsContent value="assignments" className="mt-6">
          {/* Assignment history view */}
        </TabsContent>
      </Tabs>
      
      {/* Equipment Form Dialog */}
      <Dialog open={showEquipmentForm} onOpenChange={setShowEquipmentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEquipmentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                name="name"
                value={equipmentForm.name || ''}
                onChange={handleEquipmentInputChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                name="description"
                value={equipmentForm.description || ''}
                onChange={handleEquipmentInputChange}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <Select
                name="category"
                value={equipmentForm.category || 'tool'}
                onChange={handleEquipmentInputChange}
                options={[
                  { value: 'vehicle', label: 'Vehicle' },
                  { value: 'tool', label: 'Tool' },
                  { value: 'testing-equipment', label: 'Testing Equipment' },
                  { value: 'safety-equipment', label: 'Safety Equipment' },
                  { value: 'other', label: 'Other' }
                ]}
                required
              />
            </div>
            
            {isVehicle && (
              <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                <h3 className="font-medium">Vehicle Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Make *</label>
                    <Input
                      name="make"
                      value={vehicleFields.make}
                      onChange={handleVehicleInputChange}
                      required={isVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Model *</label>
                    <Input
                      name="model"
                      value={vehicleFields.model}
                      onChange={handleVehicleInputChange}
                      required={isVehicle}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Year *</label>
                    <Input
                      name="year"
                      type="number"
                      value={vehicleFields.year}
                      onChange={handleVehicleInputChange}
                      required={isVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Mileage</label>
                    <Input
                      name="mileage"
                      type="number"
                      value={vehicleFields.mileage}
                      onChange={handleVehicleInputChange}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">License Plate</label>
                    <Input
                      name="license_plate"
                      value={vehicleFields.license_plate}
                      onChange={handleVehicleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">VIN</label>
                    <Input
                      name="vin"
                      value={vehicleFields.vin}
                      onChange={handleVehicleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <Select
                name="status"
                value={equipmentForm.status || 'available'}
                onChange={handleEquipmentInputChange}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'in-use', label: 'In Use' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                  { value: 'lost', label: 'Lost' }
                ]}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Condition Rating</label>
              <Input
                name="condition_rating"
                type="number"
                min="1"
                max="5"
                value={equipmentForm.condition_rating || 5}
                onChange={handleEquipmentInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">Rating from 1 (poor) to 5 (excellent)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <Input
                name="location"
                value={equipmentForm.location || ''}
                onChange={handleEquipmentInputChange}
                placeholder="Warehouse, Job Site, etc."
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEquipmentForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Equipment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 