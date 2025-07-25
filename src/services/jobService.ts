import { supabase } from '../lib/supabase';
import { Job } from '../lib/types/jobs';

// Resource types
export type ResourceType = 'employee' | 'equipment' | 'material' | 'vehicle';

// Resource skill levels for employees
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Resource availability status
export type AvailabilityStatus = 'available' | 'partially_available' | 'unavailable' | 'scheduled' | 'out_of_service';

// Resource interfaces
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: AvailabilityStatus;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface EmployeeResource extends Resource {
  type: 'employee';
  employee_id: string;
  skills: string[];
  skill_levels: Record<string, SkillLevel>;
  hourly_rate: number;
  max_hours_per_week: number;
  current_availability: AvailabilityPeriod[];
  certifications?: string[];
  email: string;
  role: string;
  avatar_url?: string;
}

export interface EquipmentResource extends Resource {
  type: 'equipment';
  model: string;
  serial_number?: string;
  acquisition_date?: string;
  condition: string;
  maintenance_schedule?: {
    last_service_date: string;
    next_service_date: string;
  };
  daily_rate?: number;
  hourly_rate?: number;
  current_availability: AvailabilityPeriod[];
  purchase_date: string;
  warranty_expiry: string | null;
}

export interface MaterialResource extends Resource {
  type: 'material';
  unit: string;
  unit_cost: number;
  quantity_available: number;
  reorder_threshold?: number;
  supplier_id?: string;
  location?: string;
}

export interface VehicleResource extends Resource {
  type: 'vehicle';
  make: string;
  model: string;
  year: number;
  license_plate?: string;
  vin?: string;
  mileage?: number;
  fuel_type?: string;
  daily_rate?: number;
  current_availability: AvailabilityPeriod[];
}

// Availability period
export interface AvailabilityPeriod {
  start_date: string;
  end_date: string;
  status: AvailabilityStatus;
  notes?: string;
}

// Resource allocation for a job
export interface ResourceAllocation {
  id: string;
  job_id: string;
  resource_id: string;
  resource_type: ResourceType;
  start_date: string;
  end_date: string;
  hours_allocated?: number;
  quantity_allocated?: number;
  notes?: string;
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  
  // Joined resource data
  resource?: Resource | EmployeeResource | EquipmentResource | MaterialResource | VehicleResource;
}

// Resource utilization
export interface ResourceUtilization {
  resource_id: string;
  resource_name: string;
  resource_type: ResourceType;
  total_hours_allocated: number;
  utilization_percentage: number;
  allocations: ResourceAllocation[];
}

// Resource conflict
export interface ResourceConflict {
  resource_id: string;
  resource_name: string;
  conflicting_allocations: ResourceAllocation[];
  conflict_start_date: string;
  conflict_end_date: string;
  severity: 'low' | 'medium' | 'high';
}

// Job schedule 
export interface JobSchedule {
  job_id: string;
  job_title: string;
  start_date: string;
  end_date: string;
  resource_allocations: ResourceAllocation[];
  status: string;
}

// Availability schedule
export interface AvailabilitySchedule {
  resource_id: string;
  allocations: ResourceAllocation[];
}

// Job costs
export type CostType = 'labor' | 'material' | 'equipment' | 'overhead';

