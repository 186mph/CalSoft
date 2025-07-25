import { useState, useEffect } from 'react';
import { Equipment, EquipmentAssignmentFormData } from '@/lib/interfaces/equipment';
import { equipmentService } from '@/lib/services/equipmentService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
}

interface EquipmentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
  onAssigned: () => void;
}

export default function EquipmentAssignmentModal({
  isOpen,
  onClose,
  equipment,
  onAssigned
}: EquipmentAssignmentModalProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EquipmentAssignmentFormData>({
    equipment_id: equipment.id,
    technician_id: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      // Reset form when modal opens
      setFormData({
        equipment_id: equipment.id,
        technician_id: '',
        start_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [isOpen, equipment.id]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      // This is a placeholder - you need to implement a technician service
      // const data = await technicianService.getAllTechnicians();
      // For now, we'll use mock data
      const data: Technician[] = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '555-1234', role: 'Senior Technician' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '555-5678', role: 'Technician' },
        { id: '3', first_name: 'Mike', last_name: 'Johnson', email: 'mike@example.com', phone: '555-9012', role: 'Junior Technician' },
      ];
      setTechnicians(data);
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
      toast({
        title: 'Error',
        description: 'Failed to load technicians',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.technician_id) {
      toast({
        title: 'Error',
        description: 'Please select a technician',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create the assignment with only the required fields
      await equipmentService.createAssignment({
        equipment_id: formData.equipment_id,
        technician_id: formData.technician_id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null
      });
      
      toast({
        title: 'Success',
        description: 'Equipment assigned successfully',
        variant: 'success',
      });
      onAssigned();
    } catch (error) {
      console.error('Failed to assign equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign equipment',
        variant: 'destructive',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Equipment: ${equipment.name}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Equipment Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium">{equipment.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Serial Number</p>
              <p className="text-sm font-medium">{equipment.serial_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm font-medium">{equipment.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Model</p>
              <p className="text-sm font-medium">{equipment.model}</p>
            </div>
          </div>
        </div>

        <Select
          label="Assign to Technician"
          name="technician_id"
          value={formData.technician_id}
          onChange={handleInputChange}
          options={[
            { label: 'Select a Technician', value: '' },
            ...technicians.map(tech => ({ 
              label: `${tech.first_name} ${tech.last_name} (${tech.role})`, 
              value: tech.id 
            }))
          ]}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleInputChange}
            required
          />
          <Input
            label="End Date (Optional)"
            name="end_date"
            type="date"
            value={formData.end_date || ''}
            onChange={handleInputChange}
          />
        </div>

        <Textarea
          label="Assignment Notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleInputChange}
          placeholder="Add any special instructions or notes about this assignment"
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.technician_id}
          >
            {loading ? 'Processing...' : 'Assign Equipment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
} 