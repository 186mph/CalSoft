import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/ui/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge, Button, Input, Select, Textarea, toast } from '@/components/ui';
import { Plus, PencilRuler, Book, FileCode, FileSymlink, Upload } from 'lucide-react';
import { DesignApprovalWorkflow, DesignStatus } from '@/components/engineering/DesignApprovalWorkflow';
import { TechnicalDocumentationLibrary } from '@/components/engineering/TechnicalDocumentationLibrary';
import { useDivision } from '@/App';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import engineeringService from '@/lib/services/engineeringService';

export default function EngineeringPage() {
  const { user } = useAuth();
  const { setDivision } = useDivision();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('designs');
  const [createDesignOpen, setCreateDesignOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Create design form state
  const [designForm, setDesignForm] = useState({
    title: '',
    description: '',
    design_type: '',
    project: '',
    version: '1.0',
    file_url: ''
  });
  const [designTypes, setDesignTypes] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Set the division context to engineering
    setDivision('engineering');
    
    // Get tab from URL if present
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    // Fetch form options
    fetchFormOptions();
  }, [setDivision, searchParams]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  
  const fetchFormOptions = async () => {
    const typesResponse = await engineeringService.getDesignTypes();
    if (typesResponse.data) {
      setDesignTypes(typesResponse.data);
    }

    const projectsResponse = await engineeringService.getProjects();
    if (projectsResponse.data) {
      setProjects(projectsResponse.data);
    }
  };
  
  const handleFormChange = (key: string, value: string) => {
    setDesignForm(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleCreateDesign = async () => {
    if (!user) return;
    
    if (!designForm.title || !designForm.design_type || !designForm.project) {
      toast({
        title: 'Validation Error',
        description: 'Title, design type, and project are required fields',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const designData = {
      ...designForm,
      status: 'draft' as DesignStatus,
      submitted_by_id: user.id,
      created_at: new Date().toISOString()
    };
    
    const response = await engineeringService.createDesign(designData);
    
    setIsSubmitting(false);
    
    if (response.error) {
      toast({
        title: 'Error',
        description: response.error ? String(response.error) : 'Failed to create design',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: 'Design created successfully',
      variant: 'success',
    });
    
    setCreateDesignOpen(false);
    // Reset form
    setDesignForm({
      title: '',
      description: '',
      design_type: '',
      project: '',
      version: '1.0',
      file_url: ''
    });
    
    // If we're on the designs tab, update the refresh trigger
    // This will trigger a re-fetch in the DesignApprovalWorkflow component
    setRefreshTrigger(prev => prev + 1);
  };

  // Placeholder components for tabs that are not yet implemented
  const StandardsComplianceUpdates = () => (
    <div className="p-8 text-center">
      <h3 className="text-xl font-medium mb-4">Standards & Compliance Updates</h3>
      <p className="text-muted-foreground">This feature will be implemented soon.</p>
    </div>
  );

  const DrawingRepository = () => (
    <div className="p-8 text-center">
      <h3 className="text-xl font-medium mb-4">Drawing Repository</h3>
      <p className="text-muted-foreground">This feature will be implemented soon.</p>
    </div>
  );

  return (
    <PageLayout
      title="Engineering Portal"
      subtitle="Design management, technical documentation, and standards compliance"
      actions={
        <div className="flex items-center gap-2">
          {activeTab === 'designs' && (
            <Button onClick={() => setCreateDesignOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Design
            </Button>
          )}
          {activeTab === 'documentation' && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
          <Badge className="!bg-[#f26722] !text-white">Engineering</Badge>
        </div>
      }
    >
      <Tabs 
        defaultValue="designs" 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="designs" className="flex items-center gap-2">
            <PencilRuler className="h-4 w-4" />
            <span>Design Approval</span>
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span>Technical Documentation</span>
          </TabsTrigger>
          <TabsTrigger value="standards" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            <span>Standards & Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="drawings" className="flex items-center gap-2">
            <FileSymlink className="h-4 w-4" />
            <span>Drawing Repository</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="space-y-6">
          <DesignApprovalWorkflow refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <TechnicalDocumentationLibrary />
        </TabsContent>

        <TabsContent value="standards" className="space-y-6">
          <StandardsComplianceUpdates />
        </TabsContent>

        <TabsContent value="drawings" className="space-y-6">
          <DrawingRepository />
        </TabsContent>
      </Tabs>

      {/* Create Design Dialog */}
      <Dialog open={createDesignOpen} onOpenChange={setCreateDesignOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Design</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              label="Title"
              placeholder="Enter design title"
              value={designForm.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="Enter design description"
              value={designForm.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Design Type"
                value={designForm.design_type}
                onChange={(e) => handleFormChange('design_type', e.target.value)}
                options={[
                  { value: '', label: 'Select Design Type' },
                  ...designTypes.map(type => ({ value: type, label: type }))
                ]}
                required
              />
              
              <Select
                label="Project"
                value={designForm.project}
                onChange={(e) => handleFormChange('project', e.target.value)}
                options={[
                  { value: '', label: 'Select Project' },
                  ...projects.map(project => ({ value: project, label: project }))
                ]}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Version"
                placeholder="1.0"
                value={designForm.version}
                onChange={(e) => handleFormChange('version', e.target.value)}
              />
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Attachment
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-gray-300 dark:border-gray-600">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={() => console.log('File upload not implemented')}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, CAD, or image files up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDesignOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDesign}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Design'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
} 