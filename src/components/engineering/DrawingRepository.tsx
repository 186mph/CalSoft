import React, { useState } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, Clock, Filter, Download, Upload, Plus, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PageLayout } from '@/components/ui/PageLayout';
import { ScrollArea } from '@/components/ui/ScrollArea';

// Mock data for drawings
const mockDrawings = [
  {
    id: 'DWG-2023-001',
    title: 'Pump Station Layout',
    project: 'Municipal Water Treatment',
    status: 'approved',
    date: '2023-10-15',
    author: 'John Engineer',
    revision: 'Rev. 2',
    description: 'Layout design for the main pump station including dimensions and equipment placement.'
  },
  {
    id: 'DWG-2023-002',
    title: 'Electrical Schematic',
    project: 'Municipal Water Treatment',
    status: 'in-review',
    date: '2023-10-18',
    author: 'Sarah Technician',
    revision: 'Rev. 1',
    description: 'Detailed electrical schematic for control panel including wiring diagrams.'
  },
  {
    id: 'DWG-2023-003',
    title: 'Foundation Details',
    project: 'Industrial Facility Expansion',
    status: 'pending',
    date: '2023-10-20',
    author: 'Mike Builder',
    revision: 'Rev. 1',
    description: 'Foundation structural details and reinforcement specifications.'
  },
  {
    id: 'DWG-2023-004',
    title: 'HVAC Ductwork',
    project: 'Office Building Renovation',
    status: 'approved',
    date: '2023-09-28',
    author: 'Lisa HVAC',
    revision: 'Rev. 3',
    description: 'Ductwork layout and ventilation system design for the second floor.'
  },
  {
    id: 'DWG-2023-005',
    title: 'Site Plan',
    project: 'Industrial Facility Expansion',
    status: 'approved',
    date: '2023-09-15',
    author: 'John Engineer',
    revision: 'Rev. 1',
    description: 'Overall site plan showing building footprint, access roads, and utilities.'
  }
];

// Mock data for projects
const mockProjects = [
  {
    id: 'PRJ-2023-001',
    name: 'Municipal Water Treatment',
    client: 'Cityville Water Authority',
    status: 'active',
    drawingsCount: 8,
    startDate: '2023-08-01',
    endDate: '2024-02-28'
  },
  {
    id: 'PRJ-2023-002',
    name: 'Industrial Facility Expansion',
    client: 'Acme Manufacturing',
    status: 'active',
    drawingsCount: 12,
    startDate: '2023-07-15',
    endDate: '2024-03-30'
  },
  {
    id: 'PRJ-2023-003',
    name: 'Office Building Renovation',
    client: 'TechCorp Inc.',
    status: 'completed',
    drawingsCount: 6,
    startDate: '2023-05-01',
    endDate: '2023-09-30'
  }
];

