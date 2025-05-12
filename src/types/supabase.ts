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
      };
    };
  };
} 