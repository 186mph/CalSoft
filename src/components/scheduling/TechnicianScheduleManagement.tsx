import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulingService } from '@/lib/services/schedulingService';
import { 
  TechnicianAvailability,
  TechnicianException,
  PortalType,
  AvailableTechnician,
  TechnicianAssignment,
  TimeOffRequest,
  TimeOffStatus
} from '@/lib/types/scheduling';
import { Button } from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui';
import { TechnicianCalendar } from './TechnicianCalendar';
import { 
  Clock, 
  Save, 
  Plus, 
  XCircle, 
  Calendar,
  CheckCircle,
  AlertCircle,
  User,
  Users,
  FileText
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import dayjs from 'dayjs';

// Interfaces
interface TechnicianScheduleManagementProps {
  portalType: PortalType;
  division?: string;
}

export function TechnicianScheduleManagement({ portalType, division }: TechnicianScheduleManagementProps) {
  const { user } = useAuth();
  
  // States for technicians and selected technician
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  
  // State for availabilities, exceptions and time-off requests
  const [availabilities, setAvailabilities] = useState<TechnicianAvailability[]>([]);
  const [exceptions, setExceptions] = useState<TechnicianException[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  
  // State for time-off request form
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    isFullDay: true
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('calendar');
  
  // Fetch technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await schedulingService.getAvailableTechnicians(portalType, division);
        if (error) {
          console.error("Error fetching technicians:", error);
          setError("Failed to load technicians. Please try again.");
        } else {
          setTechnicians(data || []);
          // Set current user as default selected technician if they're a technician
          if (data && data.length > 0) {
            const currentUserAsTech = data.find(tech => tech.user_id === user?.id);
            if (currentUserAsTech) {
              setSelectedTechnician(currentUserAsTech.user_id);
              setTimeOffForm(prev => ({ ...prev, userId: currentUserAsTech.user_id }));
            } else {
              setSelectedTechnician(data[0].user_id);
              setTimeOffForm(prev => ({ ...prev, userId: data[0].user_id }));
            }
          }
        }
      } catch (err) {
        console.error("Exception fetching technicians:", err);
        setError("An unexpected error occurred while loading technicians.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicians();
  }, [user, portalType, division]);
  
  // Fetch time-off requests
  useEffect(() => {
    const fetchTimeOffRequests = async () => {
      if (!selectedTechnician) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await schedulingService.getTimeOffRequests({
          technicianId: selectedTechnician,
          portalType,
          division
        });
        
        if (error) {
          console.error("Error fetching time-off requests:", error);
          setError("Failed to load time-off requests. Please try again.");
        } else {
          setTimeOffRequests(data || []);
        }
      } catch (err) {
        console.error("Exception fetching time-off requests:", err);
        setError("An unexpected error occurred while loading time-off requests.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeOffRequests();
  }, [selectedTechnician, portalType, division]);

  // Handle technician selection change
  const handleTechnicianChange = (techId: string) => {
    setSelectedTechnician(techId);
    setTimeOffForm(prev => ({ ...prev, userId: techId }));
  };
  
  // Handle time-off form input changes
  const handleTimeOffInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setTimeOffForm(prev => ({ 
        ...prev, 
        [name]: checked
      }));
    } else {
      setTimeOffForm(prev => ({ 
        ...prev, 
        [name]: value
      }));
    }
  };
  
  // Handle submitting a new time-off request
  const handleSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!timeOffForm.userId || !timeOffForm.startDate || !timeOffForm.endDate || !timeOffForm.reason) {
      toast({
        title: "Error",
        description: "Please fill out all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const timeOffRequest = {
        user_id: timeOffForm.userId,
        start_date: timeOffForm.startDate,
        end_date: timeOffForm.endDate,
        start_time: timeOffForm.isFullDay ? undefined : timeOffForm.startTime,
        end_time: timeOffForm.isFullDay ? undefined : timeOffForm.endTime,
        reason: timeOffForm.reason,
        status: 'pending' as TimeOffStatus,
        portal_type: portalType,
        division: division
      };
      
      const { data, error } = await schedulingService.createTimeOffRequest(timeOffRequest);
      
      if (error) {
        console.error("Error creating time-off request:", error);
        toast({
          title: "Error",
          description: "Failed to submit time-off request. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Time-off request submitted successfully!"
        });
        setShowTimeOffForm(false);
        
        // Reset form
        setTimeOffForm({
          userId: selectedTechnician,
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          reason: '',
          isFullDay: true
        });
        
        // Refresh time-off requests
        const { data: updatedRequests } = await schedulingService.getTimeOffRequests({
          technicianId: selectedTechnician,
          portalType,
          division
        });
        
        if (updatedRequests) {
          setTimeOffRequests(updatedRequests);
        }
      }
    } catch (err) {
      console.error("Exception creating time-off request:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to handle request approval/rejection
  const handleUpdateTimeOffStatus = async (requestId: string, status: TimeOffStatus) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await schedulingService.updateTimeOffRequestStatus(
        requestId, 
        status, 
        user.id
      );
      
      if (error) {
        console.error("Error updating time-off request:", error);
        toast({
          title: "Error",
          description: `Failed to ${status} request. Please try again.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Time-off request ${status} successfully!`
        });
        
        // Refresh time-off requests
        const { data: updatedRequests } = await schedulingService.getTimeOffRequests({
          technicianId: selectedTechnician,
          portalType,
          division
        });
        
        if (updatedRequests) {
          setTimeOffRequests(updatedRequests);
        }
      }
    } catch (err) {
      console.error("Exception updating time-off request:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to handle request cancellation
  const handleCancelTimeOffRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await schedulingService.cancelTimeOffRequest(requestId);
      
      if (error) {
        console.error("Error cancelling time-off request:", error);
        toast({
          title: "Error",
          description: "Failed to cancel request. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Time-off request cancelled successfully!"
        });
        
        // Refresh time-off requests
        const { data: updatedRequests } = await schedulingService.getTimeOffRequests({
          technicianId: selectedTechnician,
          portalType,
          division
        });
        
        if (updatedRequests) {
          setTimeOffRequests(updatedRequests);
        }
      }
    } catch (err) {
      console.error("Exception cancelling time-off request:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: TimeOffStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Technician Schedule Management</h2>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedTechnician}
            onChange={(e) => handleTechnicianChange(e.target.value)}
            className="w-64"
            options={technicians.map(tech => ({
              value: tech.user_id,
              label: tech.full_name || tech.email || 'Unknown'
            }))}
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="time-off">Time-Off Requests</TabsTrigger>
          <TabsTrigger value="approvals">Schedule Approvals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-4">
          <TechnicianCalendar
            portalType={portalType}
            division={division}
            selectedTechnician={selectedTechnician}
            showAllTechnicians={false}
          />
        </TabsContent>
        
        <TabsContent value="time-off" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Time-Off Requests</CardTitle>
              <Button 
                onClick={() => setShowTimeOffForm(true)}
                disabled={!selectedTechnician || isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Request Time Off
              </Button>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No time-off requests</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first time-off request to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeOffRequests.map(request => (
                    <div 
                      key={request.id} 
                      className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between"
                    >
                      <div className="space-y-2 mb-3 sm:mb-0">
                        <div className="flex items-center">
                          <h3 className="font-medium">{request.reason}</h3>
                          <span 
                            className={`ml-2 text-xs font-medium text-white px-2 py-0.5 rounded-full ${getStatusBadgeColor(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {dayjs(request.start_date).format('MMM D, YYYY')}
                          {request.start_date !== request.end_date && 
                            ` - ${dayjs(request.end_date).format('MMM D, YYYY')}`}
                          {request.start_time && 
                            ` (${request.start_time.substring(0, 5)} - ${request.end_time?.substring(0, 5) || 'End of day'})`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Submitted on {dayjs(request.created_at).format('MMM D, YYYY')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {request.status === 'pending' && (
                          <>
                            <Button variant="outline" size="sm" disabled={request.user_id !== user?.id} onClick={() => handleCancelTimeOffRequest(request.id)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            {user?.user_metadata?.role === 'Admin' || user?.user_metadata?.role === 'Scheduler' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleUpdateTimeOffStatus(request.id, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => handleUpdateTimeOffStatus(request.id, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="approvals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-4 text-gray-500">
                Schedule approval workflow will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Time-off Request Form Dialog */}
      <Dialog open={showTimeOffForm} onOpenChange={setShowTimeOffForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitTimeOff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                name="startDate"
                value={timeOffForm.startDate}
                onChange={handleTimeOffInputChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                name="endDate"
                value={timeOffForm.endDate}
                onChange={handleTimeOffInputChange}
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFullDay"
                name="isFullDay"
                checked={timeOffForm.isFullDay}
                onChange={handleTimeOffInputChange}
                className="mr-2"
              />
              <label htmlFor="isFullDay" className="text-sm font-medium">Full day</label>
            </div>
            
            {!timeOffForm.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <Input
                    type="time"
                    name="startTime"
                    value={timeOffForm.startTime}
                    onChange={handleTimeOffInputChange}
                    required={!timeOffForm.isFullDay}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <Input
                    type="time"
                    name="endTime"
                    value={timeOffForm.endTime}
                    onChange={handleTimeOffInputChange}
                    required={!timeOffForm.isFullDay}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <Textarea
                name="reason"
                value={timeOffForm.reason}
                onChange={handleTimeOffInputChange}
                placeholder="Vacation, sick leave, personal appointment, etc."
                rows={3}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowTimeOffForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 