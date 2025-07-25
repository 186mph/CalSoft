import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineCheck } from 'react-icons/ai';
import { FaTools, FaTruck, FaShieldAlt, FaWrench } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';

import { equipmentService } from '@/lib/services/equipmentService';
import { 
  Equipment, 
  EquipmentFilters, 
  EquipmentFormData, 
  EquipmentStatus, 
  EquipmentFilter,
  MaintenanceRecord
} from '@/lib/interfaces/equipment';
import { EquipmentCategory } from '@/lib/types/equipment';
import { PortalType } from '@/lib/types/scheduling';
import { usePortalAccess, useUser } from '@/lib/hooks';
import { VehicleTracking } from '@/components/equipment/VehicleTracking';

// Temporary component stubs to fix module import errors
const EquipmentTable = ({ equipment, isLoading, onRefresh }: any) => <div>Equipment Table Component</div>;
const VehicleManagement = ({ division, portal }: any) => <div>Vehicle Management Component</div>;
const MaintenanceSchedule = ({ division, portal }: any) => <div>Maintenance Schedule Component</div>;
const EquipmentAssignmentModal = ({ isOpen, onClose, equipment, onAssigned }: any) => <div>Equipment Assignment Modal</div>;
const EquipmentDetailsModal = ({ isOpen, onClose, equipment, onEdit, onAssign }: any) => <div>Equipment Details Modal</div>;
const EquipmentForm = ({ equipment, onSave }: any) => <div>Equipment Form Component</div>;

// Extend the Equipment interface to include the missing properties
interface ExtendedEquipment extends Equipment {
  description?: string;
  asset_tag?: string;
  category?: string;
  customer?: {
    id: string;
    name: string;
    company_name: string;
  };
  asset?: {
    id: string;
    name: string;
    type: string;
  };
}

interface EquipmentManagementProps {
  division?: string;
  portal: PortalType;
}

