import { supabase } from '../supabase';
import { SCHEMAS } from '../schema';
import { 
  TechnicianAvailability,
  TechnicianException,
  TechnicianSkill,
  TechnicianAssignment,
  JobSkillRequirement,
  AvailableTechnician,
  TechnicianMatch,
  CalendarEvent, 
  PortalType,
  AssignmentStatus,
  TimeOffRequest,
  TimeOffStatus
} from '../types/scheduling';
import { PostgrestError } from '@supabase/supabase-js';
import dayjs from 'dayjs';

/**
 * Service for managing technician scheduling
 */
export const schedulingService = {
  /**
   * Fetch all availabilities for a technician
   */
  async getTechnicianAvailability(technicianId: string, portalType: PortalType): Promise<{
    data: TechnicianAvailability[] | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_AVAILABILITY)
      .select('*')
      .eq('user_id', technicianId)
      .eq('portal_type', portalType)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
  },

  /**
   * Create or update technician availability
   */
  async saveTechnicianAvailability(availability: Omit<TechnicianAvailability, 'id' | 'created_at' | 'updated_at'>): Promise<{
    data: TechnicianAvailability | null;
    error: PostgrestError | null;
  }> {
    // Check if this availability already exists
    const { data: existing } = await supabase
      .from(SCHEMAS.TECH_AVAILABILITY)
      .select('id')
      .eq('user_id', availability.user_id)
      .eq('day_of_week', availability.day_of_week)
      .eq('start_time', availability.start_time)
      .eq('portal_type', availability.portal_type)
      .eq('division', availability.division || '')
      .maybeSingle();

    if (existing) {
      // Update existing
      return supabase
        .from(SCHEMAS.TECH_AVAILABILITY)
        .update({
          end_time: availability.end_time,
          recurring: availability.recurring
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      return supabase
        .from(SCHEMAS.TECH_AVAILABILITY)
        .insert(availability)
        .select()
        .single();
    }
  },

  /**
   * Delete a technician availability slot
   */
  async deleteTechnicianAvailability(availabilityId: string): Promise<{
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_AVAILABILITY)
      .delete()
      .eq('id', availabilityId);
  },

  /**
   * Fetch exceptions for a technician in a date range
   */
  async getTechnicianExceptions(
    technicianId: string, 
    portalType: PortalType, 
    startDate: string, 
    endDate: string
  ): Promise<{
    data: TechnicianException[] | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_EXCEPTIONS)
      .select('*')
      .eq('user_id', technicianId)
      .eq('portal_type', portalType)
      .gte('exception_date', startDate)
      .lte('exception_date', endDate)
      .order('exception_date', { ascending: true });
  },

  /**
   * Create or update technician exception
   */
  async saveTechnicianException(exception: Omit<TechnicianException, 'id' | 'created_at' | 'updated_at'>): Promise<{
    data: TechnicianException | null;
    error: PostgrestError | null;
  }> {
    // Check if this exception already exists
    const { data: existing } = await supabase
      .from(SCHEMAS.TECH_EXCEPTIONS)
      .select('id')
      .eq('user_id', exception.user_id)
      .eq('exception_date', exception.exception_date)
      .eq('portal_type', exception.portal_type)
      .eq('division', exception.division || '')
      .maybeSingle();

    if (existing) {
      // Update existing
      return supabase
        .from(SCHEMAS.TECH_EXCEPTIONS)
        .update({
          is_available: exception.is_available,
          start_time: exception.start_time,
          end_time: exception.end_time,
          reason: exception.reason
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      return supabase
        .from(SCHEMAS.TECH_EXCEPTIONS)
        .insert(exception)
        .select()
        .single();
    }
  },

  /**
   * Delete a technician exception
   */
  async deleteTechnicianException(exceptionId: string): Promise<{
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_EXCEPTIONS)
      .delete()
      .eq('id', exceptionId);
  },

  /**
   * Fetch skills for a technician
   */
  async getTechnicianSkills(technicianId: string, portalType: PortalType): Promise<{
    data: TechnicianSkill[] | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_SKILLS)
      .select('*')
      .eq('user_id', technicianId)
      .eq('portal_type', portalType)
      .order('skill_name', { ascending: true });
  },

  /**
   * Save a technician skill
   */
  async saveTechnicianSkill(skill: Omit<TechnicianSkill, 'id' | 'created_at' | 'updated_at'>): Promise<{
    data: TechnicianSkill | null;
    error: PostgrestError | null;
  }> {
    // Check if this skill already exists
    const { data: existing } = await supabase
      .from(SCHEMAS.TECH_SKILLS)
      .select('id')
      .eq('user_id', skill.user_id)
      .eq('skill_name', skill.skill_name)
      .eq('portal_type', skill.portal_type)
      .maybeSingle();

    if (existing) {
      // Update existing
      return supabase
        .from(SCHEMAS.TECH_SKILLS)
        .update({
          proficiency_level: skill.proficiency_level,
          certification: skill.certification,
          certification_date: skill.certification_date,
          expiration_date: skill.expiration_date,
          notes: skill.notes
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      return supabase
        .from(SCHEMAS.TECH_SKILLS)
        .insert(skill)
        .select()
        .single();
    }
  },

  /**
   * Delete a technician skill
   */
  async deleteTechnicianSkill(skillId: string): Promise<{
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_SKILLS)
      .delete()
      .eq('id', skillId);
  },

  /**
   * Fetch assignments for a technician in a date range
   */
  async getTechnicianAssignments(
    technicianId: string | undefined,
    portalType: PortalType,
    startDate: string,
    endDate: string,
    division?: string
  ): Promise<{
    data: TechnicianAssignment[] | null;
    error: PostgrestError | null;
  }> {
    // Select required fields and join with users and jobs
    // Note: Joining jobs might need adjustment based on portalType
    // This example assumes neta_ops.jobs for portalType 'neta'
    const userQuery = 'user:user_id(id, email, raw_user_meta_data)';
    // Adjust job query based on portalType if needed
    const jobQuery = portalType === 'neta' ? 'job:job_id(id, job_number, title)' : 'job_id'; // Simplified for non-neta portals

    let query = supabase
      .from(SCHEMAS.TECH_ASSIGNMENTS)
      .select(`
        *,
        ${userQuery},
        ${jobQuery}
      `)
      .eq('portal_type', portalType)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (technicianId) {
      query = query.eq('user_id', technicianId);
    }
    if (division) {
      query = query.eq('division', division);
    }

    query = query.order('assignment_date', { ascending: true }).order('start_time', { ascending: true });
    
    // Execute the query and explicitly cast the result
    const result = await query;
    return {
      data: result.data as TechnicianAssignment[] | null,
      error: result.error
    };
  },

  /**
   * Save a technician assignment
   */
  async saveTechnicianAssignment(
    assignment: Omit<TechnicianAssignment, 'id' | 'created_at' | 'updated_at' | 'user' | 'job' | 'createdBy'>
  ): Promise<{
    data: TechnicianAssignment | null;
    error: PostgrestError | null;
  }> {
    const { data: existing } = await supabase
      .from(SCHEMAS.TECH_ASSIGNMENTS)
      .select('id')
      .eq('user_id', assignment.user_id)
      .eq('job_id', assignment.job_id)
      .eq('assignment_date', assignment.assignment_date)
      .eq('start_time', assignment.start_time)
      .maybeSingle();

    if (existing) {
      // Update existing
      return supabase
        .from(SCHEMAS.TECH_ASSIGNMENTS)
        .update({
          end_time: assignment.end_time,
          status: assignment.status,
          notes: assignment.notes
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      return supabase
        .from(SCHEMAS.TECH_ASSIGNMENTS)
        .insert(assignment)
        .select()
        .single();
    }
  },

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string, 
    status: AssignmentStatus
  ): Promise<{
    data: TechnicianAssignment | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_ASSIGNMENTS)
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single();
  },

  /**
   * Delete a technician assignment
   */
  async deleteTechnicianAssignment(assignmentId: string): Promise<{
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_ASSIGNMENTS)
      .delete()
      .eq('id', assignmentId);
  },

  /**
   * Fetch job skill requirements
   */
  async getJobSkillRequirements(jobId: string, portalType: PortalType): Promise<{
    data: JobSkillRequirement[] | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.JOB_SKILL_REQUIREMENTS)
      .select('*')
      .eq('job_id', jobId)
      .eq('portal_type', portalType)
      .order('is_required', { ascending: false })
      .order('skill_name', { ascending: true });
  },

  /**
   * Save a job skill requirement
   */
  async saveJobSkillRequirement(
    requirement: Omit<JobSkillRequirement, 'id' | 'created_at' | 'updated_at' | 'job'>
  ): Promise<{
    data: JobSkillRequirement | null;
    error: PostgrestError | null;
  }> {
    const { data: existing } = await supabase
      .from(SCHEMAS.JOB_SKILL_REQUIREMENTS)
      .select('id')
      .eq('job_id', requirement.job_id)
      .eq('skill_name', requirement.skill_name)
      .maybeSingle();

    if (existing) {
      // Update existing
      return supabase
        .from(SCHEMAS.JOB_SKILL_REQUIREMENTS)
        .update({
          minimum_proficiency: requirement.minimum_proficiency,
          is_required: requirement.is_required
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      return supabase
        .from(SCHEMAS.JOB_SKILL_REQUIREMENTS)
        .insert(requirement)
        .select()
        .single();
    }
  },

  /**
   * Delete a job skill requirement
   */
  async deleteJobSkillRequirement(requirementId: string): Promise<{
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.JOB_SKILL_REQUIREMENTS)
      .delete()
      .eq('id', requirementId);
  },

  /**
   * Find available technicians with skill matching
   */
  async findAvailableTechnicians(
    jobId: string,
    assignmentDate: string,
    startTime: string,
    endTime: string,
    portalType: PortalType
  ): Promise<{
    data: TechnicianMatch[] | null;
    error: PostgrestError | null;
  }> {
    // Call the stored procedure
    return supabase
      .rpc('find_available_technicians', {
        job_id: jobId,
        assignment_date: assignmentDate,
        start_time: startTime,
        end_time: endTime,
        portal: portalType
      });
  },

  /**
   * Get all available technicians and their schedules
   */
  async getAvailableTechnicians(portalType: PortalType, division?: string): Promise<{
    data: AvailableTechnician[] | null;
    error: PostgrestError | null;
  }> {
    let query = supabase
      .from(SCHEMAS.AVAILABLE_TECHNICIANS)
      .select('*')
      .eq('portal_type', portalType);

    if (division) {
      query = query.eq('division', division);
    }

    return query.order('division').order('full_name').order('day_of_week').order('start_time');
  },

  /**
   * Convert assignments and exceptions to calendar events
   */
  convertToCalendarEvents(
    assignments: TechnicianAssignment[],
    exceptions: TechnicianException[] = []
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Add assignments
    assignments.forEach(assignment => {
      // Safely access potentially null related data
      const jobTitle = assignment.job?.title ?? 'Job Details Missing';
      const jobNumber = assignment.job?.job_number ?? '';
      const technicianName = assignment.user?.user_metadata?.name ?? assignment.user?.email ?? 'Unknown Technician';
      const technicianId = assignment.user_id ?? 'unknown-user';
      const jobId = assignment.job_id ?? 'unknown-job';
      
      events.push({
        id: `assignment-${assignment.id}`,
        title: `${jobNumber ? `[${jobNumber}] ` : ''}${jobTitle}`,
        start: `${assignment.assignment_date}T${assignment.start_time}`,
        end: `${assignment.assignment_date}T${assignment.end_time}`,
        allDay: false,
        source: 'assignment',
        status: assignment.status,
        color: this.getStatusColor(assignment.status),
        technician: {
          id: technicianId,
          name: technicianName
        },
        job: {
          id: jobId,
          number: jobNumber,
          title: jobTitle
        },
        editable: assignment.status !== 'completed' && assignment.status !== 'cancelled',
        tooltip: `Technician: ${technicianName}\nJob: ${jobTitle}\nStatus: ${assignment.status}`
      });
    });

    // Add exceptions
    exceptions.forEach(exception => {
      // Exception data might not have user joined, fallback safely
      const technicianName = exception.user?.user_metadata?.name ?? exception.user?.email ?? 'Unknown Technician';
      const technicianId = exception.user_id ?? 'unknown-user';
      
      if (!exception.is_available) {
        // All-day unavailability
        events.push({
          id: `exception-${exception.id}`,
          title: `Unavailable: ${technicianName}`,
          start: exception.exception_date,
          end: exception.exception_date,
          allDay: true,
          source: 'exception',
          color: '#e57373', // Light red
          technician: {
            id: technicianId,
            name: technicianName
          },
          editable: true,
          tooltip: exception.reason ? `Reason: ${exception.reason}` : 'Technician unavailable'
        });
      } else if (exception.start_time && exception.end_time) {
        // Partial day availability
        events.push({
          id: `exception-${exception.id}`,
          title: `Available: ${technicianName}`,
          start: `${exception.exception_date}T${exception.start_time}`,
          end: `${exception.exception_date}T${exception.end_time}`,
          allDay: false,
          source: 'exception',
          color: '#81c784', // Light green
          technician: {
            id: technicianId,
            name: technicianName
          },
          editable: true,
          tooltip: exception.reason ? `Reason: ${exception.reason}` : 'Technician available'
        });
      }
    });

    return events;
  },

  /**
   * Get color code for assignment status
   */
  getStatusColor(status?: AssignmentStatus): string {
    switch (status) {
      case 'scheduled':
        return '#42a5f5'; // Light blue
      case 'in-progress':
        return '#ffb74d'; // Light orange
      case 'completed':
        return '#81c784'; // Light green
      case 'cancelled':
        return '#e57373'; // Light red
      default:
        return '#90a4ae'; // Light blue-grey
    }
  },

  /**
   * Fetch all time-off requests for a technician or for approval
   */
  async getTimeOffRequests(options: {
    technicianId?: string;
    portalType: PortalType;
    division?: string;
    status?: TimeOffStatus;
    startDate?: string;
    endDate?: string;
    forApproval?: boolean;
  }): Promise<{
    data: TimeOffRequest[] | null;
    error: PostgrestError | null;
  }> {
    let query = supabase
      .from(SCHEMAS.TECH_TIME_OFF)
      .select(`
        *,
        user:user_id(
          id,
          email,
          user_metadata
        ),
        approver:approver_id(
          id,
          email,
          user_metadata
        )
      `)
      .eq('portal_type', options.portalType);
    
    if (options.technicianId) {
      query = query.eq('user_id', options.technicianId);
    }
    
    if (options.division) {
      query = query.eq('division', options.division);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.startDate && options.endDate) {
      // Find any requests that overlap with the specified date range
      query = query.or(`start_date.lte.${options.endDate},end_date.gte.${options.startDate}`);
    }

    // If for approval, get only pending requests that the current user can approve
    if (options.forApproval) {
      query = query.eq('status', 'pending');
    }
    
    // Sort by start date (most recent first) and status (pending first)
    return query
      .order('status', { ascending: true })
      .order('start_date', { ascending: false });
  },

  /**
   * Create a new time-off request
   */
  async createTimeOffRequest(request: Omit<TimeOffRequest, 'id' | 'created_at' | 'updated_at' | 'user' | 'approver'>): Promise<{
    data: TimeOffRequest | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_TIME_OFF)
      .insert(request)
      .select(`
        *,
        user:user_id(
          id,
          email,
          user_metadata
        )
      `)
      .single();
  },

  /**
   * Update time-off request status (approve/reject)
   */
  async updateTimeOffRequestStatus(
    requestId: string,
    status: TimeOffStatus,
    approverId: string,
    notes?: string
  ): Promise<{
    data: TimeOffRequest | null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_TIME_OFF)
      .update({
        status,
        approver_id: approverId,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        user:user_id(
          id,
          email,
          user_metadata
        ),
        approver:approver_id(
          id,
          email,
          user_metadata
        )
      `)
      .single();
  },

  /**
   * Cancel a time-off request
   */
  async cancelTimeOffRequest(requestId: string): Promise<{
    data: null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_TIME_OFF)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
  },

  /**
   * Delete a time-off request (for administrators only)
   */
  async deleteTimeOffRequest(requestId: string): Promise<{
    data: null;
    error: PostgrestError | null;
  }> {
    return supabase
      .from(SCHEMAS.TECH_TIME_OFF)
      .delete()
      .eq('id', requestId);
  },
}; 