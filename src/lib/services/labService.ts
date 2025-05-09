import { supabase } from '@/lib/supabase';
import { SCHEMAS } from '@/lib/schema';

export interface LabEquipment {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'in-use' | 'maintenance' | 'calibration' | 'out-of-service';
  serial_number?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expiration?: string;
  location?: string;
  responsible_user?: string;
  responsible_user_name?: string;
  notes?: string;
  last_calibration_date?: string;
  next_calibration_date?: string;
  calibration_frequency?: number;
  calibration_procedure_id?: string;
  accuracy_rating?: string;
  measurement_range?: string;
  created_at: string;
  updated_at: string;
}

export interface Calibration {
  id: string;
  equipment_id: string;
  calibration_date: string;
  performed_by?: string;
  performer_name?: string;
  calibration_standard?: string;
  result: 'pass' | 'fail' | 'adjusted';
  certificate_number?: string;
  notes?: string;
  next_calibration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Procedure {
  id: string;
  title: string;
  version: string;
  document_url?: string;
  status: 'draft' | 'under-review' | 'approved' | 'deprecated';
  description?: string;
  category?: string;
  created_by?: string;
  creator_name?: string;
  approved_by?: string;
  approver_name?: string;
  approval_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  certificate_type: string;
  issued_date: string;
  issued_to: string;
  issued_by?: string;
  issuer_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  calibration_id?: string;
  document_url?: string;
  expiration_date?: string;
  status: 'valid' | 'expired' | 'revoked';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QualityMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
  date_recorded: string;
  target_value?: number;
  lower_threshold?: number;
  upper_threshold?: number;
  status: 'below-threshold' | 'within-threshold' | 'above-threshold';
  equipment_id?: string;
  equipment_name?: string;
  recorded_by?: string;
  recorder_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Equipment calibration methods
class LabService {
  // Check if lab tables exist, create them if needed
  async checkLabTablesExist() {
    try {
      const { data, error } = await supabase.rpc('check_lab_tables_exist');
      
      if (error) {
        console.error("Error checking lab tables:", error);
        return false;
      }
      
      return data;
    } catch (err) {
      console.error("Exception checking lab tables:", err);
      return false;
    }
  }
  
  // Equipment methods
  async getEquipment() {
    try {
      const { data, error } = await supabase
        .from(SCHEMAS.LAB_EQUIPMENT)
        .select(`
          *,
          responsible_user_name:responsible_user(raw_user_meta_data->>'name')
        `)
        .order('name');
        
      if (error) {
        console.error("Error fetching lab equipment:", error);
        return { data: null, error };
      }
      
      return { data: data as unknown as LabEquipment[], error: null };
    } catch (err) {
      console.error("Exception fetching lab equipment:", err);
      return { data: null, error: err };
    }
  }
  
  async getEquipmentById(id: string) {
    try {
      const { data, error } = await supabase
        .from(SCHEMAS.LAB_EQUIPMENT)
        .select(`
          *,
          responsible_user_name:responsible_user(raw_user_meta_data->>'name')
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        console.error(`Error fetching equipment with ID ${id}:`, error);
        return { data: null, error };
      }
      
      return { data: data as unknown as LabEquipment, error: null };
    } catch (err) {
      console.error(`Exception fetching equipment with ID ${id}:`, err);
      return { data: null, error: err };
    }
  }
  
  async saveEquipment(equipment: Partial<LabEquipment>) {
    try {
      if (equipment.id) {
        // Update existing equipment
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_EQUIPMENT)
          .update(equipment)
          .eq('id', equipment.id)
          .select()
          .single();
          
        if (error) {
          console.error("Error updating lab equipment:", error);
          return { data: null, error };
        }
        
        return { data: data as LabEquipment, error: null };
      } else {
        // Create new equipment
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_EQUIPMENT)
          .insert(equipment)
          .select()
          .single();
          
        if (error) {
          console.error("Error creating lab equipment:", error);
          return { data: null, error };
        }
        
        return { data: data as LabEquipment, error: null };
      }
    } catch (err) {
      console.error("Exception saving lab equipment:", err);
      return { data: null, error: err };
    }
  }
  
  async deleteEquipment(id: string) {
    try {
      const { error } = await supabase
        .from(SCHEMAS.LAB_EQUIPMENT)
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error(`Error deleting equipment with ID ${id}:`, error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error(`Exception deleting equipment with ID ${id}:`, err);
      return { success: false, error: err };
    }
  }
  
  // Calibration methods
  async getCalibrations(equipmentId?: string) {
    try {
      let query = supabase
        .from(SCHEMAS.LAB_CALIBRATIONS)
        .select(`
          *,
          performer_name:performed_by(raw_user_meta_data->>'name')
        `)
        .order('calibration_date', { ascending: false });
        
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error("Error fetching calibrations:", error);
        return { data: null, error };
      }
      
      return { data: data as unknown as Calibration[], error: null };
    } catch (err) {
      console.error("Exception fetching calibrations:", err);
      return { data: null, error: err };
    }
  }
  
  async saveCalibration(calibration: Partial<Calibration>) {
    try {
      if (calibration.id) {
        // Update existing calibration
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_CALIBRATIONS)
          .update(calibration)
          .eq('id', calibration.id)
          .select()
          .single();
          
        if (error) {
          console.error("Error updating calibration:", error);
          return { data: null, error };
        }
        
        return { data: data as Calibration, error: null };
      } else {
        // Create new calibration
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_CALIBRATIONS)
          .insert(calibration)
          .select()
          .single();
          
        if (error) {
          console.error("Error creating calibration:", error);
          return { data: null, error };
        }
        
        return { data: data as Calibration, error: null };
      }
    } catch (err) {
      console.error("Exception saving calibration:", err);
      return { data: null, error: err };
    }
  }
  
  // Get equipment needing calibration (due within 30 days)
  async getEquipmentNeedingCalibration() {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data, error } = await supabase
        .from(SCHEMAS.LAB_EQUIPMENT)
        .select(`
          *,
          responsible_user_name:responsible_user(raw_user_meta_data->>'name')
        `)
        .lte('next_calibration_date', thirtyDaysFromNow.toISOString().substring(0, 10))
        .order('next_calibration_date');
        
      if (error) {
        console.error("Error fetching equipment needing calibration:", error);
        return { data: null, error };
      }
      
      return { data: data as unknown as LabEquipment[], error: null };
    } catch (err) {
      console.error("Exception fetching equipment needing calibration:", err);
      return { data: null, error: err };
    }
  }
  
  // Certificate methods
  async getCertificates(customerId?: string, equipmentId?: string) {
    try {
      let query = supabase
        .from(SCHEMAS.LAB_CERTIFICATES)
        .select(`
          *,
          issuer_name:issued_by(raw_user_meta_data->>'name'),
          equipment_name:equipment_id(name)
        `)
        .order('issued_date', { ascending: false });
        
      if (customerId) {
        query = query.eq('issued_to', customerId);
      }
      
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error("Error fetching certificates:", error);
        return { data: null, error };
      }
      
      return { data: data as unknown as Certificate[], error: null };
    } catch (err) {
      console.error("Exception fetching certificates:", err);
      return { data: null, error: err };
    }
  }
  
  async getCertificateById(id: string) {
    try {
      const { data, error } = await supabase
        .from(SCHEMAS.LAB_CERTIFICATES)
        .select(`
          *,
          issuer_name:issued_by(raw_user_meta_data->>'name'),
          equipment_name:equipment_id(name)
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        console.error(`Error fetching certificate with ID ${id}:`, error);
        return { data: null, error };
      }
      
      return { data: data as unknown as Certificate, error: null };
    } catch (err) {
      console.error(`Exception fetching certificate with ID ${id}:`, err);
      return { data: null, error: err };
    }
  }
  
  async saveCertificate(certificate: Partial<Certificate>) {
    try {
      if (certificate.id) {
        // Update existing certificate
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_CERTIFICATES)
          .update(certificate)
          .eq('id', certificate.id)
          .select()
          .single();
          
        if (error) {
          console.error("Error updating certificate:", error);
          return { data: null, error };
        }
        
        return { data: data as Certificate, error: null };
      } else {
        // Create new certificate
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_CERTIFICATES)
          .insert(certificate)
          .select()
          .single();
          
        if (error) {
          console.error("Error creating certificate:", error);
          return { data: null, error };
        }
        
        return { data: data as Certificate, error: null };
      }
    } catch (err) {
      console.error("Exception saving certificate:", err);
      return { data: null, error: err };
    }
  }
  
