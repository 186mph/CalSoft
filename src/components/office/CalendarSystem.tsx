import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addMonths, subMonths, parseISO, isSameDay, isBefore, isAfter, isSameMonth } from 'date-fns';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { 
  SelectRoot as Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { Search, Plus, CalendarIcon, Clock, MapPin, Users, Tag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/toast';
import CalendarNotifications from './CalendarNotifications';

// Define event types
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  category: EventCategory;
  attendees?: string[];
  isAllDay?: boolean;
  reminders?: EventReminder[];
}

type EventCategory = 'meeting' | 'personal' | 'holiday' | 'deadline' | 'training' | 'other';

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  category: EventCategory;
  attendees: string;
  isAllDay: boolean;
}

interface EventReminder {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  sent: boolean;
}

// Sample data - replace with API calls
const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync-up to discuss project progress',
    startTime: '2024-03-18T10:00:00',
    endTime: '2024-03-18T11:00:00',
    location: 'Conference Room A',
    category: 'meeting',
    attendees: ['John Doe', 'Jane Smith', 'Bob Johnson']
  },
  {
    id: '2',
    title: 'Client Presentation',
    description: 'Presenting new product features to key client',
    startTime: '2024-03-20T14:00:00',
    endTime: '2024-03-20T15:30:00',
    location: 'Board Room',
    category: 'meeting',
    attendees: ['Jane Smith', 'Sarah Wilson', 'Mike Thompson']
  },
  {
    id: '3',
    title: 'Product Training',
    description: 'Training session for new hires on product features',
    startTime: '2024-03-22T09:00:00',
    endTime: '2024-03-22T12:00:00',
    location: 'Training Room',
    category: 'training',
    attendees: ['Bob Johnson', 'New Hires']
  },
  {
    id: '4',
    title: 'Project Deadline',
    description: 'Final submission deadline for Q1 project',
    startTime: '2024-03-31T00:00:00',
    endTime: '2024-03-31T23:59:59',
    category: 'deadline',
    isAllDay: true
  },
  {
    id: '5',
    title: 'Company Holiday',
    description: 'Office closed for spring holiday',
    startTime: '2024-04-01T00:00:00',
    endTime: '2024-04-01T23:59:59',
    category: 'holiday',
    isAllDay: true
  }
];

// Event category options and colors
const eventCategories = [
  { value: 'meeting', label: 'Meeting', color: 'bg-blue-500' },
  { value: 'personal', label: 'Personal', color: 'bg-green-500' },
  { value: 'holiday', label: 'Holiday', color: 'bg-red-500' },
  { value: 'deadline', label: 'Deadline', color: 'bg-amber-500' },
  { value: 'training', label: 'Training', color: 'bg-purple-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' }
];

