import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Autocomplete,
  IconButton,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import ConstructionIcon from '@mui/icons-material/Construction';

import {
  getResources,
  Resource,
  EmployeeResource,
  EquipmentResource
} from '../../services/jobService';

// Define the ResourceAllocation interface since it seems to be missing from jobService
interface ResourceAllocation {
  id: string;
  job_id: string;
  resource_id: string;
  resource_type: 'employee' | 'equipment';
  start_date: string;
  end_date: string;
  hours_allocated: number;
  quantity_allocated: number;
  notes: string | null;
  status: 'scheduled' | 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Mock implementations of missing functions
const getResourceAllocations = async (jobId: string): Promise<ResourceAllocation[]> => {
  // Implementation would fetch resource allocations for a job
  return [];
};

const createResourceAllocation = async (data: Omit<ResourceAllocation, 'id' | 'created_at' | 'updated_at'>): Promise<ResourceAllocation> => {
  // Implementation would create a resource allocation
  return { id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
};

const updateResourceAllocation = async (id: string, data: Partial<ResourceAllocation>): Promise<ResourceAllocation> => {
  // Implementation would update a resource allocation
  return { id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as ResourceAllocation;
};

const deleteResourceAllocation = async (id: string): Promise<void> => {
  // Implementation would delete a resource allocation
};

// Define the AvailabilityResult interface
interface AvailabilityResult {
  available: boolean;
  totalHours: number;
}

const checkResourceAvailability = async (
  resourceId: string,
  startDate: string,
  endDate: string,
  excludeAllocationId?: string
): Promise<AvailabilityResult> => {
  // Implementation would check resource availability
  return {
    available: true,
    totalHours: 0
  };
};

// Simple formatDate utility
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Simple mock for getUserInfo
const getUserInfo = () => {
  return { id: '1', name: 'User' };
};

interface JobResourcesProps {
  jobId: string;
}

const JobResources: React.FC<JobResourcesProps> = ({ jobId }) => {
  // State
  const [resources, setResources] = useState<Resource[]>([]);
  const [employees, setEmployees] = useState<EmployeeResource[]>([]);
  const [equipment, setEquipment] = useState<EquipmentResource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for allocation form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedAllocation, setSelectedAllocation] = useState<ResourceAllocation | null>(null);
  const [formData, setFormData] = useState<Partial<ResourceAllocation>>({
    job_id: jobId,
    resource_id: '',
    resource_type: 'employee',
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    hours_allocated: 8,
    quantity_allocated: 1,
    notes: '',
    status: 'scheduled'
  });
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityResult | null>(null);

  // Load resources and allocations when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch all resources
        const allResources = await getResources();
        setResources(allResources);
        
        // Separate employees and equipment
        setEmployees(allResources.filter(r => r.type === 'employee') as EmployeeResource[]);
        setEquipment(allResources.filter(r => r.type === 'equipment') as EquipmentResource[]);
        
        // Fetch allocations for this job
        const jobAllocations = await getResourceAllocations(jobId);
        setAllocations(jobAllocations);
        
        setError(null);
      } catch (err) {
        setError('Failed to load resources and allocations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [jobId]);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Clear availability check when resource or dates change
    if (['resource_id', 'start_date', 'end_date'].includes(field)) {
      setAvailabilityCheck(null);
    }
  };

  // Check resource availability
  const checkAvailability = async () => {
    if (!formData.resource_id || !formData.start_date || !formData.end_date) {
      return;
    }
    
    try {
      const result = await checkResourceAvailability(
        formData.resource_id,
        formData.start_date,
        formData.end_date,
        selectedAllocation?.id
      );
      
      setAvailabilityCheck(result);
    } catch (err) {
      console.error("Failed to check availability:", err);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!formData.resource_id || !formData.start_date || !formData.end_date) {
        setError('Required fields are missing');
        return;
      }
      
      // Update or create allocation
      if (selectedAllocation?.id) {
        const updated = await updateResourceAllocation(selectedAllocation.id, formData);
        setAllocations(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await createResourceAllocation(formData as Omit<ResourceAllocation, 'id' | 'created_at' | 'updated_at'>);
        setAllocations(prev => [...prev, created]);
      }
      
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      setError('Failed to save resource allocation');
      console.error(err);
    }
  };

  // Handle allocation deletion
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource allocation?')) {
      try {
        await deleteResourceAllocation(id);
        setAllocations(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        setError('Failed to delete resource allocation');
        console.error(err);
      }
    }
  };

  // Reset the form
  const resetForm = () => {
    setSelectedAllocation(null);
    setFormData({
      job_id: jobId,
      resource_id: '',
      resource_type: 'employee',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      hours_allocated: 8,
      quantity_allocated: 1,
      notes: '',
      status: 'scheduled'
    });
    setAvailabilityCheck(null);
    setError(null);
  };

  // Open the form to edit an existing allocation
  const handleEdit = (allocation: ResourceAllocation) => {
    setSelectedAllocation(allocation);
    setFormData({
      ...allocation,
      job_id: allocation.job_id,
      resource_id: allocation.resource_id,
      resource_type: allocation.resource_type,
    });
    setIsModalOpen(true);
  };

  // Helper to find resource by ID
  const getResourceById = (id: string): Resource | undefined => {
    return resources.find(r => r.id === id);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Resource Allocation</Typography>
        <Button 
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          disabled={loading}
        >
          Add Resource
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : allocations.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No resources have been allocated to this job yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Resource</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocations.map((allocation) => {
                const resource = getResourceById(allocation.resource_id);
                return (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {allocation.resource_type === 'employee' ? (
                          <PersonIcon sx={{ mr: 1 }} />
                        ) : (
                          <ConstructionIcon sx={{ mr: 1 }} />
                        )}
                        {resource?.name || 'Unknown Resource'}
                      </Box>
                    </TableCell>
                    <TableCell>{allocation.resource_type}</TableCell>
                    <TableCell>{formatDate(allocation.start_date)}</TableCell>
                    <TableCell>{formatDate(allocation.end_date)}</TableCell>
                    <TableCell align="right">{allocation.hours_allocated}</TableCell>
                    <TableCell align="right">{allocation.quantity_allocated}</TableCell>
                    <TableCell>
                      <Chip 
                        label={allocation.status}
                        color={
                          allocation.status === 'completed' ? 'success' :
                          allocation.status === 'in_progress' ? 'info' :
                          allocation.status === 'cancelled' ? 'error' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(allocation)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(allocation.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Resource allocation modal form */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAllocation ? 'Edit Resource Allocation' : 'Add Resource Allocation'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="resource-type-label">Resource Type</InputLabel>
                <Select
                  labelId="resource-type-label"
                  value={formData.resource_type || 'employee'}
                  label="Resource Type"
                  onChange={(e) => handleInputChange('resource_type', e.target.value)}
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="equipment">Equipment</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="resource-label">Resource</InputLabel>
                <Select
                  labelId="resource-label"
                  value={formData.resource_id || ''}
                  label="Resource"
                  onChange={(e) => handleInputChange('resource_id', e.target.value)}
                  disabled={!formData.resource_type}
                >
                  {formData.resource_type === 'employee' ? (
                    employees.map(employee => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </MenuItem>
                    ))
                  ) : (
                    equipment.map(item => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date ? new Date(formData.start_date) : null}
                  onChange={(date) => handleInputChange('start_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={formData.end_date ? new Date(formData.end_date) : null}
                  onChange={(date) => handleInputChange('end_date', date?.toISOString())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Hours Allocated"
                type="number"
                value={formData.hours_allocated || 0}
                onChange={(e) => handleInputChange('hours_allocated', parseInt(e.target.value, 10))}
              />

              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={formData.quantity_allocated || 1}
                onChange={(e) => handleInputChange('quantity_allocated', parseInt(e.target.value, 10))}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                value={formData.status || 'scheduled'}
                label="Status"
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />

            {formData.resource_type === 'employee' && formData.resource_id && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button 
                    variant="outlined" 
                    startIcon={<AccessTimeIcon />}
                    onClick={checkAvailability}
                    disabled={!formData.resource_id || !formData.start_date || !formData.end_date}
                  >
                    Check Availability
                  </Button>
                  
                  {availabilityCheck && (
                    <Alert 
                      severity={availabilityCheck.available ? "success" : "warning"}
                      sx={{ ml: 2, flexGrow: 1 }}
                    >
                      {availabilityCheck.available 
                        ? `Resource is available (${availabilityCheck.totalHours} hours already allocated)` 
                        : `Resource may be overallocated (${availabilityCheck.totalHours} hours already allocated)`}
                    </Alert>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedAllocation ? 'Update' : 'Add'} Resource
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobResources; 