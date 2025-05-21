import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Label } from '@/components/ui/Label';
import { 
  Plus, Search, Calendar, Users, CheckCircle, Clock, BookOpen, Video, Globe, Award, 
  Filter, RefreshCw, BarChart, Eye, Download, Edit, Trash2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/Dialog';

// Types
interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'inPerson' | 'selfPaced';
  category: string;
  duration: string;
  instructor: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
  enrollments: Enrollment[];
}

interface Enrollment {
  id: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  completionDate: string | null;
  status: 'enrolled' | 'inProgress' | 'completed' | 'failed' | 'cancelled';
  grade?: string;
  certificateId?: string;
}

const TrainingTracking: React.FC = () => {
  // State for managing training courses
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<TrainingCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Mock data
  const mockCourses: TrainingCourse[] = [
    {
      id: '1',
      title: 'Safety Compliance Training',
      description: 'Essential safety protocols and compliance requirements for all employees.',
      type: 'inPerson',
      category: 'Safety',
      duration: '2 days',
      instructor: 'Mark Johnson',
      maxParticipants: 20,
      startDate: '2023-11-15',
      endDate: '2023-11-16',
      status: 'scheduled',
      enrollments: [
        {
          id: 'e1',
          employeeId: '1',
          employeeName: 'John Doe',
          enrollmentDate: '2023-10-05',
          completionDate: null,
          status: 'enrolled'
        },
        {
          id: 'e2',
          employeeId: '2',
          employeeName: 'Jane Smith',
          enrollmentDate: '2023-10-05',
          completionDate: null,
          status: 'enrolled'
        }
      ]
    },
    {
      id: '2',
      title: 'Leadership Development',
      description: 'Advanced leadership skills for managers and team leads.',
      type: 'inPerson',
      category: 'Professional Development',
      duration: '3 days',
      instructor: 'Sarah Williams',
      maxParticipants: 15,
      startDate: '2023-12-05',
      endDate: '2023-12-07',
      status: 'scheduled',
      enrollments: [
        {
          id: 'e3',
          employeeId: '3',
          employeeName: 'Robert Johnson',
          enrollmentDate: '2023-10-10',
          completionDate: null,
          status: 'enrolled'
        }
      ]
    },
    {
      id: '3',
      title: 'Introduction to Project Management',
      description: 'Fundamentals of project management methodologies and best practices.',
      type: 'online',
      category: 'Professional Development',
      duration: '4 weeks',
      instructor: 'David Lee',
      maxParticipants: 50,
      startDate: '2023-10-01',
      endDate: '2023-10-28',
      status: 'inProgress',
      enrollments: [
        {
          id: 'e4',
          employeeId: '1',
          employeeName: 'John Doe',
          enrollmentDate: '2023-09-20',
          completionDate: null,
          status: 'inProgress'
        },
        {
          id: 'e5',
          employeeId: '4',
          employeeName: 'Michael Brown',
          enrollmentDate: '2023-09-22',
          completionDate: null,
          status: 'inProgress'
        }
      ]
    },
    {
      id: '4',
      title: 'Cybersecurity Awareness',
      description: 'Essential cybersecurity practices for protecting company data.',
      type: 'selfPaced',
      category: 'Technology',
      duration: 'Self-paced',
      instructor: 'Self-guided',
      maxParticipants: 100,
      startDate: '2023-09-01',
      endDate: '2023-11-30',
      status: 'inProgress',
      enrollments: [
        {
          id: 'e6',
          employeeId: '2',
          employeeName: 'Jane Smith',
          enrollmentDate: '2023-09-05',
          completionDate: '2023-09-15',
          status: 'completed',
          grade: '95%',
          certificateId: 'CERT-CS-1001'
        },
        {
          id: 'e7',
          employeeId: '5',
          employeeName: 'Sarah Wilson',
          enrollmentDate: '2023-09-10',
          completionDate: null,
          status: 'inProgress'
        }
      ]
    },
    {
      id: '5',
      title: 'Customer Service Excellence',
      description: 'Techniques for providing exceptional customer service.',
      type: 'inPerson',
      category: 'Customer Service',
      duration: '1 day',
      instructor: 'Emily Parker',
      maxParticipants: 25,
      startDate: '2023-08-15',
      endDate: '2023-08-15',
      status: 'completed',
      enrollments: [
        {
          id: 'e8',
          employeeId: '2',
          employeeName: 'Jane Smith',
          enrollmentDate: '2023-08-01',
          completionDate: '2023-08-15',
          status: 'completed',
          grade: '90%',
          certificateId: 'CERT-CS-1002'
        },
        {
          id: 'e9',
          employeeId: '5',
          employeeName: 'Sarah Wilson',
          enrollmentDate: '2023-08-01',
          completionDate: '2023-08-15',
          status: 'completed',
          grade: '88%',
          certificateId: 'CERT-CS-1003'
        }
      ]
    }
  ];

  // Load mock data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCourses(mockCourses);
      setFilteredCourses(mockCourses);
      setLoading(false);
    }, 800);
  }, []);

  // Filter courses based on search query, filters, and tab
  useEffect(() => {
    let results = courses;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(course => course.status === filterStatus);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      results = results.filter(course => course.type === filterType);
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      results = results.filter(course => course.category === filterCategory);
    }
    
    // Apply tab filter
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (activeTab === 'upcoming') {
      results = results.filter(course => course.startDate > todayStr && course.status !== 'cancelled');
    } else if (activeTab === 'ongoing') {
      results = results.filter(course => course.status === 'inProgress');
    } else if (activeTab === 'completed') {
      results = results.filter(course => course.status === 'completed');
    }
    
    setFilteredCourses(results);
  }, [searchQuery, filterStatus, filterType, filterCategory, activeTab, courses]);

  // Get unique categories for filter
  const categories = ['all', ...new Set(courses.map(course => course.category))];

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'inProgress':
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'enrolled':
        return <Badge className="bg-blue-100 text-blue-800">Enrolled</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Type badge component
  const TypeBadge = ({ type }: { type: string }) => {
    switch(type) {
      case 'online':
        return <Badge className="bg-indigo-100 text-indigo-800">
          <Globe className="h-3 w-3 mr-1" />
          Online
        </Badge>;
      case 'inPerson':
        return <Badge className="bg-amber-100 text-amber-800">
          <Users className="h-3 w-3 mr-1" />
          In Person
        </Badge>;
      case 'selfPaced':
        return <Badge className="bg-emerald-100 text-emerald-800">
          <Clock className="h-3 w-3 mr-1" />
          Self-Paced
        </Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Simple course card component
  const CourseCard = ({ course }: { course: TrainingCourse }) => (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <TypeBadge type={course.type} />
          <StatusBadge status={course.status} />
        </div>
        
        <h3 className="font-medium mb-2">{course.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{course.enrollments.length} / {course.maxParticipants} Enrolled</span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={() => {
              setSelectedCourse(course);
              setIsDetailDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Training Detail Dialog Component
  const TrainingDetailDialog = () => {
    if (!selectedCourse) return null;
    
    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{selectedCourse.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <TypeBadge type={selectedCourse.type} />
                <StatusBadge status={selectedCourse.status} />
              </div>
            </div>
            <DialogDescription className="text-sm">
              {selectedCourse.description}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2 flex-1 overflow-hidden flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="details" className="text-xs px-2 py-1">Course Details</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs px-2 py-1">Participants</TabsTrigger>
              <TabsTrigger value="materials" className="text-xs px-2 py-1">Materials</TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs px-2 py-1">Schedule</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto pr-1 flex-1">
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-2">Course Information</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Category</Label>
                        <p className="font-medium text-sm">{selectedCourse.category}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Type</Label>
                        <p className="font-medium text-sm">{selectedCourse.type === 'inPerson' ? 'In Person' : selectedCourse.type === 'online' ? 'Online' : 'Self-Paced'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Duration</Label>
                        <p className="font-medium text-sm">{selectedCourse.duration}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-2">Instructor & Schedule</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Instructor</Label>
                        <p className="font-medium text-sm">{selectedCourse.instructor}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Start Date</Label>
                        <p className="font-medium text-sm">{new Date(selectedCourse.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">End Date</Label>
                        <p className="font-medium text-sm">{new Date(selectedCourse.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-base font-medium mb-2">Completion Requirements</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-md p-3">
                          <h4 className="text-xs font-medium mb-1">Attendance</h4>
                          <p className="text-sm">Full participation required</p>
                        </div>
                        <div className="border rounded-md p-3">
                          <h4 className="text-xs font-medium mb-1">Assessments</h4>
                          <p className="text-sm">Final exam with 70% passing score</p>
                        </div>
                        <div className="border rounded-md p-3">
                          <h4 className="text-xs font-medium mb-1">Certification</h4>
                          <p className="text-sm">Available upon successful completion</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="participants" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Enrollments ({selectedCourse.enrollments.length}/{selectedCourse.maxParticipants})</h3>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Participant
                    </Button>
                  </div>

                  {selectedCourse.enrollments.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-gray-50 px-3 py-1.5 border-b">
                        <div className="grid grid-cols-4 gap-2">
                          <p className="text-xs font-medium">Employee</p>
                          <p className="text-xs font-medium">Enrollment Date</p>
                          <p className="text-xs font-medium">Status</p>
                          <p className="text-xs font-medium">Actions</p>
                        </div>
                      </div>
                      
                      <div className="max-h-[250px] overflow-y-auto">
                        <div className="divide-y">
                          {selectedCourse.enrollments.map(enrollment => (
                            <div key={enrollment.id} className="px-3 py-2">
                              <div className="grid grid-cols-4 gap-2 items-center">
                                <div>
                                  <p className="font-medium text-sm">{enrollment.employeeName}</p>
                                </div>
                                <div>
                                  <p className="text-xs">{new Date(enrollment.enrollmentDate).toLocaleDateString()}</p>
                                  {enrollment.completionDate && (
                                    <p className="text-xs text-gray-500">
                                      Completed: {new Date(enrollment.completionDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <StatusBadge status={enrollment.status} />
                                  {enrollment.grade && (
                                    <span className="text-xs ml-2">Grade: {enrollment.grade}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  {enrollment.certificateId && (
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                      <Award className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
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
                  ) : (
                    <div className="text-center py-8 border rounded-md">
                      <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">No participants enrolled</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="materials" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Course Materials</h3>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Material
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center p-2 border rounded-md">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                          <div>
                            <p className="font-medium text-sm">Course Handbook</p>
                            <p className="text-xs text-gray-500">PDF, 2.5MB</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 border rounded-md">
                        <div className="flex items-center">
                          <Video className="h-4 w-4 text-blue-600 mr-2" />
                          <div>
                            <p className="font-medium text-sm">Introduction Video</p>
                            <p className="text-xs text-gray-500">MP4, 15 minutes</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 border rounded-md">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                          <div>
                            <p className="font-medium text-sm">Practice Exercises</p>
                            <p className="text-xs text-gray-500">PDF, 1.2MB</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="schedule" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Training Schedule</h3>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="divide-y">
                      <div className="p-3">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-medium text-sm">Day 1: Introduction</h4>
                          <span className="text-xs text-gray-500">{new Date(selectedCourse.startDate).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-700">Overview of course objectives and key concepts</p>
                      </div>
                      
                      <div className="p-3">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-medium text-sm">Day 2: Core Skills</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(new Date(selectedCourse.startDate).setDate(
                              new Date(selectedCourse.startDate).getDate() + 1
                            )).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700">Hands-on practice with essential techniques</p>
                      </div>
                      
                      <div className="p-3">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-medium text-sm">Final Day: Assessment</h4>
                          <span className="text-xs text-gray-500">{new Date(selectedCourse.endDate).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-700">Final exam and certification</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="flex justify-between items-center mt-3 pt-3 border-t">
            <div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Enroll
              </Button>
              <Button size="sm" className="h-7 text-xs" variant="outline">
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
              <CardTitle>Training Management</CardTitle>
              <CardDescription>Manage training courses, enrollment, and completion tracking</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add Training
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                      <p className="text-2xl font-semibold">
                        {courses.filter(c => 
                          c.startDate > new Date().toISOString().split('T')[0] && 
                          c.status !== 'cancelled'
                        ).length}
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
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                      <p className="text-2xl font-semibold">
                        {courses.filter(c => c.status === 'inProgress').length}
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                      <p className="text-2xl font-semibold">
                        {courses.filter(c => c.status === 'completed').length}
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
                      <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Certifications</p>
                      <p className="text-2xl font-semibold">
                        {courses
                          .flatMap(c => c.enrollments)
                          .filter(e => e.status === 'completed' && e.certificateId)
                          .length}
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
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-40">
                <SelectRoot value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="inProgress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
              <div className="w-40">
                <SelectRoot value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <BookOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="inPerson">In Person</SelectItem>
                    <SelectItem value="selfPaced">Self-Paced</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterType('all');
                setFilterCategory('all');
              }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ongoing
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
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
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No courses found</h3>
                <p className="text-gray-500">
                  {searchQuery || filterStatus !== 'all' || filterType !== 'all' || filterCategory !== 'all' ? 
                    'Try adjusting your search or filters' : 
                    'Add your first training course to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <BarChart className="h-4 w-4 mr-1" />
              Reports
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Training detail dialog */}
      {selectedCourse && <TrainingDetailDialog />}
    </div>
  );
};

export default TrainingTracking; 