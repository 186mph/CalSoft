export interface Database {
  neta_ops: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          job_number: string;
          customer_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          title: string;
          job_number?: string;
          customer_id: string;
          user_id?: string;
          description?: string;
          status?: string;
          division?: string;
          priority?: string;
          start_date?: string;
          due_date?: string;
          budget?: number;
          notes?: string;
          job_type?: string;
          portal_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          job_number?: string;
          customer_id?: string;
          user_id?: string;
          description?: string;
          status?: string;
          division?: string;
          priority?: string;
          start_date?: string;
          due_date?: string;
          budget?: number;
          notes?: string;
          job_type?: string;
          portal_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
  common: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          company_name: string;
          address: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          name: string;
          company_name: string;
          address: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company_name?: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
  lab_ops: {
    Tables: {
      lab_jobs: {
        Row: {
          id: string;
          title: string;
          job_number?: string | null;
          customer_id?: string | null;
          user_id?: string | null;
          description?: string | null;
          status?: string | null;
          division?: string | null;
          priority?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          budget?: number | null;
          notes?: string | null;
          job_type?: string | null;
          portal_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          title: string;
          job_number?: string | null;
          customer_id?: string | null;
          user_id?: string | null;
          description?: string | null;
          status?: string | null;
          division?: string | null;
          priority?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          budget?: number | null;
          notes?: string | null;
          job_type?: string | null;
          portal_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          job_number?: string | null;
          customer_id?: string | null;
          user_id?: string | null;
          description?: string | null;
          status?: string | null;
          division?: string | null;
          priority?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          budget?: number | null;
          notes?: string | null;
          job_type?: string | null;
          portal_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 