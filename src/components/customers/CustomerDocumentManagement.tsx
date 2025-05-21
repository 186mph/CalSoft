import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Form,
  ListGroup,
  Nav,
  Tab,
  Modal,
  Alert,
  Badge,
  Spinner,
  ProgressBar,
  InputGroup,
  Dropdown,
  OverlayTrigger,
  Tooltip,
  Breadcrumb
} from 'react-bootstrap';
import {
  FaPlus,
  FaFile,
  FaCloudUploadAlt,
  FaFolderPlus,
  FaFileAlt,
  FaDownload,
  FaEdit,
  FaFolder,
  FaTrash,
  FaEllipsisV,
  FaSearch,
  FaShare,
  FaTag,
  FaCloudDownloadAlt,
  FaListAlt,
  FaEye,
  FaPencilAlt,
  FaFilter,
  FaSync,
  FaImage,
  FaFilePdf,
  FaFileAlt as FaFileIcon
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  CustomerDocument,
  DocumentFolder,
  getCustomerDocuments,
  getDocumentFolders,
  createDocumentFolder,
  uploadCustomerDocument,
  deleteCustomerDocument,
  connectGoogleDrive,
  uploadToGoogleDrive,
  getDocumentCategories,
  updateCustomerDocument,
  getDocumentUrl,
  getGoogleDriveDocuments,
  syncGoogleDriveDocuments,
} from '../../services/customerService';
import { format } from 'date-fns';

// File type to icon mapping
const fileTypeIcons: Record<string, React.ReactElement> = {
  PDF: <FaFilePdf />,
  JPG: <FaImage />,
  JPEG: <FaImage />,
  PNG: <FaImage />,
  GIF: <FaImage />,
  DEFAULT: <FaFileIcon />,
};

interface CustomerDocumentManagementProps {
  customerId: string;
}