export default function EquipmentManagement({ division, portal }: EquipmentManagementProps) {
  const { canEdit, canView } = usePortalAccess('equipment');
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState<ExtendedEquipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<ExtendedEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<EquipmentStatus[]>([]);
  const [filter, setFilter] = useState<EquipmentFilter>({
    division,
    portal,
    search: '',
    category: '',
    status: '' as EquipmentStatus
  });

  const user = useUser();
  const canManageEquipment = user?.role === 'admin' || user?.role === 'manager';

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Equipment>();
  const maintenanceForm = useForm<MaintenanceRecord>();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<ExtendedEquipment | null>(null);
  
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    type: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    purchase_date: '',
    status: 'available',
    location: '',
  });

  // Fetch equipment data
  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      // Use equipmentService to fetch equipment data from neta_ops schema
      const result = await equipmentService.getAllEquipment({
        ...filter,
        division: division,
        portal: portal
      });
      
      if (result.data) {
        setEquipment(result.data as ExtendedEquipment[]);
        setFilteredEquipment(result.data as ExtendedEquipment[]);
        
        // Extract unique categories for filter options
        const uniqueCategories = [...new Set(result.data.map(item => item.category || item.type).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (portal && canView) {
      fetchEquipment();
    }
  }, [division, portal, canView]);
  
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Get statuses directly from enum
        const statusesResult = ['available', 'assigned', 'maintenance', 'retired'] as EquipmentStatus[];
        setStatuses(statusesResult);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [filter, equipment]);
  
  const applyFilters = () => {
    let filtered = [...equipment];
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
        (item.serial_number && item.serial_number.toLowerCase().includes(searchLower)) ||
        (item.asset_tag && item.asset_tag.toLowerCase().includes(searchLower)) ||
        (item.model && item.model.toLowerCase().includes(searchLower)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(searchLower))
      );
    }
    
    if (filter.category) {
      filtered = filtered.filter(item => item.category === filter.category || item.type === filter.category);
    }
    
    if (filter.status) {
      filtered = filtered.filter(item => item.status === filter.status);
    }
    
    setFilteredEquipment(filtered);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value }));
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(prev => ({ ...prev, category: e.target.value }));
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(prev => ({ ...prev, status: e.target.value as EquipmentStatus }));
  };
  
  const refreshEquipment = async () => {
    try {
      setIsLoading(true);
      // Use equipmentService to fetch equipment data from neta_ops schema
      const result = await equipmentService.getAllEquipment({
        ...filter,
        division: division,
        portal: portal
      });
      
      if (result.data) {
        setEquipment(result.data as ExtendedEquipment[]);
        setFilteredEquipment(result.data as ExtendedEquipment[]);
      }
    } catch (error) {
      console.error('Failed to refresh equipment:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEquipmentSaved = () => {
    setOpenForm(false);
    refreshEquipment();
  };
  
  const getCategoryIcon = (category: EquipmentCategory) => {
    switch (category) {
      case 'vehicle':
        return <FaTruck className="text-blue-500" />;
      case 'tool':
        return <FaWrench className="text-yellow-500" />;
      case 'testing-equipment':
        return <FaTools className="text-green-500" />;
      case 'safety-equipment':
        return <FaShieldAlt className="text-red-500" />;
      default:
        return null;
    }
  };
  
  // Update the EquipmentStatus type to include 'out-of-service'
  type ExtendedEquipmentStatus = 'available' | 'assigned' | 'maintenance' | 'retired' | 'out-of-service';
  
  const getStatusColor = (status: ExtendedEquipmentStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-service':
        return 'bg-red-100 text-red-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleCreateEquipment = async () => {
    try {
      // Convert undefined to null for nullable fields to match expected types
      const equipmentData = {
        ...formData,
        notes: formData.notes !== undefined ? formData.notes : null,
        warranty_expiration: formData.warranty_expiration !== undefined ? formData.warranty_expiration : null,
        last_maintenance_date: formData.last_maintenance_date !== undefined ? formData.last_maintenance_date : null,
        next_maintenance_date: formData.next_maintenance_date !== undefined ? formData.next_maintenance_date : null,
        division: division
      } as Omit<Equipment, "id" | "created_at" | "updated_at">;
      
      // Use equipmentService to create equipment in neta_ops schema
      const result = await equipmentService.createEquipment(equipmentData);
      
      if (result.error) {
        throw new Error((result.error as any).message || 'Failed to create equipment');
      }
      
      toast({
        title: 'Success',
        description: 'Equipment created successfully',
        variant: 'default',
      });
      setIsCreateModalOpen(false);
      resetForm();
      refreshEquipment();
    } catch (error: any) {
      console.error('Failed to create equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create equipment',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEquipment = async () => {
    if (!selectedEquipment) return;
    
    try {
      // Convert undefined to null for nullable fields to match expected types
      const equipmentData = {
        ...formData,
        notes: formData.notes !== undefined ? formData.notes : null,
        warranty_expiration: formData.warranty_expiration !== undefined ? formData.warranty_expiration : null,
        last_maintenance_date: formData.last_maintenance_date !== undefined ? formData.last_maintenance_date : null,
        next_maintenance_date: formData.next_maintenance_date !== undefined ? formData.next_maintenance_date : null,
        division: division
      } as Omit<Equipment, "id" | "created_at" | "updated_at">;
      
      // Use equipmentService to update equipment in neta_ops schema
      const result = await equipmentService.updateEquipment(selectedEquipment.id, equipmentData);
      
      if (result.error) {
        throw new Error((result.error as any).message || 'Failed to update equipment');
      }
      
      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
        variant: 'default',
      });
      setIsEditModalOpen(false);
      resetForm();
      refreshEquipment();
    } catch (error: any) {
      console.error('Failed to update equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    
    try {
      // Use equipmentService to delete equipment from neta_ops schema
      const result = await equipmentService.deleteEquipment(id);
      
      if (result.error) {
        throw new Error((result.error as any).message || 'Failed to delete equipment');
      }
      
      toast({
        title: 'Success',
        description: 'Equipment deleted successfully',
        variant: 'default',
      });
      refreshEquipment();
    } catch (error: any) {
      console.error('Failed to delete equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete equipment',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (item: ExtendedEquipment) => {
    setSelectedEquipment(item);
    setFormData({
      name: item.name,
      type: item.type,
      serial_number: item.serial_number,
      model: item.model,
      manufacturer: item.manufacturer,
      purchase_date: item.purchase_date,
      warranty_expiration: item.warranty_expiration || undefined,
      status: item.status,
      location: item.location,
      notes: item.notes || undefined,
      last_maintenance_date: item.last_maintenance_date || undefined,
      next_maintenance_date: item.next_maintenance_date || undefined,
    });
    setIsEditModalOpen(true);
  };

  const openAssignModal = (item: ExtendedEquipment) => {
    setSelectedEquipment(item);
    setIsAssignModalOpen(true);
  };

  const openDetailsModal = (item: ExtendedEquipment) => {
    setSelectedEquipment(item);
    setIsDetailsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      serial_number: '',
      model: '',
      manufacturer: '',
      purchase_date: '',
      status: 'available',
      location: '',
    });
    setSelectedEquipment(null);
  };

  const handleFilterChange = (key: keyof EquipmentFilters, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  if (!canView) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Equipment Management</h1>
        <p>You don't have permission to view equipment data.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Equipment Management</h1>
        {canManageEquipment && (
          <Button onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }} className="flex items-center gap-2">
            <Plus size={16} />
            Add Equipment
          </Button>
        )}
      </div>

      <Tabs defaultValue="equipment">
        <TabsList className="flex">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Filters</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Search"
                  placeholder="Search by name, description, serial number..."
                  value={filter.search}
                  onChange={handleSearch}
                />
                <Select
                  label="Category"
                  value={filter.category}
                  onChange={handleCategoryChange}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map(cat => ({ value: cat, label: cat }))
                  ]}
                />
                <Select
                  label="Status"
                  value={filter.status}
                  onChange={handleStatusChange}
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...statuses.map(status => ({ value: status, label: status }))
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          <EquipmentTable 
            equipment={filteredEquipment} 
            isLoading={isLoading} 
            onRefresh={refreshEquipment}
          />
        </TabsContent>
        
        <TabsContent value="vehicles">
          <VehicleTracking 
            division={division || ''}
          />
        </TabsContent>
        
        <TabsContent value="maintenance">
          <MaintenanceSchedule 
            division={division}
            portal={portal} 
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Equipment Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          isCreateModalOpen ? setIsCreateModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? "Add New Equipment" : "Edit Equipment"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Equipment Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Serial Number"
              name="serial_number"
              value={formData.serial_number}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Manufacturer"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              name="purchase_date"
              type="date"
              value={formData.purchase_date}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Warranty Expiration"
              name="warranty_expiration"
              type="date"
              value={formData.warranty_expiration || ''}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Last Maintenance Date"
              name="last_maintenance_date"
              type="date"
              value={formData.last_maintenance_date || ''}
              onChange={handleInputChange}
            />
            <Input
              label="Next Maintenance Date"
              name="next_maintenance_date"
              type="date"
              value={formData.next_maintenance_date || ''}
              onChange={handleInputChange}
            />
          </div>
          
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { label: 'Available', value: 'available' },
              { label: 'Assigned', value: 'assigned' },
              { label: 'Maintenance', value: 'maintenance' },
              { label: 'Retired', value: 'retired' }
            ]}
            required
          />
          
          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
          />
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              variant="outline"
              onClick={() => {
                isCreateModalOpen ? setIsCreateModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={isCreateModalOpen ? handleCreateEquipment : handleUpdateEquipment}
            >
              {isCreateModalOpen ? 'Create Equipment' : 'Update Equipment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Equipment Details Modal */}
      {selectedEquipment && (
        <EquipmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          equipment={selectedEquipment}
          onEdit={() => {
            setIsDetailsModalOpen(false);
            openEditModal(selectedEquipment);
          }}
          onAssign={() => {
            setIsDetailsModalOpen(false);
            openAssignModal(selectedEquipment);
          }}
        />
      )}

      {/* Equipment Assignment Modal */}
      {selectedEquipment && (
        <EquipmentAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          equipment={selectedEquipment}
          onAssigned={() => {
            setIsAssignModalOpen(false);
            fetchEquipment();
          }}
        />
      )}
    </div>
  );
} 