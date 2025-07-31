import { supabase } from '../lib/supabase';

export interface CategoryRule {
  id?: string;
  field: string;
  operator: string;
  value: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  rules?: CategoryRule[];
}

export interface Customer {
  id: string;
  name: string;
  company_name: string;
  company_id?: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  category_id?: string | null;
  category?: CustomerCategory;
  created_at: string;
  user_id?: string;
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  name: string;
  type: string;
  size: number;
  upload_date: string;
  uploaded_by: string;
  folder_id: string | null;
  tags: string[];
  gdrive_id?: string;
  gdrive_url?: string;
  version: number;
  file_path: string;
  category?: string;
  description?: string;
  file_url?: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  customer_id: string;
  created_at: string;
  parent_folder_id?: string | null;
}

export interface CustomerInteraction {
  id: string;
  customer_id: string;
  type: string;
  created_at: string;
  created_by: string;
  title: string;
  description: string;
  outcome?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  completed: boolean;
  associated_contact_id?: string | null;
  tags: string[];
}

export interface CustomerHealth {
  id: string;
  customer_id: string;
  health_score: number;
  last_updated: string;
  metrics: CustomerHealthMetrics;
  alerts: CustomerHealthAlert[];
  history: CustomerHealthHistoryEntry[];
}

export interface CustomerHealthMetrics {
  satisfaction_score: number;
  interaction_frequency: number;
  response_time: number;
  payment_timeliness: number;
  service_usage: number;
  support_tickets: number;
  contract_value: number;
  contract_renewal: number;
}

