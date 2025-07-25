import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  CalendarEvent, 
  TechnicianAssignment, 
  TechnicianException, 
  PortalType, 
  AssignmentStatus, 
  AvailableTechnician
} from '@/lib/types/scheduling';
import { schedulingService } from '@/lib/services/schedulingService';
import { useAuth } from '@/lib/AuthContext';
import { UserData, User } from '@/lib/types/auth';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import { AlertCircle, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import dayjs from 'dayjs';

interface TechnicianCalendarProps {
  portalType: PortalType;
  division?: string;
  onAssignmentClick?: (assignment: TechnicianAssignment) => void;
  onDateClick?: (date: Date) => void;
  onAddAvailability?: () => void;
  onAddException?: (date: Date) => void;
  selectedTechnician?: string;
  viewOnly?: boolean;
  showAllTechnicians?: boolean;
}

export function TechnicianCalendar({
  portalType,
  division,
  onAssignmentClick,
  onDateClick,
  onAddAvailability,
  onAddException,
  selectedTechnician,
  viewOnly = false,
  showAllTechnicians = false
}: TechnicianCalendarProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [filteredTechnician, setFilteredTechnician] = useState<string | undefined>(selectedTechnician);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<boolean>(false);

  // Handle calendar range changes
  const handleDatesSet = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const formattedStart = dayjs(start).format('YYYY-MM-DD');
    const formattedEnd = dayjs(end).format('YYYY-MM-DD');
    if (formattedStart !== startDate || formattedEnd !== endDate) {
      setStartDate(formattedStart);
      setEndDate(formattedEnd);
    }
  }, [startDate, endDate]);

  // Fetch available technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoading(true);
      setError(null);
      setSchemaError(false);
      try {
        if (showAllTechnicians) {
          try {
            const { data, error } = await schedulingService.getAvailableTechnicians(portalType, division);
            if (error) {
              console.warn("Available technicians view not yet created in database. Using fallback.", error);
              // Set schema error flag to true to show notification
              setSchemaError(true);
              // If the available_technicians view doesn't exist yet, we'll use a fallback
              if (user) {
                const fallbackTechnicians: AvailableTechnician[] = [
                  {
                    user_id: user.id,
                    full_name: user.user_metadata?.name || 'Current User',
                    email: user.email ?? '',
                    division: user.user_metadata?.division || division,
                    portal_type: portalType,
                    day_of_week: 0,
                    start_time: '08:00:00',
                    end_time: '17:00:00'
                  }
                ];
                setTechnicians(fallbackTechnicians);
              }
            } else {
              setTechnicians(data || []);
            }
          } catch (err) {
            console.warn("Error fetching technicians, using fallback:", err);
            setSchemaError(true);
            // Setup fallback data
            if (user) {
              const fallbackTechnicians: AvailableTechnician[] = [
                {
                  user_id: user.id,
                  full_name: user.user_metadata?.name || 'Current User',
                  email: user.email ?? '',
                  division: user.user_metadata?.division || division,
                  portal_type: portalType,
                  day_of_week: 0,
                  start_time: '08:00:00',
                  end_time: '17:00:00'
                }
              ];
              setTechnicians(fallbackTechnicians);
            }
          }
        } else {
          if (user) {
            const currentUserAsTechnician: AvailableTechnician = {
              user_id: user.id,
              full_name: user.user_metadata?.name,
              email: user.email ?? '',
              division: user.user_metadata?.division,
              portal_type: portalType,
              day_of_week: 0,
              start_time: '00:00:00',
              end_time: '00:00:00'
            };
            setTechnicians([currentUserAsTechnician]);
            if (!filteredTechnician) {
              setFilteredTechnician(user.id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching technicians:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch technicians');
        setSchemaError(true);
        
        // Still provide fallback data even in case of error
        if (user) {
          const fallbackTechnicians: AvailableTechnician[] = [
            {
              user_id: user.id,
              full_name: user.user_metadata?.name || 'Current User',
              email: user.email ?? '',
              division: user.user_metadata?.division || division,
              portal_type: portalType,
              day_of_week: 0,
              start_time: '08:00:00',
              end_time: '17:00:00'
            }
          ];
          setTechnicians(fallbackTechnicians);
          if (!filteredTechnician) {
            setFilteredTechnician(user.id);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [user, showAllTechnicians, portalType, division, filteredTechnician]);

  // Fetch calendar data when date range or technician changes
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!startDate || !endDate) return;
      
      setLoading(true);
      setError(null);
      
      try {
        try {
          const { data: assignments, error: assignmentsError } = await schedulingService.getTechnicianAssignments(
            filteredTechnician,
            portalType,
            startDate,
            endDate,
            division
          );

          if (assignmentsError) {
            console.warn("Error fetching assignments, likely schema issue:", assignmentsError);
            setSchemaError(true);
            // Continue with empty assignments array
            setEvents([]);
          } else {
            let exceptions: TechnicianException[] = [];
            if (filteredTechnician) {
              try {
                const { data: exceptionsData, error: exceptionsError } = await schedulingService.getTechnicianExceptions(
                  filteredTechnician,
                  portalType,
                  startDate,
                  endDate
                );

                if (exceptionsError) {
                  console.warn("Error fetching exceptions, likely schema issue:", exceptionsError);
                  // Continue with empty exceptions array
                } else {
                  exceptions = exceptionsData || [];
                }
              } catch (exceptionsErr) {
                console.warn("Error in exceptions fetch:", exceptionsErr);
                // Continue with empty exceptions array
              }
            }

            const calendarEvents = schedulingService.convertToCalendarEvents(
              assignments || [],
              exceptions
            );

            setEvents(calendarEvents);
          }
        } catch (err) {
          console.warn("Database error in assignments fetch:", err);
          setSchemaError(true);
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [startDate, endDate, filteredTechnician, portalType, division]);

  // Handle event click with specific type
  const handleEventClick = (clickInfo: EventClickArg) => { 
    const eventId = clickInfo.event.id;
    // Find the original CalendarEvent from our state
    const sourceEvent = events.find(event => event.id === eventId);

    if (sourceEvent?.source === 'assignment' && onAssignmentClick) {
      // Ensure the data needed for TechnicianAssignment exists
      if (sourceEvent.technician && sourceEvent.job) {
        // Construct the object matching TechnicianAssignment more closely
        const techAssignment: TechnicianAssignment = {
          id: eventId.replace('assignment-', ''),
          user_id: sourceEvent.technician.id,
          job_id: sourceEvent.job.id,
          assignment_date: dayjs(sourceEvent.start).format('YYYY-MM-DD'),
          start_time: dayjs(sourceEvent.start).format('HH:mm:ss'),
          end_time: sourceEvent.end ? dayjs(sourceEvent.end).format('HH:mm:ss') : dayjs(sourceEvent.start).add(1, 'hour').format('HH:mm:ss'), // Handle null end time
          status: sourceEvent.status ?? 'scheduled', // Use nullish coalescing
          notes: undefined, // Add optional fields as undefined if not available
          portal_type: portalType,
          division: division,
          created_at: '', // Placeholder or fetch actual value
          updated_at: '', // Placeholder or fetch actual value
          created_by: undefined, // Add optional fields as undefined
          // Reconstruct nested objects carefully
          user: sourceEvent.technician ? { 
              id: sourceEvent.technician.id,
              // Add other User fields as needed, potentially fetching them
              email: undefined, 
              user_metadata: { name: sourceEvent.technician.name } 
          } as User : undefined, // Cast to User type if needed
          job: sourceEvent.job ? {
            id: sourceEvent.job.id,
            job_number: sourceEvent.job.number,
            title: sourceEvent.job.title,
            // Add other Job fields as needed, potentially fetching them
            status: 'pending', // Placeholder
            division: division,
            customer_id: '',
            created_at: '',
            updated_at: '',
          } : undefined,
          createdBy: undefined // Add optional fields as undefined
        };
        
        onAssignmentClick(techAssignment);
      }
    }
    // Handle exception click if needed
  };

  // Handle date click - revert to any type for now
  const handleDateClick = (arg: any) => { 
    if (!viewOnly && onDateClick) {
      onDateClick(arg.date);
    }
    if (!viewOnly && onAddException) {
      // Potentially call handleAddException(arg.date);
    }
  };

  // Handle adding an exception (keep as is)
  const handleAddException = (date: Date) => {
    if (!viewOnly && onAddException) {
      onAddException(date);
    }
  };

  // Prepare options for the Select component
  const technicianOptions: SelectOption[] = [
    { value: '', label: 'All Technicians' }, // Option for selecting all
    ...technicians.map(tech => ({
      value: tech.user_id,
      label: tech.full_name || tech.email || 'Unknown'
    }))
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" />
          Technician Schedule{division && ` - ${division}`}
        </CardTitle>
        <div className="flex items-center gap-2">
          {showAllTechnicians && (
            <Select
              value={filteredTechnician ?? ''} 
              onChange={(e) => {
                const value = e.target.value;
                setFilteredTechnician(value === '' ? undefined : value);
              }}
              options={technicianOptions}
              className="w-[180px]"
              aria-label="Select Technician"
            />
          )}
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)} className="ml-auto">
            <TabsList>
              <TabsTrigger value="timeGridDay">Day</TabsTrigger>
              <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
              <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          {!viewOnly && onAddAvailability && (
            <Button
              variant="outline"
              onClick={onAddAvailability}
              className="ml-2"
            >
              <Clock className="mr-2 h-4 w-4" />
              Set Availability
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {schemaError && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-300">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Database Setup Required
            </h3>
            <p className="mt-1 text-sm">
              The database schema for technician scheduling is not fully configured. The following tables/views need to be set up:
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm">
              <li><code>common.available_technicians</code> - View for listing technicians</li>
              <li><code>common.technician_assignments</code> - Table for storing assignments</li>
              <li><code>common.technician_exceptions</code> - Table for storing availability exceptions</li>
            </ul>
            <p className="mt-2 text-sm font-medium">
              Please contact your administrator to complete the database setup.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-2">
          <div className="flex gap-2 mb-3">
            <Badge className="bg-[#42a5f5] text-white">
              <Clock className="h-3 w-3 mr-1" /> Scheduled
            </Badge>
            <Badge className="bg-[#ffb74d] text-white">
              <Calendar className="h-3 w-3 mr-1" /> In Progress
            </Badge>
            <Badge className="bg-[#81c784] text-white">
              <CheckCircle className="h-3 w-3 mr-1" /> Completed
            </Badge>
            <Badge className="bg-[#e57373] text-white">
              <XCircle className="h-3 w-3 mr-1" /> Cancelled
            </Badge>
          </div>

          <div style={{ height: '600px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading calendar data...</p>
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={currentView}
                headerToolbar={false}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                editable={!viewOnly}
                selectable={!viewOnly}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                datesSet={handleDatesSet}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={true}
                height="auto"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false,
                  hour12: false
                }}
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  omitZeroMinute: false,
                  meridiem: false,
                  hour12: false
                }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 