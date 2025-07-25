import { User } from './user';
import { PortalType } from './scheduling';

/**
 * Status type for vehicle or equipment
 */
export type EquipmentStatus = 'available' | 'in-use' | 'maintenance' | 'retired' | 'lost';

/**
 * Type for different equipment categories
 */
export type EquipmentCategory = 
  | 'vehicle' 
  | 'tool' 
  | 'testing-equipment' 
  | 'safety-equipment' 
  | 'other';

/**
 * Base interface for equipment and vehicles
 */
export interface Equipment {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: EquipmentStatus;
  serial_number?: string;
  model?: string;
  purchase_date?: string;
  last_service_date?: string;
  next_service_date?: string;
  condition_rating?: number;
  notes?: string;
  image_url?: string;
  portal_type: string;
  division: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Vehicle-specific interface
 */
export interface Vehicle extends Equipment {
  make?: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  mileage?: number;
  fuel_type?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
}

/**
 * Interface for equipment maintenance records
 */
export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  performed_by?: string;
  description: string;
  cost?: number;
  next_maintenance_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for equipment assignment history
 */
export interface EquipmentAssignment {
  id: string;
  equipment_id: string;
  equipment?: Equipment;
  user_id: string;
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  checkout_date: string;
  expected_return_date?: string;
  return_date?: string;
  condition_before?: number;
  condition_after?: number;
  notes?: string;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for maintenance alert settings
 */
export interface MaintenanceAlert {
  id: string;
  equipment_id: string;
  alert_type: 'date' | 'usage' | 'condition';
  threshold_value: string | number; // Date string or numeric value
  notification_days_before: number;
  last_triggered_date?: string;
  is_active: boolean;
  recipients?: string[]; // Array of user_ids
  created_at: string;
  updated_at: string;
}

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'certification' | 'calibration' | 'other';

export type AssignmentStatus = 'checked-out' | 'returned' | 'overdue' | 'damaged';

export const EQUIPMENT_CATEGORIES = [
  'Test Equipment',
  'Safety Equipment',
  'Tools',
  'Vehicle',
  'Computer/IT',
  'Communication',
  'Office Equipment',
  'Lab Equipment',
  'Other'
]; 