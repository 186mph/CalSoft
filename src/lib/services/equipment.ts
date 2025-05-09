import { supabase } from '../supabase';
import { 
  Equipment, 
  EquipmentStatus, 
  Vehicle, 
  MaintenanceRecord, 
  EquipmentAssignment,
  EquipmentFilter,
  MaintenanceType,
  AssignmentStatus
} from '../interfaces/equipment';

// Equipment CRUD operations
export async function getEquipment(filter?: EquipmentFilter): Promise<Equipment[]> {
  try {
    // First, let's try a simple select without relations
    let query = supabase
      .schema('neta_ops')
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Exclude vehicle types from equipment listing
    const vehicleTypes = ['truck', 'van', 'suv', 'car', 'utility', 'specialized'];
    query = query.not('type', 'in', `(${vehicleTypes.map(t => `'${t}'`).join(',')})`);
    
    if (filter) {
      try {
        // Safely apply filters with error handling
        if (filter.portal) {
          query = query.eq('portal_type', filter.portal);
        }
        
        // Only apply division filter if the division field exists and has a value
        if (filter.division) {
          try {
            query = query.eq('division', filter.division);
          } catch (divisionError) {
            console.warn('Error applying division filter:', divisionError);
            // Continue without this filter if it fails
          }
        }
        
        if (filter.category) {
          query = query.eq('category', filter.category);
        }
        
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        
        if (filter.search) {
          query = query.or(
            `name.ilike.%${filter.search}%,serial_number.ilike.%${filter.search}%`
          );
        }
        
        // Include vehicles if specifically requested
        if (filter.includeVehicles) {
          query = supabase
            .schema('neta_ops')
            .from('equipment')
            .select('*')
            .order('created_at', { ascending: false });
            
          // Re-apply the other filters
          if (filter.portal) query = query.eq('portal_type', filter.portal);
          if (filter.division) query = query.eq('division', filter.division);
          if (filter.category) query = query.eq('category', filter.category);
          if (filter.status) query = query.eq('status', filter.status);
          if (filter.search) {
            query = query.or(
              `name.ilike.%${filter.search}%,serial_number.ilike.%${filter.search}%`
            );
          }
        }
      } catch (filterError) {
        console.error('Error applying filters:', filterError);
        // Continue with unfiltered query if filter application fails
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching equipment:', error);
      throw new Error(error.message);
    }
    
    // Now let's separately fetch customers and assets if any equipment items have those IDs
    const equipmentWithRelations = [...(data || [])];
    
    // Try to fetch customers for equipment items that have customer_id
    try {
      const customerIds = equipmentWithRelations
        .filter(item => item.customer_id)
        .map(item => item.customer_id);
        
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .in('id', customerIds);
          
        if (customers) {
          // Manually join the customers data
          equipmentWithRelations.forEach(item => {
            if (item.customer_id) {
              const customer = customers.find(c => c.id === item.customer_id);
              if (customer) {
                item.customer = customer;
              }
            }
          });
        }
      }
    } catch (customerError) {
      console.warn('Error fetching customer relations:', customerError);
    }
    
    // Try to fetch assets for equipment items that have asset_id
    try {
      const assetIds = equipmentWithRelations
        .filter(item => item.asset_id)
        .map(item => item.asset_id);
        
      if (assetIds.length > 0) {
        const { data: assets } = await supabase
          .schema('neta_ops')
          .from('assets')
          .select('id, name, type')
          .in('id', assetIds);
          
        if (assets) {
          // Manually join the assets data
          equipmentWithRelations.forEach(item => {
            if (item.asset_id) {
              const asset = assets.find(a => a.id === item.asset_id);
              if (asset) {
                item.asset = asset;
              }
            }
          });
        }
      }
    } catch (assetError) {
      console.warn('Error fetching asset relations:', assetError);
    }
    
    return equipmentWithRelations;
  } catch (error) {
    console.error('Exception fetching equipment:', error);
    return []; // Return empty array instead of throwing
  }
}

export async function getEquipmentById(id: string): Promise<Equipment> {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching equipment by id:', error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function createEquipment(equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>): Promise<Equipment> {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .insert([equipment])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating equipment:', error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function updateEquipment(id: string, equipment: Partial<Equipment>): Promise<Equipment> {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .update({
      ...equipment,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating equipment:', error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting equipment:', error);
    throw new Error(error.message);
  }
}

// Vehicle operations
export async function getVehicles() {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('vehicles')
    .select('*, equipment(*)');
  
  if (error) throw error;
  return data;
}

export async function getVehicleByEquipmentId(equipmentId: string) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('vehicles')
    .select('*')
    .eq('equipment_id', equipmentId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as Vehicle | null;
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('vehicles')
    .insert([vehicle])
    .select();
  
  if (error) throw error;
  return data[0] as Vehicle;
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('vehicles')
    .update(vehicle)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0] as Vehicle;
}

// Maintenance records operations
export async function getMaintenanceRecords(equipmentId: string) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('maintenance_records')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('maintenance_date', { ascending: false });
  
  if (error) throw error;
  return data as MaintenanceRecord[];
}

