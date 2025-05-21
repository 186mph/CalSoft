import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { 
  Card, Button, Input, Select, Badge, 
  Table, TableHeader, TableBody, TableRow, 
  TableHead, TableCell, Pagination, toast 
} from '@/components/ui';
import { Search, Filter, Folder, File, Download } from 'lucide-react';
import engineeringService from '@/lib/services/engineeringService';

export type DocumentCategory = 'technical' | 'manual' | 'procedure' | 'standard' | 'guide' | 'reference';

export interface DocumentFilters {
  category?: DocumentCategory;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
}

export interface TechnicalDocument {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  file_url: string;
  version: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
  };
  created_by_id: string;
}

export function TechnicalDocumentationLibrary() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<TechnicalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<TechnicalDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Filter states
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Upload dialog states
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'technical' as DocumentCategory,
    tags: [] as string[],
    file: null as File | null
  });

  useEffect(() => {
    fetchDocuments();
    fetchTags();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, filters]);

  const fetchDocuments = async () => {
    setLoading(true);
    // This will be implemented in the engineeringService
    // Placeholder for now
    const response = { data: [], error: null };
    
    if (response.data) {
      setDocuments(response.data as TechnicalDocument[]);
    } else {
      toast({
        title: 'Error',
        description: response.error ? String(response.error) : 'Failed to fetch documents',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    // This will be implemented in the engineeringService
    // Placeholder for now
    const response = { data: ['CAD', 'Blueprint', 'Procedure', 'Safety', 'Electrical', 'Mechanical'], error: null };
    
    if (response.data) {
      setTags(response.data);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];
    
    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(doc => 
        filters.tags?.some(tag => doc.tags.includes(tag))
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(doc => 
        new Date(doc.created_at) >= new Date(filters.dateFrom!)
      );
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(doc => 
        new Date(doc.created_at) <= new Date(filters.dateTo!)
      );
    }
    
    setFilteredDocuments(filtered);
  };

  const handleFilterChange = (key: keyof DocumentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagChange = (tag: string) => {
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(updatedTags);
    handleFilterChange('tags', updatedTags);
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedTags([]);
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const handleUploadSubmit = async () => {
    if (!newDocument.title || !newDocument.category || !newDocument.file) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields and select a file',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    
    // This will be implemented in the engineeringService
    // Placeholder for now
    // Would upload the file and create the document record
    setTimeout(() => {
      setUploading(false);
      setShowUploadDialog(false);
      setNewDocument({
        title: '',
        description: '',
        category: 'technical',
        tags: [],
        file: null
      });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
        variant: 'success',
      });
      
      fetchDocuments();
    }, 1500);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    const categoryMap: Record<DocumentCategory, string> = {
      technical: 'Technical Document',
      manual: 'Manual',
      procedure: 'Procedure',
      standard: 'Standard',
      guide: 'Guide',
      reference: 'Reference'
    };
    
    return categoryMap[category] || category;
  };

  const getCategoryBadgeColor = (category: DocumentCategory) => {
    const colorMap: Record<DocumentCategory, string> = {
      technical: 'bg-blue-500',
      manual: 'bg-green-500',
      procedure: 'bg-purple-500',
      standard: 'bg-yellow-500',
      guide: 'bg-orange-500',
      reference: 'bg-gray-500'
    };
    
    return colorMap[category] || 'bg-gray-500';
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div>
      {/* Header section with stats and actions */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Technical Documentation Library
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage and access engineering documentation
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search documents..." 
              className="pl-10 w-64"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>
      
      {/* Filters panel */}
      {showFilters && (
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <Select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'technical', label: 'Technical Document' },
                  { value: 'manual', label: 'Manual' },
                  { value: 'procedure', label: 'Procedure' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'guide', label: 'Guide' },
                  { value: 'reference', label: 'Reference' }
                ]}
              >
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date From
              </label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date To
              </label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  className={`cursor-pointer ${
                    selectedTags.includes(tag) 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleTagChange(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </Card>
      )}
      
      {/* Documents table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2">Loading documents...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <File className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No documents found</p>
                  {Object.keys(filters).length > 0 && (
                    <Button variant="link" onClick={clearFilters} className="mt-2">
                      Clear filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {doc.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getCategoryBadgeColor(doc.category)} text-white`}>
                      {getCategoryLabel(doc.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.version}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{formatDate(doc.created_at)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      by {doc.created_by.display_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {!loading && filteredDocuments.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredDocuments.length / itemsPerPage)}
              onPageChange={paginate}
            />
          </div>
        )}
      </Card>
      
      {/* Upload document dialog - Placeholder for now */}
      {showUploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Upload Document</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <Input
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                    placeholder="Enter document title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                    placeholder="Enter document description"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-dark-100"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <Select
                    value={newDocument.category}
                    onChange={(e) => setNewDocument({
                      ...newDocument, 
                      category: e.target.value as DocumentCategory
                    })}
                    options={[
                      { value: 'technical', label: 'Technical Document' },
                      { value: 'manual', label: 'Manual' },
                      { value: 'procedure', label: 'Procedure' },
                      { value: 'standard', label: 'Standard' },
                      { value: 'guide', label: 'Guide' },
                      { value: 'reference', label: 'Reference' }
                    ]}
                  >
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag}
                        className={`cursor-pointer ${
                          newDocument.tags.includes(tag) 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => {
                          const updatedTags = newDocument.tags.includes(tag)
                            ? newDocument.tags.filter(t => t !== tag)
                            : [...newDocument.tags, tag];
                          setNewDocument({...newDocument, tags: updatedTags});
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    File *
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-8m-12 0v-8m0 0V4m0 4h4m8 0h-4m-12 4h4m8 0h-4m-12 4h12a4 4 0 014 4v4m0 0v-4m0 0h-12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-dark-100 rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                          <span>Upload a file</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setNewDocument({...newDocument, file: e.target.files[0]});
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, DOC, CAD, DWG, XLS up to 10MB
                      </p>
                    </div>
                  </div>
                  {newDocument.file && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Selected file: {newDocument.file.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 