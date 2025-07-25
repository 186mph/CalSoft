/**
 * Job status types
 */
export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';

/**
 * Job priority levels
 */
export type JobPriority = 'high' | 'medium' | 'low';

/**
 * Interface for job entities
 */
export interface Job {
  id: string;
  job_number: string;
  title: string;
  name?: string; // Alternative to title in some cases
  description?: string;
  status: JobStatus;
  division?: string;
  amp_division?: string; // Alternative division field
  department?: string; // Sometimes used instead of division
  location?: string; // Job site location
  address?: string; // Physical address for the job
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  scheduled_date?: string; // Sometimes used for scheduling
  budget?: number;
  amount_paid?: number;
  cost?: number; // Alternative to budget
  price?: number; // Alternative to budget
  priority?: JobPriority;
  type?: string; // Type of job
  category?: string; // Category of job
  tags?: string[]; // For tagging jobs
  manager?: string; // Job manager
  technician?: string; // Assigned technician
  assigned_to?: string; // Generic assignment field
  assigned_to_id?: string; // ID of assigned user
  notes?: string;
  comments?: string;
  is_completed?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  customer_id?: string;
  opportunity_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  
  // Joined entities
  customer?: {
    id: string;
    name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  formattedCustomerName?: string; // Helper field for display
}

/**
 * Interface for job creation/update
 */
export interface JobFormData {
  customer_id: string;
  title: string;
  description?: string;
  status?: JobStatus;
  division?: string;
  start_date?: string;
  due_date?: string;
  budget?: string | number;
  priority?: JobPriority;
} 