const CustomerDocumentManagement: React.FC<CustomerDocumentManagementProps> = ({ customerId }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState<CustomerDocument | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // New state variables for enhanced features
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentCategory, setDocumentCategory] = useState('');
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getDocumentCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      let docsData;
      
      if (showGoogleDrive) {
        docsData = await getGoogleDriveDocuments(customerId);
      } else {
        docsData = await getCustomerDocuments(customerId, {
          folderId: currentFolder,
          search: searchTerm || undefined,
          category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          type: selectedTypes.length > 0 ? selectedTypes : undefined
        });
      }

      setDocuments(docsData);
      
      // Extract unique tags and types for filters
      const tags = Array.from(new Set(docsData.flatMap(doc => doc.tags || []))) as string[];
      const types = Array.from(new Set(docsData.map(doc => doc.type))) as string[];
      
      setAllTags(tags);
      setAllTypes(types);
      
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, currentFolder, selectedCategories, selectedTags, selectedTypes, searchTerm, showGoogleDrive]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const foldersData = await getDocumentFolders(customerId);
      setFolders(foldersData);
      
      // Initial document load
      await loadDocuments();
      
    } catch (error) {
      console.error('Error loading document data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, loadDocuments]);

  useEffect(() => {
    if (customerId) {
      loadData();
      loadCategories();
    }
  }, [customerId, loadData, loadCategories]);

  useEffect(() => {
    if (customerId) {
      loadDocuments();
    }
  }, [customerId, loadDocuments]);

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadCustomerDocument(file, customerId, currentFolder, tags);
      }
      
      // Complete progress and reset
      setUploadProgress(100);
      setUploadModalOpen(false);
      setSelectedFiles(null);
      setTags([]);
      loadData(); // Refresh the document list
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsLoading(true);
    try {
      await createDocumentFolder({
        name: newFolderName,
        customer_id: customerId,
        parent_folder_id: currentFolder
      });
      
      setNewFolderModalOpen(false);
      setNewFolderName('');
      loadData(); // Refresh the folder list
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (document: CustomerDocument) => {
    if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
    setIsLoading(true);
    try {
        await deleteCustomerDocument(document.id);
        loadDocuments(); // Refresh the document list
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setIsLoading(false);
      }
    }
  };

  const handleGoogleDriveUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // First, ensure we're connected to Google Drive
      const isConnected = await connectGoogleDrive();
      
      if (!isConnected.success) {
        // Redirect to Google auth
        // Note: In a real application, this would initiate OAuth flow
        alert('Please connect to Google Drive first');
        return;
      }
      
      // Upload files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadToGoogleDrive(file, customerId, currentFolder === null ? undefined : currentFolder);
      }
      
      setUploadModalOpen(false);
      setSelectedFiles(null);
      setTags([]);
      
      // Switch to Google Drive view and refresh
      setShowGoogleDrive(true);
      loadDocuments();
      
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // New handler functions
  const handleEditDocument = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    try {
      await updateCustomerDocument(selectedFile.id, {
        description: documentDescription,
        category: documentCategory
      });
      
      // Close dialog and refresh documents
      setEditDialogOpen(false);
      loadDocuments();
      
    } catch (error) {
      console.error('Error updating document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditDialog = (document: CustomerDocument) => {
    setSelectedFile(document);
    setDocumentDescription(document.description || '');
    setDocumentCategory(document.category || '');
    setEditDialogOpen(true);
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDocumentCategory(event.target.value);
  };

  const handleViewDocument = async (document: CustomerDocument) => {
    try {
      setIsLoading(true);
      const url = await getDocumentUrl(document.id);
      
      // For preview-compatible files, show in dialog
      const fileExtension = document.name.split('.').pop()?.toLowerCase();
      const previewCompatible = ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(fileExtension || '');
      
      if (previewCompatible) {
        setPreviewUrl(url);
        setPreviewDialogOpen(true);
      } else {
        // For other files, download directly
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (document: CustomerDocument) => {
    setSelectedFile(document);
    setDetailsDialogOpen(true);
  };

  const handleFilterTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedTypes(value ? [value] : []);
  };

  const handleFilterTagChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedTags(value ? [value] : []);
  };

  const handleFilterCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedCategories(value ? [value] : []);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedTypes([]);
    setFilterDialogOpen(false);
    
    // If we're closing filters, load documents with cleared filters
    loadDocuments();
  };

  const handleSyncGoogleDrive = async () => {
    setSyncingDrive(true);
    setSyncMessage(null);
    
    try {
      // First, ensure we're connected to Google Drive
      const isConnected = await connectGoogleDrive();
      
      if (!isConnected.success) {
        // Redirect to Google auth
        // Note: In a real application, this would initiate OAuth flow
        setSyncMessage({
          type: 'error',
          text: 'Please connect to Google Drive first'
        });
        return;
      }
      
      // Perform sync
      const result = await syncGoogleDriveDocuments(customerId);
      
      setSyncMessage({
        type: 'success',
        text: `Successfully synced ${result.count} new document(s).`
      });
      
      // Refresh documents if we're in Google Drive view
      if (showGoogleDrive) {
      loadDocuments();
      }
      
    } catch (error) {
      console.error('Error syncing with Google Drive:', error);
      setSyncMessage({
        type: 'error',
        text: 'Failed to sync with Google Drive'
      });
    } finally {
      setSyncingDrive(false);
    }
  };

  const getFileTypeIcon = (type: string) => {
    return fileTypeIcons[type.toUpperCase()] || fileTypeIcons.DEFAULT;
  };

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: CustomerDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
  };

  const handleBackToParent = () => {
    // Find current folder to get its parent
    const currentFolderObj = folders.find(f => f.id === currentFolder);
    setCurrentFolder(currentFolderObj?.parent_folder_id || null);
  };

  const handleTabChange = (newValue: number) => {
    setSelectedTab(newValue);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFolder = currentFolder === null || doc.folder_id === currentFolder;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const filteredFolders = folders.filter(folder => {
    const matchesParent = folder.parent_folder_id === currentFolder;
    const matchesSearch = folder.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesParent && matchesSearch;
  });

  // UI rendering functions
  const renderFileList = () => {
    if (isLoading && documents.length === 0) {
  return (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <Alert variant="info" className="my-3">
          No documents found in this location.
        </Alert>
      );
    }

    return (
      <ListGroup>
        {documents.map((doc) => (
          <ListGroup.Item key={doc.id} className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div className="me-3 fs-4">
                {getFileTypeIcon(doc.type)}
              </div>
              <div>
                <div className="fw-bold">{doc.name}</div>
                <div className="text-muted small">
                  {new Date(doc.upload_date).toLocaleString()} · {(doc.size / 1024).toFixed(2)} KB
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-1">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`view-${doc.id}`}>View</Tooltip>}
              >
              <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="me-1"
                  onClick={() => handleViewDocument(doc)}
                >
                  <FaEye />
              </Button>
              </OverlayTrigger>
              
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`download-${doc.id}`}>Download</Tooltip>}
              >
              <Button 
                  variant="outline-success" 
                  size="sm" 
                  className="me-1"
                  onClick={() => handleViewDocument(doc)}
                >
                  <FaDownload />
              </Button>
              </OverlayTrigger>
              
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`details-${doc.id}`}>Details</Tooltip>}
              >
              <Button 
                  variant="outline-info" 
                  size="sm" 
                  className="me-1"
                  onClick={() => handleViewDetails(doc)}
                >
                  <FaListAlt />
              </Button>
              </OverlayTrigger>
              
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`edit-${doc.id}`}>Edit</Tooltip>}
              >
            <Button
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-1"
                  onClick={() => handleOpenEditDialog(doc)}
                >
                  <FaPencilAlt />
            </Button>
              </OverlayTrigger>
              
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`delete-${doc.id}`}>Delete</Tooltip>}
              >
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => handleDeleteDocument(doc)}
                >
                  <FaTrash />
                </Button>
              </OverlayTrigger>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  const renderFolderNavigation = () => {
    const currentFolderObj = folders.find(f => f.id === currentFolder);
    const subFolders = folders.filter(f => f.parent_folder_id === currentFolder);
    
    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Breadcrumb>
            <Breadcrumb.Item 
              active={currentFolder === null}
              onClick={() => setCurrentFolder(null)}
              style={{ cursor: 'pointer' }}
            >
              Root
            </Breadcrumb.Item>
            
            {currentFolderObj && (
              <Breadcrumb.Item active>
                {currentFolderObj.name}
              </Breadcrumb.Item>
            )}
          </Breadcrumb>
          
          {currentFolder !== null && (
              <Button 
              variant="outline-secondary" 
              size="sm"
                onClick={handleBackToParent}
              >
              Back to Parent
              </Button>
            )}
        </div>
        
        {subFolders.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            {subFolders.map(folder => (
              <Card 
                key={folder.id} 
                style={{ width: '150px', cursor: 'pointer' }}
                onClick={() => handleFolderClick(folder.id)}
                className="text-center"
              >
                <Card.Body className="p-2">
                  <div className="fs-1 mb-2">
                    <FaFolder className="text-warning" />
                  </div>
                  <div className="small fw-bold text-truncate">
                    {folder.name}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Static dummy data for presentation
  const lastUpdated = new Date('2023-04-15');

  return (
    <div className="p-6">
      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">All Documents</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">24</div>
            <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 4</div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Last 30 days</div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Contracts</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">6</div>
            <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 1</div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Active contracts</div>
        </div>
              
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Invoices</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">8</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 ml-2 mb-1">▼ 2</div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Last quarter</div>
        </div>
              
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Storage Used</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">45.2MB</div>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: "15%" }}></div>
          </div>
        </div>
      </div>
      
      {/* Recent Documents */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Documents</h3>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center">
                {getFileTypeIcon('pdf')}
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Q1 Service Agreement.pdf</h4>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300 mr-2">Contract</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">2.4 MB</span>
            </div>
          </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded by: John Smith • Apr 12, 2023</p>
                    <div className="flex space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Download</button>
                      <button className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center">
                {getFileTypeIcon('pdf')}
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Invoice #INV-2023-045.pdf</h4>
                    <div className="flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 mr-2">Invoice</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">1.2 MB</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded by: Jane Doe • Apr 8, 2023</p>
                    <div className="flex space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Download</button>
                      <button className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center">
                {getFileTypeIcon('doc')}
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Project Requirements.docx</h4>
                    <div className="flex items-center">
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300 mr-2">Specification</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">856 KB</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded by: Michael Brown • Apr 5, 2023</p>
                    <div className="flex space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Download</button>
                      <button className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center">
                {getFileTypeIcon('img')}
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Site Photos.zip</h4>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300 mr-2">Photos</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">15.8 MB</span>
              </div>
            </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded by: Sarah Johnson • Mar 28, 2023</p>
                    <div className="flex space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Download</button>
                      <button className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout for Folders and Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Folders */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Document Folders</h3>
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Contracts</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">6 files</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last modified: Apr 12, 2023</p>
                  </div>
                </div>
              </div>
            
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Invoices</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">8 files</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last modified: Apr 8, 2023</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Project Files</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">5 files</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last modified: Apr 5, 2023</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
              </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Media</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">5 files</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last modified: Mar 28, 2023</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        {/* Recent Activity */}
            <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">John Smith</span> uploaded <span className="font-medium">Q1 Service Agreement.pdf</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Apr 12, 2023 at 10:45 AM</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Jane Doe</span> viewed <span className="font-medium">Invoice #INV-2023-045.pdf</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Apr 10, 2023 at 3:22 PM</span>
                </div>
            </div>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Michael Brown</span> downloaded <span className="font-medium">Project Requirements.docx</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Apr 7, 2023 at 9:15 AM</span>
                </div>
              </div>
            </div>
              
            <div className="p-4">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">Sarah Johnson</span> deleted <span className="font-medium">Old Contract Draft.docx</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Apr 5, 2023 at 2:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upload Button */}
      <div className="mt-8 flex justify-end">
        <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#f26722] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#f26722]/90 focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:ring-offset-2">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload New Document
        </button>
      </div>
      
      {/* Last updated info */}
      <div className="mt-4 text-right text-xs text-gray-500 dark:text-gray-400">
        Last updated: {format(lastUpdated, 'MMM d, yyyy')}
            </div>
    </div>
  );
};

export default CustomerDocumentManagement; 