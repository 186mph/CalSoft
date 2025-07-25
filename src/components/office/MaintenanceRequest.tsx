import React, { useState } from 'react';
import { format } from 'date-fns';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  submittedBy: string;
  submittedAt: string;
  assignedTo?: string;
  completedAt?: string;
  notes?: string[];
}

interface MaintenanceFormData {
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const priorityColors = {
  low: 'default',
  medium: 'secondary',
  high: 'destructive',
  urgent: 'destructive',
} as const;

const statusColors = {
  pending: 'secondary',
  'in-progress': 'default',
  completed: 'outline',
  cancelled: 'destructive',
} as const;

// Sample data - replace with API calls
const sampleRequests: MaintenanceRequest[] = [
  {
    id: '1',
    title: 'AC Not Working',
    description: 'The air conditioning unit in Conference Room A is not cooling properly.',
    location: 'Conference Room A',
    priority: 'high',
    status: 'pending',
    submittedBy: 'John Doe',
    submittedAt: '2024-01-15T10:30:00Z',
    notes: ['Technician scheduled for inspection'],
  },
  {
    id: '2',
    title: 'Light Bulb Replacement',
    description: 'Three light bulbs need replacement in the main hallway.',
    location: 'Main Hallway',
    priority: 'low',
    status: 'completed',
    submittedBy: 'Jane Smith',
    submittedAt: '2024-01-14T15:45:00Z',
    completedAt: '2024-01-14T17:20:00Z',
    assignedTo: 'Mike Johnson',
    notes: ['Replaced with LED bulbs', 'All lights functioning properly'],
  },
];

export default function MaintenanceRequest() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>(sampleRequests);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState<MaintenanceFormData>({
    title: '',
    description: '',
    location: '',
    priority: 'medium',
  });

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!requestForm.title.trim() || !requestForm.location.trim() || !requestForm.description.trim()) {
        throw new Error('Please fill in all required fields');
      }

      // Create request
      const newRequest: MaintenanceRequest = {
        id: Math.random().toString(36).substr(2, 9),
        ...requestForm,
        status: 'pending',
        submittedBy: 'Current User', // Replace with actual user
        submittedAt: new Date().toISOString(),
        notes: [],
      };

      setRequests(prev => [newRequest, ...prev]);
      setShowRequestForm(false);
      setRequestForm({
        title: '',
        description: '',
        location: '',
        priority: 'medium',
      });
      setRequestError(null);
    } catch (error) {
      console.error('Error creating request:', error);
      setRequestError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = (requestId: string, newStatus: MaintenanceRequest['status']) => {
    setRequests(prev => prev.map(request => {
      if (request.id === requestId) {
        return {
          ...request,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : request.completedAt,
        };
      }
      return request;
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Maintenance Requests</h2>
        <Button onClick={() => setShowRequestForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Priority' },
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-sm text-gray-500">{request.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{request.location}</TableCell>
                    <TableCell>
                      <Badge variant={priorityColors[request.priority]}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[request.status]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(request.submittedAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(request.submittedAt), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'in-progress')}
                          >
                            Start
                          </Button>
                        )}
                        {request.status === 'in-progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Form Dialog */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>
              Submit a new maintenance request for facility issues.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            {requestError && (
              <Alert variant="destructive">
                <AlertDescription>{requestError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                label="Title*"
                value={requestForm.title}
                onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                required
                placeholder="Brief description of the issue"
              />

              <Input
                label="Location*"
                value={requestForm.location}
                onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                required
                placeholder="Where is the issue located?"
              />

              <Select
                label="Priority*"
                value={requestForm.priority}
                onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as MaintenanceFormData['priority'] })}
                options={[
                  { value: 'low', label: 'Low - Not urgent' },
                  { value: 'medium', label: 'Medium - Should be fixed soon' },
                  { value: 'high', label: 'High - Needs immediate attention' },
                  { value: 'urgent', label: 'Urgent - Critical issue' },
                ]}
                required
              />

              <Textarea
                label="Description*"
                value={requestForm.description}
                onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                required
                placeholder="Detailed description of the maintenance issue..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRequestForm(false);
                  setRequestError(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 