const DrawingRepository: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawing, setSelectedDrawing] = useState<typeof mockDrawings[0] | null>(null);
  const [activeTab, setActiveTab] = useState('drawings');
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [drawings, setDrawings] = useState(mockDrawings);
  const [projects, setProjects] = useState(mockProjects);
  
  // New drawing form state
  const [newDrawing, setNewDrawing] = useState({
    id: '',
    title: '',
    project: '',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    author: '',
    revision: 'Rev. 1',
    description: ''
  });
  
  // New project form state
  const [newProject, setNewProject] = useState({
    id: '',
    name: '',
    client: '',
    status: 'active',
    drawingsCount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  
  // Filter drawings based on search query
  const filteredDrawings = drawings.filter(drawing => 
    drawing.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drawing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drawing.project.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter projects based on search query
  const filteredProjects = projects.filter(project => 
    project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'in-review':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            In Review
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            {status}
          </Badge>
        );
    }
  };
  
  // Add new drawing
  const handleAddDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ID if not provided
    let drawingId = newDrawing.id;
    if (!drawingId) {
      const currentYear = new Date().getFullYear();
      const drawingCount = drawings.length + 1;
      drawingId = `DWG-${currentYear}-${String(drawingCount).padStart(3, '0')}`;
    }
    
    const drawingToAdd = {
      ...newDrawing,
      id: drawingId
    };
    
    setDrawings([...drawings, drawingToAdd]);
    
    // Reset form and close modal
    setNewDrawing({
      id: '',
      title: '',
      project: '',
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      author: '',
      revision: 'Rev. 1',
      description: ''
    });
    setShowDrawingModal(false);
  };
  
  // Add new project
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ID if not provided
    let projectId = newProject.id;
    if (!projectId) {
      const currentYear = new Date().getFullYear();
      const projectCount = projects.length + 1;
      projectId = `PRJ-${currentYear}-${String(projectCount).padStart(3, '0')}`;
    }
    
    const projectToAdd = {
      ...newProject,
      id: projectId
    };
    
    setProjects([...projects, projectToAdd]);
    
    // Reset form and close modal
    setNewProject({
      id: '',
      name: '',
      client: '',
      status: 'active',
      drawingsCount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
    setShowProjectModal(false);
  };

  return (
    <PageLayout
      title="Drawing Repository"
      subtitle="Manage and access engineering drawings and technical illustrations"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Drawings
          </Button>
          <Button 
            className="bg-[#f26722] hover:bg-[#f26722]/90"
            onClick={() => activeTab === "drawings" ? setShowDrawingModal(true) : setShowProjectModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === "drawings" ? "Drawing" : "Project"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and filter row */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drawings by name, number, or tag..."
              className="pl-9 w-full"
            />
          </div>
          <Button variant="outline" className="flex gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="drawings">Drawings</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="drawings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrawings.map(drawing => (
                <Card key={drawing.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                      onClick={() => setSelectedDrawing(drawing)}>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{drawing.title}</CardTitle>
                      <StatusBadge status={drawing.status} />
                    </div>
                    <CardDescription>
                      <div className="flex justify-between text-xs">
                        <span>{drawing.id}</span>
                        <span>{drawing.revision}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">Project: {drawing.project}</p>
                    <p className="text-sm truncate">{drawing.description}</p>
                  </CardContent>
                  <CardFooter className="text-xs text-gray-500">
                    <div className="flex justify-between w-full">
                      <span>By: {drawing.author}</span>
                      <span>Date: {drawing.date}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map(project => (
                <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge 
                        className={project.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex justify-between text-xs">
                        <span>{project.id}</span>
                        <span>Drawings: {project.drawingsCount}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">Client: {project.client}</p>
                    <p className="text-sm">
                      Timeline: {project.startDate} to {project.endDate}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {selectedDrawing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{selectedDrawing.title}</CardTitle>
                  <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedDrawing(null)}>
                    &times;
                  </Button>
                </div>
                <CardDescription>
                  <div className="flex justify-between">
                    <span>{selectedDrawing.id} - {selectedDrawing.revision}</span>
                    <StatusBadge status={selectedDrawing.status} />
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Project</h4>
                    <p>{selectedDrawing.project}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Author</h4>
                    <p>{selectedDrawing.author}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Date</h4>
                    <p>{selectedDrawing.date}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p>{selectedDrawing.description}</p>
                </div>
                <div className="bg-gray-100 dark:bg-dark-300 p-4 rounded-lg flex items-center justify-center h-64">
                  <div className="flex flex-col items-center text-gray-500">
                    <FileText className="w-12 h-12 mb-2" />
                    <p>Drawing preview would display here</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline">Download</Button>
                <Button>View Full Size</Button>
              </CardFooter>
            </Card>
          </div>
        )}
        
        {/* Add Drawing Modal */}
        {showDrawingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold">Add New Drawing</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowDrawingModal(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form onSubmit={handleAddDrawing} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    value={newDrawing.title} 
                    onChange={(e) => setNewDrawing({...newDrawing, title: e.target.value})}
                    placeholder="e.g. Pump Station Layout"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={newDrawing.project}
                    onChange={(e) => setNewDrawing({...newDrawing, project: e.target.value})}
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.name}>{project.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Drawing ID (optional)</label>
                    <Input 
                      value={newDrawing.id} 
                      onChange={(e) => setNewDrawing({...newDrawing, id: e.target.value})}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Revision</label>
                    <Input 
                      value={newDrawing.revision} 
                      onChange={(e) => setNewDrawing({...newDrawing, revision: e.target.value})}
                      placeholder="e.g. Rev. 1"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md"
                      value={newDrawing.status}
                      onChange={(e) => setNewDrawing({...newDrawing, status: e.target.value})}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="in-review">In Review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Author</label>
                    <Input 
                      value={newDrawing.author} 
                      onChange={(e) => setNewDrawing({...newDrawing, author: e.target.value})}
                      placeholder="e.g. John Engineer"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    type="date"
                    value={newDrawing.date} 
                    onChange={(e) => setNewDrawing({...newDrawing, date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={newDrawing.description} 
                    onChange={(e) => setNewDrawing({...newDrawing, description: e.target.value})}
                    placeholder="Brief description of the drawing"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Drawing (coming soon)</label>
                  <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-gray-500">
                    <Upload className="h-8 w-8 mb-2" />
                    <p className="text-sm">Drag & drop a file or click to browse</p>
                    <p className="text-xs mt-1">This feature will be available soon</p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowDrawingModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#f26722] hover:bg-[#f26722]/90">
                    Add Drawing
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Add Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold">Add New Project</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowProjectModal(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form onSubmit={handleAddProject} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input 
                    value={newProject.name} 
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    placeholder="e.g. Municipal Water Treatment"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client</label>
                  <Input 
                    value={newProject.client} 
                    onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                    placeholder="e.g. Cityville Water Authority"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project ID (optional)</label>
                    <Input 
                      value={newProject.id} 
                      onChange={(e) => setNewProject({...newProject, id: e.target.value})}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md"
                      value={newProject.status}
                      onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input 
                      type="date"
                      value={newProject.startDate} 
                      onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input 
                      type="date"
                      value={newProject.endDate} 
                      onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowProjectModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#f26722] hover:bg-[#f26722]/90">
                    Add Project
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DrawingRepository; 