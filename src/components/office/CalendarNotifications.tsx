import React, { useState, useEffect } from 'react';
import { format, addMinutes, isPast, isToday, isTomorrow, parseISO, isWithinInterval, addDays } from 'date-fns';
import { Bell, Mail, CalendarDays, AlertCircle, CheckCircle, X, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { toast } from '@/components/ui/toast';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  category: 'meeting' | 'personal' | 'holiday' | 'deadline' | 'training' | 'other';
  attendees?: string[];
  isAllDay?: boolean;
  reminders?: EventReminder[];
}

interface EventReminder {
  id: string;
  eventId: string;
  time: number; // minutes before event
  type: 'popup' | 'email' | 'both';
  sent: boolean;
}

interface NotificationPreferences {
  enableNotifications: boolean;
  emailNotifications: boolean;
  defaultReminderTime: number; // minutes
  defaultReminderType: 'popup' | 'email' | 'both';
}

// Default reminder times in minutes
const reminderTimes = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

export default function CalendarNotifications({ 
  events, 
  onAddReminder, 
  onDismissReminder,
  onViewEvent,
  onIntegrateWithBooking
}: { 
  events: CalendarEvent[]; 
  onAddReminder: (eventId: string, reminder: Omit<EventReminder, 'id' | 'sent'>) => void;
  onDismissReminder: (eventId: string, reminderId: string) => void;
  onViewEvent: (eventId: string) => void;
  onIntegrateWithBooking: (eventId: string, roomId: string) => void;
}) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableNotifications: true,
    emailNotifications: true,
    defaultReminderTime: 30,
    defaultReminderType: 'both',
  });
  
  const [activeNotifications, setActiveNotifications] = useState<(CalendarEvent & { reminderId?: string })[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  // Sample rooms data - in a real app, this would be fetched from the API
  const rooms = [
    { id: '1', name: 'Conference Room A' },
    { id: '2', name: 'Meeting Room B' },
    { id: '3', name: 'Training Room C' },
    { id: '4', name: 'Huddle Room D' },
    { id: '5', name: 'Board Room' },
  ];

  // Check for upcoming event notifications
  useEffect(() => {
    if (!preferences.enableNotifications) {
      setActiveNotifications([]);
      return;
    }
    
    const now = new Date();
    const upcomingEvents: (CalendarEvent & { reminderId?: string })[] = [];
    
    events.forEach(event => {
      const eventStart = parseISO(event.startTime);
      
      // Skip past events
      if (isPast(eventStart)) return;
      
      // If the event is today or tomorrow, we might need to show a notification
      if (isToday(eventStart) || isTomorrow(eventStart)) {
        // Check if any reminder for this event should be shown
        event.reminders?.forEach(reminder => {
          if (reminder.sent) return;
          
          const reminderTime = addMinutes(eventStart, -reminder.time);
          
          // If the reminder time is now or in the past (but not more than 30 mins ago), show notification
          if (isWithinInterval(now, {
            start: addMinutes(now, -30),
            end: addMinutes(now, 5)
          })) {
            upcomingEvents.push({...event, reminderId: reminder.id});
          }
        });
        
        // If event is starting within next 15 minutes and has no reminders, show a notification
        if (!event.reminders?.length && 
            isWithinInterval(eventStart, {
              start: now,
              end: addMinutes(now, 15)
            })) {
          upcomingEvents.push(event);
        }
      }
    });
    
    setActiveNotifications(upcomingEvents);
    setNotificationCount(upcomingEvents.length);
    
    // Show toast for new notifications
    if (upcomingEvents.length > 0 && upcomingEvents.length !== notificationCount) {
      toast({
        title: 'Calendar Notification',
        description: `You have ${upcomingEvents.length} upcoming events`,
        variant: 'default',
      });
    }
    
    // Polling interval - check every minute
    const interval = setInterval(() => {
      // Same logic as above but in the interval
    }, 60000);
    
    return () => clearInterval(interval);
  }, [events, preferences.enableNotifications, notificationCount]);

  const handleAddReminder = (eventId: string) => {
    onAddReminder(eventId, {
      eventId,
      time: preferences.defaultReminderTime,
      type: preferences.defaultReminderType
    });
  };
  
  const handleDismissReminder = (eventId: string, reminderId?: string) => {
    if (reminderId) {
      onDismissReminder(eventId, reminderId);
    }
    
    setActiveNotifications(prev => prev.filter(n => 
      !(n.id === eventId && n.reminderId === reminderId)
    ));
    
    if (notificationCount > 0) {
      setNotificationCount(prev => prev - 1);
    }
  };
  
  const handleSaveIntegration = () => {
    if (selectedEvent && selectedRoomId) {
      onIntegrateWithBooking(selectedEvent.id, selectedRoomId);
      setShowIntegrationModal(false);
      setSelectedEvent(null);
      
      toast({
        title: 'Room Booked',
        description: `Successfully booked ${rooms.find(r => r.id === selectedRoomId)?.name} for "${selectedEvent.title}"`,
        variant: 'default',
      });
    }
  };
  
  const handleSendEmail = () => {
    setSendingEmail(true);
    
    // Simulate sending email
    setTimeout(() => {
      setSendingEmail(false);
      setShowEmailForm(false);
      
      toast({
        title: 'Email Sent',
        description: 'Calendar event notification has been sent',
        variant: 'default',
      });
    }, 1500);
  };
  
  const getNotificationTime = (event: CalendarEvent) => {
    const startTime = parseISO(event.startTime);
    
    if (isToday(startTime)) {
      return `Today at ${format(startTime, 'h:mm a')}`;
    } else if (isTomorrow(startTime)) {
      return `Tomorrow at ${format(startTime, 'h:mm a')}`;
    } else {
      return format(startTime, 'MMM d, yyyy h:mm a');
    }
  };
  
  const prepareEmail = (event: CalendarEvent) => {
    const attendeeList = event.attendees?.join(', ') || '';
    const startTime = format(parseISO(event.startTime), 'MMM d, yyyy h:mm a');
    const endTime = format(parseISO(event.endTime), 'h:mm a');
    
    setEmailFormData({
      to: attendeeList,
      subject: `Calendar Event: ${event.title}`,
      body: `
Event: ${event.title}
Time: ${startTime} - ${endTime}
Location: ${event.location || 'Not specified'}
${event.description ? `\nDetails: ${event.description}` : ''}
${attendeeList ? `\nAttendees: ${attendeeList}` : ''}
      `.trim()
    });
    
    setShowEmailForm(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calendar Notifications</h3>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b flex justify-between items-center">
                <h4 className="font-medium">Event Notifications</h4>
                <Button variant="outline" size="sm" onClick={() => setShowPreferences(true)}>
                  Settings
                </Button>
              </div>
              
              <div className="max-h-80 overflow-auto">
                {activeNotifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No upcoming event notifications</p>
                  </div>
                ) : (
                  activeNotifications.map(notification => (
                    <div key={`${notification.id}-${notification.reminderId || 'default'}`} 
                        className="p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{notification.title}</h5>
                          <p className="text-sm text-gray-500">
                            {getNotificationTime(notification)}
                          </p>
                          {notification.location && (
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.location}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" 
                                onClick={() => handleDismissReminder(notification.id, notification.reminderId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" 
                                onClick={() => onViewEvent(notification.id)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline"
                                onClick={() => {
                                  setSelectedEvent(notification);
                                  setShowIntegrationModal(true);
                                }}>
                          Book Room
                        </Button>
                        <Button size="sm" variant="outline"
                                onClick={() => prepareEmail(notification)}>
                          Email
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500">
                  Enable or disable notifications in settings
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Customize how you want to be notified about calendar events
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Notifications</h4>
                <p className="text-sm text-gray-500">
                  Show alerts for upcoming events
                </p>
              </div>
              <Switch 
                checked={preferences.enableNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({...preferences, enableNotifications: checked})
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-gray-500">
                  Send email reminders for events
                </p>
              </div>
              <Switch 
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({...preferences, emailNotifications: checked})
                }
                disabled={!preferences.enableNotifications}
              />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Default Reminder Time</h4>
              <Select 
                value={preferences.defaultReminderTime.toString()} 
                onValueChange={(value) => 
                  setPreferences({...preferences, defaultReminderTime: parseInt(value)})
                }
                disabled={!preferences.enableNotifications}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder time" />
                </SelectTrigger>
                <SelectContent>
                  {reminderTimes.map(time => (
                    <SelectItem key={time.value} value={time.value.toString()}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Default Reminder Type</h4>
              <Select 
                value={preferences.defaultReminderType} 
                onValueChange={(value) => 
                  setPreferences({...preferences, defaultReminderType: value as 'popup' | 'email' | 'both'})
                }
                disabled={!preferences.enableNotifications}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popup">Popup only</SelectItem>
                  <SelectItem value="email">Email only</SelectItem>
                  <SelectItem value="both">Both popup and email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Room Integration Dialog */}
      <Dialog open={showIntegrationModal} onOpenChange={setShowIntegrationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Room for Event</DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span>Select a room to book for "{selectedEvent.title}"</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {selectedEvent && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <span className="font-medium">Event: </span>
                  {selectedEvent.title}
                </div>
                <div>
                  <span className="font-medium">Time: </span>
                  {format(parseISO(selectedEvent.startTime), 'MMM d, yyyy h:mm a')} - {format(parseISO(selectedEvent.endTime), 'h:mm a')}
                </div>
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div>
                    <span className="font-medium">Attendees: </span>
                    {selectedEvent.attendees.length}
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Room</label>
              <Select 
                value={selectedRoomId} 
                onValueChange={(value) => setSelectedRoomId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntegrationModal(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedRoomId} onClick={handleSaveIntegration}>
              Book Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Form Dialog */}
      <Dialog open={showEmailForm} onOpenChange={setShowEmailForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Event Notification</DialogTitle>
            <DialogDescription>
              Send email notification to event attendees
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Input
                value={emailFormData.to}
                onChange={(e) => setEmailFormData({...emailFormData, to: e.target.value})}
                placeholder="email@example.com, email2@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={emailFormData.subject}
                onChange={(e) => setEmailFormData({...emailFormData, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                rows={6}
                value={emailFormData.body}
                onChange={(e) => setEmailFormData({...emailFormData, body: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Notification Summary Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Upcoming Events</h3>
              <p className="text-sm text-gray-500">
                You have {activeNotifications.length} upcoming events that need attention
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPreferences(true)}>
                <Bell className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" onClick={() => {}}>
                <Mail className="h-4 w-4 mr-2" />
                Sync Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 