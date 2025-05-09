export type EquipmentStatus = 'available' | 'in-use' | 'maintenance' | 'retired' | 'lost';
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'certification' | 'calibration' | 'other';
export type AssignmentStatus = 'checked-out' | 'returned' | 'overdue' | 'damaged';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  purchase_date: string;
  warranty_expiration: string | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  location: string;
  notes: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  condition_rating?: number;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  asset_id?: string;
  division?: string;
  vehicle_type?: string;
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

export interface Vehicle {
  id: string;
  equipment_id: string;
  license_plate: string;
  vin: string;
  year: string;
  make: string;
  current_location?: string;
  assigned_tech_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  next_maintenance_date?: string;
  performed_by?: string;
  cost?: number;
  notes?: string;
  attachments?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  status_after_maintenance?: 'available' | 'in-repair' | 'out-of-service' | 'in-calibration';
}

export interface EquipmentAssignment {
  id: string;
  equipment_id: string;
  technician_id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  status?: string;
  technician?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
  };
}

export interface EquipmentWithAssignments extends Equipment {
  assignments?: EquipmentAssignment[];
}

export interface EquipmentWithMaintenance extends Equipment {
  maintenance_records?: MaintenanceRecord[];
}

export interface VehicleWithDetails extends Vehicle {
  equipment?: Equipment;
}

export interface EquipmentFilter {
  portal?: string;
  division?: string;
  category?: string;
  status?: EquipmentStatus;
  search?: string;
  includeVehicles?: boolean;
}

export interface MaintenanceDue {
  id: string;
  name: string;
  category: string;
  last_service_date: string;
  next_service_date: string;
  days_overdue: number;
}

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface EquipmentFilters {
  status?: string;
  type?: string;
  searchTerm?: string;
}

export interface EquipmentFormData {
  name: string;
  type: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  purchase_date: string;
  warranty_expiration?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  location: string;
  notes?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
}

export interface EquipmentAssignmentFormData {
  equipment_id: string;
  technician_id: string;
  start_date: string;
  end_date?: string;
  notes?: string;
} 