import React, { useEffect, useState } from 'react';
import { 
  getSurveyTemplates,
  getSurveyTemplateById,
  createCustomerSurvey,
  getCustomerSurveys,
  SurveyTemplate as ServiceSurveyTemplate,
  CustomerSurvey as ServiceCustomerSurvey,
  SurveyResponse as ServiceSurveyResponse
} from '../../services/customerService';
import { useAuth } from '../../lib/AuthContext';
import { Button } from '../ui/Button';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Plus, FileText, Mail, Check, Clock, AlertTriangle, BarChart, Eye } from 'lucide-react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

// Extended interface to include job_id
interface ExtendedCustomerSurvey extends ServiceCustomerSurvey {
  job_id: string;
  contact_id?: string | null;
  template?: ServiceSurveyTemplate;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_primary: boolean;
}

interface JobSurveysProps {
  jobId: string;
  customerId: string;
  contacts: Contact[];
}

export default function JobSurveys({ jobId, customerId, contacts }: JobSurveysProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ServiceSurveyTemplate[]>([]);
  const [surveys, setSurveys] = useState<ExtendedCustomerSurvey[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    templateId: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<{
    templateId?: string;
    notes?: string;
  }>({});
  const [creatingError, setCreatingError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId, jobId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load survey templates
      const templatesData = await getSurveyTemplates();
      setTemplates(templatesData.filter(t => t.is_active));
      
      // Load existing surveys for this job
      const surveysData = await getCustomerSurveys(customerId);
      
      // Filter surveys for the current jobId and cast to our extended interface
      const jobSurveys = surveysData
        .filter(survey => (survey as any).job_id === jobId)
        .map(survey => survey as unknown as ExtendedCustomerSurvey);
      
      setSurveys(jobSurveys);
    } catch (err) {
      console.error('Error loading survey data:', err);
      setError('Failed to load surveys. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    // Set default values
    if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
    if (contacts.length > 0) {
      // Default to primary contact if available
      const primaryContact = contacts.find(c => c.is_primary);
      setSelectedContactId(primaryContact?.id || contacts[0].id);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSelectedTemplateId('');
    setSelectedContactId('');
  };

  const handleCreateSurvey = async () => {
    if (!selectedTemplateId) {
      setError('Please select a survey template');
      return;
    }

    setIsSubmitting(true);
    try {
      // Add job_id to the survey data even though it's not in the official interface
      await createCustomerSurvey({
        template_id: selectedTemplateId,
        customer_id: customerId,
        created_by: user?.id || '',
        notes: '',
        // Add these as additional properties that will be saved in the database
        ...(selectedContactId ? { contact_id: selectedContactId } : {}),
        job_id: jobId
      } as any);
      
      // Refresh surveys
      const surveysData = await getCustomerSurveys(customerId);
      
      // Filter and cast surveys
      const jobSurveys = surveysData
        .filter(survey => (survey as any).job_id === jobId)
        .map(survey => survey as unknown as ExtendedCustomerSurvey);
      
      setSurveys(jobSurveys);
      
      // Close modal
      handleCloseCreateModal();
    } catch (err) {
      console.error('Error creating survey:', err);
      setError('Failed to create survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSurveyStatus = (survey: ExtendedCustomerSurvey) => {
    if (survey.completed_at) {
      return 'completed';
    } else if (survey.sent_at) {
      return 'sent';
    } else {
      return 'draft';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-gray-500">Loading surveys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Customer Surveys</h2>
        <Button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Survey
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          {error}
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-8 text-center rounded-md">
          <FileText className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No surveys yet</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Create a new survey to gather feedback from the customer.
          </p>
          <Button 
            onClick={handleOpenCreateModal}
            className="mt-4"
          >
            Create your first survey
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => {
            const status = getSurveyStatus(survey);
            const contactName = survey.contact_id 
              ? contacts.find(c => c.id === survey.contact_id)?.first_name + ' ' + 
                contacts.find(c => c.id === survey.contact_id)?.last_name
              : 'No contact selected';
            
            return (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{survey.template?.title || 'Untitled Survey'}</CardTitle>
                      <CardDescription>
                        Created on {new Date(survey.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Contact:</strong> {contactName}
                    </p>
                    <p className="text-sm">
                      <strong>Status:</strong> {status === 'completed' ? 'Completed' : status === 'sent' ? 'Awaiting Response' : 'Not Sent'}
                    </p>
                    {survey.sent_at && (
                      <p className="text-sm">
                        <strong>Sent on:</strong> {new Date(survey.sent_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {status === 'completed' ? (
                    <Button variant="outline" className="flex items-center gap-2">
                      <BarChart className="h-4 w-4" />
                      View Results
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Survey
                      </Button>
                      {!survey.sent_at && (
                        <>
                          <Button variant="outline" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Send
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Survey</h2>
            
            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Survey Template</label>
                <select 
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                  disabled={isSubmitting}
                >
                  <option value="">Select a template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Contact (Optional)</label>
                <select 
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                  disabled={isSubmitting}
                >
                  <option value="">No contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} {contact.is_primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleCloseCreateModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSurvey}
                disabled={!selectedTemplateId || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Survey'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 