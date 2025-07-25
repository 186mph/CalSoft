# Setting Up Document Storage in Supabase

This guide outlines how to set up and use document storage in Supabase for the AMPOS application.

## 1. Database Setup

First, you need to create a `documents` table in the `common` schema:

```sql
CREATE TABLE common.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  division TEXT,
  category TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Add indexes for faster queries
CREATE INDEX idx_documents_division ON common.documents(division);
CREATE INDEX idx_documents_created_by ON common.documents(created_by);
CREATE INDEX idx_documents_category ON common.documents(category);

-- Set up Row Level Security
ALTER TABLE common.documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view documents" 
  ON common.documents FOR SELECT 
  USING (true);  -- Anyone can view documents

CREATE POLICY "Users can insert their own documents" 
  ON common.documents FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own documents" 
  ON common.documents FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own documents" 
  ON common.documents FOR DELETE 
  USING (auth.uid() = created_by);
```

## 2. Storage Bucket Setup

Next, set up a storage bucket for the documents in Supabase:

1. Go to the Supabase dashboard
2. Navigate to Storage in the sidebar
3. Click "Create a new bucket"
4. Name it `documents`
5. Set the Security to "Private" if documents should be restricted, or "Public" if they're openly available
6. Setup bucket policies based on your security requirements:

For a private bucket, you might set policies like:

```sql
-- Allow users to insert their own files
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT 
  WITH CHECK (auth.uid() = request.auth.uid);

-- Allow users to view files they've uploaded
CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT 
  USING (auth.uid() = owner);
```

## 3. Frontend Integration

### Upload Document Function

Create a utility function to handle document uploads:

```typescript
// src/lib/documentUtils.ts
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

export async function uploadDocument(document: DocumentUpload) {
  try {
    const user = supabase.auth.getUser();
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
```

### Fetch Documents Function

Create a function to fetch documents:

```typescript
// src/lib/documentUtils.ts

export interface DocumentFilter {
  division?: string;
  category?: string;
  tags?: string[];
  createdBy?: string;
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
```

### Get Document URL Function

Create a function to get a downloadable or viewable URL for a document:

```typescript
// src/lib/documentUtils.ts

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
```

### Delete Document Function

Create a function to delete a document:

```typescript
// src/lib/documentUtils.ts

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
```

## 4. UI Implementation

Here's an example of how to implement a document upload component:

```tsx
// src/components/DocumentUpload.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { uploadDocument } from '@/lib/documentUtils';

interface DocumentUploadProps {
  division: string;
  onSuccess?: () => void;
}

export function DocumentUpload({ division, onSuccess }: DocumentUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    setError(null);
    setUploading(true);
    
    try {
      await uploadDocument({
        title,
        description,
        file,
        division
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (err: any) {
      setError(err.message || 'Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <Input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">File</label>
        <Input 
          type="file"
          onChange={handleFileChange}
          required
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <Button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </form>
  );
}
```

And a component to display a list of documents:

```tsx
// src/components/DocumentList.tsx
import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fetchDocuments, getDocumentUrl, deleteDocument } from '@/lib/documentUtils';
import { useAuth } from '@/lib/AuthContext';

interface DocumentListProps {
  division?: string;
  category?: string;
}

export function DocumentList({ division, category }: DocumentListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [division, category]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filter: any = {};
      if (division) filter.division = division;
      if (category) filter.category = category;
      
      const docs = await fetchDocuments(filter);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    try {
      const url = await getDocumentUrl(filePath);
      
      // Create a temporary link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert('Error downloading file');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(id);
      // Refresh the document list
      loadDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert('Error deleting document');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading documents...</div>;
  
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  
  if (documents.length === 0) {
    return <div className="p-4 text-center text-gray-500">No documents found</div>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className="border rounded-md p-4 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="h-6 w-6 mr-3 text-gray-400" />
            <div>
              <h3 className="font-medium">{doc.title}</h3>
              {doc.description && (
                <p className="text-sm text-gray-500">{doc.description}</p>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(doc.created_at).toLocaleDateString()} • 
                {(doc.file_size / 1024).toFixed(0)} KB
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDownload(doc.file_path, doc.title)}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {user && user.id === doc.created_by && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDelete(doc.id)}
              >
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 5. Document Page Implementation

Create a documents page to list all documents:

```tsx
// src/app/documents/page.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DocumentList } from '@/components/DocumentList';
import { DocumentUpload } from '@/components/DocumentUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const division = searchParams.get('division');
  const [showUpload, setShowUpload] = useState(false);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {division ? `${division} Documents` : 'All Documents'}
        </h1>
        
        {user && (
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel' : 'Upload Document'}
          </Button>
        )}
      </div>
      
      {showUpload && (
        <div className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
          <DocumentUpload 
            division={division || 'general'} 
            onSuccess={() => {
              setShowUpload(false);
              // Refresh document list (handled by rerender)
            }}
          />
        </div>
      )}
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="manuals">Manuals</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <DocumentList division={division || undefined} />
        </TabsContent>
        
        <TabsContent value="reports">
          <DocumentList division={division || undefined} category="reports" />
        </TabsContent>
        
        <TabsContent value="manuals">
          <DocumentList division={division || undefined} category="manuals" />
        </TabsContent>
        
        <TabsContent value="forms">
          <DocumentList division={division || undefined} category="forms" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 6. Migration Script

Create a migration script to set up the documents table in Supabase:

```sql
-- supabase/migrations/20250501000000_documents_table.sql

-- Create documents table in common schema
CREATE TABLE IF NOT EXISTS common.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  division TEXT,
  category TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_division ON common.documents(division);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON common.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON common.documents(category);

-- Set up Row Level Security
ALTER TABLE common.documents ENABLE ROW LEVEL SECURITY;

-- Create policies (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'documents' 
    AND schemaname = 'common' 
    AND policyname = 'Users can view documents'
  ) THEN
    CREATE POLICY "Users can view documents" 
      ON common.documents FOR SELECT 
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'documents' 
    AND schemaname = 'common' 
    AND policyname = 'Users can insert their own documents'
  ) THEN
    CREATE POLICY "Users can insert their own documents" 
      ON common.documents FOR INSERT 
      WITH CHECK (auth.uid() = created_by);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'documents' 
    AND schemaname = 'common' 
    AND policyname = 'Users can update their own documents'
  ) THEN
    CREATE POLICY "Users can update their own documents" 
      ON common.documents FOR UPDATE 
      USING (auth.uid() = created_by);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'documents' 
    AND schemaname = 'common' 
    AND policyname = 'Users can delete their own documents'
  ) THEN
    CREATE POLICY "Users can delete their own documents" 
      ON common.documents FOR DELETE 
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- Create or update trigger for updated_at
CREATE OR REPLACE FUNCTION common.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON common.documents;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON common.documents
FOR EACH ROW
EXECUTE FUNCTION common.update_updated_at_column();
```

## 7. Recommended Frontend Structure

```
src/
├── components/
│   ├── DocumentList.tsx
│   ├── DocumentUpload.tsx
│   └── DocumentView.tsx
├── lib/
│   └── documentUtils.ts
└── app/
    └── documents/
        └── page.tsx
```

This structure helps organize your document-related code and provides a good foundation for implementing document management in your AMPOS application. 