export interface CustomerHealthAlert {
  id: string;
  customer_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface CustomerHealthHistoryEntry {
  date: string;
  score: number;
  major_changes?: {
    metric: string;
    previous_value: number;
    new_value: number;
    impact: number;
  }[];
}

// Customer Satisfaction Interfaces
export type QuestionType = 'rating' | 'text' | 'multiple_choice' | 'boolean';

export interface SurveyTemplate {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  auto_send: boolean;
  frequency?: string;
}

export interface SurveyQuestion {
  id: string;
  template_id: string;
  question: string;
  question_type: QuestionType;
  required: boolean;
  order_index: number;
  options?: {
    options: string[];
  };
}

export interface CustomerSurvey {
  id: string;
  customer_id: string;
  template_id: string;
  created_at: string;
  created_by: string;
  sent_at?: string;
  completed_at?: string;
  unique_token: string;
  notes?: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  question_id: string;
  response: string | number | boolean;
  created_at: string;
}

export interface CustomerSatisfactionScore {
  customer_id: string;
  company_name: string;
  avg_score: number;
  completed_surveys: number;
  total_surveys: number;
  last_survey_date?: string;
}

// Customer Category Functions
export async function getCategories() {
  try {
    // Since the customer_categories table doesn't exist, we'll return an empty array
    console.log("Note: customer_categories table not found, returning empty array");
    return [];
  } catch (error) {
    console.error("Error in getCategories:", error);
    return [];
  }
}

export async function createCategory(category: Omit<CustomerCategory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_categories')
    .insert([category])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, category: Partial<CustomerCategory>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .schema('common')
    .from('customer_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Customer Document Functions
export async function getCustomerDocuments(customerId: string, filters?: { 
  folderId?: string | null; 
  search?: string;
  type?: string[];
  tags?: string[];
  category?: string;
}) {
  let query = supabase
    .schema('common')
    .from('customer_documents')
    .select('*')
    .eq('customer_id', customerId);
  
  if (filters) {
    if (filters.folderId !== undefined) {
      query = query.eq('folder_id', filters.folderId);
    }
    
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    
    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
  }

  const { data, error } = await query.order('upload_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDocumentFolders(customerId: string) {
  const { data, error } = await supabase
    .schema('common')
    .from('document_folders')
    .select('*')
    .eq('customer_id', customerId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createDocumentFolder(folder: Omit<DocumentFolder, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .schema('common')
    .from('document_folders')
    .insert([folder])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadCustomerDocument(file: File, customerId: string, folderId?: string | null, tags?: string[]) {
  try {
    // 1. Upload to Supabase storage
    const fileExt = file.name.split('.').pop();
    const filePath = `customer-documents/${customerId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // 2. Get the public URL
    const { data: urlData } = supabase.storage
      .from('customer-documents')
      .getPublicUrl(filePath);
    
    // 3. Create document record in database
    const fileType = fileExt?.toUpperCase() || 'UNKNOWN';
    const document: Omit<CustomerDocument, 'id' | 'upload_date'> = {
      customer_id: customerId,
      name: file.name,
      type: fileType,
      size: file.size,
      uploaded_by: 'Current User', // This should be replaced with actual user info
      folder_id: folderId || null,
      tags: tags || [],
      version: 1,
      file_path: filePath
    };
    
    const { data: docData, error: docError } = await supabase
      .schema('common')
      .from('customer_documents')
      .insert([{
        ...document,
        file_url: urlData.publicUrl,
        file_path: filePath
      }])
      .select()
      .single();
    
    if (docError) throw docError;
    
    return docData;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

export async function deleteCustomerDocument(documentId: string, filePath?: string) {
  try {
    // 1. Delete from storage if filePath is provided
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('customer-documents')
        .remove([filePath]);
      
      if (storageError) throw storageError;
    }
    
    // 2. Delete from database
    const { error: dbError } = await supabase
      .schema('common')
      .from('customer_documents')
      .delete()
      .eq('id', documentId);
    
    if (dbError) throw dbError;
    
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

export async function updateCustomerDocument(id: string, updates: Partial<CustomerDocument>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getDocumentCategories() {
  const { data, error } = await supabase
    .schema('common')
    .from('document_categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getDocumentUrl(filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from('customer-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiration
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw error;
  }
}

// Google Drive Integration
export async function connectGoogleDrive() {
  // This would typically initiate the OAuth flow, but for now we'll just return a mock success
  return {
    success: true,
    message: 'Connected to Google Drive successfully'
  };
}

export async function uploadToGoogleDrive(file: File, customerId: string, folderId?: string) {
  // This would typically upload to Google Drive using their API
  // For now, we'll just simulate a successful upload
  return {
    success: true,
    fileId: `gdrive-${Date.now()}`,
    url: 'https://drive.google.com/file/example',
    message: 'File uploaded to Google Drive successfully'
  };
}

// Enhanced Google Drive Integration
export async function getGoogleDriveDocuments(customerId: string) {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId)
      .not('gdrive_id', 'is', null);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting Google Drive documents:', error);
    throw error;
  }
}

export async function syncGoogleDriveDocuments(customerId: string) {
  // In a real implementation, this would use Google Drive API to fetch documents
  // and sync them with our database. For now, we'll return a mock success.
  return {
    success: true,
    message: 'Documents synced with Google Drive',
    count: 5 // Mock number of documents synced
  };
}

// Customer Functions
export async function getCustomers(filters?: { category_id?: string | null; status?: string | null }) {
  const currentPath = window.location.pathname;
  const isCalibration = currentPath.startsWith('/calibration');
  const schema = isCalibration ? 'lab_ops' : 'common';
  const table = isCalibration ? 'lab_customers' : 'customers';

  console.log(`[customerService.getCustomers] Path: ${currentPath}, isCalibration: ${isCalibration}, Schema: ${schema}, Table: ${table}`);

  let query = supabase
    .schema(schema)
    .from(table)
    .select('*');

  if (filters) {
    if (filters.category_id) {
      console.log(`[customerService.getCustomers] Applying filter category_id: ${filters.category_id}`);
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.status) {
      console.log(`[customerService.getCustomers] Applying filter status: ${filters.status}`);
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[customerService.getCustomers] Error fetching from ${schema}.${table}:`, error);
    throw error;
  }
  
  console.log(`[customerService.getCustomers] Fetched ${data?.length || 0} customers from ${schema}.${table}. Data:`, data);
  return data || [];
}

export async function getCustomerById(id: string) {
  // Determine schema based on division context from URL
  const isCalibration = window.location.pathname.startsWith('/calibration');
  const schema = isCalibration ? 'lab_ops' : 'common';
  const table = isCalibration ? 'lab_customers' : 'customers';

  const { data, error } = await supabase
    .schema(schema)
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomerCategory(customerId: string, categoryId: string | null) {
  const { data, error } = await supabase
    .schema('common')
    .from('customers')
    .update({ category_id: categoryId })
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at'>) {
  try {
    console.log("Creating new customer:", customer);
    
    // Determine schema based on division context from URL
    const isCalibration = window.location.pathname.startsWith('/calibration');
    const schema = isCalibration ? 'lab_ops' : 'common';
    const table = isCalibration ? 'lab_customers' : 'customers';
    
    // For calibration division, we need to modify the customer object
    const customerData = { ...customer };
    
    if (isCalibration) {
      // The lab_customers table might not have these columns
      // so we'll remove them to avoid errors
      if ('category_id' in customerData) {
        delete (customerData as any).category_id;
      }
      
      // Always remove user_id for lab_customers to avoid UUID format issues
      if ('user_id' in customerData) {
        delete (customerData as any).user_id;
      }
      
      // Validate that company_id is provided for calibration division
      if (!customerData.company_id) {
        throw new Error('Customer ID is required for Calibration Division customers. Please ensure the Customer ID is auto-generated or manually entered.');
      }
      
      // Ensure status is explicitly set for calibration division
      if (!customerData.status) {
        customerData.status = 'active';
      }
      
      console.log("Modified customer data for lab_ops schema:", customerData);
    }
    
    // Ensure we're using the correct schema
    const { data, error } = await supabase
      .schema(schema)
      .from(table)
      .insert([customerData])
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createCustomer:", error);
    throw error;
  }
}

export async function updateCustomer(id: string, customer: Partial<Customer>) {
  // Determine schema based on division context from URL
  const isCalibration = window.location.pathname.startsWith('/calibration');
  const schema = isCalibration ? 'lab_ops' : 'common';
  const table = isCalibration ? 'lab_customers' : 'customers';

  // For calibration division, we need to modify the customer object
  const customerData = { ...customer };
  
  if (isCalibration) {
    // The lab_customers table might not have these columns
    // so we'll remove them to avoid errors
    if ('category_id' in customerData) {
      delete (customerData as any).category_id;
    }
    
    // Always remove user_id for lab_customers to avoid UUID format issues
    if ('user_id' in customerData) {
      delete (customerData as any).user_id;
    }
    
    // Ensure company_id is not accidentally deleted or updated
    // since it's used as the primary identifier
    if ('company_id' in customerData && !customerData.company_id) {
      delete (customerData as any).company_id;
    }
    
    // Ensure status is explicitly set for calibration division
    if ('status' in customerData && !customerData.status) {
      customerData.status = 'active';
    }
    
    console.log("Modified customer data for update in lab_ops schema:", customerData);
  }

  try {
    const { data, error } = await supabase
      .schema(schema)
      .from(table)
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating customer in ${schema} schema:`, error);
      
      // Check if it's a schema cache error for a specific column
      if (error.message && (
        error.message.includes("category_id") || 
        error.message.includes("company_id") ||
        error.message.includes("status"))) {
        console.error(`Schema cache error for column in ${table}. This usually means the column exists in the database but not in the cache.`);
      }
      
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error("Unexpected error in updateCustomer:", err);
    throw err;
  }
}

export async function deleteCustomer(id: string) {
  // Determine schema based on division context from URL
  const isCalibration = window.location.pathname.startsWith('/calibration');
  const schema = isCalibration ? 'lab_ops' : 'common';
  const table = isCalibration ? 'lab_customers' : 'customers';

  const { error } = await supabase
    .schema(schema)
    .from(table)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Customer Interaction Functions
export async function getCustomerInteractions(customerId: string, filters?: {
  type?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string[];
}) {
  let query = supabase
    .schema('common')
    .from('customer_interactions')
    .select('*')
    .eq('customer_id', customerId);
  
  if (filters) {
    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCustomerInteraction(interaction: Omit<CustomerInteraction, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_interactions')
    .insert([interaction])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomerInteraction(id: string, interaction: Partial<CustomerInteraction>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_interactions')
    .update(interaction)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomerInteraction(id: string) {
  const { error } = await supabase
    .schema('common')
    .from('customer_interactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Customer Satisfaction Functions
export async function getSurveyTemplates(includeInactive = false): Promise<SurveyTemplate[]> {
  try {
    let query = supabase.from('survey_templates').select('*');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching survey templates:', error);
    throw error;
  }
}

export async function getSurveyTemplateById(id: string): Promise<SurveyTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching survey template with id ${id}:`, error);
    throw error;
  }
}

export async function createSurveyTemplate(template: Omit<SurveyTemplate, 'id' | 'created_at'>): Promise<SurveyTemplate> {
  try {
    const { data, error } = await supabase
      .from('survey_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating survey template:', error);
    throw error;
  }
}

export async function updateSurveyTemplate(id: string, template: Partial<SurveyTemplate>): Promise<void> {
  try {
    const { error } = await supabase
      .from('survey_templates')
      .update(template)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error updating survey template with id ${id}:`, error);
    throw error;
  }
}

export async function deleteSurveyTemplate(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('survey_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting survey template with id ${id}:`, error);
    throw error;
  }
}

export async function getSurveyQuestions(templateId: string): Promise<SurveyQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching survey questions for template ${templateId}:`, error);
    throw error;
  }
}

export async function createSurveyQuestion(question: Omit<SurveyQuestion, 'id'>): Promise<SurveyQuestion> {
  try {
    const { data, error } = await supabase
      .from('survey_questions')
      .insert(question)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating survey question:', error);
    throw error;
  }
}

export async function updateSurveyQuestion(id: string, question: Partial<SurveyQuestion>): Promise<void> {
  try {
    const { error } = await supabase
      .from('survey_questions')
      .update(question)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error updating survey question with id ${id}:`, error);
    throw error;
  }
}

export async function deleteSurveyQuestion(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('survey_questions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting survey question with id ${id}:`, error);
    throw error;
  }
}

export async function getCustomerSurveys(customerId: string): Promise<CustomerSurvey[]> {
  try {
    const { data, error } = await supabase
      .from('customer_surveys')
      .select('*, survey_templates(title)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching surveys for customer ${customerId}:`, error);
    throw error;
  }
}

export async function getCustomerSurveyById(id: string, includeResponses: boolean = false) {
  const query = supabase
    .schema('common')
    .from('customer_surveys')
    .select(includeResponses ? 
      '*, template:template_id(*), responses:survey_responses(*, question:question_id(*))' : 
      '*, template:template_id(*)'
    )
    .eq('id', id);
  
  const { data, error } = await query.single();
  
  if (error) throw error;
  return data;
}

export async function createCustomerSurvey(survey: Omit<CustomerSurvey, 'id' | 'created_at' | 'unique_token'>): Promise<CustomerSurvey> {
  try {
    // Generate unique token for survey link
    const uniqueToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { data, error } = await supabase
      .from('customer_surveys')
      .insert({
        ...survey,
        unique_token: uniqueToken
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating customer survey:', error);
    throw error;
  }
}

export async function updateCustomerSurvey(id: string, survey: Partial<CustomerSurvey>) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_surveys')
    .update(survey)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCustomerSurvey(id: string) {
  const { error } = await supabase
    .schema('common')
    .from('customer_surveys')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

export async function sendCustomerSurvey(surveyId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('customer_surveys')
      .update({ sent_at: now })
      .eq('id', surveyId);
    
    if (error) throw error;
    
    // In a real app, you would send an email to the customer with the survey link here
    // For now, we're just updating the sent_at timestamp
  } catch (error) {
    console.error(`Error sending survey ${surveyId}:`, error);
    throw error;
  }
}

export async function submitSurveyResponse(surveyToken: string, responses: {
  questionId: string;
  response?: string;
  rating?: number;
}[]) {
  try {
    // 1. Get the survey by token
    const { data: surveyData, error: surveyError } = await supabase
      .schema('common')
      .from('customer_surveys')
      .select('id, template_id')
      .eq('unique_token', surveyToken)
      .eq('status', 'sent')
      .single();
    
    if (surveyError || !surveyData) throw new Error('Survey not found or already completed');
    
    // 2. Insert all responses
    const responsesToInsert = responses.map(response => ({
      survey_id: surveyData.id,
      question_id: response.questionId,
      response: response.response,
      rating: response.rating
    }));
    
    const { error: responseError } = await supabase
      .schema('common')
      .from('survey_responses')
      .insert(responsesToInsert);
    
    if (responseError) throw responseError;
    
    // 3. Calculate satisfaction score (average of all rating questions)
    const ratingResponses = responses.filter(r => r.rating !== undefined);
    const avgRating = ratingResponses.length > 0
      ? Math.round(ratingResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingResponses.length)
      : null;
    
    // 4. Update survey as completed
    const { error: updateError } = await supabase
      .schema('common')
      .from('customer_surveys')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        satisfaction_score: avgRating
      })
      .eq('id', surveyData.id);
    
    if (updateError) throw updateError;
    
    return {
      success: true,
      message: 'Survey responses submitted successfully'
    };
  } catch (error) {
    console.error('Error submitting survey response:', error);
    throw error;
  }
}

export async function getCustomerSatisfactionScore(customerId: string) {
  const { data, error } = await supabase
    .schema('common')
    .from('customer_satisfaction_scores')
    .select('*')
    .eq('customer_id', customerId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') { // Record not found
      return {
        customer_id: customerId,
        avg_score: 0,
        completed_surveys: 0,
        total_surveys: 0
      };
    }
    throw error;
  }
  
  return data;
}

// Survey Response Functions
export async function getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*, survey_questions(question, question_type)')
      .eq('survey_id', surveyId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching responses for survey ${surveyId}:`, error);
    throw error;
  }
}

export async function getSurveyResponsesBySurveyToken(token: string): Promise<{ survey: CustomerSurvey, questions: SurveyQuestion[], responses: SurveyResponse[] } | null> {
  try {
    // Get survey by token
    const { data: surveyData, error: surveyError } = await supabase
      .from('customer_surveys')
      .select('*')
      .eq('unique_token', token)
      .single();
    
    if (surveyError) throw surveyError;
    if (!surveyData) return null;
    
    // Get questions for this survey's template
    const { data: questionsData, error: questionsError } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('template_id', surveyData.template_id)
      .order('order_index', { ascending: true });
    
    if (questionsError) throw questionsError;
    
    // Get existing responses
    const { data: responsesData, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyData.id);
    
    if (responsesError) throw responsesError;
    
    return {
      survey: surveyData,
      questions: questionsData || [],
      responses: responsesData || []
    };
  } catch (error) {
    console.error(`Error fetching survey data for token ${token}:`, error);
    throw error;
  }
}

export async function createSurveyResponse(response: Omit<SurveyResponse, 'id' | 'created_at'>): Promise<SurveyResponse> {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .insert(response)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating survey response:', error);
    throw error;
  }
}

export async function completeSurvey(surveyId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('customer_surveys')
      .update({ completed_at: now })
      .eq('id', surveyId);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error marking survey ${surveyId} as completed:`, error);
    throw error;
  }
}