export interface JobCost {
  id: string;
  job_id: string;
  description: string;
  amount: number;
  cost_type: CostType;
  date: string;
  quantity?: number;
  unit_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CostSummary {
  total: number;
  labor: number;
  material: number;
  equipment: number;
  overhead: number;
}

export interface JobRevenue {
  id: string;
  job_id: string;
  description: string;
  amount: number;
  revenue_type: 'invoice' | 'payment' | 'other';
  date: string;
  status: 'pending' | 'approved' | 'paid';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RevenueSummary {
  total: number;
  pending: number;
  approved: number;
  paid: number;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  revenueByType: {
    invoice: number;
    payment: number;
    other: number;
  };
  costByType: {
    labor: number;
    material: number;
    equipment: number;
    overhead: number;
  };
}

/**
 * Get all resources of a specific type
 */
export async function getResources(type?: ResourceType): Promise<Resource[]> {
  try {
    let query = supabase
      .schema('neta_ops')
      .from('resources')
      .select('*');
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

/**
 * Get a specific resource by ID
 */
export async function getResourceById(id: string): Promise<Resource> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching resource with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new resource
 */
export async function createResource(resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>): Promise<Resource> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resources')
      .insert([resource])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating resource:', error);
    throw error;
  }
}

/**
 * Update an existing resource
 */
export async function updateResource(id: string, updates: Partial<Resource>): Promise<Resource> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating resource with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a resource
 */
export async function deleteResource(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .schema('neta_ops')
      .from('resources')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting resource with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Allocate a resource to a job
 */
export async function allocateResource(allocation: Omit<ResourceAllocation, 'id' | 'created_at' | 'updated_at'>): Promise<ResourceAllocation> {
  try {
    // First check if the resource is available for the given time period
    const isAvailable = await checkResourceAvailability(
      allocation.resource_id,
      allocation.start_date,
      allocation.end_date,
      allocation.job_id // Exclude current job when checking availability
    );
    
    if (!isAvailable) {
      throw new Error('Resource is not available for the requested time period');
    }
    
    // Create the allocation
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .insert([allocation])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error allocating resource:', error);
    throw error;
  }
}

/**
 * Update a resource allocation
 */
export async function updateResourceAllocation(id: string, updates: Partial<ResourceAllocation>): Promise<ResourceAllocation> {
  try {
    // If updating dates, check availability
    if (updates.start_date || updates.end_date) {
      const current = await getResourceAllocationById(id);
      const isAvailable = await checkResourceAvailability(
        current.resource_id,
        updates.start_date || current.start_date,
        updates.end_date || current.end_date,
        current.job_id // Exclude current job when checking availability
      );
      
      if (!isAvailable) {
        throw new Error('Resource is not available for the requested time period');
      }
    }
    
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating resource allocation with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Get a specific resource allocation by ID
 */
export async function getResourceAllocationById(id: string): Promise<ResourceAllocation> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching resource allocation with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a resource allocation
 */
export async function deleteResourceAllocation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting resource allocation with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Get resource allocations for a job
 */
export async function getResourceAllocationsForJob(jobId: string): Promise<ResourceAllocation[]> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .select(`
        *,
        resource:resource_id (*)
      `)
      .eq('job_id', jobId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching resource allocations for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Check if a resource is available for a given time period
 */
export async function checkResourceAvailability(
  resourceId: string,
  startDate: string,
  endDate: string,
  excludeJobId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .select('*')
      .eq('resource_id', resourceId)
      .not('status', 'eq', 'cancelled')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
    
    if (excludeJobId) {
      query = query.neq('job_id', excludeJobId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // If no conflicting allocations found, resource is available
    return (data || []).length === 0;
  } catch (error) {
    console.error(`Error checking resource availability for resource ${resourceId}:`, error);
    throw error;
  }
}

/**
 * Get resource utilization for a specific time period
 */
export async function getResourceUtilization(
  resourceIds: string[],
  startDate: string,
  endDate: string
): Promise<ResourceUtilization[]> {
  try {
    const utilization: ResourceUtilization[] = [];
    
    for (const resourceId of resourceIds) {
      // Get resource details
      const resource = await getResourceById(resourceId);
      
      // Get allocations for this resource in the given time period
      const { data: allocations, error } = await supabase
        .schema('neta_ops')
        .from('resource_allocations')
        .select('*')
        .eq('resource_id', resourceId)
        .not('status', 'eq', 'cancelled')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
      
      if (error) throw error;
      
      // Calculate total hours allocated
      let totalHoursAllocated = 0;
      for (const allocation of (allocations || [])) {
        const allocStart = new Date(Math.max(new Date(allocation.start_date).getTime(), new Date(startDate).getTime()));
        const allocEnd = new Date(Math.min(new Date(allocation.end_date).getTime(), new Date(endDate).getTime()));
        
        // Calculate hours between these dates
        const hours = (allocEnd.getTime() - allocStart.getTime()) / (1000 * 60 * 60);
        totalHoursAllocated += hours > 0 ? hours : 0;
      }
      
      // Calculate total available hours in the period
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      const totalAvailableHours = totalDays * 8; // Assuming 8 working hours per day
      
      // Calculate utilization percentage
      const utilizationPercentage = (totalHoursAllocated / totalAvailableHours) * 100;
      
      utilization.push({
        resource_id: resourceId,
        resource_name: resource.name,
        resource_type: resource.type,
        total_hours_allocated: totalHoursAllocated,
        utilization_percentage: utilizationPercentage,
        allocations: allocations || []
      });
    }
    
    return utilization;
  } catch (error) {
    console.error('Error calculating resource utilization:', error);
    throw error;
  }
}

/**
 * Find resource conflicts for a job's planned allocations
 */
export async function findResourceConflicts(jobId: string): Promise<ResourceConflict[]> {
  try {
    // Get all allocations for this job
    const jobAllocations = await getResourceAllocationsForJob(jobId);
    const conflicts: ResourceConflict[] = [];
    
    for (const allocation of jobAllocations) {
      // Find other allocations for the same resource that overlap with this one
      const { data: conflictingAllocations, error } = await supabase
        .schema('neta_ops')
        .from('resource_allocations')
        .select('*')
        .eq('resource_id', allocation.resource_id)
        .neq('job_id', jobId)
        .not('status', 'eq', 'cancelled')
        .or(`start_date.lte.${allocation.end_date},end_date.gte.${allocation.start_date}`);
      
      if (error) throw error;
      
      if ((conflictingAllocations || []).length > 0) {
        // Get resource details
        const resource = await getResourceById(allocation.resource_id);
        
        // Find the exact conflict period
        let conflictStartDate = allocation.start_date;
        let conflictEndDate = allocation.end_date;
        
        for (const conflict of (conflictingAllocations || [])) {
          if (new Date(conflict.start_date) > new Date(conflictStartDate)) {
            conflictStartDate = conflict.start_date;
          }
          if (new Date(conflict.end_date) < new Date(conflictEndDate)) {
            conflictEndDate = conflict.end_date;
          }
        }
        
        // Determine severity based on overlap percentage
        const allocationDuration = new Date(allocation.end_date).getTime() - new Date(allocation.start_date).getTime();
        const conflictDuration = new Date(conflictEndDate).getTime() - new Date(conflictStartDate).getTime();
        const overlapPercentage = (conflictDuration / allocationDuration) * 100;
        
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (overlapPercentage > 75) {
          severity = 'high';
        } else if (overlapPercentage > 25) {
          severity = 'medium';
        }
        
        conflicts.push({
          resource_id: allocation.resource_id,
          resource_name: resource.name,
          conflicting_allocations: conflictingAllocations || [],
          conflict_start_date: conflictStartDate,
          conflict_end_date: conflictEndDate,
          severity
        });
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error(`Error finding resource conflicts for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Get job schedule including all resource allocations
 */
export async function getJobSchedule(jobId: string): Promise<JobSchedule> {
  try {
    // Get job details
    const { data: job, error: jobError } = await supabase
      .schema('neta_ops')
      .from('jobs')
      .select('id, title, status')
      .eq('id', jobId)
      .single();
    
    if (jobError) throw jobError;
    
    // Get resource allocations for this job
    const allocations = await getResourceAllocationsForJob(jobId);
    
    // Determine overall job start and end dates from allocations
    let jobStartDate = '';
    let jobEndDate = '';
    
    if (allocations.length > 0) {
      const startDates = allocations.map(a => new Date(a.start_date).getTime());
      const endDates = allocations.map(a => new Date(a.end_date).getTime());
      
      jobStartDate = new Date(Math.min(...startDates)).toISOString();
      jobEndDate = new Date(Math.max(...endDates)).toISOString();
    }
    
    return {
      job_id: jobId,
      job_title: job.title,
      start_date: jobStartDate,
      end_date: jobEndDate,
      resource_allocations: allocations,
      status: job.status
    };
  } catch (error) {
    console.error(`Error getting job schedule for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Find available resources for a given time period and type
 */
export async function findAvailableResources(
  startDate: string,
  endDate: string,
  resourceType?: ResourceType,
  requiredSkills?: string[]
): Promise<Resource[]> {
  try {
    // Get all resources of the specified type
    const resources = await getResources(resourceType);
    const availableResources: Resource[] = [];
    
    for (const resource of resources) {
      // Check if resource is available during this period
      const isAvailable = await checkResourceAvailability(
        resource.id,
        startDate,
        endDate
      );
      
      if (isAvailable) {
        // If skills are required, check if the resource has them
        if (requiredSkills && requiredSkills.length > 0 && resource.type === 'employee') {
          const employee = resource as unknown as EmployeeResource;
          const hasRequiredSkills = requiredSkills.every(skill => employee.skills.includes(skill));
          
          if (hasRequiredSkills) {
            availableResources.push(resource);
          }
        } else {
          availableResources.push(resource);
        }
      }
    }
    
    return availableResources;
  } catch (error) {
    console.error('Error finding available resources:', error);
    throw error;
  }
}

/**
 * Get employee availability schedule
 */
export async function getEmployeeAvailabilitySchedule(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilitySchedule> {
  try {
    // Get all allocations for this employee in the given time period
    const { data: allocations, error: allocationsError } = await supabase
      .schema('neta_ops')
      .from('resource_allocations')
      .select(`
        *,
        job:job_id (id, title)
      `)
      .eq('resource_id', employeeId)
      .not('status', 'eq', 'cancelled')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
    
    if (allocationsError) throw allocationsError;
    
    // Convert allocations to availability periods
    const availabilityPeriods: AvailabilityPeriod[] = [];
    
    for (const allocation of (allocations || [])) {
      availabilityPeriods.push({
        start_date: allocation.start_date,
        end_date: allocation.end_date,
        status: 'scheduled',
        notes: `Scheduled for job: ${allocation.job.title}`
      });
    }
    
    return {
      resource_id: employeeId,
      allocations: allocations || []
    };
  } catch (error) {
    console.error(`Error getting employee availability schedule for employee ${employeeId}:`, error);
    throw error;
  }
}

/**
 * Get costs for a job
 */
export async function getJobCosts(jobId: string): Promise<JobCost[]> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_costs')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching job costs:', error);
    throw error;
  }
}

/**
 * Add a cost to a job
 */
export async function addJobCost(cost: Omit<JobCost, 'id' | 'created_at' | 'updated_at'>): Promise<JobCost> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_costs')
      .insert([cost])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding job cost:', error);
    throw error;
  }
}

/**
 * Update a job cost
 */
export async function updateJobCost(id: string, updates: Partial<JobCost>): Promise<JobCost> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_costs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating job cost:', error);
    throw error;
  }
}

/**
 * Delete a job cost
 */
export async function deleteJobCost(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .schema('neta_ops')
      .from('job_costs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting job cost:', error);
    throw error;
  }
}

/**
 * Get cost summary for a job
 */
export async function getCostSummary(jobId: string): Promise<CostSummary> {
  try {
    const costs = await getJobCosts(jobId);
    
    // Initialize summary object
    const summary: CostSummary = {
      total: 0,
      labor: 0,
      material: 0,
      equipment: 0,
      overhead: 0
    };
    
    // Calculate totals by cost type
    costs.forEach(cost => {
      summary.total += cost.amount;
      summary[cost.cost_type] += cost.amount;
    });
    
    return summary;
  } catch (error) {
    console.error('Error generating cost summary:', error);
    throw error;
  }
}

/**
 * Get revenue entries for a job
 */
export async function getJobRevenue(jobId: string): Promise<JobRevenue[]> {
  try {
    // First, check if the job_revenue table exists
    const { count, error: checkError } = await supabase
      .schema('neta_ops')
      .from('job_revenue')
      .select('*', { count: 'exact', head: true });
    
    if (checkError && checkError.code === '42P01') {  // Table doesn't exist
      // Create the table
      await createJobRevenueTable();
    } else if (checkError) {
      throw checkError;
    }
    
    // Now fetch the revenue data
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_revenue')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching job revenue:', error);
    throw error;
  }
}

/**
 * Add a revenue entry to a job
 */
export async function addJobRevenue(revenue: Omit<JobRevenue, 'id' | 'created_at' | 'updated_at'>): Promise<JobRevenue> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_revenue')
      .insert([revenue])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding job revenue:', error);
    throw error;
  }
}

/**
 * Update a job revenue entry
 */
export async function updateJobRevenue(id: string, updates: Partial<JobRevenue>): Promise<JobRevenue> {
  try {
    const { data, error } = await supabase
      .schema('neta_ops')
      .from('job_revenue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating job revenue:', error);
    throw error;
  }
}

/**
 * Delete a job revenue entry
 */
export async function deleteJobRevenue(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .schema('neta_ops')
      .from('job_revenue')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting job revenue:', error);
    throw error;
  }
}

/**
 * Get revenue summary for a job
 */
export async function getRevenueSummary(jobId: string): Promise<RevenueSummary> {
  try {
    const revenues = await getJobRevenue(jobId);
    
    // Initialize summary object
    const summary: RevenueSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0
    };
    
    // Calculate totals by status
    revenues.forEach(revenue => {
      summary.total += revenue.amount;
      summary[revenue.status] += revenue.amount;
    });
    
    return summary;
  } catch (error) {
    console.error('Error generating revenue summary:', error);
    throw error;
  }
}

