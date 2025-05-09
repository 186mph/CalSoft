import { supabase } from '@/lib/supabase/client';
import { MaintenanceRecord, MaintenanceType } from '../interfaces/equipment';

/**
 * Service for managing equipment maintenance records and scheduling
 */
export const equipmentMaintenanceService = {
  /**
   * Get all maintenance records with optional filters
   */
  getAllMaintenanceRecords: async (equipmentId?: string, maintenanceType?: MaintenanceType) => {
    let query = supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:equipment_id(id, name, type, serial_number),
        technician:technician_id(id, email, user_metadata)
      `)
      .order('maintenance_date', { ascending: false });
    
    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }
    
    if (maintenanceType) {
      query = query.eq('maintenance_type', maintenanceType);
    }
    
    const { data, error } = await query;
    
    return { data, error };
  },
  
  /**
   * Get maintenance record by ID
   */
  getMaintenanceRecordById: async (id: string) => {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:equipment_id(id, name, type, serial_number),
        technician:technician_id(id, email, user_metadata)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },
  
  /**
   * Create new maintenance record
   */
  createMaintenanceRecord: async (record: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .insert(record)
      .select(`
        *,
        equipment:equipment_id(id, name, type, serial_number),
        technician:technician_id(id, email, user_metadata)
      `)
      .single();
    
    // If successful and this is a completed maintenance, update the equipment's last_maintenance_date
    if (!error && data) {
      await supabase
        .from('equipment')
        .update({ 
          last_maintenance_date: data.maintenance_date,
          next_maintenance_date: data.next_maintenance_date || null,
          // If maintenance is complete and there's no specific status to set, set equipment to available
          ...(record.maintenance_type !== 'certification' && !record.status_after_maintenance ? { status: 'available' } : {})
        })
        .eq('id', record.equipment_id);
    }
    
    return { data, error };
  },
  
  /**
   * Update existing maintenance record
   */
  updateMaintenanceRecord: async (id: string, updates: Partial<Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        equipment:equipment_id(id, name, type, serial_number),
        technician:technician_id(id, email, user_metadata)
      `)
      .single();
    
    // If this updates maintenance_date or next_maintenance_date, update the equipment record too
    if (!error && data && (updates.maintenance_date || updates.next_maintenance_date)) {
      const equipmentUpdates: any = {};
      
      if (updates.maintenance_date) {
        equipmentUpdates.last_maintenance_date = updates.maintenance_date;
      }
      
      if (updates.next_maintenance_date) {
        equipmentUpdates.next_maintenance_date = updates.next_maintenance_date;
      }
      
      if (Object.keys(equipmentUpdates).length > 0) {
        await supabase
          .from('equipment')
          .update(equipmentUpdates)
          .eq('id', data.equipment_id);
      }
    }
    
    return { data, error };
  },
  
  /**
   * Delete maintenance record
   */
  deleteMaintenanceRecord: async (id: string) => {
    const { error } = await supabase
      .from('equipment_maintenance')
      .delete()
      .eq('id', id);
    
    return { error };
  },
  
  /**
   * Get maintenance schedule for equipment (upcoming and overdue)
   */
  getMaintenanceSchedule: async (daysAhead = 30) => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedFuture = futureDate.toISOString().split('T')[0];
    
    // Get upcoming maintenance
    const { data: upcomingData, error: upcomingError } = await supabase
      .from('equipment')
      .select(`
        id,
        name,
        type,
        serial_number,
        model,
        last_maintenance_date,
        next_maintenance_date
      `)
      .not('next_maintenance_date', 'is', null)
      .gte('next_maintenance_date', formattedToday)
      .lte('next_maintenance_date', formattedFuture)
      .order('next_maintenance_date');
    
    // Get overdue maintenance
    const { data: overdueData, error: overdueError } = await supabase
      .from('equipment')
      .select(`
        id,
        name,
        type,
        serial_number,
        model,
        last_maintenance_date,
        next_maintenance_date
      `)
      .not('next_maintenance_date', 'is', null)
      .lt('next_maintenance_date', formattedToday)
      .order('next_maintenance_date');
    
    return { 
      upcoming: { data: upcomingData, error: upcomingError },
      overdue: { data: overdueData, error: overdueError }
    };
  },
  
  /**
   * Get maintenance types (predefined list)
   */
  getMaintenanceTypes: async () => {
    // These are predefined maintenance types
    const types: MaintenanceType[] = [
      'routine',
      'repair',
      'inspection',
      'certification',
      'calibration',
      'other'
    ];
    
    return { data: types, error: null };
  }
};

export default equipmentMaintenanceService; 