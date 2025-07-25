// Schema mappings for database tables
// This file centralizes schema references for maintainability

export const SCHEMAS = {
  // neta_ops schema tables
  ASSETS: 'neta_ops.assets',
  JOB_ASSETS: 'neta_ops.job_assets',
  JOBS: 'neta_ops.jobs', 
  REPORTS: 'neta_ops.reports',
  
  // business schema tables
  ESTIMATES: 'business.estimates',
  OPPORTUNITIES: 'business.opportunities',
  
  // common schema tables
  CONTACTS: 'common.contacts',
  CUSTOMERS: 'common.customers',
  
  // technician scheduling tables (common schema)
  TECH_AVAILABILITY: 'common.technician_availability',
  TECH_EXCEPTIONS: 'common.technician_exceptions',
  TECH_SKILLS: 'common.technician_skills',
  TECH_ASSIGNMENTS: 'common.technician_assignments',
  TECH_TIME_OFF: 'common.technician_time_off',
  JOB_SKILL_REQUIREMENTS: 'common.job_skill_requirements',
  AVAILABLE_TECHNICIANS: 'common.available_technicians', // Properly reference the view in common schema
  
  // equipment tracking tables (now in neta_ops schema)
  EQUIPMENT: 'neta_ops.equipment',
  EQUIPMENT_MAINTENANCE: 'neta_ops.maintenance_records',
  EQUIPMENT_ASSIGNMENTS: 'neta_ops.equipment_assignments',
  MAINTENANCE_ALERTS: 'neta_ops.maintenance_alerts',
  VEHICLES: 'neta_ops.vehicles',
  
  // lab schema tables
  LAB_EQUIPMENT: 'lab.equipment',
  LAB_CALIBRATIONS: 'lab.calibrations',
  LAB_PROCEDURES: 'lab.procedures',
  LAB_CERTIFICATES: 'lab.certificates',
  LAB_QUALITY_METRICS: 'lab.quality_metrics'
}

// Function to help with migration from old schema
export function getTable(tableName: string): string {
  // Map old public schema table names to new schema qualified names
  switch (tableName) {
    case 'assets': return SCHEMAS.ASSETS;
    case 'job_assets': return SCHEMAS.JOB_ASSETS;
    case 'jobs': return SCHEMAS.JOBS;
    case 'reports': return SCHEMAS.REPORTS;
    case 'estimates': return SCHEMAS.ESTIMATES;
    case 'opportunities': return SCHEMAS.OPPORTUNITIES;
    case 'contacts': return SCHEMAS.CONTACTS;
    case 'customers': return SCHEMAS.CUSTOMERS;
    case 'technician_availability': return SCHEMAS.TECH_AVAILABILITY;
    case 'technician_exceptions': return SCHEMAS.TECH_EXCEPTIONS;
    case 'technician_skills': return SCHEMAS.TECH_SKILLS;
    case 'technician_assignments': return SCHEMAS.TECH_ASSIGNMENTS;
    case 'job_skill_requirements': return SCHEMAS.JOB_SKILL_REQUIREMENTS;
    case 'available_technicians': return SCHEMAS.AVAILABLE_TECHNICIANS;
    case 'equipment': return SCHEMAS.EQUIPMENT;
    case 'equipment_maintenance': 
    case 'maintenance_records': return SCHEMAS.EQUIPMENT_MAINTENANCE;
    case 'equipment_assignments': return SCHEMAS.EQUIPMENT_ASSIGNMENTS;
    case 'maintenance_alerts': return SCHEMAS.MAINTENANCE_ALERTS;
    case 'vehicles': return SCHEMAS.VEHICLES;
    case 'lab_equipment': return SCHEMAS.LAB_EQUIPMENT;
    case 'lab_calibrations': return SCHEMAS.LAB_CALIBRATIONS;
    case 'lab_procedures': return SCHEMAS.LAB_PROCEDURES;
    case 'lab_certificates': return SCHEMAS.LAB_CERTIFICATES;
    case 'lab_quality_metrics': return SCHEMAS.LAB_QUALITY_METRICS;
    default: return tableName; // For any tables not in our mapping, return as is
  }
} 