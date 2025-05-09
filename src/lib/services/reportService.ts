import { supabase } from '@/lib/supabase';
import { SCHEMAS } from '@/lib/schema';
import { User } from '@/lib/types/auth';

/**
 * Report status types
 */
export type ReportStatus = 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'archived';

/**
 * Technical Report interface
 */
export interface TechnicalReport {
  id: string;
  job_id: string;
  title: string;
  report_type: string;
  submitted_by: string;
  submitted_at: string;
  status: ReportStatus;
  review_comments?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  revision_history: RevisionHistory[];
  current_version: number;
  report_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Revision history entry
 */
export interface RevisionHistory {
  version: number;
  timestamp: string;
  user_id: string;
  user_name?: string;
  status: ReportStatus;
  comments?: string;
}

/**
 * Report submission request
 */
export interface ReportSubmissionRequest {
  job_id: string;
  title: string;
  report_type: string;
  report_data: Record<string, any>;
}

/**
 * Report approval request
 */
export interface ReportApprovalRequest {
  report_id: string;
  status: 'approved' | 'rejected' | 'in-review';
  comments?: string;
  reviewer_id: string;
}

/**
 * Report filter options
 */
export interface ReportFilters {
  job_id?: string;
  status?: ReportStatus;
  report_type?: string;
  start_date?: string;
  end_date?: string;
  submitted_by?: string;
  search?: string;
}

/**
 * Get all technical reports with optional filtering
 */
export async function getAllReports(filters?: ReportFilters) {
  try {
    let query = supabase
      .from(SCHEMAS.REPORTS)
      .select(`
        *,
        submitted_by:submitted_by(id, raw_user_meta_data->name),
        reviewed_by:reviewed_by(id, raw_user_meta_data->name)
      `);

    // Apply filters if provided
    if (filters) {
      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.report_type) {
        query = query.eq('report_type', filters.report_type);
      }
      
      if (filters.submitted_by) {
        query = query.eq('submitted_by', filters.submitted_by);
      }
      
      if (filters.start_date && filters.end_date) {
        query = query.gte('submitted_at', filters.start_date).lte('submitted_at', filters.end_date);
      } else if (filters.start_date) {
        query = query.gte('submitted_at', filters.start_date);
      } else if (filters.end_date) {
        query = query.lte('submitted_at', filters.end_date);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,report_data->>'identifier'.ilike.%${filters.search}%`);
      }
    }

    // Order by most recent first
    query = query.order('submitted_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting technical reports:', error);
    return { data: null, error };
  }
}

/**
 * Get a specific technical report by ID
 */
export async function getReportById(id: string) {
  try {
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .select(`
        *,
        submitted_by:submitted_by(id, raw_user_meta_data->name),
        reviewed_by:reviewed_by(id, raw_user_meta_data->name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting technical report:', error);
    return { data: null, error };
  }
}

/**
 * Create a draft technical report
 */
export async function createDraftReport(reportData: ReportSubmissionRequest, userId: string) {
  try {
    const now = new Date().toISOString();
    
    // Initial revision history entry
    const revisionHistory = [{
      version: 1,
      timestamp: now,
      user_id: userId,
      status: 'draft',
      comments: 'Initial draft'
    }];

    const newReport = {
      job_id: reportData.job_id,
      title: reportData.title,
      report_type: reportData.report_type,
      submitted_by: userId,
      status: 'draft' as ReportStatus,
      revision_history: revisionHistory,
      current_version: 1,
      report_data: reportData.report_data,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .insert(newReport)
      .select()
      .single();

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating draft report:', error);
    return { data: null, error };
  }
}

/**
 * Update a draft report
 */
export async function updateDraftReport(id: string, reportData: Partial<ReportSubmissionRequest>, userId: string) {
  try {
    // First, get the current report to check status and update revision history
    const { data: currentReport, error: fetchError } = await supabase
      .from(SCHEMAS.REPORTS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    // Only draft reports can be updated this way
    if (currentReport.status !== 'draft') {
      throw new Error('Only draft reports can be updated. Use resubmitReport for reports in other statuses.');
    }
    
    const now = new Date().toISOString();
    
    // Update report with new data
    const updates: any = {
      updated_at: now,
    };
    
    if (reportData.title) updates.title = reportData.title;
    if (reportData.report_data) updates.report_data = reportData.report_data;
    
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating draft report:', error);
    return { data: null, error };
  }
}

/**
 * Submit a report for approval
 * Can be used for new submissions or resubmissions after rejection
 */
export async function submitReportForApproval(id: string, userId: string, comments?: string) {
  try {
    const now = new Date().toISOString();
    
    // First get current report
    const { data: currentReport, error: fetchError } = await supabase
      .from(SCHEMAS.REPORTS)
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Validate report state
    if (currentReport.status !== 'draft' && currentReport.status !== 'rejected') {
      throw new Error('Only draft or rejected reports can be submitted for approval');
    }
    
    // Check if this is a resubmission and increment version if needed
    const newVersion = currentReport.status === 'rejected' 
      ? currentReport.current_version + 1 
      : currentReport.current_version;
    
    // Create new revision history entry
    const newRevisionEntry = {
      version: newVersion,
      timestamp: now,
      user_id: userId,
      status: 'submitted' as ReportStatus,
      comments: comments || 'Submitted for approval'
    };
    
    // Add to existing revision history
    const updatedRevisionHistory = [
      ...currentReport.revision_history,
      newRevisionEntry
    ];
    
    // Update the report
    const updates = {
      status: 'submitted' as ReportStatus,
      submitted_at: now,
      revision_history: updatedRevisionHistory,
      current_version: newVersion,
      updated_at: now,
      review_comments: null,  // Clear previous review comments
      reviewed_by: null,      // Clear previous reviewer
      reviewed_at: null       // Clear previous review timestamp
    };
    
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;

    // TODO: Send notification to managers/reviewers about new submission
    
    return { data, error: null };
  } catch (error) {
    console.error('Error submitting report for approval:', error);
    return { data: null, error };
  }
}

/**
 * Review a report (approve, reject, or mark as in-review)
 */
export async function reviewReport(approvalRequest: ReportApprovalRequest) {
  try {
    const { report_id, status, comments, reviewer_id } = approvalRequest;
    const now = new Date().toISOString();
    
    // First get current report
    const { data: currentReport, error: fetchError } = await supabase
      .from(SCHEMAS.REPORTS)
      .select('*')
      .eq('id', report_id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Validate report state
    if (currentReport.status !== 'submitted' && currentReport.status !== 'in-review') {
      throw new Error('Only submitted or in-review reports can be reviewed');
    }
    
    // Create new revision history entry
    const newRevisionEntry = {
      version: currentReport.current_version,
      timestamp: now,
      user_id: reviewer_id,
      status: status as ReportStatus,
      comments: comments || `Report ${status}`
    };
    
    // Add to existing revision history
    const updatedRevisionHistory = [
      ...currentReport.revision_history,
      newRevisionEntry
    ];
    
    // Update the report
    const updates = {
      status: status,
      review_comments: comments,
      reviewed_by: reviewer_id,
      reviewed_at: now,
      revision_history: updatedRevisionHistory,
      updated_at: now
    };
    
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .update(updates)
      .eq('id', report_id)
      .select()
      .single();
      
    if (error) throw error;

    // TODO: Send notification to report submitter about the review result
    
    return { data, error: null };
  } catch (error) {
    console.error('Error reviewing report:', error);
    return { data: null, error };
  }
}

/**
 * Archive a report
 */
export async function archiveReport(id: string, userId: string, comments?: string) {
  try {
    const now = new Date().toISOString();
    
    // First get current report
    const { data: currentReport, error: fetchError } = await supabase
      .from(SCHEMAS.REPORTS)
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Create new revision history entry
    const newRevisionEntry = {
      version: currentReport.current_version,
      timestamp: now,
      user_id: userId,
      status: 'archived' as ReportStatus,
      comments: comments || 'Report archived'
    };
    
    // Add to existing revision history
    const updatedRevisionHistory = [
      ...currentReport.revision_history,
      newRevisionEntry
    ];
    
    // Update the report
    const updates = {
      status: 'archived' as ReportStatus,
      revision_history: updatedRevisionHistory,
      updated_at: now
    };
    
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error archiving report:', error);
    return { data: null, error };
  }
}

/**
 * Get approval metrics
 */
export async function getReportApprovalMetrics(timeRange?: { startDate: string, endDate: string }) {
  try {
    let query = supabase
      .from(SCHEMAS.REPORTS)
      .select('status');
      
    if (timeRange) {
      query = query
        .gte('submitted_at', timeRange.startDate)
        .lte('submitted_at', timeRange.endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Count reports by status
    const metrics = {
      total: data.length,
      draft: data.filter(r => r.status === 'draft').length,
      submitted: data.filter(r => r.status === 'submitted').length,
      inReview: data.filter(r => r.status === 'in-review').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length,
      archived: data.filter(r => r.status === 'archived').length
    };
    
    return { data: metrics, error: null };
  } catch (error) {
    console.error('Error getting report approval metrics:', error);
    return { 
      data: { 
        total: 0, 
        draft: 0, 
        submitted: 0, 
        inReview: 0, 
        approved: 0, 
        rejected: 0, 
        archived: 0 
      }, 
      error 
    };
  }
}

/**
 * Get report history by job ID
 */
export async function getReportHistoryByJob(jobId: string) {
  try {
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .select(`
        *,
        submitted_by:submitted_by(id, raw_user_meta_data->name),
        reviewed_by:reviewed_by(id, raw_user_meta_data->name)
      `)
      .eq('job_id', jobId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting report history for job:', error);
    return { data: null, error };
  }
}

/**
 * Get pending reports that need review
 */
export async function getPendingReportsForReview() {
  try {
    const { data, error } = await supabase
      .from(SCHEMAS.REPORTS)
      .select(`
        *,
        submitted_by:submitted_by(id, raw_user_meta_data->name)
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting pending reports for review:', error);
    return { data: null, error };
  }
}

// Export the service
export const reportService = {
  getAllReports,
  getReportById,
  createDraftReport,
  updateDraftReport,
  submitReportForApproval,
  reviewReport,
  archiveReport,
  getReportApprovalMetrics,
  getReportHistoryByJob,
  getPendingReportsForReview
}; 