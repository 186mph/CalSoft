import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';
import { MaintenanceRecord, MaintenanceType, Equipment } from '@/lib/interfaces/equipment';
import { equipmentMaintenanceService } from '@/lib/services/equipmentMaintenanceService';

interface MaintenanceFormProps {
  equipmentId: string;
  equipmentDetails?: Equipment;
  maintenanceRecord?: MaintenanceRecord;
  onSave: () => void;
  onCancel: () => void;
}

export default function MaintenanceForm({
  equipmentId,
  equipmentDetails,
  maintenanceRecord,
  onSave,
  onCancel
}: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [showNextDate, setShowNextDate] = useState(
    maintenanceRecord?.next_maintenance_date ? true : false
  );
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<
    Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>
  >({
    defaultValues: maintenanceRecord
      ? {
          equipment_id: maintenanceRecord.equipment_id,
          maintenance_type: maintenanceRecord.maintenance_type,
          maintenance_date: maintenanceRecord.maintenance_date,
          next_maintenance_date: maintenanceRecord.next_maintenance_date,
          performed_by: maintenanceRecord.performed_by,
          cost: maintenanceRecord.cost,
          notes: maintenanceRecord.notes,
          status_after_maintenance: maintenanceRecord.status_after_maintenance
        }
      : {
          equipment_id: equipmentId,
          maintenance_date: new Date().toISOString().split('T')[0]
        }
  });
  
  const maintenanceType = watch('maintenance_type');
  
  useEffect(() => {
    const loadMaintenanceTypes = async () => {
      try {
        const { data } = await equipmentMaintenanceService.getMaintenanceTypes();
        if (data) {
          setMaintenanceTypes(data);
        }
      } catch (error) {
        console.error('Failed to load maintenance types:', error);
      }
    };
    
    loadMaintenanceTypes();
  }, []);
  
  useEffect(() => {
    // Different maintenance types might require different follow-up actions
    if (maintenanceType === 'routine' || maintenanceType === 'inspection') {
      setShowNextDate(true);
    }
  }, [maintenanceType]);
  
  const onSubmit = async (data: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSubmitting(true);
    
    try {
      if (maintenanceRecord?.id) {
        // Update existing record
        const { error } = await equipmentMaintenanceService.updateMaintenanceRecord(
          maintenanceRecord.id,
          data
        );
        
        if (error) throw new Error(error.message);
        
        toast({
          title: 'Success',
          description: 'Maintenance record updated successfully',
          variant: 'success',
        });
      } else {
        // Create new record
        const { error } = await equipmentMaintenanceService.createMaintenanceRecord(data);
        
        if (error) throw new Error(error.message);
        
        toast({
          title: 'Success',
          description: 'Maintenance record created successfully',
          variant: 'success',
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
      toast({
        title: 'Error',
        description: 'Failed to save maintenance record',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-lg font-semibold mb-2">
        {maintenanceRecord ? 'Edit Maintenance Record' : 'Create Maintenance Record'}
      </h3>
      
      {equipmentDetails && (
        <div className="bg-gray-50 p-3 rounded mb-4">
          <p className="font-medium">{equipmentDetails.name}</p>
          <p className="text-sm text-gray-600">
            Type: {equipmentDetails.type} | Model: {equipmentDetails.model} | SN: {equipmentDetails.serial_number}
          </p>
        </div>
      )}
      
      <input type="hidden" {...register('equipment_id')} value={equipmentId} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Maintenance Type"
            {...register('maintenance_type', { required: 'Maintenance type is required' })}
            options={maintenanceTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))}
            error={errors.maintenance_type?.message}
          />
        </div>
        
        <div>
          <Input
            type="date"
            label="Maintenance Date"
            {...register('maintenance_date', { required: 'Maintenance date is required' })}
            error={errors.maintenance_date?.message}
          />
        </div>
        
        {showNextDate && (
          <div>
            <Input
              type="date"
              label="Next Maintenance Date"
              {...register('next_maintenance_date')}
              error={errors.next_maintenance_date?.message}
            />
          </div>
        )}
        
        <div>
          <Input
            type="text"
            label="Performed By"
            {...register('performed_by')}
            error={errors.performed_by?.message}
          />
        </div>
        
        <div>
          <Input
            type="number"
            step="0.01"
            label="Cost"
            {...register('cost', {
              setValueAs: value => (value === '' ? undefined : parseFloat(value))
            })}
            error={errors.cost?.message}
          />
        </div>
        
        {maintenanceType && (
          <div className="md:col-span-2">
            <Select
              label="Equipment Status After Maintenance"
              {...register('status_after_maintenance')}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'in-repair', label: 'In Repair' },
                { value: 'out-of-service', label: 'Out of Service' },
                { value: 'in-calibration', label: 'In Calibration' }
              ]}
              hint="Leave empty to keep current status"
            />
          </div>
        )}
      </div>
      
      <div>
        <Textarea
          label="Notes"
          {...register('notes')}
          error={errors.notes?.message}
          rows={4}
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          onClick={onCancel} 
          variant="outline"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting 
            ? 'Saving...' 
            : maintenanceRecord ? 'Update Maintenance' : 'Create Maintenance'
          }
        </Button>
      </div>
    </form>
  );
} 