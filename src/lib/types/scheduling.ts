// Define base types to avoid import errors
// These match the actual interfaces from auth.ts and jobs.ts
interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    role?: string;
    division?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  division?: string;
  customer_id?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * Portal types for technician scheduling
 */
export type PortalType = 'neta' | 'lab' | 'scavenger';

/**
 * Assignment status types
 */
export type AssignmentStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

/**
 * Interface for technician availability (weekly schedule)
 */
export interface TechnicianAvailability {
  id: string;
  user_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  portal_type: PortalType;
  division?: string;
  recurring: boolean;
  created_at: string;
  updated_at: string;
  user?: User; // Populated via join if needed
}

/**
 * Interface for technician exceptions (time off, special hours)
 */
export interface TechnicianException {
  id: string;
  user_id: string;
  exception_date: string; // YYYY-MM-DD
  is_available: boolean;
  start_time?: string | null; // Only if is_available=true and partial day
  end_time?: string | null; // Only if is_available=true and partial day
  reason?: string;
  portal_type: PortalType;
  division?: string;
  created_at: string;
  updated_at: string;
  user?: User; // Populated via join if needed
}

/**
 * Interface for technician skills and certifications
 */
export interface TechnicianSkill {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency_level?: number; // 1-5 scale
  certification?: string;
  certification_date?: string; // YYYY-MM-DD
  expiration_date?: string; // YYYY-MM-DD
  notes?: string;
  portal_type: PortalType;
  created_at: string;
  updated_at: string;
  user?: User; // Populated via join if needed
}

/**
 * Interface for technician job assignments
 */
export interface TechnicianAssignment {
  id: string;
  user_id: string;
  job_id: string;
  assignment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: AssignmentStatus;
  notes?: string;
  portal_type: PortalType;
  division?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  user?: User; // Populated via join if needed
  job?: Job; // Populated via join if needed
  createdBy?: User; // Populated via join if needed
}

/**
 * Interface for job skill requirements
 */
export interface JobSkillRequirement {
  id: string;
  job_id: string;
  skill_name: string;
  minimum_proficiency?: number; // 1-5 scale
  is_required: boolean;
  portal_type: PortalType;
  created_at: string;
  updated_at: string;
  job?: Job; // Populated via join if needed
}

/**
 * Response type for available technicians view/function
 */
export interface AvailableTechnician {
  user_id: string;
  full_name?: string;
  email: string;
  division?: string;
  avatar_url?: string;
  portal_type: PortalType;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/**
 * Response type for technician matching function
 */
export interface TechnicianMatch {
  user_id: string;
  full_name?: string;
  email: string;
  division?: string;
  skill_match_score: number;
  availability_conflicts: string[];
}

/**
 * Interface for calendar event display
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date/time
  end: string; // ISO date/time
  allDay?: boolean;
  source: 'assignment' | 'exception';
  status?: AssignmentStatus;
  color?: string; // For visual differentiation
  technician?: {
    id: string;
    name: string;
  };
  job?: {
    id: string;
    number: string;
    title: string;
  };
  editable: boolean;
  tooltip?: string;
}

/**
 * Time-off request status
 */
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Interface for technician time-off request
 */
export interface TimeOffRequest {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM:SS (if not full day)
  end_time?: string; // HH:MM:SS (if not full day)
  reason: string;
  status: TimeOffStatus;
  approver_id?: string;
  notes?: string;
  portal_type: PortalType;
  division?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
    }
  };
  approver?: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
    }
  };
} 