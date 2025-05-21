import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulingService } from '@/lib/services/schedulingService';
import { 
  TechnicianAvailability, 
  TechnicianException,
  PortalType,
  AvailableTechnician
} from '@/lib/types/scheduling';
import { Button } from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Select, { SelectOption } from '@/components/ui/Select';
import { TechnicianCalendar } from './TechnicianCalendar';
import { Clock, Save, Plus, XCircle, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

// Interfaces
interface ScheduleManagementProps {
  portalType: PortalType;
  division?: string;
}

interface AvailabilityForm {
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface ExceptionForm {
  userId: string;
  exceptionDate: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reason: string;
}

// Day of week options
const dayOptions: SelectOption[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' }
];

export function ScheduleManagement({ portalType, division }: ScheduleManagementProps) {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [availabilities, setAvailabilities] = useState<TechnicianAvailability[]>([]);
  const [exceptions, setExceptions] = useState<TechnicianException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>({
    userId: '',
    dayOfWeek: 1, // Monday default
    startTime: '08:00',
    endTime: '17:00',
    isRecurring: true
  });

  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>({
    userId: '',
    exceptionDate: '',
    startTime: '08:00',
    endTime: '17:00',
    isAvailable: false,
    reason: ''
  });

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
              setAvailabilityForm(prev => ({ ...prev, userId: currentUserAsTech.user_id }));
              setExceptionForm(prev => ({ ...prev, userId: currentUserAsTech.user_id }));
            } else {
              setSelectedTechnician(data[0].user_id);
              setAvailabilityForm(prev => ({ ...prev, userId: data[0].user_id }));
              setExceptionForm(prev => ({ ...prev, userId: data[0].user_id }));
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

  // Fetch availabilities when technician changes
  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (!selectedTechnician) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await schedulingService.getTechnicianAvailability(selectedTechnician, portalType);
        if (error) {
          console.error("Error fetching availabilities:", error);
          setError("Failed to load technician availability.");
        } else {
          setAvailabilities(data || []);
        }
      } catch (err) {
        console.error("Exception fetching availabilities:", err);
        setError("An unexpected error occurred while loading availability.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailabilities();
  }, [selectedTechnician, portalType]);
  
  // Fetch exceptions when technician changes
  useEffect(() => {
    const fetchExceptions = async () => {
      if (!selectedTechnician) return;
      
      setIsLoading(true);
      try {
        // Get current month date range
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        
        const { data, error } = await schedulingService.getTechnicianExceptions(
          selectedTechnician, 
          portalType,
          dayjs(startDate).format('YYYY-MM-DD'),
          dayjs(endDate).format('YYYY-MM-DD')
        );
        if (error) {
          console.error("Error fetching exceptions:", error);
          setError("Failed to load technician exceptions.");
        } else {
          setExceptions(data || []);
        }
      } catch (err) {
        console.error("Exception fetching exceptions:", err);
        setError("An unexpected error occurred while loading exceptions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExceptions();
  }, [selectedTechnician, portalType]);

  // Form handlers
  const handleTechnicianChange = (techId: string) => {
    setSelectedTechnician(techId);
    setAvailabilityForm(prev => ({ ...prev, userId: techId }));
    setExceptionForm(prev => ({ ...prev, userId: techId }));
  };

  const handleAddAvailability = async () => {
    setIsLoading(true);
    try {
      const { error } = await schedulingService.saveTechnicianAvailability({
        user_id: availabilityForm.userId,
        day_of_week: availabilityForm.dayOfWeek,
        start_time: `${availabilityForm.startTime}:00`,
        end_time: `${availabilityForm.endTime}:00`,
        portal_type: portalType,
        division: division,
        recurring: availabilityForm.isRecurring,
      });
      
      if (error) {
        console.error("Error adding availability:", error);
        setError("Failed to save availability.");
      } else {
        // Refresh availabilities
        const { data: newData } = await schedulingService.getTechnicianAvailability(
          selectedTechnician, 
          portalType
        );
        setAvailabilities(newData || []);
        setShowAvailabilityForm(false);
        // Reset form
        setAvailabilityForm({
          userId: selectedTechnician,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '17:00',
          isRecurring: true
        });
      }
    } catch (err) {
      console.error("Exception adding availability:", err);
      setError("An unexpected error occurred while saving availability.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddException = async () => {
    setIsLoading(true);
    try {
      const { error } = await schedulingService.saveTechnicianException({
        user_id: exceptionForm.userId,
        exception_date: exceptionForm.exceptionDate,
        start_time: `${exceptionForm.startTime}:00`,
        end_time: `${exceptionForm.endTime}:00`,
        is_available: exceptionForm.isAvailable,
        reason: exceptionForm.reason,
        portal_type: portalType,
      });
      
      if (error) {
        console.error("Error adding exception:", error);
        setError("Failed to save exception.");
      } else {
        // Refresh exceptions
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        
        const { data: newData } = await schedulingService.getTechnicianExceptions(
          selectedTechnician, 
          portalType,
          dayjs(startDate).format('YYYY-MM-DD'),
          dayjs(endDate).format('YYYY-MM-DD')
        );
        setExceptions(newData || []);
        setShowExceptionForm(false);
        // Reset form
        setExceptionForm({
          userId: selectedTechnician,
          exceptionDate: '',
          startTime: '08:00',
          endTime: '17:00',
          isAvailable: false,
          reason: ''
        });
        setSelectedDate(null);
      }
    } catch (err) {
      console.error("Exception adding exception:", err);
      setError("An unexpected error occurred while saving exception.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (!window.confirm('Are you sure you want to delete this availability?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await schedulingService.deleteTechnicianAvailability(availabilityId);
      if (error) {
        console.error("Error deleting availability:", error);
        setError("Failed to delete availability.");
      } else {
        setAvailabilities(availabilities.filter(a => a.id !== availabilityId));
      }
    } catch (err) {
      console.error("Exception deleting availability:", err);
      setError("An unexpected error occurred while deleting availability.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteException = async (exceptionId: string) => {
    if (!window.confirm('Are you sure you want to delete this exception?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await schedulingService.deleteTechnicianException(exceptionId);
      if (error) {
        console.error("Error deleting exception:", error);
        setError("Failed to delete exception.");
      } else {
        setExceptions(exceptions.filter(e => e.id !== exceptionId));
      }
    } catch (err) {
      console.error("Exception deleting exception:", err);
      setError("An unexpected error occurred while deleting exception.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setExceptionForm(prev => ({
      ...prev,
      exceptionDate: dayjs(date).format('YYYY-MM-DD'),
      userId: selectedTechnician
    }));
    setShowExceptionForm(true);
  };

  // Prepare options for the technician select
  const technicianOptions: SelectOption[] = technicians.map(tech => ({
    value: tech.user_id,
    label: tech.full_name || tech.email || 'Unknown'
  }));

  // Get day name from number
  const getDayName = (dayNumber: number): string => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayMap[dayNumber] || 'Unknown';
  };

  return (
    <div className="container mx-auto px-4 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <CardTitle className="text-xl font-bold">Technician Schedule Management</CardTitle>
          <div className="flex space-x-2">
            <Select
              value={selectedTechnician} 
              onChange={(e) => handleTechnicianChange(e.target.value)}
              options={technicianOptions}
              className="w-[220px]"
              aria-label="Select Technician"
              disabled={isLoading || technicians.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
              {error}
              <button className="ml-2 text-red-600" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <Tabs defaultValue="calendar">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="availability">Regular Availability</TabsTrigger>
              <TabsTrigger value="exceptions">Time Off & Exceptions</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <div className="mb-4 flex justify-end space-x-2">
                <Button
                  onClick={() => {
                    setShowAvailabilityForm(true);
                    setAvailabilityForm(prev => ({ ...prev, userId: selectedTechnician }));
                  }}
                  disabled={!selectedTechnician || isLoading}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Add Regular Availability
                </Button>
                <Button
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setExceptionForm(prev => ({
                      ...prev,
                      exceptionDate: dayjs(today).format('YYYY-MM-DD'),
                      userId: selectedTechnician
                    }));
                    setShowExceptionForm(true);
                  }}
                  disabled={!selectedTechnician || isLoading}
                  variant="outline"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Add Time Off
                </Button>
              </div>
              
              <TechnicianCalendar
                portalType={portalType}
                division={division}
                selectedTechnician={selectedTechnician}
                onDateClick={handleDateClick}
                showAllTechnicians={false}
              />
            </TabsContent>

            <TabsContent value="availability">
              <div className="mb-4 flex justify-end">
                <Button
                  onClick={() => {
                    setShowAvailabilityForm(true);
                    setAvailabilityForm(prev => ({ ...prev, userId: selectedTechnician }));
                  }}
                  disabled={!selectedTechnician || isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Availability
                </Button>
              </div>

              {showAvailabilityForm && (
                <Card className="mb-6 border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-md">Add Regular Availability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Day of Week
                        </label>
                        <Select
                          value={availabilityForm.dayOfWeek.toString()}
                          onChange={(e) => setAvailabilityForm({
                            ...availabilityForm,
                            dayOfWeek: parseInt(e.target.value)
                          })}
                          options={dayOptions}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Recurring
                        </label>
                        <Select
                          value={availabilityForm.isRecurring.toString()}
                          onChange={(e) => setAvailabilityForm({
                            ...availabilityForm,
                            isRecurring: e.target.value === 'true'
                          })}
                          options={[
                            { value: 'true', label: 'Yes - Weekly' },
                            { value: 'false', label: 'No - One Time' }
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={availabilityForm.startTime}
                          onChange={(e) => setAvailabilityForm({
                            ...availabilityForm,
                            startTime: e.target.value
                          })}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={availabilityForm.endTime}
                          onChange={(e) => setAvailabilityForm({
                            ...availabilityForm,
                            endTime: e.target.value
                          })}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAvailabilityForm(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddAvailability}
                        disabled={isLoading}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Availability
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {isLoading ? (
                  <p>Loading availabilities...</p>
                ) : availabilities.length === 0 ? (
                  <p>No regular availability set for this technician. Add their working hours to enable scheduling.</p>
                ) : (
                  availabilities.map((avail) => (
                    <Card key={avail.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{getDayName(avail.day_of_week)}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {avail.start_time.substring(0, 5)} - {avail.end_time.substring(0, 5)}
                              {avail.recurring ? ' (Weekly)' : ' (One Time)'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAvailability(avail.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="exceptions">
              <div className="mb-4 flex justify-end">
                <Button
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setExceptionForm(prev => ({
                      ...prev,
                      exceptionDate: dayjs(today).format('YYYY-MM-DD'),
                      userId: selectedTechnician
                    }));
                    setShowExceptionForm(true);
                  }}
                  disabled={!selectedTechnician || isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Off
                </Button>
              </div>

              {showExceptionForm && (
                <Card className="mb-6 border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-md">
                      {exceptionForm.isAvailable ? 'Add Special Availability' : 'Add Time Off'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={exceptionForm.exceptionDate}
                          onChange={(e) => setExceptionForm({
                            ...exceptionForm,
                            exceptionDate: e.target.value
                          })}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <Select
                          value={exceptionForm.isAvailable.toString()}
                          onChange={(e) => setExceptionForm({
                            ...exceptionForm,
                            isAvailable: e.target.value === 'true'
                          })}
                          options={[
                            { value: 'false', label: 'Time Off - Unavailable' },
                            { value: 'true', label: 'Special Hours - Available' }
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={exceptionForm.startTime}
                          onChange={(e) => setExceptionForm({
                            ...exceptionForm,
                            startTime: e.target.value
                          })}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={exceptionForm.endTime}
                          onChange={(e) => setExceptionForm({
                            ...exceptionForm,
                            endTime: e.target.value
                          })}
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Reason
                        </label>
                        <input
                          type="text"
                          value={exceptionForm.reason}
                          onChange={(e) => setExceptionForm({
                            ...exceptionForm,
                            reason: e.target.value
                          })}
                          placeholder="E.g., Vacation, Training, Sick Leave"
                          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowExceptionForm(false);
                          setSelectedDate(null);
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddException}
                        disabled={isLoading}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save {exceptionForm.isAvailable ? 'Special Hours' : 'Time Off'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {isLoading ? (
                  <p>Loading exceptions...</p>
                ) : exceptions.length === 0 ? (
                  <p>No time off or special availability records found.</p>
                ) : (
                  exceptions.map((exception) => (
                    <Card 
                      key={exception.id} 
                      className={`border ${exception.is_available ? 'border-green-200' : 'border-red-200'}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">
                              {dayjs(exception.exception_date).format('MMM D, YYYY')}
                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                exception.is_available 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {exception.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exception.is_available 
                                ? `Special Hours: ${exception.start_time?.substring(0, 5) || ''} - ${exception.end_time?.substring(0, 5) || ''}` 
                                : `Time Off: All Day`}
                            </p>
                            {exception.reason && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {exception.reason}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteException(exception.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 