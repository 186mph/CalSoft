import { supabase } from '../lib/supabase';

/**
 * SLA Priority Levels
 */
export type SLAPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * SLA Status
 */
export type SLAStatus = 'active' | 'inactive' | 'archived';

/**
 * SLA Compliance Status
 */
export type SLAComplianceStatus = 'compliant' | 'at_risk' | 'violated';

/**
 * Time Period for SLA Measurement
 */
export type SLATimePeriod = 'hours' | 'days' | 'weeks' | 'months';

/**
 * SLA Metric Type
 */
export type SLAMetricType = 'response_time' | 'resolution_time' | 'uptime_percentage' | 'custom';

/**
 * SLA Definition
 */
export interface SLADefinition {
  id: string;
  name: string;
  description: string;
  priority: SLAPriority;
  status: SLAStatus;
  metric_type: SLAMetricType;
  target_value: number;
  time_period: SLATimePeriod;
  customer_id?: string;  // Optional: specific customer SLA
  job_type?: string;     // Optional: specific job type SLA
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SLA Tracking Record
 */
export interface SLATracking {
  id: string;
  sla_id: string;
  job_id: string;
  start_time: string;
  target_time: string;
  actual_time?: string;
  current_value?: number;
  compliance_status: SLAComplianceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  sla_definition?: SLADefinition;
}

/**
 * SLA Violation
 */
export interface SLAViolation {
  id: string;
  sla_tracking_id: string;
  job_id: string;
  violation_time: string;
  reason?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  sla_tracking?: SLATracking;
}

/**
 * SLA Performance Summary
 */
export interface SLAPerformanceSummary {
  total_slas: number;
  compliant: number;
  at_risk: number;
  violated: number;
  compliance_percentage: number;
  response_time_avg?: number;
  resolution_time_avg?: number;
}

/**
 * Get all SLA definitions
 */
export const getSLADefinitions = async (
  status?: SLAStatus,
  customerId?: string,
  jobType?: string
): Promise<SLADefinition[]> => {
  try {
    let query = supabase
      .schema('common')
      .from('sla_definitions')
      .select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    if (jobType) {
      query = query.eq('job_type', jobType);
    }
    
    const { data, error } = await query.order('priority');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching SLA definitions:', error);
    return [];
  }
};

/**
 * Get SLA definition by ID
 */
export const getSLADefinitionById = async (id: string): Promise<SLADefinition | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_definitions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching SLA definition with ID ${id}:`, error);
    return null;
  }
};

/**
 * Create SLA definition
 */
export const createSLADefinition = async (
  slaDefinition: Omit<SLADefinition, 'id' | 'created_at' | 'updated_at'>
): Promise<SLADefinition | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_definitions')
      .insert({
        ...slaDefinition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating SLA definition:', error);
    return null;
  }
};

/**
 * Update SLA definition
 */
export const updateSLADefinition = async (
  id: string, 
  updates: Partial<SLADefinition>
): Promise<SLADefinition | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating SLA definition with ID ${id}:`, error);
    return null;
  }
};

/**
 * Delete SLA definition
 */
export const deleteSLADefinition = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .schema('common')
      .from('sla_definitions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting SLA definition with ID ${id}:`, error);
    return false;
  }
};

/**
 * Get SLA tracking records for a job
 */
export const getSLATrackingForJob = async (jobId: string): Promise<SLATracking[]> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_tracking')
      .select(`
        *,
        sla_definition:sla_id(*)
      `)
      .eq('job_id', jobId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching SLA tracking for job ${jobId}:`, error);
    return [];
  }
};

/**
 * Create SLA tracking record
 */
export const createSLATracking = async (
  tracking: Omit<SLATracking, 'id' | 'created_at' | 'updated_at'>
): Promise<SLATracking | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_tracking')
      .insert({
        ...tracking,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating SLA tracking record:', error);
    return null;
  }
};

/**
 * Update SLA tracking record
 */
export const updateSLATracking = async (
  id: string, 
  updates: Partial<SLATracking>
): Promise<SLATracking | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_tracking')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating SLA tracking with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get SLA violations for a job
 */
export const getSLAViolationsForJob = async (jobId: string): Promise<SLAViolation[]> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_violations')
      .select(`
        *,
        sla_tracking:sla_tracking_id(
          *,
          sla_definition:sla_id(*)
        )
      `)
      .eq('job_id', jobId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching SLA violations for job ${jobId}:`, error);
    return [];
  }
};

/**
 * Create SLA violation record
 */
