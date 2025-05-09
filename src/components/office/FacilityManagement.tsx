import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  Select,
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem,
  SelectRoot 
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Calendar } from '@/components/ui/Calendar';
import { Search, Plus, Calendar as CalendarIcon, Users, MapPin, Monitor, Wrench, Package } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import MaintenanceRequest from './MaintenanceRequest';
import AssetTracking from './AssetTracking';

interface Room {
  id: string;
  name: string;
  capacity: number;
  amenities: string[];
  description: string;
  location: string;
}

interface Booking {
  id: string;
  roomId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: number;
  isRecurring: boolean;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: string;
  };
}

type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate: string;
}

interface BookingFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: number;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
}

// Sample data - replace with API calls
const sampleRooms: Room[] = [
  {
    id: "1",
    name: "Conference Room A",
    capacity: 20,
    amenities: ["Projector", "Whiteboard"],
    description: "Large conference room with modern amenities",
    location: "Main Floor"
  },
  {
    id: '2',
    name: 'Meeting Room B',
    capacity: 8,
    amenities: ['TV Screen', 'Whiteboard'],
    description: "Medium-sized meeting room for small groups",
    location: 'Main Floor',
  },
  {
    id: '3',
    name: 'Training Room C',
    capacity: 30,
    amenities: ['Projector', 'Whiteboard', 'Audio System', 'Training PCs'],
    description: "Large training facility with computer workstations",
    location: 'Main Floor',
  },
  {
    id: '4',
    name: 'Huddle Room D',
    capacity: 4,
    amenities: ['TV Screen', 'Whiteboard'],
    description: "Small huddle space for quick meetings",
    location: 'Second Floor',
  },
  {
    id: '5',
    name: 'Board Room',
    capacity: 16,
    amenities: ['Projector', 'Video Conference System', 'Premium Audio'],
    description: "Executive meeting room with premium amenities",
    location: 'Executive Floor',
  }
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const RoomSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  return (
    <SelectRoot value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a room" />
      </SelectTrigger>
      <SelectContent>
        {sampleRooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            {room.name}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
};

const FilterSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: {value: string, label: string}[];
  placeholder: string;
}) => {
  return (
    <SelectRoot value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
};

export default function FacilityManagement() {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]); // Will be replaced with API data
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('room-booking'); // Default tab

  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    attendees: 1,
    isRecurring: false,
    recurrencePattern: {
      frequency: 'weekly',
      interval: 1,
      endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
    }
  });

  const filteredRooms = sampleRooms.filter(room => {
    const searchLower = searchTerm.toLowerCase();
    return (
      room.name.toLowerCase().includes(searchLower) ||
      room.location.toLowerCase().includes(searchLower) ||
      room.amenities.some(e => e.toLowerCase().includes(searchLower))
    );
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate booking
      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${bookingForm.startTime}`);
      const endDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${bookingForm.endTime}`);

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }

      if (selectedRoom && bookingForm.attendees > selectedRoom.capacity) {
        throw new Error('Number of attendees exceeds room capacity');
      }

      // Check for conflicts
      const hasConflict = checkForBookingConflicts(
        selectedRoom?.id || '',
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        bookingForm.isRecurring ? bookingForm.recurrencePattern : undefined
      );

      if (hasConflict) {
        throw new Error('This time slot is already booked');
      }

      // Create booking
      const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        roomId: selectedRoom?.id || '',
        title: bookingForm.title,
        description: bookingForm.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        attendees: bookingForm.attendees,
        isRecurring: bookingForm.isRecurring,
        recurrencePattern: bookingForm.isRecurring ? bookingForm.recurrencePattern : undefined
      };

      setBookings(prev => [...prev, newBooking]);
      setShowBookingForm(false);
      setBookingForm({
        title: '',
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        attendees: 1,
        isRecurring: false,
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
          endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
        }
      });
      setBookingError(null);
    } catch (error) {
      console.error('Error creating booking:', error);
      setBookingError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkForBookingConflicts = (
    roomId: string,
    startTime: string,
    endTime: string,
    recurrencePattern?: BookingFormData['recurrencePattern']
  ): boolean => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return bookings.some(booking => {
      if (booking.roomId !== roomId) return false;

      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Check if the new booking overlaps with existing booking
      const hasOverlap = (
        (start >= bookingStart && start < bookingEnd) ||
        (end > bookingStart && end <= bookingEnd) ||
        (start <= bookingStart && end >= bookingEnd)
      );

      if (hasOverlap) return true;

      // Check recurring bookings if applicable
      if (recurrencePattern && booking.isRecurring && booking.recurrencePattern) {
        // Implement recurring booking conflict check logic here
        // This is a simplified version - you might want to add more sophisticated checks
        const recurrenceEnd = new Date(recurrencePattern.endDate);
        const bookingRecurrenceEnd = new Date(booking.recurrencePattern.endDate);

        return isWithinInterval(start, { start: bookingStart, end: bookingRecurrenceEnd }) ||
               isWithinInterval(end, { start: bookingStart, end: bookingRecurrenceEnd }) ||
               isWithinInterval(bookingStart, { start, end: recurrenceEnd });
      }

      return false;
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date || new Date());
  };

  const getDayBookings = (date: Date, roomId: string) => {
    return bookings.filter(booking => 
      booking.roomId === roomId && 
      isSameDay(parseISO(booking.startTime), date)
    );
  };

  const renderRoomCard = (room: Room) => {
    const todayBookings = getDayBookings(selectedDate, room.id);
    const isAvailableNow = !todayBookings.some(booking => {
      const now = new Date();
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return now >= bookingStart && now <= bookingEnd;
    });

    return (
      <Card key={room.id} className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{room.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Users className="w-4 h-4" />
              <span>Capacity: {room.capacity}</span>
              <MapPin className="w-4 h-4 ml-2" />
              <span>{room.location}</span>
            </div>
          </div>
          <Badge variant={isAvailableNow ? "outline" : "secondary"}>
            {isAvailableNow ? "Available" : "In Use"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((amenity, index) => (
                <Badge key={index} variant="default" className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {amenity}
                </Badge>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Today's Bookings</h4>
              {todayBookings.length > 0 ? (
                <div className="space-y-2">
                  {todayBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{booking.title}</span>
                      <span className="text-gray-500">
                        {format(parseISO(booking.startTime), 'HH:mm')} - 
                        {format(parseISO(booking.endTime), 'HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No bookings for today</p>
              )}
            </div>
            <Button 
              className="w-full mt-4"
              onClick={() => {
                setSelectedRoom(room);
                setShowBookingForm(true);
              }}
            >
              Book Room
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Facility Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="room-booking" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Room Booking</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>Maintenance</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Assets</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="room-booking">
              <div className="space-y-4">
                <div className="flex justify-between mb-4">
                  <div className="w-1/3 pr-4">
                    <div className="mb-4">
                      <label className="text-sm font-medium">Search Rooms</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                          className="pl-9"
                          placeholder="Search by name or amenities..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-sm font-medium">Select Date</label>
                      <div className="rounded-md border">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          className="rounded-md border"
                        />
                      </div>
                    </div>

                    <div>
                      <Button
                        className="w-full"
                        onClick={() => setShowBookingForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Booking
                      </Button>
                    </div>
                  </div>

                  <div className="w-2/3">
                    <h3 className="font-semibold mb-4">Available Rooms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRooms.map(room => renderRoomCard(room))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maintenance">
              <MaintenanceRequest />
            </TabsContent>
            
            <TabsContent value="assets">
              <AssetTracking />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book a Room</DialogTitle>
            <DialogDescription>
              Schedule a room for your meeting or event.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            {bookingError && (
              <Alert variant="destructive">
                <AlertDescription>{bookingError}</AlertDescription>
              </Alert>
            )}

            {selectedRoom ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedRoom.name}</h3>
                  <p className="text-sm text-gray-500">Capacity: {selectedRoom.capacity} people</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRoom(null)}
                >
                  Change Room
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Room</label>
                <RoomSelect
                  value=""
                  onChange={(value) => {
                    const room = sampleRooms.find(r => r.id === value);
                    setSelectedRoom(room || null);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <div className="border rounded-md p-2">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <FilterSelect
                  value={bookingForm.startTime}
                  onChange={(value) => setBookingForm({...bookingForm, startTime: value})}
                  options={timeSlots}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <FilterSelect
                  value={bookingForm.endTime}
                  onChange={(value) => setBookingForm({...bookingForm, endTime: value})}
                  options={timeSlots}
                  placeholder="Select end time"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Attendees</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedRoom?.capacity || 999}
                  value={bookingForm.attendees}
                  onChange={(e) => setBookingForm({...bookingForm, attendees: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={bookingForm.title}
                onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                placeholder="Meeting title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={bookingForm.description}
                onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                placeholder="Brief description of the meeting"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={bookingForm.isRecurring}
                onCheckedChange={(checked) => setBookingForm({...bookingForm, isRecurring: checked})}
              />
              <label className="text-sm font-medium">Recurring Meeting</label>
            </div>

            {bookingForm.isRecurring && (
              <div className="space-y-4 border-l-2 border-gray-200 pl-4 ml-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Frequency</label>
                    <FilterSelect
                      value={bookingForm.recurrencePattern.frequency}
                      onChange={(value) => setBookingForm({
                        ...bookingForm,
                        recurrencePattern: {
                          ...bookingForm.recurrencePattern,
                          frequency: value as RecurrenceFrequency
                        }
                      })}
                      options={[
                        {value: 'daily', label: 'Daily'},
                        {value: 'weekly', label: 'Weekly'},
                        {value: 'monthly', label: 'Monthly'}
                      ]}
                      placeholder="Select frequency"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Every</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={bookingForm.recurrencePattern.interval}
                      onChange={(e) => setBookingForm({
                        ...bookingForm,
                        recurrencePattern: {
                          ...bookingForm.recurrencePattern,
                          interval: parseInt(e.target.value) || 1
                        }
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={bookingForm.recurrencePattern.endDate}
                    onChange={(e) => setBookingForm({
                      ...bookingForm,
                      recurrencePattern: {
                        ...bookingForm.recurrencePattern,
                        endDate: e.target.value
                      }
                    })}
                    min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBookingForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Book Room
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 