  async deleteCertificate(id: string) {
    try {
      const { error } = await supabase
        .from(SCHEMAS.LAB_CERTIFICATES)
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error(`Error deleting certificate with ID ${id}:`, error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error(`Exception deleting certificate with ID ${id}:`, err);
      return { success: false, error: err };
    }
  }
  
  async uploadCertificateFile(file: File, certificateId: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `certificates/${certificateId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('lab-documents')
        .upload(filePath, file);
        
      if (error) {
        console.error("Error uploading certificate file:", error);
        return { data: null, error };
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lab-documents')
        .getPublicUrl(filePath);
        
      // Update certificate with document URL
      const certificateUpdate = {
        id: certificateId,
        document_url: urlData.publicUrl
      };
      
      const updateResult = await this.saveCertificate(certificateUpdate);
      
      return {
        data: {
          path: filePath,
          url: urlData.publicUrl,
          certificate: updateResult.data
        },
        error: null
      };
    } catch (err) {
      console.error("Exception uploading certificate file:", err);
      return { data: null, error: err };
    }
  }
  
  // Quality metrics methods
  async getQualityMetrics(equipmentId?: string, dateRange?: { start: string, end: string }) {
    try {
      let query = supabase
        .from(SCHEMAS.LAB_QUALITY_METRICS)
        .select(`
          *,
          recorder_name:recorded_by(raw_user_meta_data->>'name'),
          equipment_name:equipment_id(name)
        `)
        .order('date_recorded', { ascending: false });
        
      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      
      if (dateRange) {
        query = query
          .gte('date_recorded', dateRange.start)
          .lte('date_recorded', dateRange.end);
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error("Error fetching quality metrics:", error);
        return { data: null, error };
      }
        
      return { data: data as unknown as QualityMetric[], error: null };
    } catch (err) {
      console.error("Exception fetching quality metrics:", err);
      return { data: null, error: err };
    }
  }
  
  async saveQualityMetric(metric: Partial<QualityMetric>) {
    try {
      if (metric.id) {
        // Update existing metric
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_QUALITY_METRICS)
          .update(metric)
          .eq('id', metric.id)
          .select()
          .single();
          
        if (error) {
          console.error("Error updating quality metric:", error);
          return { data: null, error };
        }
        
        return { data: data as QualityMetric, error: null };
      } else {
        // Create new metric
        const { data, error } = await supabase
          .from(SCHEMAS.LAB_QUALITY_METRICS)
          .insert(metric)
          .select()
          .single();
          
        if (error) {
          console.error("Error creating quality metric:", error);
          return { data: null, error };
        }
        
        return { data: data as QualityMetric, error: null };
      }
    } catch (err) {
      console.error("Exception saving quality metric:", err);
      return { data: null, error: err };
    }
  }
}

export const labService = new LabService(); 