const getCategoryColor = (category: EventCategory) => {
  return eventCategories.find(c => c.value === category)?.color || 'bg-gray-500';
};

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export default function CalendarSystem() {
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [eventForm, setEventForm] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '10:00',
    location: '',
    category: 'meeting',
    attendees: '',
    isAllDay: false
  });

  // Add reminders state
  const [reminders, setReminders] = useState<EventReminder[]>([]);

  // Filter events based on search and category
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handle event submission
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!eventForm.title.trim()) {
        throw new Error('Event title is required');
      }
      
      const startDateTime = `${eventForm.startDate}T${eventForm.isAllDay ? '00:00:00' : eventForm.startTime}`;
      const endDateTime = `${eventForm.endDate}T${eventForm.isAllDay ? '23:59:59' : eventForm.endTime}`;
      
      // Check that end date/time is after start date/time
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        throw new Error('End time must be after start time');
      }
      
      // Create event object
      const newEvent: CalendarEvent = {
        id: selectedEvent?.id || Math.random().toString(36).substr(2, 9),
        title: eventForm.title,
        description: eventForm.description,
        startTime: startDateTime,
        endTime: endDateTime,
        location: eventForm.location,
        category: eventForm.category,
        attendees: eventForm.attendees ? eventForm.attendees.split(',').map(a => a.trim()) : [],
        isAllDay: eventForm.isAllDay
      };
      
      if (selectedEvent) {
        // Update existing event
        setEvents(events.map(e => e.id === selectedEvent.id ? newEvent : e));
      } else {
        // Add new event
        setEvents([...events, newEvent]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error submitting event:', error);
      setFormError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowEventForm(false);
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '10:00',
      location: '',
      category: 'meeting',
      attendees: '',
      isAllDay: false
    });
    setFormError(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
    if (selectedEvent?.id === eventId) {
      resetForm();
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    const startDate = event.startTime.split('T')[0];
    const startTime = event.startTime.split('T')[1].substring(0, 5);
    const endDate = event.endTime.split('T')[0];
    const endTime = event.endTime.split('T')[1].substring(0, 5);
    
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      startDate,
      startTime,
      endDate,
      endTime,
      location: event.location || '',
      category: event.category,
      attendees: event.attendees?.join(', ') || '',
      isAllDay: event.isAllDay || false
    });
    setShowEventForm(true);
  };

  // Calendar navigation
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setCurrentMonth(new Date());
  };

  // Calendar rendering helpers
  const renderCalendarDays = () => {
    const days: Date[] = [];
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    let day = startDate;
    
    while (day <= endDate) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    
    return days.map((day) => renderDayCell(day));
  };

  const getDayEvents = (day: Date) => {
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return (isSameDay(day, eventStart) || isSameDay(day, eventEnd) || 
              (isAfter(day, eventStart) && isBefore(day, eventEnd)));
    });
  };

  const renderDayCell = (day: Date) => {
    const dayEvents = getDayEvents(day);
    const isToday = isSameDay(day, new Date());
    const isSelected = isSameDay(day, selectedDate);
    const isCurrentMonth = isSameMonth(day, currentMonth);
    
    return (
      <div 
        key={day.toString()} 
        className={`
          h-24 border p-1 overflow-hidden
          ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500' : ''}
        `}
        onClick={() => setSelectedDate(day)}
      >
        <div className="font-semibold text-sm mb-1">{format(day, 'd')}</div>
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => (
            <div 
              key={event.id}
              className={`text-xs px-1 py-0.5 rounded truncate text-white ${getCategoryColor(event.category)}`}
              onClick={(e) => {
                e.stopPropagation();
                handleEditEvent(event);
              }}
            >
              {event.isAllDay ? '◆ ' : `${format(parseISO(event.startTime), 'HH:mm')} `}
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = renderCalendarDays();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="calendar-month">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="font-semibold text-center py-2 text-sm">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hourRows = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8 min-w-[800px]">
          {/* Header row with day names */}
          <div className="sticky top-0 bg-white dark:bg-gray-950 z-10 border-b font-semibold">
            Hour
          </div>
          {weekDays.map(day => (
            <div 
              key={day.toString()} 
              className={`
                sticky top-0 bg-white dark:bg-gray-950 z-10 p-2 text-center border-b font-semibold
                ${isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
            >
              <div>{format(day, 'EEE')}</div>
              <div>{format(day, 'MMM d')}</div>
            </div>
          ))}
          
          {/* Hour rows */}
          {hourRows.map(hour => (
            <React.Fragment key={hour}>
              <div className="border-r border-b py-2 px-1 text-sm sticky left-0 bg-white dark:bg-gray-950">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map(day => {
                const currentHourDate = new Date(day);
                currentHourDate.setHours(hour);
                const hourEvents = filteredEvents.filter(event => {
                  const eventStart = new Date(event.startTime);
                  const eventEnd = new Date(event.endTime);
                  // Check if event starts in this hour or spans this hour
                  return (
                    (isSameDay(day, eventStart) && eventStart.getHours() === hour) ||
                    (isSameDay(day, eventStart) && event.isAllDay) ||
                    (eventStart < currentHourDate && eventEnd > currentHourDate)
                  );
                });
                
                return (
                  <div key={day.toString()} className="border-b p-1 relative min-h-14">
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 mb-1 rounded text-white ${getCategoryColor(event.category)}`}
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="font-semibold">{event.title}</div>
                        {!event.isAllDay && (
                          <div>{format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hourRows = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="relative">
          <div className="sticky top-0 bg-white dark:bg-gray-950 z-10 p-2 text-center border-b font-semibold">
            <div>{format(selectedDate, 'EEEE')}</div>
            <div>{format(selectedDate, 'MMMM d, yyyy')}</div>
          </div>
          
          {hourRows.map(hour => {
            const currentHourDate = new Date(selectedDate);
            currentHourDate.setHours(hour);
            
            const hourEvents = filteredEvents.filter(event => {
              const eventStart = new Date(event.startTime);
              const eventEnd = new Date(event.endTime);
              // Check if event starts in this hour or spans this hour
              return (
                (isSameDay(selectedDate, eventStart) && eventStart.getHours() === hour) ||
                (isSameDay(selectedDate, eventStart) && event.isAllDay) ||
                (eventStart < currentHourDate && eventEnd > currentHourDate)
              );
            });
            
            return (
              <div key={hour} className="grid grid-cols-6 border-b">
                <div className="border-r py-4 px-2 text-sm col-span-1 sticky left-0 bg-white dark:bg-gray-950">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="p-2 col-span-5">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className={`p-2 mb-2 rounded text-white ${getCategoryColor(event.category)}`}
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="font-semibold">{event.title}</div>
                      {!event.isAllDay && (
                        <div className="text-sm">
                          {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-sm mt-1">
                          <MapPin className="h-3 w-3 mr-1" /> {event.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add notification handling functions
  const handleAddReminder = (eventId: string, reminderData: Omit<EventReminder, 'id' | 'sent'>) => {
    const newReminder: EventReminder = {
      ...reminderData,
      id: `reminder-${Date.now()}`,
      sent: false
    };
    
    setReminders(prev => [...prev, newReminder]);
    
    // Update the event with the reminder
    setEvents(prev => 
      prev.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            reminders: [...(event.reminders || []), newReminder]
          };
        }
        return event;
      })
    );
    
    toast({
      title: 'Reminder Set',
      description: `Reminder added for event "${events.find(e => e.id === eventId)?.title}"`,
      variant: 'default',
    });
  };
  
  const handleDismissReminder = (eventId: string, reminderId: string) => {
    // Mark reminder as sent
    setReminders(prev => 
      prev.map(reminder => {
        if (reminder.id === reminderId) {
          return { ...reminder, sent: true };
        }
        return reminder;
      })
    );
    
    // Update the event
    setEvents(prev => 
      prev.map(event => {
        if (event.id === eventId && event.reminders) {
          return {
            ...event,
            reminders: event.reminders.map(r => 
              r.id === reminderId ? { ...r, sent: true } : r
            )
          };
        }
        return event;
      })
    );
  };
  
  const handleViewEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowEventForm(true);
    }
  };
  
  const handleIntegrateWithBooking = (eventId: string, roomId: string) => {
    // In a real app, this would call an API to book the room
    console.log(`Booking room ${roomId} for event ${eventId}`);
    
    // Update the event with location information
    setEvents(prev => 
      prev.map(event => {
        if (event.id === eventId) {
          const roomName = `Room ${roomId}`;
          return {
            ...event,
            location: roomName
          };
        }
        return event;
      })
    );
    
    toast({
      title: 'Room Booked',
      description: `Successfully booked room for event`,
      variant: 'default',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Company Calendar</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowEventForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>
      
      {/* Add notifications component */}
      <CalendarNotifications 
        events={events as any}
        onAddReminder={handleAddReminder as any}
        onDismissReminder={handleDismissReminder}
        onViewEvent={handleViewEvent}
        onIntegrateWithBooking={handleIntegrateWithBooking}
      />
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={prevMonth} size="sm">&lt;</Button>
              <h3 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
              <Button variant="outline" onClick={nextMonth} size="sm">&gt;</Button>
              <Button variant="outline" onClick={goToToday} size="sm">Today</Button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2">
              <Tabs defaultValue="month" onValueChange={(v) => setViewMode(v as any)} className="md:w-auto">
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-9 w-40 md:w-60"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {eventCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </CardContent>
      </Card>

      {/* Event Form Dialog */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent 
                ? 'Edit the details of your event' 
                : 'Enter the details of your new event'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEventSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title *</label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                placeholder="Team Meeting"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                placeholder="Meeting details and agenda..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 my-4">
              <input
                type="checkbox"
                id="all-day"
                checked={eventForm.isAllDay}
                onChange={(e) => setEventForm({...eventForm, isAllDay: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="all-day" className="text-sm font-medium">All-day event</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({...eventForm, startDate: e.target.value})}
                  required
                />
              </div>
              {!eventForm.isAllDay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time *</label>
                  <Select
                    value={eventForm.startTime}
                    onValueChange={(value) => setEventForm({...eventForm, startTime: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date *</label>
                <Input
                  type="date"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})}
                  required
                />
              </div>
              {!eventForm.isAllDay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time *</label>
                  <Select
                    value={eventForm.endTime}
                    onValueChange={(value) => setEventForm({...eventForm, endTime: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                placeholder="Conference Room A"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select
                value={eventForm.category}
                onValueChange={(value) => setEventForm({...eventForm, category: value as EventCategory})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {eventCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${category.color}`}></div>
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Attendees</label>
              <Input
                value={eventForm.attendees}
                onChange={(e) => setEventForm({...eventForm, attendees: e.target.value})}
                placeholder="John Doe, Jane Smith (comma separated)"
              />
              <p className="text-xs text-gray-500">Separate names with commas</p>
            </div>

            <DialogFooter className="flex justify-between items-center">
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  Delete
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedEvent ? 'Update' : 'Create')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 