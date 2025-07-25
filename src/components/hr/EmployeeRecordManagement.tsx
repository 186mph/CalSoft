import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Plus, Search, Edit, Trash2, Eye, FileText, Download, Upload, Filter, RefreshCw, User, Calendar, AtSign, Phone, MapPin, Building, Briefcase, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/Tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/Dialog';

// Types for our employee data
interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  dateUploaded: string;
  size: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'active' | 'onLeave' | 'terminated' | 'contractor';
  hireDate: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContact: string;
  emergencyPhone: string;
  documents: EmployeeDocument[];
}

const EmployeeRecordManagement: React.FC = () => {
  // States for handling employee data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    status: 'active',
    hireDate: new Date().toISOString().split('T')[0],
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
    documents: []
  });

  // Mock data
  const mockEmployees: Employee[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      department: 'Engineering',
      position: 'Senior Engineer',
      status: 'active',
      hireDate: '2020-03-15',
      address: '123 Main Street',
      city: 'Cityville',
      state: 'ST',
      zipCode: '12345',
      emergencyContact: 'Jane Doe',
      emergencyPhone: '(555) 987-6543',
      documents: [
        { id: 'd1', name: 'Employment Contract', type: 'PDF', dateUploaded: '2020-03-15', size: '1.2MB' },
        { id: 'd2', name: 'Tax Form W-4', type: 'PDF', dateUploaded: '2020-03-15', size: '892KB' }
      ]
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '(555) 234-5678',
      department: 'Sales',
      position: 'Sales Manager',
      status: 'active',
      hireDate: '2019-07-22',
      address: '456 Elm Street',
      city: 'Townsville',
      state: 'ST',
      zipCode: '23456',
      emergencyContact: 'John Smith',
      emergencyPhone: '(555) 876-5432',
      documents: [
        { id: 'd3', name: 'Employment Contract', type: 'PDF', dateUploaded: '2019-07-22', size: '1.1MB' }
      ]
    },
    {
      id: '3',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.johnson@example.com',
      phone: '(555) 345-6789',
      department: 'Marketing',
      position: 'Marketing Specialist',
      status: 'onLeave',
      hireDate: '2021-01-10',
      address: '789 Oak Street',
      city: 'Villageville',
      state: 'ST',
      zipCode: '34567',
      emergencyContact: 'Mary Johnson',
      emergencyPhone: '(555) 765-4321',
      documents: [
        { id: 'd4', name: 'Employment Contract', type: 'PDF', dateUploaded: '2021-01-10', size: '1.3MB' },
        { id: 'd5', name: 'Medical Leave Request', type: 'PDF', dateUploaded: '2023-03-20', size: '450KB' }
      ]
    },
    {
      id: '4',
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@example.com',
      phone: '(555) 456-7890',
      department: 'IT',
      position: 'IT Support',
      status: 'active',
      hireDate: '2022-05-05',
      address: '1010 Pine Street',
      city: 'Metropolis',
      state: 'ST',
      zipCode: '45678',
      emergencyContact: 'Sarah Brown',
      emergencyPhone: '(555) 654-3210',
      documents: [
        { id: 'd6', name: 'Employment Contract', type: 'PDF', dateUploaded: '2022-05-05', size: '1.2MB' }
      ]
    },
    {
      id: '5',
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@example.com',
      phone: '(555) 567-8901',
      department: 'Human Resources',
      position: 'HR Coordinator',
      status: 'active',
      hireDate: '2021-09-12',
      address: '222 Maple Street',
      city: 'Springfield',
      state: 'ST',
      zipCode: '56789',
      emergencyContact: 'David Wilson',
      emergencyPhone: '(555) 543-2109',
      documents: [
        { id: 'd7', name: 'Employment Contract', type: 'PDF', dateUploaded: '2021-09-12', size: '1.1MB' }
      ]
    }
  ];

  // Load mock data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setEmployees(mockEmployees);
      setFilteredEmployees(mockEmployees);
      setLoading(false);
    }, 800);
  }, []);

  // Filter employees based on search query and filters
  useEffect(() => {
    let results = employees;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(employee => 
        employee.firstName.toLowerCase().includes(query) ||
        employee.lastName.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(employee => employee.status === filterStatus);
    }
    
    // Apply department filter
    if (filterDepartment !== 'all') {
      results = results.filter(employee => employee.department === filterDepartment);
    }
    
    setFilteredEmployees(results);
  }, [searchQuery, filterStatus, filterDepartment, employees]);

  // Get unique departments for filter
  const departments = ['all', ...new Set(employees.map(emp => emp.department))];

  // Handle create new employee
  const handleCreateEmployee = () => {
    // Validate required fields
    if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const newId = (employees.length + 1).toString();
    const employeeToAdd = {
      ...newEmployee,
      id: newId,
      documents: []
    } as Employee;
    
    setEmployees([...employees, employeeToAdd]);
    setIsAddModalOpen(false);
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
      address: '',
      city: '',
      state: '',
      zipCode: '',
      emergencyContact: '',
      emergencyPhone: ''
    });
    toast.success('Employee record created successfully');
  };

  // Handle edit employee
  const handleUpdateEmployee = () => {
    if (!selectedEmployee) return;
    
    setEmployees(employees.map(emp => 
      emp.id === selectedEmployee.id ? selectedEmployee : emp
    ));
    setIsEditModalOpen(false);
    toast.success('Employee record updated successfully');
  };

  // Handle delete employee
  const handleDeleteEmployee = () => {
    if (!selectedEmployee) return;
    
    setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id));
    setIsDeleteModalOpen(false);
    setSelectedEmployee(null);
    toast.success('Employee record deleted successfully');
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'onLeave':
        return <Badge className="bg-amber-100 text-amber-800">On Leave</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
      case 'contractor':
        return <Badge className="bg-blue-100 text-blue-800">Contractor</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Simple employee card component
  const EmployeeCard = ({ employee }: { employee: Employee }) => (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-base font-semibold">{employee.firstName} {employee.lastName}</h3>
            <p className="text-xs text-gray-600">{employee.position}</p>
          </div>
          <StatusBadge status={employee.status} />
        </div>
        
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Building className="h-3.5 w-3.5 text-gray-500" />
            <span>{employee.department}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AtSign className="h-3.5 w-3.5 text-gray-500" />
            <span className="truncate">{employee.email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Phone className="h-3.5 w-3.5 text-gray-500" />
            <span>{employee.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span>Hired: {new Date(employee.hireDate).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setSelectedEmployee(employee);
              setIsEditModalOpen(true);
            }}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setSelectedEmployee(employee);
              setIsViewDialogOpen(true);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Employee Detail Dialog Content
  const EmployeeDetailDialog = () => {
    if (!selectedEmployee) return null;
    
    return (
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Employee Details</DialogTitle>
            <DialogDescription className="text-sm">
              View detailed information about {selectedEmployee.firstName} {selectedEmployee.lastName}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="personal" className="mt-2 flex-1 overflow-hidden flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="personal" className="text-xs px-2 py-1">Personal Info</TabsTrigger>
              <TabsTrigger value="employment" className="text-xs px-2 py-1">Employment</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs px-2 py-1">Documents</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs px-2 py-1">Performance</TabsTrigger>
              <TabsTrigger value="training" className="text-xs px-2 py-1">Training & Certs</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto pr-1 flex-1">
              <TabsContent value="personal" className="space-y-3 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-2">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">First Name</Label>
                          <p className="font-medium text-sm">{selectedEmployee.firstName}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Last Name</Label>
                          <p className="font-medium text-sm">{selectedEmployee.lastName}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Email</Label>
                        <p className="font-medium text-sm">{selectedEmployee.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <p className="font-medium text-sm">{selectedEmployee.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-2">Address</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Street Address</Label>
                        <p className="font-medium text-sm">{selectedEmployee.address}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">City</Label>
                          <p className="font-medium text-sm">{selectedEmployee.city}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">State</Label>
                          <p className="font-medium text-sm">{selectedEmployee.state}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Zip Code</Label>
                          <p className="font-medium text-sm">{selectedEmployee.zipCode}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-base font-medium mb-2">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <p className="font-medium text-sm">{selectedEmployee.emergencyContact}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <p className="font-medium text-sm">{selectedEmployee.emergencyPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="employment" className="mt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-base font-medium mb-2">Position Details</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">Department</Label>
                          <p className="font-medium text-sm">{selectedEmployee.department}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Position</Label>
                          <p className="font-medium text-sm">{selectedEmployee.position}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Status</Label>
                          <div className="mt-1">
                            <StatusBadge status={selectedEmployee.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mb-2">Employment Dates</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">Hire Date</Label>
                          <p className="font-medium text-sm">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
                        </div>
                        {selectedEmployee.status === 'terminated' && (
                          <div>
                            <Label className="text-xs text-gray-500">Termination Date</Label>
                            <p className="font-medium text-sm">March 15, 2023</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Employee Documents</h3>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Upload
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-1.5 border-b">
                      <div className="grid grid-cols-5 gap-2">
                        <p className="text-xs font-medium col-span-2">Document</p>
                        <p className="text-xs font-medium">Type</p>
                        <p className="text-xs font-medium">Date</p>
                        <p className="text-xs font-medium">Actions</p>
                      </div>
                    </div>
                    
                    <div className="max-h-[180px] overflow-y-auto">
                      <div className="divide-y">
                        {selectedEmployee.documents.map(doc => (
                          <div key={doc.id} className="px-3 py-2">
                            <div className="grid grid-cols-5 gap-2 items-center">
                              <div className="col-span-2 flex items-center">
                                <FileText className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
                                <span className="text-xs">{doc.name}</span>
                              </div>
                              <span className="text-xs">{doc.type}</span>
                              <span className="text-xs">{new Date(doc.dateUploaded).toLocaleDateString()}</span>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Performance Reviews</h3>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Review
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <div className="mb-3">
                      <h4 className="font-medium text-sm">2023 Annual Performance Review</h4>
                      <p className="text-xs text-gray-500">Completed on: October 15, 2023</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="border rounded-md p-2">
                        <h5 className="text-xs font-medium mb-1">Overall Rating</h5>
                        <p className="text-lg font-bold text-blue-600">4.5/5</p>
                      </div>
                      <div className="border rounded-md p-2">
                        <h5 className="text-xs font-medium mb-1">Strengths</h5>
                        <p className="text-xs">Technical expertise, team collaboration</p>
                      </div>
                      <div className="border rounded-md p-2">
                        <h5 className="text-xs font-medium mb-1">Areas for Growth</h5>
                        <p className="text-xs">Project planning, time estimation</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium mb-1">Manager Comments</h5>
                      <p className="text-xs text-gray-700">
                        {selectedEmployee.firstName} has consistently demonstrated strong technical skills and is a valuable team member.
                        Continues to improve in communication and has taken on additional responsibilities.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="training" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium">Training Completed</h3>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="max-h-[180px] overflow-y-auto">
                        <div className="divide-y">
                          <div className="p-2.5">
                            <div className="flex justify-between mb-1">
                              <h4 className="font-medium text-xs">Safety Protocols Training</h4>
                              <span className="text-xs text-gray-500">Jan 15, 2023</span>
                            </div>
                            <p className="text-xs text-gray-700 mb-1.5">Annual workplace safety training</p>
                            <div className="flex items-center">
                              <span className="text-xs bg-green-100 text-green-800 rounded-full px-1.5 py-0.5 text-[10px]">Completed</span>
                            </div>
                          </div>
                          
                          <div className="p-2.5">
                            <div className="flex justify-between mb-1">
                              <h4 className="font-medium text-xs">Project Management Basics</h4>
                              <span className="text-xs text-gray-500">Mar 22, 2023</span>
                            </div>
                            <p className="text-xs text-gray-700 mb-1.5">Fundamentals of project management</p>
                            <div className="flex items-center">
                              <span className="text-xs bg-green-100 text-green-800 rounded-full px-1.5 py-0.5 text-[10px]">Completed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium">Certifications</h3>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="max-h-[180px] overflow-y-auto">
                        <div className="divide-y">
                          <div className="p-2.5">
                            <div className="flex justify-between mb-1">
                              <h4 className="font-medium text-xs">Professional Engineer License</h4>
                              <span className="text-xs text-gray-500">Valid until Dec 2025</span>
                            </div>
                            <p className="text-xs text-gray-700 mb-1.5">License #PE12345</p>
                            <div className="flex items-center">
                              <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-1.5 py-0.5 text-[10px]">Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="flex justify-between items-center mt-3 pt-3 border-t">
            <div>
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => {
                setIsViewDialogOpen(false);
                setSelectedEmployee(null);
              }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => {
                setIsViewDialogOpen(false);
                setIsEditModalOpen(true);
              }}>
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Employee Records</CardTitle>
              <CardDescription>Manage employee profiles, documents, and information</CardDescription>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-48">
                <SelectRoot value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="onLeave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
              <div className="w-48">
                <SelectRoot value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <Building className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.filter(d => d !== 'all').map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterDepartment('all');
              }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-[220px] animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="h-3 w-full bg-gray-200 rounded"></div>
                      <div className="h-3 w-full bg-gray-200 rounded"></div>
                      <div className="h-3 w-full bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No employees found</h3>
              <p className="text-gray-500">
                {searchQuery || filterStatus !== 'all' || filterDepartment !== 'all' ? 
                  'Try adjusting your search or filters' : 
                  'Add your first employee to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map(employee => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              Report
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Employee detail dialog */}
      {selectedEmployee && <EmployeeDetailDialog />}

      {/* Modal forms would be here but removed for brevity */}
      {/* These would include:
          - Add Employee Form
          - Edit Employee Form
          - Delete Confirmation
          - Document Upload Form
      */}
    </div>
  );
};

export default EmployeeRecordManagement; 