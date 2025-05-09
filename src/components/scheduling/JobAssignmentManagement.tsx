import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulingService } from '@/lib/services/schedulingService';
import { 
  TechnicianAssignment,
  TechnicianMatch,
  PortalType,
  AssignmentStatus,
  JobSkillRequirement,
} from '@/lib/types/scheduling';
import { Button } from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { 
  Calendar,
  Clock,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Briefcase,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Settings
} from 'lucide-react';
import dayjs from 'dayjs';

// Props interface
interface JobAssignmentManagementProps {
  portalType: PortalType;
  division?: string;
}

// Component for managing job assignments
export function JobAssignmentManagement({ portalType, division }: JobAssignmentManagementProps) {
  const { user } = useAuth();
  
  // States
  const [assignments, setAssignments] = useState<TechnicianAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<TechnicianAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssignmentStatus>('scheduled');
  
  // Search/filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  
  // New assignment dialog
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianMatch[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);  // TODO: Define a proper Job interface
  const [skillRequirements, setSkillRequirements] = useState<JobSkillRequirement[]>([]);
  
  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    technicianId: '',
    jobId: '',
    assignmentDate: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });
  
  // Fetch assignments
  useEffect(() => {
    fetchAssignments();
  }, [portalType, division]);
  
  // Filter assignments when tab changes or search/filter criteria change
  useEffect(() => {
    if (assignments.length > 0) {
      let filtered = assignments.filter(assignment => assignment.status === activeTab);
      
      // Apply search term filter
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(
          assignment => 
            assignment.job?.job_number.toLowerCase().includes(lowerSearchTerm) ||
            assignment.job?.title.toLowerCase().includes(lowerSearchTerm) ||
            assignment.user?.user_metadata?.name?.toLowerCase().includes(lowerSearchTerm)
        );
      }
      
      // Apply date filter
      if (dateFilter) {
        filtered = filtered.filter(
          assignment => assignment.assignment_date === dateFilter
        );
      }
      
      // Apply technician filter
      if (technicianFilter) {
        filtered = filtered.filter(
          assignment => assignment.user_id === technicianFilter
        );
      }
      
      setFilteredAssignments(filtered);
    }
  }, [assignments, activeTab, searchTerm, dateFilter, technicianFilter]);
  
  // Fetch assignments from API
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Get a date range (next 30 days)
      const startDate = dayjs().format('YYYY-MM-DD');
      const endDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
      
      const { data, error } = await schedulingService.getTechnicianAssignments(
        undefined, // No specific technician - get all
        portalType,
        startDate,
        endDate,
        division
      );
      
      if (error) {
        console.error('Error fetching assignments:', error);
        setError('Failed to load assignments. Please try again.');
      } else {
        setAssignments(data || []);
        // Initialize filtered assignments with scheduled status (default tab)
        setFilteredAssignments(
          (data || []).filter(assignment => assignment.status === 'scheduled')
        );
      }
    } catch (err) {
      console.error('Exception fetching assignments:', err);
      setError('An unexpected error occurred while loading assignments.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAssignmentForm(prev => ({ ...prev, [name]: value }));
    
    // If job ID changes, fetch skill requirements and find matching technicians
    if (name === 'jobId' && value) {
      fetchJobSkillRequirements(value);
      fetchAvailableTechnicians(value);
    }
  };
  
  // Fetch job skill requirements
  const fetchJobSkillRequirements = async (jobId: string) => {
    try {
      const { data, error } = await schedulingService.getJobSkillRequirements(jobId, portalType);
      
      if (error) {
        console.error('Error fetching job skill requirements:', error);
      } else {
        setSkillRequirements(data || []);
      }
    } catch (err) {
      console.error('Exception fetching job skill requirements:', err);
    }
  };
  
  // Fetch available technicians with skill matching
  const fetchAvailableTechnicians = async (jobId: string) => {
    try {
      const { data, error } = await schedulingService.findAvailableTechnicians(
        jobId,
        assignmentForm.assignmentDate,
        assignmentForm.startTime + ':00',
        assignmentForm.endTime + ':00',
        portalType
      );
      
      if (error) {
        console.error('Error finding available technicians:', error);
      } else {
        setTechnicians(data || []);
      }
    } catch (err) {
      console.error('Exception finding available technicians:', err);
    }
  };
  
  // Handle assignment submission
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignmentForm.technicianId || !assignmentForm.jobId || !assignmentForm.assignmentDate) {
      toast({
        title: 'Error',
        description: 'Please fill out all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const assignment = {
        user_id: assignmentForm.technicianId,
        job_id: assignmentForm.jobId,
        assignment_date: assignmentForm.assignmentDate,
        start_time: assignmentForm.startTime + ':00',
        end_time: assignmentForm.endTime + ':00',
        status: 'scheduled' as AssignmentStatus,
        notes: assignmentForm.notes,
        portal_type: portalType,
        division,
        created_by: user?.id,
      };
      
      const { data, error } = await schedulingService.saveTechnicianAssignment(assignment);
      
      if (error) {
        console.error('Error creating assignment:', error);
        toast({
          title: 'Error',
          description: 'Failed to create assignment. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Assignment created successfully!',
        });
        setShowAssignmentForm(false);
        
        // Reset form
        setAssignmentForm({
          technicianId: '',
          jobId: '',
          assignmentDate: dayjs().format('YYYY-MM-DD'),
          startTime: '09:00',
          endTime: '17:00',
          notes: '',
        });
        
        // Refresh assignments
        fetchAssignments();
      }
    } catch (err) {
      console.error('Exception creating assignment:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update assignment status
  const handleUpdateStatus = async (assignmentId: string, status: AssignmentStatus) => {
    setLoading(true);
    try {
      const { data, error } = await schedulingService.updateAssignmentStatus(
        assignmentId,
        status
      );
      
      if (error) {
        console.error('Error updating assignment status:', error);
        toast({
          title: 'Error',
          description: `Failed to update assignment status. Please try again.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `Assignment marked as ${status}.`,
        });
        
        // Refresh assignments
        fetchAssignments();
      }
    } catch (err) {
      console.error('Exception updating assignment status:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await schedulingService.deleteTechnicianAssignment(assignmentId);
      
      if (error) {
        console.error('Error deleting assignment:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete assignment. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Assignment deleted successfully.',
        });
        
        // Refresh assignments
        fetchAssignments();
      }
    } catch (err) {
      console.error('Exception deleting assignment:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get color for assignment status badge
  const getStatusBadgeColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in-progress': return 'bg-amber-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Check if user can edit assignments
  const canEditAssignments = user?.user_metadata?.role === 'Admin' || 
                           user?.user_metadata?.role === 'Scheduler';
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative max-w-xs">
            <Input
              placeholder="Search by job number, title, or technician"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
          
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>
        
        {canEditAssignments && (
          <Button onClick={() => setShowAssignmentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AssignmentStatus)}>
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading assignments...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="h-8 w-8 mx-auto mb-2" />
              <p>No {activeTab} assignments found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Badge className={`${getStatusBadgeColor(assignment.status)} text-white mb-2`}>
                      {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                    </Badge>
                    <CardTitle className="text-base">
                      {assignment.job?.job_number} - {assignment.job?.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{assignment.user?.user_metadata?.name || 'Unknown Technician'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{dayjs(assignment.assignment_date).format('MMM DD, YYYY')}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <span>
                          {assignment.start_time.substring(0, 5)} - {assignment.end_time.substring(0, 5)}
                        </span>
                      </div>
                      
                      {assignment.notes && (
                        <div className="text-sm mt-2">
                          <p className="text-gray-500 font-medium">Notes:</p>
                          <p className="text-gray-600">{assignment.notes}</p>
                        </div>
                      )}
                      
                      {canEditAssignments && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {/* Action buttons based on current status */}
                          {assignment.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateStatus(assignment.id, 'in-progress')}
                              >
                                Start
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateStatus(assignment.id, 'cancelled')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                          
                          {assignment.status === 'in-progress' && (
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateStatus(assignment.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>
      
      {/* New Assignment Dialog */}
      <Dialog open={showAssignmentForm} onOpenChange={setShowAssignmentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job</label>
              <Select
                name="jobId"
                value={assignmentForm.jobId}
                onChange={handleInputChange}
                required
                options={jobs.map(job => ({
                  label: `${job.job_number} - ${job.title}`,
                  value: job.id
                }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Assignment Date</label>
              <Input
                type="date"
                name="assignmentDate"
                value={assignmentForm.assignmentDate}
                onChange={handleInputChange}
                min={dayjs().format('YYYY-MM-DD')}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <Input
                  type="time"
                  name="startTime"
                  value={assignmentForm.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <Input
                  type="time"
                  name="endTime"
                  value={assignmentForm.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Technician</label>
              <Select
                name="technicianId"
                value={assignmentForm.technicianId}
                onChange={handleInputChange}
                required
                options={technicians.map(tech => ({
                  label: `${tech.full_name || tech.email} (${tech.skill_match_score}% skill match)`,
                  value: tech.user_id
                }))}
              />
            </div>
            
            {skillRequirements.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Required Skills</label>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  {skillRequirements.map(skill => (
                    <div key={skill.id} className="flex items-center mb-1">
                      <span className={skill.is_required ? 'font-medium' : ''}>
                        {skill.skill_name}
                        {skill.minimum_proficiency ? ` (Min. Level: ${skill.minimum_proficiency})` : ''}
                      </span>
                      {skill.is_required && (
                        <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                name="notes"
                value={assignmentForm.notes}
                onChange={handleInputChange}
                placeholder="Add any special instructions or notes"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAssignmentForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Assignment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 