export const createSLAViolation = async (
  violation: Omit<SLAViolation, 'id' | 'created_at' | 'updated_at'>
): Promise<SLAViolation | null> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('sla_violations')
      .insert({
        ...violation,
        acknowledged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // If successful, also create a notification
    if (data) {
      try {
        await supabase
          .schema('common')
          .from('job_notifications')
          .insert({
            job_id: violation.job_id,
            user_id: null, // System notification
            type: 'sla_violation',
            title: 'SLA Violation',
            message: `An SLA has been violated for job #${violation.job_id}`,
            is_read: false,
            is_dismissed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (notifError) {
        console.error('Error creating SLA violation notification:', notifError);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error creating SLA violation record:', error);
    return null;
  }
};

/**
 * Acknowledge SLA violation
 */
export const acknowledgeSLAViolation = async (
  id: string, 
  userId: string
): Promise<SLAViolation | null> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .schema('common')
      .from('sla_violations')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: now,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error acknowledging SLA violation with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get SLA performance summary
 */
export const getSLAPerformanceSummary = async (
  filters: {
    customerId?: string;
    jobType?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<SLAPerformanceSummary> => {
  try {
    // Default summary with all zeros
    const defaultSummary: SLAPerformanceSummary = {
      total_slas: 0,
      compliant: 0,
      at_risk: 0,
      violated: 0,
      compliance_percentage: 0,
      response_time_avg: undefined,
      resolution_time_avg: undefined
    };
    
    let query = supabase
      .schema('common')
      .from('sla_tracking')
      .select(`
        *,
        sla_definition:sla_id(*)
      `);
    
    // Apply filters
    if (filters.customerId) {
      query = query.eq('sla_definition.customer_id', filters.customerId);
    }
    
    if (filters.jobType) {
      query = query.eq('sla_definition.job_type', filters.jobType);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return defaultSummary;
    }
    
    // Calculate summary
    const summary: SLAPerformanceSummary = {
      total_slas: data.length,
      compliant: data.filter(sla => sla.compliance_status === 'compliant').length,
      at_risk: data.filter(sla => sla.compliance_status === 'at_risk').length,
      violated: data.filter(sla => sla.compliance_status === 'violated').length,
      compliance_percentage: 0,
      response_time_avg: undefined,
      resolution_time_avg: undefined
    };
    
    // Calculate compliance percentage
    summary.compliance_percentage = (summary.compliant / summary.total_slas) * 100;
    
    // Calculate average metrics if available
    const responseTimes: number[] = [];
    const resolutionTimes: number[] = [];
    
    data.forEach(sla => {
      if (sla.sla_definition?.metric_type === 'response_time' && sla.actual_time) {
        const start = new Date(sla.start_time).getTime();
        const actual = new Date(sla.actual_time).getTime();
        const responseTime = (actual - start) / (60 * 60 * 1000); // in hours
        responseTimes.push(responseTime);
      }
      
      if (sla.sla_definition?.metric_type === 'resolution_time' && sla.actual_time) {
        const start = new Date(sla.start_time).getTime();
        const actual = new Date(sla.actual_time).getTime();
        const resolutionTime = (actual - start) / (60 * 60 * 1000); // in hours
        resolutionTimes.push(resolutionTime);
      }
    });
    
    if (responseTimes.length > 0) {
      summary.response_time_avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
    
    if (resolutionTimes.length > 0) {
      summary.resolution_time_avg = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }
    
    return summary;
  } catch (error) {
    console.error('Error calculating SLA performance summary:', error);
    return {
      total_slas: 0,
      compliant: 0,
      at_risk: 0,
      violated: 0,
      compliance_percentage: 0
    };
  }
};

/**
 * Check if a job has any active SLAs
 */
export const jobHasActiveSLAs = async (jobId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .schema('common')
      .from('sla_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);
    
    if (error) throw error;
    
    return (count || 0) > 0;
  } catch (error) {
    console.error(`Error checking if job ${jobId} has active SLAs:`, error);
    return false;
  }
};

/**
 * Calculate SLA target time based on definition and start time
 */
export const calculateSLATargetTime = (
  definition: SLADefinition,
  startTime: Date
): Date => {
  const target = new Date(startTime);
  
  switch (definition.time_period) {
    case 'hours':
      target.setHours(target.getHours() + definition.target_value);
      break;
    case 'days':
      target.setDate(target.getDate() + definition.target_value);
      break;
    case 'weeks':
      target.setDate(target.getDate() + (definition.target_value * 7));
      break;
    case 'months':
      target.setMonth(target.getMonth() + definition.target_value);
      break;
  }
  
  return target;
};

/**
 * Apply SLA to a job
 */
export const applySLAToJob = async (
  jobId: string,
  slaId: string,
  startTime: Date = new Date()
): Promise<SLATracking | null> => {
  try {
    // Get the SLA definition
    const definition = await getSLADefinitionById(slaId);
    
    if (!definition) {
      throw new Error(`SLA definition with ID ${slaId} not found`);
    }
    
    // Calculate target time
    const targetTime = calculateSLATargetTime(definition, startTime);
    
    // Create SLA tracking record
    const tracking = await createSLATracking({
      sla_id: slaId,
      job_id: jobId,
      start_time: startTime.toISOString(),
      target_time: targetTime.toISOString(),
      compliance_status: 'compliant'
    });
    
    return tracking;
  } catch (error) {
    console.error(`Error applying SLA ${slaId} to job ${jobId}:`, error);
    return null;
  }
};

/**
 * Check and update SLA compliance status
 */
export const checkAndUpdateSLACompliance = async (
  slaTrackingId: string
): Promise<SLAComplianceStatus> => {
  try {
    // Get the SLA tracking record with definition
    const { data, error } = await supabase
      .schema('common')
      .from('sla_tracking')
      .select(`
        *,
        sla_definition:sla_id(*)
      `)
      .eq('id', slaTrackingId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error(`SLA tracking with ID ${slaTrackingId} not found`);
    }
    
    const tracking = data;
    const now = new Date();
    const targetTime = new Date(tracking.target_time);
    
    // Determine current compliance status
    let newStatus: SLAComplianceStatus;
    
    // If already completed, keep the existing status
    if (tracking.actual_time) {
      return tracking.compliance_status;
    }
    
    // Calculate time remaining until target (in milliseconds)
    const timeRemaining = targetTime.getTime() - now.getTime();
    
    // If past the target time, it's violated
    if (timeRemaining <= 0) {
      newStatus = 'violated';
      
      // Create violation record if status changed from at_risk to violated
      if (tracking.compliance_status !== 'violated') {
        await createSLAViolation({
          sla_tracking_id: tracking.id,
          job_id: tracking.job_id,
          violation_time: now.toISOString(),
          acknowledged: false
        });
      }
    } 
    // If within 25% of the target time, it's at risk
    else {
      const totalDuration = targetTime.getTime() - new Date(tracking.start_time).getTime();
      const riskThreshold = totalDuration * 0.25;
      
      newStatus = timeRemaining <= riskThreshold ? 'at_risk' : 'compliant';
    }
    
    // Update the tracking record if status changed
    if (newStatus !== tracking.compliance_status) {
      await updateSLATracking(tracking.id, {
        compliance_status: newStatus
      });
    }
    
    return newStatus;
  } catch (error) {
    console.error(`Error checking SLA compliance for tracking ID ${slaTrackingId}:`, error);
    return 'at_risk'; // Fail safe to trigger attention
  }
};

/**
 * Complete an SLA tracking record
 */
export const completeSLATracking = async (
  slaTrackingId: string,
  actualTime: Date = new Date()
): Promise<SLATracking | null> => {
  try {
    // Get the SLA tracking record first
    const { data: trackingData, error: trackingError } = await supabase
      .schema('common')
      .from('sla_tracking')
      .select('*, sla_definition:sla_id(*)')
      .eq('id', slaTrackingId)
      .single();
    
    if (trackingError) throw trackingError;
    
    if (!trackingData) {
      throw new Error(`SLA tracking with ID ${slaTrackingId} not found`);
    }
    
    const tracking = trackingData;
    const targetTime = new Date(tracking.target_time);
    
    // Determine compliance status based on actual completion time
    let finalStatus: SLAComplianceStatus;
    
    if (actualTime > targetTime) {
      finalStatus = 'violated';
      
      // Create violation record if not already violated
      if (tracking.compliance_status !== 'violated') {
        await createSLAViolation({
          sla_tracking_id: tracking.id,
          job_id: tracking.job_id,
          violation_time: actualTime.toISOString(),
          acknowledged: false
        });
      }
    } else {
      finalStatus = 'compliant';
    }
    
    // Update the tracking record
    const updated = await updateSLATracking(slaTrackingId, {
      actual_time: actualTime.toISOString(),
      compliance_status: finalStatus
    });
    
    return updated;
  } catch (error) {
    console.error(`Error completing SLA tracking ID ${slaTrackingId}:`, error);
    return null;
  }
}; 