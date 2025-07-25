import React, { useState } from 'react';
import { 
  FileCode, 
  AlertCircle, 
  Info, 
  CalendarDays, 
  Search,
  Filter,
  Download,
  Plus,
  X
} from 'lucide-react';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageLayout } from '@/components/ui/PageLayout';

// Dummy data for standards
const standardsData = [
  {
    id: 1,
    title: "IEEE 1584-2018",
    category: "Electrical Safety",
    lastUpdated: "2023-09-15",
    nextReview: "2024-09-15",
    status: "current",
    description: "Guide for Performing Arc-Flash Hazard Calculations",
    changeType: "minor",
  },
  {
    id: 2,
    title: "NFPA 70E-2021",
    category: "Electrical Safety",
    lastUpdated: "2023-10-01",
    nextReview: "2024-10-01",
    status: "current",
    description: "Standard for Electrical Safety in the Workplace",
    changeType: "none",
  },
  {
    id: 3,
    title: "ANSI C37.20.7-2017",
    category: "Equipment",
    lastUpdated: "2023-08-12",
    nextReview: "2024-08-12",
    status: "current",
    description: "Guide for Testing Metal-Enclosed Switchgear Rated up to 38kV for Internal Arcing Faults",
    changeType: "none",
  },
  {
    id: 4,
    title: "IEEE 519-2014",
    category: "Power Quality",
    lastUpdated: "2023-11-05",
    nextReview: "2024-11-05",
    status: "update-pending",
    description: "Recommended Practice and Requirements for Harmonic Control in Electric Power Systems",
    changeType: "major",
  },
  {
    id: 5,
    title: "NFPA 110-2022",
    category: "Emergency Power",
    lastUpdated: "2023-07-20",
    nextReview: "2024-07-20",
    status: "current",
    description: "Standard for Emergency and Standby Power Systems",
    changeType: "minor",
  },
  {
    id: 6,
    title: "IEEE 1547-2018",
    category: "Interconnection",
    lastUpdated: "2023-10-15",
    nextReview: "2024-04-15",
    status: "update-pending",
    description: "Standard for Interconnection and Interoperability of Distributed Energy Resources with Associated Electric Power Systems Interfaces",
    changeType: "major",
  },
  {
    id: 7,
    title: "NECA 1-2015",
    category: "Installation",
    lastUpdated: "2023-09-10",
    nextReview: "2024-09-10",
    status: "current",
    description: "Standard for Good Workmanship in Electrical Construction",
    changeType: "none",
  },
  {
    id: 8,
    title: "IEC 61850",
    category: "Communications",
    lastUpdated: "2023-11-01",
    nextReview: "2024-03-01",
    status: "update-pending",
    description: "Communication Networks and Systems for Power Utility Automation",
    changeType: "minor",
  }
];

// Dummy compliance data
const complianceData = [
  {
    id: 1,
    requirement: "Annual Arc Flash Analysis",
    dueDate: "2024-03-15",
    status: "on-track",
    assignee: "Engineering Team",
    notes: "Documentation being prepared"
  },
  {
    id: 2,
    requirement: "NFPA 70E Training",
    dueDate: "2024-02-01",
    status: "at-risk",
    assignee: "Safety Department",
    notes: "Need to schedule remaining personnel"
  },
  {
    id: 3,
    requirement: "Equipment Labeling Updates",
    dueDate: "2024-01-15",
    status: "completed",
    assignee: "Field Services",
    notes: "All equipment updated to current standards"
  },
  {
    id: 4,
    requirement: "Harmonic Analysis Documentation",
    dueDate: "2024-04-30",
    status: "on-track",
    assignee: "Power Quality Team",
    notes: "Measurements in progress"
  },
  {
    id: 5,
    requirement: "Emergency Power System Testing",
    dueDate: "2024-02-28",
    status: "on-track",
    assignee: "Testing Department",
    notes: "Schedule created for all facilities"
  }
];