/**
 * Get profitability analysis for a job
 */
export async function getProfitabilityAnalysis(jobId: string): Promise<ProfitabilitySummary> {
  try {
    // Get cost data
    const costs = await getJobCosts(jobId);
    const costSummary = await getCostSummary(jobId);
    
    // Get revenue data
    const revenues = await getJobRevenue(jobId);
    const revenueSummary = await getRevenueSummary(jobId);
    
    // Calculate revenue by type
    const revenueByType = {
      invoice: 0,
      payment: 0,
      other: 0
    };
    
    revenues.forEach(revenue => {
      revenueByType[revenue.revenue_type] += revenue.amount;
    });
    
    // Calculate profit and margin
    const totalRevenue = revenueSummary.total;
    const totalCost = costSummary.total;
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    return {
      totalRevenue,
      totalCost,
      profit,
      margin,
      revenueByType,
      costByType: {
        labor: costSummary.labor,
        material: costSummary.material,
        equipment: costSummary.equipment,
        overhead: costSummary.overhead
      }
    };
  } catch (error) {
    console.error('Error generating profitability analysis:', error);
    throw error;
  }
}

/**
 * Create job_revenue table if it doesn't exist
 */
async function createJobRevenueTable(): Promise<void> {
  try {
    // Create the table using SQL
    const { error } = await supabase.rpc('create_job_revenue_table');
    
    if (error) {
      // Try a different approach - create a row to let RLS create table
      const { error: insertError } = await supabase
        .schema('neta_ops')
        .from('job_revenue')
        .insert({
          job_id: '00000000-0000-0000-0000-000000000000',
          description: 'Table initialization',
          amount: 0,
          revenue_type: 'other',
          date: new Date().toISOString(),
          status: 'pending'
        });
        
      // If the insert works but table is created, we're good,
      // if it fails with something other than a duplicate, throw
      if (insertError && insertError.code !== '23505') {
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error creating job_revenue table:', error);
    // Don't throw here as the table might have been created by another process
  }
} 