import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Label } from '@/components/ui/Label';
import { Plus, Search, FileText, Users, CheckCircle, Clock, Download, Filter, RefreshCw, AlertCircle, File, Eye, Edit, Trash2, ExternalLink, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';

// Types
interface Policy {
  id: string;
  title: string;
  description: string;
  department: string;
  category: string;
  effectiveDate: string;
  revisionDate: string;
  status: 'active' | 'archived' | 'draft' | 'pending-approval';
  fileUrl: string;
  version: string;
  acknowledgmentRequired: boolean;
  acknowledgmentStats: {
    total: number;
    acknowledged: number;
    pending: number;
  };
}

interface PolicyAcknowledgment {
  id: string;
  policyId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  acknowledgedDate: string | null;
  status: 'acknowledged' | 'pending' | 'exempt';
}

const PolicyManagement: React.FC = () => {
  // State for managing policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [acknowledgments, setAcknowledgments] = useState<PolicyAcknowledgment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Mock data
  const mockPolicies: Policy[] = [
    {
      id: '1',
      title: 'Employee Code of Conduct',
      description: 'Guidelines for professional behavior and ethical standards for all employees.',
      department: 'All',
      category: 'HR',
      effectiveDate: '2023-01-15',
      revisionDate: '2023-01-15',
      status: 'active',
      fileUrl: '/policies/code-of-conduct.pdf',
      version: '1.0',
      acknowledgmentRequired: true,
      acknowledgmentStats: {
        total: 128,
        acknowledged: 120,
        pending: 8
      }
    },
    {
      id: '2',
      title: 'Remote Work Policy',
      description: 'Procedures and guidelines for employees working remotely.',
      department: 'All',
      category: 'Operations',
      effectiveDate: '2023-03-10',
      revisionDate: '2023-03-10',
      status: 'active',
      fileUrl: '/policies/remote-work.pdf',
      version: '1.0',
      acknowledgmentRequired: true,
      acknowledgmentStats: {
        total: 128,
        acknowledged: 115,
        pending: 13
      }
    },
    {
      id: '3',
      title: 'Data Privacy and Security',
      description: 'Guidelines for handling sensitive customer and company data.',
      department: 'IT',
      category: 'Security',
      effectiveDate: '2022-11-05',
      revisionDate: '2023-05-20',
      status: 'active',
      fileUrl: '/policies/data-privacy.pdf',
      version: '2.1',
      acknowledgmentRequired: true,
      acknowledgmentStats: {
        total: 45,
        acknowledged: 43,
        pending: 2
      }
    },
    {
      id: '4',
      title: 'Travel and Expense Policy',
      description: 'Guidelines for business travel and reimbursable expenses.',
      department: 'Finance',
      category: 'Finance',
      effectiveDate: '2022-09-15',
      revisionDate: '2022-09-15',
      status: 'active',
      fileUrl: '/policies/travel-expense.pdf',
      version: '1.2',
      acknowledgmentRequired: false,
      acknowledgmentStats: {
        total: 0,
        acknowledged: 0,
        pending: 0
      }
    },
    {
      id: '5',
      title: 'Health and Safety Guidelines',
      description: 'Workplace safety procedures and emergency protocols.',
      department: 'All',
      category: 'Safety',
      effectiveDate: '2022-08-01',
      revisionDate: '2023-02-15',
      status: 'active',
      fileUrl: '/policies/health-safety.pdf',
      version: '2.0',
      acknowledgmentRequired: true,
      acknowledgmentStats: {
        total: 128,
        acknowledged: 125,
        pending: 3
      }
    },
    {
      id: '6',
      title: 'Anti-Harassment Policy - Draft',
      description: 'Updated guidelines for preventing and addressing workplace harassment.',
      department: 'All',
      category: 'HR',
      effectiveDate: '',
      revisionDate: '2023-06-01',
      status: 'draft',
      fileUrl: '/policies/anti-harassment-draft.pdf',
      version: '3.0-draft',
      acknowledgmentRequired: true,
      acknowledgmentStats: {
        total: 0,
        acknowledged: 0,
        pending: 0
      }
    }
  ];

  const mockAcknowledgments: PolicyAcknowledgment[] = [
    {
      id: 'a1',
      policyId: '1',
      employeeId: '1',
      employeeName: 'John Doe',
      department: 'Engineering',
      acknowledgedDate: '2023-01-20',
      status: 'acknowledged'
    },
    {
      id: 'a2',
      policyId: '1',
      employeeId: '2',
      employeeName: 'Jane Smith',
      department: 'Sales',
      acknowledgedDate: '2023-01-22',
      status: 'acknowledged'
    },
    {
      id: 'a3',
      policyId: '1',
      employeeId: '3',
      employeeName: 'Robert Johnson',
      department: 'Marketing',
      acknowledgedDate: null,
      status: 'pending'
    },
    {
      id: 'a4',
      policyId: '2',
      employeeId: '1',
      employeeName: 'John Doe',
      department: 'Engineering',
      acknowledgedDate: '2023-03-15',
      status: 'acknowledged'
    },
    {
      id: 'a5',
      policyId: '2',
      employeeId: '2',
      employeeName: 'Jane Smith',
      department: 'Sales',
      acknowledgedDate: null,
      status: 'pending'
    }
  ];

  // Load mock data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPolicies(mockPolicies);
      setFilteredPolicies(mockPolicies.filter(p => p.status === 'active'));
      setAcknowledgments(mockAcknowledgments);
      setLoading(false);
    }, 800);
  }, []);

  // Filter policies based on search query, filters, and tab
  useEffect(() => {
    let results = policies;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(policy => 
        policy.title.toLowerCase().includes(query) ||
        policy.description.toLowerCase().includes(query) ||
        policy.department.toLowerCase().includes(query) ||
        policy.category.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(policy => policy.status === filterStatus);
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      results = results.filter(policy => policy.category === filterCategory);
    }
    
    // Apply department filter
    if (filterDepartment !== 'all') {
      results = results.filter(policy => 
        policy.department === filterDepartment || policy.department === 'All'
      );
    }
    
    // Apply tab filter
    if (activeTab === 'active') {
      results = results.filter(policy => policy.status === 'active');
    } else if (activeTab === 'pending') {
      results = results.filter(policy => policy.status === 'pending-approval' || policy.status === 'draft');
    } else if (activeTab === 'archived') {
      results = results.filter(policy => policy.status === 'archived');
    }
    
    setFilteredPolicies(results);
  }, [searchQuery, filterStatus, filterCategory, filterDepartment, activeTab, policies]);

  // Get unique categories and departments for filters
  const categories = ['all', ...new Set(policies.map(policy => policy.category))];
  const departments = ['all', ...new Set(policies.map(policy => policy.department))];

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      case 'draft':
        return <Badge className="bg-amber-100 text-amber-800">Draft</Badge>;
      case 'pending-approval':
        return <Badge className="bg-blue-100 text-blue-800">Pending Approval</Badge>;
      case 'acknowledged':
        return <Badge className="bg-green-100 text-green-800">Acknowledged</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'exempt':
        return <Badge className="bg-gray-100 text-gray-800">Exempt</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Simple policy card component
  const PolicyCard = ({ policy }: { policy: Policy }) => (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <Badge className="bg-blue-100 text-blue-800">{policy.category}</Badge>
          <StatusBadge status={policy.status} />
        </div>
        
        <h3 className="font-medium mb-2">{policy.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{policy.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-500" />
            <span>Version: {policy.version}</span>
          </div>
          {policy.effectiveDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Effective: {new Date(policy.effectiveDate).toLocaleDateString()}</span>
            </div>
          )}
          {policy.acknowledgmentRequired && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span>Acknowledged: {policy.acknowledgmentStats.acknowledged}/{policy.acknowledgmentStats.total}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={() => {
              setSelectedPolicy(policy);
              setModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Send reminder action
  const handleSendReminders = (policyId: string) => {
    toast.success('Reminders sent to employees with pending acknowledgments');
  };

  // Delete policy action
  const handleDeletePolicy = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId));
    setSelectedPolicy(null);
    toast.success('Policy has been deleted');
  };

  // Get acknowledgments for selected policy
  const getPolicyAcknowledgments = (policyId: string) => {
    return acknowledgments.filter(ack => ack.policyId === policyId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Policy Management</CardTitle>
              <CardDescription>Manage company policies and track employee acknowledgments</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Active Policies</p>
                      <p className="text-2xl font-semibold">
                        {policies.filter(p => p.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pending Ack.</p>
                      <p className="text-2xl font-semibold">
                        {policies.reduce((acc, p) => acc + p.acknowledgmentStats.pending, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
                      <p className="text-2xl font-semibold">
                        {categories.filter(c => c !== 'all').length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                      <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Acknowledged</p>
                      <p className="text-2xl font-semibold">
                        {policies.reduce((acc, p) => acc + p.acknowledgmentStats.acknowledged, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-40">
                <SelectRoot value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.filter(c => c !== 'all').map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterCategory('all');
                setFilterDepartment('all');
              }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Draft/Pending
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Archived
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="h-[220px] animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex justify-between mb-3">
                        <div className="h-5 w-16 bg-gray-200 rounded"></div>
                        <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-full bg-gray-200 rounded mb-4"></div>
                      <div className="space-y-2 mb-4">
                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                        <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex justify-end">
                        <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No policies found</h3>
                <p className="text-gray-500">
                  {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || filterDepartment !== 'all' ? 
                    'Try adjusting your search or filters' : 
                    'Add your first policy to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPolicies.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredPolicies.length} of {policies.length} policies
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <AlertCircle className="h-4 w-4 mr-1" />
              Send All Reminders
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Modal for Policy Details */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {selectedPolicy && (
          <DialogContent className="sm:max-w-4xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedPolicy.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-100 text-blue-800">{selectedPolicy.category}</Badge>
                <StatusBadge status={selectedPolicy.status} />
              </div>
              <DialogDescription>{selectedPolicy.description}</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Policy Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500">Policy ID</Label>
                      <p>{selectedPolicy.id}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Version</Label>
                      <p>{selectedPolicy.version}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500">Department</Label>
                    <p>{selectedPolicy.department}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPolicy.effectiveDate && (
                      <div>
                        <Label className="text-gray-500">Effective Date</Label>
                        <p>{new Date(selectedPolicy.effectiveDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedPolicy.revisionDate && (
                      <div>
                        <Label className="text-gray-500">Last Revision</Label>
                        <p>{new Date(selectedPolicy.revisionDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      View Policy Document
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {selectedPolicy.status === 'active' && (
                      <>
                        <Button variant="outline" className="flex-1 justify-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" className="flex-1 justify-center text-red-500" onClick={() => {
                          handleDeletePolicy(selectedPolicy.id);
                          setModalOpen(false);
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    {selectedPolicy.status === 'draft' && (
                      <>
                        <Button variant="outline" className="flex-1 justify-center">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button className="flex-1 justify-center">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedPolicy.acknowledgmentRequired && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Acknowledgment Status</h3>
                    <Button size="sm" onClick={() => handleSendReminders(selectedPolicy.id)}>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Send Reminders
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-xl font-semibold">{selectedPolicy.acknowledgmentStats.total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Acknowledged</p>
                        <p className="text-xl font-semibold text-green-600">{selectedPolicy.acknowledgmentStats.acknowledged}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="text-xl font-semibold text-amber-600">{selectedPolicy.acknowledgmentStats.pending}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <div className="grid grid-cols-3 gap-4">
                        <p className="text-sm font-medium">Employee</p>
                        <p className="text-sm font-medium">Department</p>
                        <p className="text-sm font-medium">Status</p>
                      </div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="divide-y">
                        {getPolicyAcknowledgments(selectedPolicy.id).map(ack => (
                          <div key={ack.id} className="px-4 py-3">
                            <div className="grid grid-cols-3 gap-4">
                              <p className="text-sm">{ack.employeeName}</p>
                              <p className="text-sm">{ack.department}</p>
                              <div className="flex items-center justify-between">
                                <StatusBadge status={ack.status} />
                                {ack.acknowledgedDate && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(ack.acknowledgedDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default PolicyManagement; 