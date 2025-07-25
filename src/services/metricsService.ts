import { supabase } from '../lib/supabase';

// Types
export interface DivisionMetrics {
  division: string;
  displayName: string;
  technicians: number;
  vehicles: number;
  equipment: number;
}

export interface ReportApprovalMetrics {
  approved: number;
  pending: number;
  rejected: number;
}

// Division mapping for display names
const divisionDisplayMap: Record<string, string> = {
  'north_alabama': 'North Alabama',
  'tennessee': 'Tennessee',
  'georgia': 'Georgia',
  'international': 'International',
  'calibration': 'Calibration',
  'armadillo': 'Armadillo',
  'scavenger': 'Scavenger'
};

/**
 * Fetch metrics for all NETA divisions
 */
export async function fetchNETADivisionMetrics(): Promise<DivisionMetrics[]> {
  try {
    // Ensure all four NETA divisions are included
    const divisions = ['north_alabama', 'tennessee', 'georgia', 'international'];
    
    // For demo purposes, we're creating sample data
    // In a real implementation, this would be fetched from the database
    const metricsData: DivisionMetrics[] = divisions.map(division => {
      // Deterministic but variable numbers for demo
      const divHash = division.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      
      return {
        division,
        displayName: divisionDisplayMap[division] || division,
        technicians: 5 + (divHash % 15), // Between 5-20 technicians
        vehicles: 3 + (divHash % 10),    // Between 3-13 vehicles
        equipment: 10 + (divHash % 20)   // Between 10-30 equipment
      };
    });

    return metricsData;
  } catch (error) {
    console.error('Error fetching NETA division metrics:', error);
    throw error;
  }
}

/**
 * Fetch report approval metrics
 */
export async function fetchReportApprovalMetrics(): Promise<ReportApprovalMetrics> {
  try {
    // In a real implementation, this would query neta_ops schema tables
    // that track report submissions and approvals
    
    // For demo purposes, we're returning sample data
    return {
      approved: 76,  // 76% approved
      pending: 20,   // 20% pending
      rejected: 4    // 4% rejected
    };
  } catch (error) {
    console.error('Error fetching report approval metrics:', error);
    throw error;
  }
}

/**
 * Fetch vehicle availability metrics
 */
export async function fetchVehicleAvailabilityMetrics(division?: string): Promise<number> {
  try {
    // Create consistent metrics for specified divisions
    const vehicleMap: Record<string, number> = {
      'north_alabama': 12,
      'tennessee': 8,
      'georgia': 7,
      'international': 5
    };
    
    // If division is specified and in our map, return that value
    if (division && vehicleMap[division]) {
      return vehicleMap[division];
    }
    
    // Otherwise return a default value
    return 32; // Total across all divisions
  } catch (error) {
    console.error('Error fetching vehicle availability metrics:', error);
    throw error;
  }
}

/**
 * Fetch equipment availability metrics
 */
export async function fetchEquipmentAvailabilityMetrics(division?: string): Promise<number> {
  try {
    // Create consistent metrics for specified divisions
    const equipmentMap: Record<string, number> = {
      'north_alabama': 28,
      'tennessee': 21,
      'georgia': 18,
      'international': 14
    };
    
    // If division is specified and in our map, return that value
    if (division && equipmentMap[division]) {
      return equipmentMap[division];
    }
    
    // Otherwise return a default value
    return 81; // Total across all divisions
  } catch (error) {
    console.error('Error fetching equipment availability metrics:', error);
    throw error;
  }
}

/**
 * Fetch technician count metrics
 */
export async function fetchTechnicianCountMetrics(division?: string): Promise<number> {
  try {
    // Create consistent metrics for specified divisions
    const technicianMap: Record<string, number> = {
      'north_alabama': 18,
      'tennessee': 14,
      'georgia': 12,
      'international': 8
    };
    
    // If division is specified and in our map, return that value
    if (division && technicianMap[division]) {
      return technicianMap[division];
    }
    
    // Otherwise return a default value
    return 52; // Total across all divisions
  } catch (error) {
    console.error('Error fetching technician count metrics:', error);
    throw error;
  }
} 