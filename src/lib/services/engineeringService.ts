import { supabase } from '@/lib/supabase/client';
import { DesignDocument, DesignStatus, DesignFilters } from '@/components/engineering/DesignApprovalWorkflow';

export interface DesignMetrics {
  total: number;
  draft: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
  archived: number;
}

const engineeringService = {
  /**
   * Fetches designs with optional filters
   */
  async getDesigns(filters: DesignFilters = {}) {
    try {
      let query = supabase
        .from('engineering_designs')
        .select(`
          *,
          submitted_by:submitted_by_id (id, email, display_name, avatar_url),
          reviewed_by:reviewed_by_id (id, email, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.project) {
        query = query.eq('project', filters.project);
      }

      if (filters.designType) {
        query = query.eq('design_type', filters.designType);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        // Add 1 day to include the end date fully
        const nextDay = new Date(filters.dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      return {
        data: data as DesignDocument[],
        error
      };
    } catch (error) {
      console.error('Error fetching designs:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Fetches a single design by ID
   */
  async getDesignById(id: string) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .select(`
          *,
          submitted_by:submitted_by_id (id, email, display_name, avatar_url),
          reviewed_by:reviewed_by_id (id, email, display_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      return {
        data: data as DesignDocument,
        error
      };
    } catch (error) {
      console.error('Error fetching design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Creates a new design document
   */
  async createDesign(designData: Partial<DesignDocument>) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .insert(designData)
        .select();

      return {
        data: data?.[0] as DesignDocument,
        error
      };
    } catch (error) {
      console.error('Error creating design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Updates an existing design document
   */
  async updateDesign(id: string, designData: Partial<DesignDocument>) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .update(designData)
        .eq('id', id)
        .select();

      return {
        data: data?.[0] as DesignDocument,
        error
      };
    } catch (error) {
      console.error('Error updating design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Reviews a design (approve, reject, or mark as in-review)
   */
  async reviewDesign(reviewData: {
    design_id: string;
    status: 'in-review' | 'approved' | 'rejected';
    comments: string;
    reviewer_id: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .update({
          status: reviewData.status,
          review_comments: reviewData.comments,
          reviewed_by_id: reviewData.reviewer_id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reviewData.design_id)
        .select();

      return {
        data: data?.[0] as DesignDocument,
        error
      };
    } catch (error) {
      console.error('Error reviewing design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Deletes a design document
   */
  async deleteDesign(id: string) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .delete()
        .eq('id', id);

      return {
        data: true,
        error
      };
    } catch (error) {
      console.error('Error deleting design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Archives a design document
   */
  async archiveDesign(id: string) {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .update({
          status: 'archived'
        })
        .eq('id', id);

      return {
        data: true,
        error
      };
    } catch (error) {
      console.error('Error archiving design:', error);
      return {
        data: null,
        error
      };
    }
  },

  /**
   * Fetches metrics about design documents
   */
  async getDesignMetrics(): Promise<{ data: DesignMetrics, error: any }> {
    try {
      const { data, error } = await supabase
        .from('engineering_designs')
        .select('status');

      if (error) {
        throw error;
      }

      const metrics: DesignMetrics = {
        total: data.length,
        draft: 0,
        submitted: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
        archived: 0
      };

      data.forEach(item => {
        switch (item.status) {
          case 'draft':
            metrics.draft++;
            break;
          case 'submitted':
            metrics.submitted++;
            break;
          case 'in-review':
            metrics.inReview++;
            break;
          case 'approved':
            metrics.approved++;
            break;
          case 'rejected':
            metrics.rejected++;
            break;
          case 'archived':
            metrics.archived++;
            break;
        }
      });

      return {
        data: metrics,
        error: null
      };
    } catch (error) {
      console.error('Error fetching design metrics:', error);
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
  },

  /**
   * Gets available design types
   */
  async getDesignTypes() {
    try {
      const { data, error } = await supabase
        .rpc('get_unique_design_types');

      return {
        data: data as string[],
        error
      };
    } catch (error) {
      console.error('Error fetching design types:', error);
      return {
        data: [
          'Electrical', 
          'Mechanical', 
          'Structural', 
          'Civil', 
          'Architectural'
        ],
        error
      };
    }
  },

  /**
   * Gets available projects
   */
  async getProjects() {
    try {
      const { data, error } = await supabase
        .rpc('get_unique_projects');

      return {
        data: data as string[],
        error
      };
    } catch (error) {
      console.error('Error fetching projects:', error);
      return {
        data: [
          'North Alabama Expansion',
          'Georgia Facility Upgrade',
          'Tennessee Retrofit'
        ],
        error
      };
    }
  }
};

export default engineeringService; 