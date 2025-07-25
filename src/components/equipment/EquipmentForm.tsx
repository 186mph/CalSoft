import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Equipment, EquipmentFormData } from '@/lib/interfaces/equipment';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import * as equipmentService from '@/lib/services/equipment';

// Equipment form interfaces
interface EquipmentFormProps {
  editingEquipment?: Partial<Equipment> & { 
    purchase_price?: number | string | null;
    category?: string; 
  };
  onSave: (equipment: Equipment) => void;
  onCancel: () => void;
  division: string;
}

// Extend the EquipmentFormData interface to include our form fields
interface FormData extends EquipmentFormData {
  id?: string;
  division: string;
  purchase_price: string;
  condition_rating: string;
  customer_id: string;
  asset_id: string;
  category: string;
}

export function EquipmentForm({ 
  editingEquipment, 
  onSave, 
  onCancel,
  division
}: EquipmentFormProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [form, setForm] = useState<FormData>({
    name: '',
    type: '',
    division: division || '',
    status: 'available',
    model: '',
    serial_number: '',
    notes: '',
    purchase_date: '',
    purchase_price: '',
    manufacturer: '',
    location: '',
    warranty_expiration: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
    condition_rating: '',
    category: '',
    customer_id: '',
    asset_id: '',
  });
  
  // Load form with editing data if available
  useEffect(() => {
    if (editingEquipment) {
      // Map from equipment to form fields
      setForm({
        id: editingEquipment.id,
        name: editingEquipment.name || '',
        type: editingEquipment.type || '',
        status: editingEquipment.status || 'available',
        serial_number: editingEquipment.serial_number || '',
        model: editingEquipment.model || '',
        manufacturer: editingEquipment.manufacturer || '',
        purchase_date: editingEquipment.purchase_date || '',
        warranty_expiration: editingEquipment.warranty_expiration || '',
        location: editingEquipment.location || '',
        notes: editingEquipment.notes || '',
        last_maintenance_date: editingEquipment.last_maintenance_date || '',
        next_maintenance_date: editingEquipment.next_maintenance_date || '',
        condition_rating: editingEquipment.condition_rating?.toString() || '',
        customer_id: editingEquipment.customer_id || '',
        asset_id: editingEquipment.asset_id || '',
        division: editingEquipment.division || division,
        // Additional form fields not in Equipment interface
        purchase_price: editingEquipment.purchase_price?.toString() || '',
        category: editingEquipment.category || '',
      });
    }
  }, [editingEquipment, division]);
  
  // Fetch customers and assets for dropdowns
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .order('name');
          
        if (error) {
          console.error("Error loading customers:", error);
          return;
        }
        
        setCustomers(data || []);
      } catch (err) {
        console.error("Error in customer fetching:", err);
      }
    };
    
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .schema('neta_ops')
          .from('assets')
          .select('id, name, type')
          .order('name');
          
        if (error) {
          console.error("Error loading assets:", error);
          return;
        }
        
        setAssets(data || []);
      } catch (err) {
        console.error("Error in asset fetching:", err);
      }
    };
    
    fetchCustomers();
    fetchAssets();
  }, []);
  
  // Form change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Date picker handlers
  const handleDateChange = (field: string, date: string | null) => {
    setForm(prev => ({ 
      ...prev, 
      [field]: date || '' 
    }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Convert form string values to the proper types for the API
      const equipmentData: Omit<Equipment, 'id' | 'created_at' | 'updated_at'> = {
        name: form.name,
        type: form.type,
        serial_number: form.serial_number,
        model: form.model,
        manufacturer: form.manufacturer,
        purchase_date: form.purchase_date,
        warranty_expiration: form.warranty_expiration || null,
        status: form.status,
        location: form.location,
        notes: form.notes || null,
        last_maintenance_date: form.last_maintenance_date || null,
        next_maintenance_date: form.next_maintenance_date || null,
        condition_rating: form.condition_rating ? parseFloat(form.condition_rating) : undefined,
        customer_id: form.customer_id || undefined,
        asset_id: form.asset_id || undefined,
        division: form.division
      };
      
      // Use equipmentService for save/update
      let result;
      
      if (editingEquipment?.id) {
        // Update existing equipment
        result = await equipmentService.updateEquipment(
          editingEquipment.id,
          equipmentData
        );
      } else {
        // Create new equipment
        result = await equipmentService.createEquipment(equipmentData);
      }
      
      toast({
        title: `Equipment ${editingEquipment ? 'updated' : 'created'} successfully`,
        variant: 'success',
      });
      
      onSave(result);
    } catch (error: any) {
      console.error("Error saving equipment:", error);
      toast({
        title: "Error saving equipment",
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Define common equipment types excluding vehicle types
  const equipmentTypes = [
    { value: 'equipment', label: 'General Equipment' },
    { value: 'tool', label: 'Tool' },
    { value: 'meter', label: 'Meter' },
    { value: 'tester', label: 'Tester' },
    { value: 'device', label: 'Device' },
    { value: 'ppe', label: 'Personal Protective Equipment' },
    { value: 'instrument', label: 'Instrument' },
    { value: 'scanner', label: 'Scanner' }
  ];

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'maintenance', label: 'In Maintenance' },
    { value: 'retired', label: 'Retired' },
  ];

  return (
    <Dialog open={editingEquipment !== undefined} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name*"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
            
            <Select
              label="Type*"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={equipmentTypes}
              required
            />
          </div>
          
          <Textarea
            label="Description"
            name="notes"
            value={form.notes}
            onChange={handleChange}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Serial Number"
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
            />
            
            <Input
              label="Location"
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              name="purchase_date"
              type="date"
              value={form.purchase_date}
              onChange={handleChange}
            />
            
            <Input
              label="Warranty Expiration"
              name="warranty_expiration"
              type="date"
              value={form.warranty_expiration}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Manufacturer"
              name="manufacturer"
              value={form.manufacturer}
              onChange={handleChange}
            />
            
            <Input
              label="Model"
              name="model"
              value={form.model}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status*"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={statusOptions}
              required
            />
            
            <Input
              label="Category"
              name="category"
              value={form.category}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Last Maintenance Date"
              name="last_maintenance_date"
              type="date"
              value={form.last_maintenance_date}
              onChange={handleChange}
            />
            
            <Input
              label="Next Maintenance Date"
              name="next_maintenance_date"
              type="date"
              value={form.next_maintenance_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer"
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              options={customers.map(customer => ({ value: customer.id, label: customer.name }))}
            />
            
            <Select
              label="Asset"
              name="asset_id"
              value={form.asset_id}
              onChange={handleChange}
              options={assets.map(asset => ({ value: asset.id, label: asset.name }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Price"
              name="purchase_price"
              value={form.purchase_price}
              onChange={handleChange}
              type="number"
              step="0.01"
            />
            
            <Input
              label="Condition Rating (1-5)"
              name="condition_rating"
              value={form.condition_rating}
              onChange={handleChange}
              type="number"
              min="1"
              max="5"
              step="1"
              placeholder="Rate from 1 (poor) to 5 (excellent)"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : editingEquipment ? 'Update Equipment' : 'Add Equipment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 