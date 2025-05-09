import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  FolderPlus, 
  Search, 
  Filter, 
  Plus,
  File,
  Folder,
  MoreVertical,
  Tag,
  Download,
  Trash2,
  Edit,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { toast } from 'react-hot-toast';

// Types
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  uploadedBy: string;
  folder: string;
  tags: string[];
  version: number;
}

interface Folder {
  id: string;
  name: string;
  createdDate: string;
  parentFolder: string | null;
  documentCount: number;
}

const DocumentManagement: React.FC = () => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data initialization
  useEffect(() => {
    const mockFolders: Folder[] = [
      { id: '1', name: 'Company Policies', createdDate: '2023-01-15', parentFolder: null, documentCount: 12 },
      { id: '2', name: 'Contracts', createdDate: '2023-02-20', parentFolder: null, documentCount: 24 },
      { id: '3', name: 'HR Documents', createdDate: '2023-03-10', parentFolder: null, documentCount: 18 },
      { id: '4', name: 'Marketing Materials', createdDate: '2023-04-05', parentFolder: null, documentCount: 7 },
      { id: '5', name: 'Project Plans', createdDate: '2023-05-12', parentFolder: null, documentCount: 15 },
    ];

    const mockDocuments: Document[] = [
      { id: '1', name: 'Employee Handbook.pdf', type: 'PDF', size: '2.4 MB', uploadDate: '2023-06-10', uploadedBy: 'John Smith', folder: '1', tags: ['HR', 'Policy'], version: 1 },
      { id: '2', name: 'Vendor Agreement.docx', type: 'DOCX', size: '1.2 MB', uploadDate: '2023-06-12', uploadedBy: 'Sarah Johnson', folder: '2', tags: ['Legal', 'Vendor'], version: 3 },
      { id: '3', name: 'Marketing Plan Q3.pptx', type: 'PPTX', size: '4.7 MB', uploadDate: '2023-06-15', uploadedBy: 'Mike Brown', folder: '4', tags: ['Marketing', 'Strategy'], version: 2 },
      { id: '4', name: 'Budget 2023.xlsx', type: 'XLSX', size: '1.8 MB', uploadDate: '2023-06-18', uploadedBy: 'Lisa Chen', folder: '5', tags: ['Finance', 'Budget'], version: 5 },
      { id: '5', name: 'Office Lease.pdf', type: 'PDF', size: '3.1 MB', uploadDate: '2023-06-20', uploadedBy: 'David Wilson', folder: '2', tags: ['Legal', 'Property'], version: 1 },
      { id: '6', name: 'Product Roadmap.pdf', type: 'PDF', size: '2.8 MB', uploadDate: '2023-06-22', uploadedBy: 'Emily Davis', folder: '5', tags: ['Product', 'Strategy'], version: 4 },
      { id: '7', name: 'Company Logo.png', type: 'PNG', size: '0.5 MB', uploadDate: '2023-06-25', uploadedBy: 'Alex Turner', folder: '4', tags: ['Design', 'Branding'], version: 2 },
      { id: '8', name: 'Travel Policy.pdf', type: 'PDF', size: '1.5 MB', uploadDate: '2023-06-28', uploadedBy: 'John Smith', folder: '1', tags: ['HR', 'Policy', 'Travel'], version: 1 },
    ];

    setFolders(mockFolders);
    setDocuments(mockDocuments);
  }, []);

  // Filter documents based on search, folder, and document type
  const filteredDocuments = documents.filter((doc) => {
    // Filter by search query
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by folder
    const matchesFolder = selectedFolder ? doc.folder === selectedFolder : true;
    
    // Filter by document type
    const matchesType = filterDocType === 'all' ? true : doc.type.toLowerCase() === filterDocType.toLowerCase();
    
    // Filter by tab
    const matchesTab = activeTab === 'all' ? true : (
      activeTab === 'recent' ? new Date(doc.uploadDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false
    );
    
    return matchesSearch && matchesFolder && matchesType && matchesTab;
  });

  // Handle file drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file selection from input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Process selected files
  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files);
    setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
    setIsUploadModalOpen(true);
  };

  // Trigger file input click
  const handleSelectFilesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Upload files
  const handleUpload = () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Simulate file upload
    const newDocs = uploadedFiles.map((file, index) => {
      const fileType = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      
      return {
        id: (documents.length + index + 1).toString(),
        name: file.name,
        type: fileType,
        size: `${fileSizeMB} MB`,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Current User',
        folder: selectedFolder || '1', // Default to first folder if none selected
        tags: [],
        version: 1
      };
    });

    setDocuments([...documents, ...newDocs]);
    setUploadedFiles([]);
    setIsUploadModalOpen(false);
    toast.success(`${newDocs.length} file(s) uploaded successfully`);
  };

  // Create new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    const newFolder: Folder = {
      id: (folders.length + 1).toString(),
      name: newFolderName,
      createdDate: new Date().toISOString().split('T')[0],
      parentFolder: null,
      documentCount: 0
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
    toast.success('Folder created successfully');
  };

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="h-6 w-6 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <FileText className="h-6 w-6 text-orange-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileText className="h-6 w-6 text-purple-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search documents..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <SelectRoot value={filterDocType} onValueChange={setFilterDocType}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter size={16} />
                <SelectValue placeholder="File Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">Word</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="pptx">PowerPoint</SelectItem>
              <SelectItem value="png">Images</SelectItem>
            </SelectContent>
          </SelectRoot>
          
          <Button onClick={handleSelectFilesClick}>
            <Upload size={16} className="mr-2" />
            Upload
          </Button>
          
          <Button variant="outline" onClick={() => setIsNewFolderModalOpen(true)}>
            <FolderPlus size={16} className="mr-2" />
            New Folder
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Folders sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Folders</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li 
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between ${selectedFolder === null ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                  onClick={() => setSelectedFolder(null)}
                >
                  <div className="flex items-center">
                    <Folder className="h-5 w-5 mr-2 text-blue-500" />
                    <span>All Folders</span>
                  </div>
                </li>
                {folders.map((folder) => (
                  <li 
                    key={folder.id} 
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between ${selectedFolder === folder.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center">
                      <Folder className="h-5 w-5 mr-2 text-blue-500" />
                      <span>{folder.name}</span>
                    </div>
                    <Badge variant="outline">{folder.documentCount}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        
        {/* Documents main area */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <CardTitle>
                  {selectedFolder 
                    ? `${folders.find(f => f.id === selectedFolder)?.name} Documents` 
                    : 'All Documents'}
                </CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 sm:mt-0">
                  <TabsList className="grid grid-cols-2 w-[200px]">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* Drag and drop area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  Drag and drop files here or{' '}
                  <button 
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    onClick={handleSelectFilesClick}
                  >
                    browse
                  </button>
                </p>
              </div>
              
              {/* Documents list */}
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">No documents found</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-800">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        {getFileIcon(doc.type)}
                        <div className="ml-3">
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <span className="mr-3">{doc.size}</span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              {doc.uploadDate}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Download size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload documents to your document management system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selected Files</Label>
                <ScrollArea className="h-40 border rounded-md p-2">
                  <ul className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getFileIcon(file.name.split('.').pop() || '')}
                          <span className="ml-2">{file.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="folder">Destination Folder</Label>
                <SelectRoot defaultValue={selectedFolder || "1"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <Input 
                  id="tags" 
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              Upload {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Modal */}
      <Dialog open={isNewFolderModalOpen} onOpenChange={setIsNewFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input 
                id="folderName" 
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManagement; 