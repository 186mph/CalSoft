import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentUpload {
  title: string;
  description?: string;
  file: File;
  division: string;
  category?: string;
  tags?: string[];
}

export interface DocumentFilter {
  division?: string;
  category?: string;
  tags?: string[];
  createdBy?: string;
}

export async function uploadDocument(document: DocumentUpload) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Upload the file to storage
    const fileExt = document.file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${document.division}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, document.file);

    if (uploadError) throw uploadError;

    // 2. Add entry to the documents table
    const { data, error } = await supabase
      .schema('common')
      .from('documents')
      .insert({
        title: document.title,
        description: document.description || '',
        file_path: filePath,
        file_type: document.file.type,
        file_size: document.file.size,
        division: document.division,
        category: document.category || 'general',
        tags: document.tags || [],
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      // If the database insert fails, try to clean up the uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

export async function fetchDocuments(filter: DocumentFilter = {}) {
  try {
    let query = supabase
      .schema('common')
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filter.division) {
      query = query.eq('division', filter.division);
    }
    
    if (filter.category) {
      query = query.eq('category', filter.category);
    }
    
    if (filter.createdBy) {
      query = query.eq('created_by', filter.createdBy);
    }
    
    if (filter.tags && filter.tags.length > 0) {
      // Filter for documents that have at least one of the specified tags
      query = query.contains('tags', filter.tags);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

export async function getDocumentUrl(filePath: string, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) throw error;
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw error;
  }
}

export async function deleteDocument(documentId: string) {
  try {
    // First, get the document to know the file path
    const { data: document, error: fetchError } = await supabase
      .schema('common')
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!document) throw new Error('Document not found');
    
    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete the record from the database
    const { error: deleteError } = await supabase
      .schema('common')
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (deleteError) throw deleteError;
    
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

export async function getDocumentCount(division?: string) {
  try {
    let query = supabase
      .schema('common')
      .from('documents')
      .select('id', { count: 'exact' });
    
    if (division) {
      query = query.eq('division', division);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error getting document count:', error);
    return 0;
  }
} 