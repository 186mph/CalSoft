import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Download,
  Upload,
  Eye,
  Search,
  Filter
} from 'lucide-react';
import { labService, Procedure } from '@/lib/services/labService';

interface TestingProceduresProps {
  division?: string;
}

const procedureCategories = [
  { value: 'electrical', label: 'Electrical Testing' },
  { value: 'mechanical', label: 'Mechanical Testing' },
  { value: 'chemical', label: 'Chemical Analysis' },
  { value: 'calibration', label: 'Calibration Procedure' },
  { value: 'safety', label: 'Safety Protocol' },
  { value: 'quality', label: 'Quality Control' },
  { value: 'other', label: 'Other Procedure' }
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'deprecated', label: 'Deprecated' }
];

export function TestingProcedures({ division }: TestingProceduresProps) {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const defaultFormState: Partial<Procedure> = {
    title: '',
    version: '1.0',
    status: 'draft',
    description: '',
    category: 'electrical',
    created_by: user?.id,
    document_url: ''
  };
  
  const [form, setForm] = useState<Partial<Procedure>>(defaultFormState);

  // Fetch procedures on component mount
  useEffect(() => {
    const fetchProcedures = async () => {
      setIsLoading(true);
      try {
        // For now, we'll mock the API call since we haven't implemented it yet
        // In a real implementation, we would call the labService
        // const { data, error } = await labService.getProcedures();
        
        // Mock data for now
        const mockProcedures: Procedure[] = [
          {
            id: '1',
            title: 'Transformer Testing Protocol',
            version: '2.1',
            status: 'approved',
            description: 'Standard operating procedure for testing power transformers',
            category: 'electrical',
            created_by: '123',
            creator_name: 'John Doe',
            approved_by: '456',
            approver_name: 'Jane Smith',
            approval_date: '2025-03-15',
            document_url: 'https://example.com/procedures/transformer_testing_v2.1.pdf',
            created_at: '2025-01-10T12:00:00Z',
            updated_at: '2025-03-15T09:30:00Z'
          },
          {
            id: '2',
            title: 'Circuit Breaker Calibration',
            version: '1.3',
            status: 'under-review',
            description: 'Procedure for calibrating and testing low voltage circuit breakers',
            category: 'calibration',
            created_by: '123',
            creator_name: 'John Doe',
            document_url: 'https://example.com/procedures/breaker_calibration_v1.3.pdf',
            created_at: '2025-02-05T15:20:00Z',
            updated_at: '2025-04-01T11:45:00Z'
          },
          {
            id: '3',
            title: 'Oil Sample Analysis',
            version: '3.0',
            status: 'draft',
            description: 'Updated procedure for transformer oil sample collection and analysis',
            category: 'chemical',
            created_by: '789',
            creator_name: 'Alice Johnson',
            document_url: 'https://example.com/procedures/oil_analysis_draft_v3.pdf',
            created_at: '2025-04-10T09:00:00Z',
            updated_at: '2025-04-10T09:00:00Z'
          }
        ];
        
        setProcedures(mockProcedures);
        setError(null);
      } catch (err) {
        console.error("Exception fetching procedures:", err);
        setError("An unexpected error occurred while loading procedures.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProcedures();
  }, []);

  // Filter procedures based on search term and filters
  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch = 
      searchTerm === '' || 
      procedure.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === null || procedure.status === statusFilter;
    const matchesCategory = categoryFilter === null || procedure.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Mock function to handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      // In a real implementation, we would upload the file to storage and get a URL
      // For now, we'll just set a mock URL
      setForm(prev => ({ 
        ...prev, 
        document_url: `https://example.com/procedures/${file.name}` 
      }));
    }
  };

  // Mock function to handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real implementation, we would save the procedure to the database
    // For now, we'll just add it to the local state
    if (editingProcedureId) {
      // Update existing procedure
      const updatedProcedures = procedures.map(proc => 
        proc.id === editingProcedureId ? { ...proc, ...form, updated_at: new Date().toISOString() } : proc
      );
      setProcedures(updatedProcedures);
    } else {
      // Create new procedure
      const newProcedure: Procedure = {
        id: `${procedures.length + 1}`,
        title: form.title || 'Untitled Procedure',
        version: form.version || '1.0',
        status: form.status as 'draft' | 'under-review' | 'approved' | 'deprecated',
        description: form.description,
        category: form.category,
        created_by: user?.id,
        creator_name: user?.user_metadata?.name,
        document_url: form.document_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProcedures([...procedures, newProcedure]);
    }
    
    // Reset form
    setForm(defaultFormState);
    setSelectedFile(null);
    setEditingProcedureId(null);
    setShowForm(false);
  };

  // Handle editing a procedure
  const handleEdit = (procedure: Procedure) => {
    setEditingProcedureId(procedure.id);
    setForm({
      title: procedure.title,
      version: procedure.version,
      status: procedure.status,
      description: procedure.description,
      category: procedure.category,
      document_url: procedure.document_url
    });
    setShowForm(true);
  };

  // Handle deleting a procedure
  const handleDelete = (id: string) => {
    // In a real implementation, we would delete the procedure from the database
    // For now, we'll just remove it from the local state
    setProcedures(procedures.filter(proc => proc.id !== id));
  };

  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    switch (status) {
      case 'approved': return 'secondary';
      case 'under-review': return 'default';
      case 'draft': return 'outline';
      case 'deprecated': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Testing Procedures Documentation</h2>
        <Button onClick={() => {
          setEditingProcedureId(null);
          setForm(defaultFormState);
          setSelectedFile(null);
          setShowForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Procedure
        </Button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search procedures..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories</option>
            {procedureCategories.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter(null);
              setCategoryFilter(null);
            }}
          >
            Clear
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <p>Loading procedures...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcedures.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p>No procedures found. Add your first procedure to get started.</p>
            </div>
          ) : (
            filteredProcedures.map(procedure => (
              <Card key={procedure.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{procedure.title}</CardTitle>
                    <Badge variant={getStatusVariant(procedure.status)}>
                      {procedure.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Version: {procedure.version}</span>
                    <span>{procedure.category}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm line-clamp-2">{procedure.description}</p>
                    
                    <div className="text-xs text-gray-500">
                      <div>Created by: {procedure.creator_name}</div>
                      {procedure.approver_name && (
                        <div>Approved by: {procedure.approver_name}</div>
                      )}
                      <div>Last updated: {new Date(procedure.updated_at).toLocaleDateString()}</div>
                    </div>
                    
                    <div className="pt-2 flex justify-end space-x-2">
                      {procedure.document_url && (
                        <Button size="sm" variant="outline">
                          <a href={procedure.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(procedure)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(procedure.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Form for adding/editing procedures */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">
                {editingProcedureId ? 'Edit Procedure' : 'Add New Procedure'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    value={form.title || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="version" className="block text-sm font-medium mb-1">
                      Version
                    </label>
                    <Input
                      id="version"
                      name="version"
                      value={form.version || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={form.status || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={form.category || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
                  >
                    {procedureCategories.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="document" className="block text-sm font-medium mb-1">
                    Document
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="flex-grow"
                      onChange={handleFileChange}
                    />
                    {selectedFile && (
                      <Badge variant="outline">{selectedFile.name}</Badge>
                    )}
                  </div>
                  {form.document_url && !selectedFile && (
                    <div className="mt-2 text-sm">
                      <a 
                        href={form.document_url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Current document
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProcedureId ? 'Update' : 'Save'} Procedure
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 