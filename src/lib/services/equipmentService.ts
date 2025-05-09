import { supabase } from '@/lib/supabase/client';
import { 
  Equipment,
  Vehicle,
  MaintenanceRecord,
  EquipmentAssignment,
  EquipmentFilter,
  EquipmentFilters
} from '../interfaces/equipment';

/**
 * Service for managing equipment and vehicles
 */
export const equipmentService = {
  /**
   * Get all equipment with optional filters
   */
  getAllEquipment: async (filters?: EquipmentFilter | EquipmentFilters) => {
    let query = supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment')
      .select(`
        *,
        customer:customer_id(id, name, company_name),
        asset:asset_id(id, name, type)
      `);
    
    // By default, exclude equipment items that are vehicles (car, truck, van, etc.)
    // Unless specifically querying for them
    const includeVehicles = filters && 'includeVehicles' in (filters as any) && (filters as any).includeVehicles;
    const vehicleTypes = ['truck', 'van', 'suv', 'car', 'utility', 'specialized'];
    
    if (!includeVehicles) {
      query = query.not('type', 'in', `(${vehicleTypes.map(t => `'${t}'`).join(',')})`);
    }
    
    if (filters) {
      // Handle filters from both interfaces
      if ('portal' in filters && filters.portal) {
        query = query.eq('portal_type', filters.portal);
      } else if ('portalType' in (filters as any) && (filters as any).portalType) {
        query = query.eq('portal_type', (filters as any).portalType);
      }
      
      if ('division' in filters && filters.division) {
        query = query.eq('division', filters.division);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if ('search' in filters && filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,model.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%`
        );
      } else if ('searchTerm' in (filters as EquipmentFilters) && (filters as EquipmentFilters).searchTerm) {
        query = query.or(
          `name.ilike.%${(filters as EquipmentFilters).searchTerm}%,serial_number.ilike.%${(filters as EquipmentFilters).searchTerm}%,model.ilike.%${(filters as EquipmentFilters).searchTerm}%,manufacturer.ilike.%${(filters as EquipmentFilters).searchTerm}%`
        );
      }
      
      if ('type' in (filters as EquipmentFilters) && (filters as EquipmentFilters).type) {
        query = query.eq('type', (filters as EquipmentFilters).type);
      }
      
      if ('category' in filters && filters.category) {
        query = query.eq('category', filters.category);
      }
    }
    
    const { data, error } = await query;
    
    return { data, error };
  },
  
  /**
   * Get equipment by ID
   */
  getEquipmentById: async (id: string) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment')
      .select(`
        *,
        customer:customer_id(id, name, company_name),
        asset:asset_id(id, name, type)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },
  
  /**
   * Create new equipment
   */
  createEquipment: async (equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Starting equipment creation in neta_ops.equipment');
      const { data, error } = await supabase
        .schema('neta_ops') // Use neta_ops schema
        .from('equipment')
        .insert([equipment]) // Wrap in array to ensure it's an array
        .select()
        .single();
      
      if (error) {
        console.error('Error in createEquipment:', error);
      } else {
        console.log('Equipment created successfully:', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('Exception in createEquipment:', err);
      return { data: null, error: err };
    }
  },
  
  /**
   * Update existing equipment
   */
  updateEquipment: async (id: string, updates: Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },
  
  /**
   * Delete equipment by ID
   */
  deleteEquipment: async (id: string) => {
    const { error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment')
      .delete()
      .eq('id', id);
    
    return { error };
  },
  
  /**
   * Get all equipment assignments (optionally filtered)
   */
  getEquipmentAssignments: async (equipmentId?: string, userId?: string) => {
    let query = supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment_assignments')
      .select(`
        *,
        equipment:equipment_id(id, name, serial_number, model)
      `);
    
    if (equipmentId) query = query.eq('equipment_id', equipmentId);
    if (userId) query = query.eq('assigned_to', userId);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    return { data, error };
  },
  
  /**
   * Get equipment assignment by ID
   */
  getAssignmentById: async (id: string) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment_assignments')
      .select(`
        *,
        equipment:equipment_id(id, name, serial_number, model)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },
  
  /**
   * Create equipment assignment
   */
  createAssignment: async (assignment: Omit<EquipmentAssignment, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment_assignments')
      .insert(assignment)
      .select(`
        *,
        equipment:equipment_id(id, name, serial_number, model)
      `)
      .single();
    
    // If successful, update equipment status to assigned
    if (!error && data && assignment.technician_id) {
      await supabase
        .schema('neta_ops') // Use neta_ops schema
        .from('equipment')
        .update({ status: 'assigned' })
        .eq('id', assignment.equipment_id);
    }
    
    return { data, error };
  },
  
  /**
   * Update equipment assignment
   */
  updateAssignment: async (id: string, updates: Partial<Omit<EquipmentAssignment, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        equipment:equipment_id(id, name, serial_number, model)
      `)
      .single();
    
    return { data, error };
  },
  
  /**
   * Delete equipment assignment
   */
  deleteAssignment: async (id: string) => {
    const { error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment_assignments')
      .delete()
      .eq('id', id);
    
    return { error };
  },
  
  /**
   * Get maintenance records for equipment
   */
  getMaintenanceRecords: async (equipmentId?: string) => {
    let query = supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipment_id(id, name, serial_number, model)
      `);
    
    if (equipmentId) query = query.eq('equipment_id', equipmentId);
    
    const { data, error } = await query.order('maintenance_date', { ascending: false });
    
    return { data, error };
  },
  
  /**
   * Create maintenance record
   */
  createMaintenanceRecord: async (record: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('maintenance_records')
      .insert(record)
      .select()
      .single();
    
    // Update equipment's last maintenance date
    if (!error && data) {
      await supabase
        .schema('neta_ops') // Use neta_ops schema
        .from('equipment')
        .update({ 
          last_maintenance_date: record.maintenance_date,
          next_maintenance_date: record.next_maintenance_date,
          status: 'available' // Set back to available if it was in maintenance
        })
        .eq('id', record.equipment_id);
    }
    
    return { data, error };
  },
  
  /**
   * Get vehicles with optional filters
   */
  getVehicles: async ({ division, status }: { division?: string; status?: string }) => {
    try {
      let query = supabase
        .schema('neta_ops')
        .from('vehicles')
        .select('*');

      // Add filters if they exist
      if (division) {
        query = query.eq('division', division);
      }
      
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return { data: null, error };
    }
  },
  
  /**
   * Get vehicle by ID
   */
  getVehicleById: async (id: string) => {
    const { data, error } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('vehicles')
      .select(`
        *,
        equipment:equipment_id(*)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },
  
  /**
   * Create a new vehicle directly
   */
  createVehicle: async (vehicle: any) => {
    try {
      console.log('Starting vehicle creation in neta_ops.vehicles');
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('vehicles')
        .insert([vehicle]) // Wrap in array to ensure it's an array
        .select()
        .single();
      
      if (error) {
        console.error('Error in createVehicle:', error);
      } else {
        console.log('Vehicle created successfully:', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('Exception in createVehicle:', err);
      return { data: null, error: err };
    }
  },
  
  /**
   * Update a vehicle
   */
  updateVehicle: async (id: string, vehicle: any) => {
    try {
      console.log('Starting vehicle update in neta_ops.vehicles');
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('vehicles')
        .update(vehicle)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error in updateVehicle:', error);
      } else {
        console.log('Vehicle updated successfully:', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('Exception in updateVehicle:', err);
      return { data: null, error: err };
    }
  },
  
  /**
   * Delete vehicle (and its associated equipment)
   */
  deleteVehicle: async (id: string) => {
    // Get the vehicle to get its equipment_id
    const { data: vehicle, error: vehicleFetchError } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('vehicles')
      .select('equipment_id')
      .eq('id', id)
      .single();
    
    if (vehicleFetchError || !vehicle) {
      return { error: vehicleFetchError };
    }
    
    // Delete the vehicle entry
    const { error: vehicleDeleteError } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (vehicleDeleteError) {
      return { error: vehicleDeleteError };
    }
    
    // Delete the equipment entry
    const { error: equipmentDeleteError } = await supabase
      .schema('neta_ops') // Use neta_ops schema
      .from('equipment')
      .delete()
      .eq('id', vehicle.equipment_id);
    
    return { error: equipmentDeleteError };
  },
  
  /**
   * Get equipment specifically for equipment tracking (excluding vehicles)
   */
  getEquipment: async (filters?: EquipmentFilter) => {
    try {
      // First we get all equipment
      let query = supabase
        .schema('neta_ops')
        .from('equipment')
        .select(`
          *,
          asset:asset_id(id, name, type)
        `);
      
      // Explicitly exclude vehicle types
      const vehicleTypes = ['truck', 'van', 'suv', 'car', 'utility', 'specialized'];
      query = query.not('type', 'in', `(${vehicleTypes.map(t => `'${t}'`).join(',')})`);
      
      // Add division filter if provided
      if (filters?.division) {
        query = query.eq('division', filters.division);
      }
      
      // Add status filter if provided
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      // Add search term if provided
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,model.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  },
};

export default equipmentService;