export function StandardsComplianceUpdates() {
  const [activeTab, setActiveTab] = useState("standards");
  const [searchTerm, setSearchTerm] = useState("");
  const [showStandardModal, setShowStandardModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [standards, setStandards] = useState(standardsData);
  const [compliance, setCompliance] = useState(complianceData);
  
  // New standard form state
  const [newStandard, setNewStandard] = useState({
    title: "",
    category: "",
    description: "",
    status: "current",
    changeType: "none",
    lastUpdated: new Date().toISOString().split('T')[0],
    nextReview: ""
  });

  // New compliance form state
  const [newCompliance, setNewCompliance] = useState({
    requirement: "",
    dueDate: "",
    status: "on-track",
    assignee: "",
    notes: ""
  });
  
  // Filter standards based on search term
  const filteredStandards = standards.filter(standard => 
    standard.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    standard.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    standard.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Filter compliance items based on search term
  const filteredCompliance = compliance.filter(item => 
    item.requirement.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.assignee.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-500">Current</Badge>;
      case 'update-pending':
        return <Badge className="bg-amber-500">Update Pending</Badge>;
      case 'on-track':
        return <Badge className="bg-green-500">On Track</Badge>;
      case 'at-risk':
        return <Badge className="bg-amber-500">At Risk</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getChangeBadge = (changeType: string) => {
    switch (changeType) {
      case 'major':
        return <Badge className="bg-red-500">Major Change</Badge>;
      case 'minor':
        return <Badge className="bg-amber-500">Minor Change</Badge>;
      case 'none':
        return <Badge className="bg-gray-300 text-gray-700">No Change</Badge>;
      default:
        return null;
    }
  };

  // Add new standard
  const handleAddStandard = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add new standard with generated ID
    const newId = standards.length > 0 ? Math.max(...standards.map(s => s.id)) + 1 : 1;
    const standardToAdd = { 
      ...newStandard, 
      id: newId
    };
    
    setStandards([...standards, standardToAdd]);
    
    // Reset form and close modal
    setNewStandard({
      title: "",
      category: "",
      description: "",
      status: "current",
      changeType: "none",
      lastUpdated: new Date().toISOString().split('T')[0],
      nextReview: ""
    });
    setShowStandardModal(false);
  };

  // Add new compliance requirement
  const handleAddCompliance = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add new compliance with generated ID
    const newId = compliance.length > 0 ? Math.max(...compliance.map(c => c.id)) + 1 : 1;
    const complianceToAdd = { 
      ...newCompliance, 
      id: newId 
    };
    
    setCompliance([...compliance, complianceToAdd]);
    
    // Reset form and close modal
    setNewCompliance({
      requirement: "",
      dueDate: "",
      status: "on-track",
      assignee: "",
      notes: ""
    });
    setShowComplianceModal(false);
  };

  return (
    <PageLayout
      title="Standards & Compliance Updates"
      subtitle="Track and manage engineering standards and compliance requirements"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            className="bg-accent-color hover:bg-accent-color/90"
            onClick={() => activeTab === "standards" ? setShowStandardModal(true) : setShowComplianceModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === "standards" ? "Standard" : "Compliance"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search standards or compliance items..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        
        <Tabs defaultValue="standards" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full sm:w-[400px]">
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Requirements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standards" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Standards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{standards.length}</div>
                  <p className="text-xs text-gray-500">Tracked standards</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{standards.filter(s => s.status === 'update-pending').length}</div>
                  <p className="text-xs text-gray-500">Standards with upcoming changes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Major Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{standards.filter(s => s.changeType === 'major').length}</div>
                  <p className="text-xs text-gray-500">Standards with significant updates</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Standard</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStandards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No standards match your search criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStandards.map((standard) => (
                      <TableRow key={standard.id}>
                        <TableCell className="font-medium">
                          <div>{standard.title}</div>
                          <div className="text-xs text-gray-500">{standard.description}</div>
                        </TableCell>
                        <TableCell>{standard.category}</TableCell>
                        <TableCell>{standard.lastUpdated}</TableCell>
                        <TableCell>{getStatusBadge(standard.status)}</TableCell>
                        <TableCell>{getChangeBadge(standard.changeType)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="compliance" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{compliance.length}</div>
                  <p className="text-xs text-gray-500">Active requirements</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{compliance.filter(c => c.status === 'at-risk').length}</div>
                  <p className="text-xs text-gray-500">Items requiring attention</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{compliance.filter(c => c.status === 'completed').length}</div>
                  <p className="text-xs text-gray-500">Requirements satisfied</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompliance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No compliance items match your search criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompliance.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.requirement}</TableCell>
                        <TableCell>{item.dueDate}</TableCell>
                        <TableCell>{item.assignee}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.notes}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Standards updates section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Updates</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>IEEE 1547-2018 Amendment</CardTitle>
                    <CardDescription>Distributed Energy Resources Standard</CardDescription>
                  </div>
                  <Badge className="bg-amber-500">Update Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Amendment to include new requirements for grid support functions and interoperability. This update will affect multiple existing projects.</p>
                <div className="flex items-center mt-3 text-xs text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  <span>Expected release: April 15, 2024</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full">View Details</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>NFPA 70E-2021 Implementation</CardTitle>
                    <CardDescription>Electrical Safety in the Workplace</CardDescription>
                  </div>
                  <Badge className="bg-green-500">Current</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Updates to our internal safety procedures based on the most recent NFPA 70E standard. Includes revised arc flash calculation methods and PPE requirements.</p>
                <div className="flex items-center mt-3 text-xs text-gray-500">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  <span>Training sessions scheduled for Jan 15-20, 2024</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full">View Details</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Standard Modal */}
      {showStandardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Add New Standard</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowStandardModal(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleAddStandard} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  value={newStandard.title} 
                  onChange={(e) => setNewStandard({...newStandard, title: e.target.value})}
                  placeholder="e.g. IEEE 802.11ax-2021"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={newStandard.category} 
                  onChange={(e) => setNewStandard({...newStandard, category: e.target.value})}
                  placeholder="e.g. Communications, Electrical Safety, etc."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input 
                  value={newStandard.description} 
                  onChange={(e) => setNewStandard({...newStandard, description: e.target.value})}
                  placeholder="Brief description of the standard"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={newStandard.status}
                    onChange={(e) => setNewStandard({...newStandard, status: e.target.value})}
                    required
                  >
                    <option value="current">Current</option>
                    <option value="update-pending">Update Pending</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Type</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={newStandard.changeType}
                    onChange={(e) => setNewStandard({...newStandard, changeType: e.target.value})}
                    required
                  >
                    <option value="none">No Change</option>
                    <option value="minor">Minor Change</option>
                    <option value="major">Major Change</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Updated</label>
                  <Input 
                    type="date"
                    value={newStandard.lastUpdated} 
                    onChange={(e) => setNewStandard({...newStandard, lastUpdated: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Next Review</label>
                  <Input 
                    type="date"
                    value={newStandard.nextReview} 
                    onChange={(e) => setNewStandard({...newStandard, nextReview: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowStandardModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-accent-color hover:bg-accent-color/90">
                  Add Standard
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Compliance Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Add Compliance Requirement</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowComplianceModal(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleAddCompliance} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Requirement</label>
                <Input 
                  value={newCompliance.requirement} 
                  onChange={(e) => setNewCompliance({...newCompliance, requirement: e.target.value})}
                  placeholder="e.g. Annual Arc Flash Analysis"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input 
                  type="date"
                  value={newCompliance.dueDate} 
                  onChange={(e) => setNewCompliance({...newCompliance, dueDate: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Input 
                  value={newCompliance.assignee} 
                  onChange={(e) => setNewCompliance({...newCompliance, assignee: e.target.value})}
                  placeholder="e.g. Engineering Team, Safety Department"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={newCompliance.status}
                  onChange={(e) => setNewCompliance({...newCompliance, status: e.target.value})}
                  required
                >
                  <option value="on-track">On Track</option>
                  <option value="at-risk">At Risk</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={newCompliance.notes} 
                  onChange={(e) => setNewCompliance({...newCompliance, notes: e.target.value})}
                  placeholder="Additional details or context"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowComplianceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-accent-color hover:bg-accent-color/90">
                  Add Requirement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
} 