export async function createMaintenanceRecord(record: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('maintenance_records')
    .insert([record])
    .select();
  
  if (error) throw error;
  return data[0] as MaintenanceRecord;
}

export async function updateMaintenanceRecord(id: string, record: Partial<MaintenanceRecord>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('maintenance_records')
    .update(record)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0] as MaintenanceRecord;
}

export async function deleteMaintenanceRecord(id: string) {
  const { error } = await supabase
    .schema('neta_ops')
    .from('maintenance_records')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Equipment assignment operations
export async function getEquipmentAssignments(equipmentId?: string, userId?: string) {
  let query = supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .select(`
      *,
      technician:technician_id(id, first_name, last_name, email, phone, role)
    `)
    .order('start_date', { ascending: false });
  
  if (equipmentId) query = query.eq('equipment_id', equipmentId);
  if (userId) query = query.eq('technician_id', userId);
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as EquipmentAssignment[];
}

export async function getCurrentAssignment(equipmentId: string) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .select('*')
    .eq('equipment_id', equipmentId)
    .is('end_date', null)
    .in('status', ['checked-out', 'overdue'])
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as EquipmentAssignment | null;
}

export async function createEquipmentAssignment(assignment: Omit<EquipmentAssignment, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .insert([assignment])
    .select();
  
  if (error) throw error;
  return data[0] as EquipmentAssignment;
}

export async function updateEquipmentAssignment(id: string, assignment: Partial<EquipmentAssignment>) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .update(assignment)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0] as EquipmentAssignment;
}

export async function returnEquipment(id: string, condition_after?: number, notes?: string) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .update({
      return_date: new Date().toISOString(),
      condition_after,
      notes,
      status: 'returned' as AssignmentStatus
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0] as EquipmentAssignment;
}

export async function getMaintenanceDue(days: number = 30) {
  const { data, error } = await supabase
    .rpc('get_maintenance_due_equipment', { days_threshold: days });
  
  if (error) throw error;
  return data;
}

export async function getEquipmentCategories() {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .select('category')
    .order('category')
    .is('category', 'not.null');
  
  if (error) throw error;
  return Array.from(new Set(data.map(item => item.category)));
}

export async function getEquipmentStatuses() {
  return ['available', 'in-use', 'maintenance', 'retired', 'lost'] as EquipmentStatus[];
}

export async function getMaintenanceTypes() {
  return ['routine', 'repair', 'inspection', 'certification', 'calibration', 'other'] as MaintenanceType[];
}

export async function getAssignmentStatuses() {
  return ['checked-out', 'returned', 'overdue', 'damaged'] as AssignmentStatus[];
}

export async function assignEquipment(
  equipment_id: string, 
  assignment: {
    technician_id: string;
    start_date: string;
    end_date: string | null;
    notes: string;
  }
): Promise<void> {
  // First, check if there are any active assignments for this equipment
  const { data: activeAssignments, error: checkError } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .select('*')
    .eq('equipment_id', equipment_id)
    .is('end_date', null);

  if (checkError) {
    console.error('Error checking active assignments:', checkError);
    throw new Error(checkError.message);
  }

  // If there are active assignments, end them
  if (activeAssignments && activeAssignments.length > 0) {
    const { error: updateError } = await supabase
      .schema('neta_ops')
      .from('equipment_assignments')
      .update({ end_date: new Date().toISOString().split('T')[0] })
      .eq('equipment_id', equipment_id)
      .is('end_date', null);

    if (updateError) {
      console.error('Error ending active assignments:', updateError);
      throw new Error(updateError.message);
    }
  }

  // Create the new assignment
  const { error: insertError } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .insert([{
      equipment_id,
      technician_id: assignment.technician_id,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      notes: assignment.notes
    }]);

  if (insertError) {
    console.error('Error creating equipment assignment:', insertError);
    throw new Error(insertError.message);
  }
  
  // Update equipment status to "assigned"
  const { error: statusError } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .update({ 
      status: 'assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', equipment_id);

  if (statusError) {
    console.error('Error updating equipment status:', statusError);
    throw new Error(statusError.message);
  }
}

export async function endAssignment(assignment_id: string): Promise<void> {
  // Get the assignment to find the equipment_id
  const { data: assignment, error: fetchError } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .select('equipment_id')
    .eq('id', assignment_id)
    .single();

  if (fetchError) {
    console.error('Error fetching assignment:', fetchError);
    throw new Error(fetchError.message);
  }

  // End the assignment
  const { error: updateError } = await supabase
    .schema('neta_ops')
    .from('equipment_assignments')
    .update({ end_date: new Date().toISOString().split('T')[0] })
    .eq('id', assignment_id);

  if (updateError) {
    console.error('Error ending assignment:', updateError);
    throw new Error(updateError.message);
  }

  // Update equipment status to "available"
  const { error: statusError } = await supabase
    .schema('neta_ops')
    .from('equipment')
    .update({ 
      status: 'available',
      updated_at: new Date().toISOString()
    })
    .eq('id', assignment.equipment_id);

  if (statusError) {
    console.error('Error updating equipment status:', statusError);
    throw new Error(statusError.message);
  }
} 