// Customer Health Functions
export async function getCustomerHealth(customerId: string): Promise<CustomerHealth> {
  try {
    // Get satisfaction score
    const satisfactionData = await getCustomerSatisfactionScore(customerId);
    
    // Get interactions for frequency calculation
    const interactions = await getCustomerInteractions(customerId);
    const last30DaysInteractions = interactions.filter(
      interaction => new Date(interaction.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    // Simulate other metrics (in a real app, these would come from various sources)
    const metrics: CustomerHealthMetrics = {
      satisfaction_score: satisfactionData.avg_score * 10, // Convert to 0-100 scale
      interaction_frequency: Math.min(100, last30DaysInteractions.length * 10), // 10 points per interaction, max 100
      response_time: Math.random() * 40 + 60, // Random score between 60-100
      payment_timeliness: Math.random() * 40 + 60, // Random score between 60-100
      service_usage: Math.random() * 40 + 60, // Random score between 60-100
      support_tickets: Math.random() * 40 + 60, // Random score between 60-100
      contract_value: Math.random() * 40 + 60, // Random score between 60-100
      contract_renewal: Math.random() * 40 + 60, // Random score between 60-100
    };
    
    // Calculate overall health score (weighted average)
    const weights = {
      satisfaction_score: 0.25,
      interaction_frequency: 0.15,
      response_time: 0.1,
      payment_timeliness: 0.1,
      service_usage: 0.1,
      support_tickets: 0.1,
      contract_value: 0.1,
      contract_renewal: 0.1
    };
    
    const healthScore = Object.keys(metrics).reduce((score, key) => {
      return score + metrics[key] * weights[key];
    }, 0);
    
    // Generate simulated health history
    const historyEntries: CustomerHealthHistoryEntry[] = [];
    const today = new Date();
    for (let i = 12; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      
      // Add some variance to make the graph interesting
      const variance = Math.random() * 15 - 7.5; // -7.5 to +7.5
      const adjustedScore = Math.max(0, Math.min(100, healthScore + variance));
      
      historyEntries.push({
        date: date.toISOString(),
        score: Math.round(adjustedScore),
        major_changes: i % 3 === 0 ? [
          {
            metric: Object.keys(metrics)[Math.floor(Math.random() * Object.keys(metrics).length)],
            previous_value: Math.round(Math.random() * 100),
            new_value: Math.round(Math.random() * 100),
            impact: Math.round((Math.random() * 20) - 10)
          }
        ] : undefined
      });
    }
    
    // Generate some alerts based on metrics
    const alerts: CustomerHealthAlert[] = [];
    
    if (metrics.satisfaction_score < 60) {
      alerts.push({
        id: `alert-satisfaction-${customerId}`,
        customer_id: customerId,
        alert_type: 'satisfaction',
        severity: 'high',
        message: 'Customer satisfaction score is critically low',
        created_at: new Date().toISOString(),
        resolved: false
      });
    }
    
    if (metrics.interaction_frequency < 30) {
      alerts.push({
        id: `alert-engagement-${customerId}`,
        customer_id: customerId,
        alert_type: 'engagement',
        severity: 'medium',
        message: 'Low customer engagement in the last 30 days',
        created_at: new Date().toISOString(),
        resolved: false
      });
    }
    
    if (metrics.contract_renewal < 70) {
      alerts.push({
        id: `alert-renewal-${customerId}`,
        customer_id: customerId,
        alert_type: 'renewal',
        severity: 'critical',
        message: 'Contract renewal risk detected',
        created_at: new Date().toISOString(),
        resolved: false
      });
    }
    
    return {
      id: `health-${customerId}`,
      customer_id: customerId,
      health_score: Math.round(healthScore),
      last_updated: new Date().toISOString(),
      metrics,
      alerts,
      history: historyEntries
    };
  } catch (error) {
    console.error('Error getting customer health:', error);
    throw error;
  }
}

export async function resolveHealthAlert(alertId: string, notes: string): Promise<void> {
  try {
    // In a real app, this would update the database
    console.log(`Alert ${alertId} resolved with notes: ${notes}`);
    return Promise.resolve();
  } catch (error) {
    console.error('Error resolving health alert:', error);
    throw error;
  }
} 