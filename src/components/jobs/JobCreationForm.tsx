import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { Plus } from 'lucide-react';

interface JobCreationFormProps {
  division: 'calibration' | 'armadillo' | 'scavenger';
  onJobCreated?: () => void;
  compact?: boolean;
  buttonText?: string;
}

interface FormData {
  customer_id: string;
  title: string;
  description: string;
  budget?: string;
  start_date: string;
  due_date?: string;
  priority: '7-day' | '3-day' | '2-day' | 'same-day' | 'on-site' | '1-month' | '1-day' | '14-day' | '6-month' | '5-day';
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  company_name?: string;
}

export function JobCreationForm({ division, onJobCreated, compact = false, buttonText }: JobCreationFormProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    priority: '7-day'
  });

  // Function to open the dialog from outside
  const openDialog = () => {
    setShowForm(true);
  };

  // Add ref to expose methods
  React.useImperativeHandle(
    React.createRef(),
    () => ({
      openDialog
    })
  );

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .schema('business')
        .from('customers')
        .select('id, name, company_name')
        .order('name');

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (err) {
      console.error('Error in fetchCustomers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a job",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customer_id || !formData.title) {
      toast({
        title: "Error",
        description: "Customer and job title are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get a unique job number
      const { data: maxJobNumber } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select('job_number')
        .order('job_number', { ascending: false })
        .limit(1);
      
      let nextJobNumber = 1000;
      if (maxJobNumber && maxJobNumber.length > 0) {
        const match = maxJobNumber[0].job_number.match(/\d+/);
        if (match) {
          nextJobNumber = parseInt(match[0]) + 1;
        }
      }

      // Map division to portal type
      let portalType = 'neta';
      if (division === 'calibration' || division === 'armadillo') {
        portalType = 'lab';
      } else if (division === 'scavenger') {
        portalType = 'scavenger';
      }

      // Create the job
      const { data, error } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .insert({
          user_id: user.id,
          customer_id: formData.customer_id,
          title: formData.title,
          description: formData.description,
          status: 'pending',
          start_date: formData.start_date,
          due_date: formData.due_date,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          notes: formData.notes,
          job_number: 'JOB-' + nextJobNumber.toString().padStart(4, '0'),
          priority: formData.priority,
          division: division,
          job_type: 'neta_technician',
          portal_type: portalType,
          created_by: user.id,
          source: 'direct_entry'
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Job created successfully"
      });

      setShowForm(false);
      setFormData({
        customer_id: '',
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        priority: '7-day'
      });

      if (onJobCreated) {
        onJobCreated();
      }
    } catch (err: any) {
      console.error('Error creating job:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to create job",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {compact ? (
        <Button 
          onClick={() => setShowForm(true)} 
          id={`${division}-job-button`}
          className={`${
            division === 'calibration' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : division === 'armadillo' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-purple-600 hover:bg-purple-700'
          } text-white font-medium px-4 py-2`}
        >
          <Plus className="h-4 w-4 mr-2" />
          {buttonText || `Create ${division.charAt(0).toUpperCase() + division.slice(1)} Job`}
        </Button>
      ) : (
        <Card className="p-4 mb-6 bg-white dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">NETA Technician Jobs</h2>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Job
            </Button>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create NETA Technician jobs directly for {division.charAt(0).toUpperCase() + division.slice(1)} division
          </p>
        </Card>
      )}
      
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New {division.charAt(0).toUpperCase() + division.slice(1)} NETA Technician Job</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <Select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleInputChange}
                  className="w-full"
                  options={customers.map(customer => ({
                    value: customer.id,
                    label: customer.company_name || customer.name
                  }))}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name || customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Job Title *</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Budget</label>
                <Input
                  type="number"
                  name="budget"
                  value={formData.budget || ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full"
                  options={[
                    { value: '7-day', label: '7-Day' },
                    { value: '3-day', label: '3-Day' },
                    { value: '2-day', label: '2 day' },
                    { value: 'same-day', label: 'Same-Day' },
                    { value: 'on-site', label: 'On-Site' },
                    { value: '1-month', label: '1-Month' },
                    { value: '1-day', label: '1-Day' },
                    { value: '14-day', label: '14 Day' },
                    { value: '6-month', label: '6 - Month' },
                    { value: '5-day', label: '5-Day' }
                  ]}
                >
                  <option value="7-day">7-Day</option>
                  <option value="3-day">3-Day</option>
                  <option value="2-day">2 day</option>
                  <option value="same-day">Same-Day</option>
                  <option value="on-site">On-Site</option>
                  <option value="1-month">1-Month</option>
                  <option value="1-day">1-Day</option>
                  <option value="14-day">14 Day</option>
                  <option value="6-month">6 - Month</option>
                  <option value="5-day">5-Day</option>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <Input
                  type="date"
                  name="due_date"
                  value={formData.due_date || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Additional information..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Job'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 