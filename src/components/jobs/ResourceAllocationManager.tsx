'use client';

import { useState, useEffect } from 'react';
import { 
  ResourceType, 
  ResourceAllocation,
  Resource, 
  ResourceConflict,
  getResources,
  allocateResource,
  getResourceAllocationsForJob,
  deleteResourceAllocation,
  updateResourceAllocation,
  findResourceConflicts,
  findAvailableResources
} from '../../services/jobService';
import { 
  Box, 
  Button, 
  Card, 
  Chip, 
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
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { 
  Add as AddIcon,
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  ErrorOutline as ErrorIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

// Specialized status chips for different allocation statuses
const AllocationStatusChip = ({ status }: { status: string }) => {
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
  let icon: React.ReactElement | undefined = undefined;
  
  switch (status) {
    case 'planned':
      color = 'info';
      break;
    case 'confirmed':
      color = 'primary';
      icon = <CheckIcon />;
      break;
    case 'in_progress':
      color = 'warning';
      icon = <TimeIcon />;
      break;
    case 'completed':
      color = 'success';
      icon = <CheckIcon />;
      break;
    case 'cancelled':
      color = 'error';
      icon = <ErrorIcon />;
      break;
  }
  
  return (
    <Chip 
      label={status.replace('_', ' ')} 
      color={color} 
      size="small"
      icon={icon}
    />
  );
};

// Resource type icons and colors
const ResourceTypeChip = ({ type }: { type: ResourceType }) => {
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
  
  switch (type) {
    case 'employee':
      color = 'primary';
      break;
    case 'equipment':
      color = 'secondary';
      break;
    case 'material':
      color = 'warning';
      break;
    case 'vehicle':
      color = 'info';
      break;
  }
  
  return <Chip label={type} color={color} size="small" />;
};

// Helper component for conflict severity indicators
const ConflictSeverityIndicator = ({ severity }: { severity: 'low' | 'medium' | 'high' }) => {
  let color: 'success' | 'warning' | 'error' = 'success';
  let label = 'Low';
  
  if (severity === 'medium') {
    color = 'warning';
    label = 'Medium';
  } else if (severity === 'high') {
    color = 'error';
    label = 'High';
  }
  
  return (
    <Chip 
      label={label} 
      color={color} 
      size="small" 
      icon={<WarningIcon />} 
    />
  );
};

interface ResourceAllocationManagerProps {
  jobId: string;
  jobStartDate?: string;
  jobEndDate?: string;
  readOnly?: boolean;
}

export default function ResourceAllocationManager({
  jobId,
  jobStartDate,
  jobEndDate,
  readOnly = false
}: ResourceAllocationManagerProps) {
  // State for resource allocations
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'allocations' | 'conflicts'>('allocations');
  
  // State for resource conflicts
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  
  // State for allocation dialog
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ResourceAllocation | null>(null);
  
  // State for available resources
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  
  // Form state for new allocation
  const [formData, setFormData] = useState({
    resource_id: '',
    resource_type: 'employee' as ResourceType,
    start_date: jobStartDate || new Date().toISOString(),
    end_date: jobEndDate || new Date().toISOString(),
    hours_allocated: 0,
    quantity_allocated: 0,
    notes: '',
    status: 'planned' as ResourceAllocation['status']
  });
  
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'info' | 'warning' | 'error'
  });
  
  // Load resource allocations
  useEffect(() => {
    loadAllocations();
  }, [jobId]);
  
  // Load resource conflicts when allocations change
  useEffect(() => {
    if (allocations.length > 0) {
      loadConflicts();
    }
  }, [allocations]);
  
  const loadAllocations = async () => {
    try {
      setLoading(true);
      const data = await getResourceAllocationsForJob(jobId);
      setAllocations(data);
    } catch (error) {
      console.error('Error loading allocations:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load resource allocations',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadConflicts = async () => {
    try {
      setLoadingConflicts(true);
      const data = await findResourceConflicts(jobId);
      setConflicts(data);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoadingConflicts(false);
    }
  };
  
  const handleAddAllocation = () => {
    setEditingAllocation(null);
    setFormData({
      resource_id: '',
      resource_type: 'employee',
      start_date: jobStartDate || new Date().toISOString(),
      end_date: jobEndDate || new Date().toISOString(),
      hours_allocated: 0,
      quantity_allocated: 0,
      notes: '',
      status: 'planned'
    });
    loadAvailableResources('employee');
    setAllocationDialogOpen(true);
  };
  
  const handleEditAllocation = (allocation: ResourceAllocation) => {
    setEditingAllocation(allocation);
    setFormData({
      resource_id: allocation.resource_id,
      resource_type: allocation.resource_type,
      start_date: allocation.start_date,
      end_date: allocation.end_date,
      hours_allocated: allocation.hours_allocated || 0,
      quantity_allocated: allocation.quantity_allocated || 0,
      notes: allocation.notes || '',
      status: allocation.status
    });
    loadAvailableResources(allocation.resource_type, true);
    setAllocationDialogOpen(true);
  };
  
  const handleDeleteAllocation = async (id: string) => {
    try {
      await deleteResourceAllocation(id);
      await loadAllocations();
      setSnackbar({
        open: true,
        message: 'Resource allocation deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting allocation:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete resource allocation',
        severity: 'error'
      });
    }
  };
  
  const handleSubmitAllocation = async () => {
    try {
      if (editingAllocation) {
        // Update existing allocation
        await updateResourceAllocation(editingAllocation.id, {
          start_date: formData.start_date,
          end_date: formData.end_date,
          hours_allocated: formData.hours_allocated || undefined,
          quantity_allocated: formData.quantity_allocated || undefined,
          notes: formData.notes || undefined,
          status: formData.status
        });
        setSnackbar({
          open: true,
          message: 'Resource allocation updated successfully',
          severity: 'success'
        });
      } else {
        // Create new allocation
        await allocateResource({
          job_id: jobId,
          resource_id: formData.resource_id,
          resource_type: formData.resource_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          hours_allocated: formData.hours_allocated || undefined,
          quantity_allocated: formData.quantity_allocated || undefined,
          notes: formData.notes || undefined,
          status: formData.status
        });
        setSnackbar({
          open: true,
          message: 'Resource allocated successfully',
          severity: 'success'
        });
      }
      
      setAllocationDialogOpen(false);
      await loadAllocations();
    } catch (error) {
      console.error('Error saving allocation:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save resource allocation',
        severity: 'error'
      });
    }
  };
  
  const loadAvailableResources = async (type: ResourceType, includeCurrentResource = false) => {
    try {
      setLoadingResources(true);
      const startDate = formData.start_date;
      const endDate = formData.end_date;
      
      // Find available resources for the given time period
      const resources = await findAvailableResources(
        startDate,
        endDate,
        type
      );
      
      // If editing, include the current resource in the list even if not available
      if (includeCurrentResource && editingAllocation && editingAllocation.resource) {
        const currentResourceExists = resources.some(r => r.id === editingAllocation.resource_id);
        if (!currentResourceExists) {
          const currentResource = editingAllocation.resource;
          resources.push(currentResource as Resource);
        }
      }
      
      setAvailableResources(resources);
    } catch (error) {
      console.error('Error loading available resources:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load available resources',
        severity: 'error'
      });
    } finally {
      setLoadingResources(false);
    }
  };
  
  const handleResourceTypeChange = (type: ResourceType) => {
    setFormData({
      ...formData,
      resource_type: type,
      resource_id: '' // Reset resource ID when changing type
    });
    loadAvailableResources(type);
  };
  
  const handleDateChange = (dateType: 'start' | 'end', date: Date | null) => {
    if (!date) return;
    
    const dateString = date.toISOString();
    const updatedFormData = {
      ...formData,
      [dateType === 'start' ? 'start_date' : 'end_date']: dateString
    };
    
    setFormData(updatedFormData);
    
    // Reload available resources when dates change
    if (formData.resource_type) {
      loadAvailableResources(
        formData.resource_type, 
        !!editingAllocation
      );
    }
  };
  
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInDays(end, start);
    const hours = differenceInHours(end, start);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };
  
  if (loading) {
    return <LinearProgress />;
  }
  
  return (
    <Box sx={{ mb: 4 }}>
      <Tabs 
        value={activeTab} 
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label="Resource Allocations" value="allocations" />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Conflicts
              {conflicts.length > 0 && (
                <Chip 
                  label={conflicts.length} 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          } 
          value="conflicts" 
        />
      </Tabs>
      
      {activeTab === 'allocations' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Resource Allocations</Typography>
            {!readOnly && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleAddAllocation}
              >
                Allocate Resource
              </Button>
            )}
          </Box>
          
          {allocations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No resources allocated to this job yet.
              </Typography>
              {!readOnly && (
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddAllocation}
                  sx={{ mt: 2 }}
                >
                  Allocate Resource
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Resource</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Allocation</TableCell>
                    <TableCell>Status</TableCell>
                    {!readOnly && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        {allocation.resource?.name || 'Unknown Resource'}
                      </TableCell>
                      <TableCell>
                        <ResourceTypeChip type={allocation.resource_type} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(allocation.start_date), 'MMM d, yyyy')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          to {format(new Date(allocation.end_date), 'MMM d, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {calculateDuration(allocation.start_date, allocation.end_date)}
                      </TableCell>
                      <TableCell>
                        {allocation.resource_type === 'material' ? (
                          <Typography variant="body2">
                            {allocation.quantity_allocated} units
                          </Typography>
                        ) : (
                          <Typography variant="body2">
                            {allocation.hours_allocated} hours
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <AllocationStatusChip status={allocation.status} />
                      </TableCell>
                      {!readOnly && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditAllocation(allocation)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDeleteAllocation(allocation.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
      
      {activeTab === 'conflicts' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Resource Conflicts</Typography>
            <Button 
              variant="outlined" 
              onClick={loadConflicts}
              disabled={loadingConflicts}
            >
              Refresh Conflicts
            </Button>
          </Box>
          
          {loadingConflicts ? (
            <LinearProgress />
          ) : conflicts.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No resource conflicts detected.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {conflicts.map((conflict, index) => (
                <Card key={`${conflict.resource_id}-${index}`} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{conflict.resource_name}</Typography>
                    <ConflictSeverityIndicator severity={conflict.severity} />
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Conflict period: {format(new Date(conflict.conflict_start_date), 'MMM d, yyyy')} to {format(new Date(conflict.conflict_end_date), 'MMM d, yyyy')}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="subtitle2">Conflicting Allocations:</Typography>
                  <List dense>
                    {conflict.conflicting_allocations.map((allocation, allocationIndex) => (
                      <ListItem key={`conflict-${index}-allocation-${allocationIndex}`}>
                        <ListItemText
                          primary={`Job ID: ${allocation.job_id}`}
                          secondary={`${format(new Date(allocation.start_date), 'MMM d, yyyy')} to ${format(new Date(allocation.end_date), 'MMM d, yyyy')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
      
      {/* Resource Allocation Dialog */}
      <Dialog 
        open={allocationDialogOpen} 
        onClose={() => setAllocationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAllocation ? 'Edit Resource Allocation' : 'Allocate Resource'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="resource-type-label">Resource Type</InputLabel>
              <Select
                labelId="resource-type-label"
                value={formData.resource_type}
                label="Resource Type"
                onChange={(e) => handleResourceTypeChange(e.target.value as ResourceType)}
                disabled={!!editingAllocation}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="material">Material</MenuItem>
                <MenuItem value="vehicle">Vehicle</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="resource-label">Resource</InputLabel>
              <Select
                labelId="resource-label"
                value={formData.resource_id}
                label="Resource"
                onChange={(e) => setFormData({...formData, resource_id: e.target.value})}
                disabled={!!editingAllocation || loadingResources}
              >
                {loadingResources ? (
                  <MenuItem value="">Loading resources...</MenuItem>
                ) : availableResources.length === 0 ? (
                  <MenuItem value="">No available resources</MenuItem>
                ) : (
                  availableResources.map((resource) => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <DatePicker
                    label="Start Date"
                    value={new Date(formData.start_date)}
                    onChange={(date) => handleDateChange('start', date)}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <DatePicker
                    label="End Date"
                    value={new Date(formData.end_date)}
                    onChange={(date) => handleDateChange('end', date)}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Box>
              </Box>
            </LocalizationProvider>
            
            {formData.resource_type === 'material' ? (
              <TextField
                label="Quantity Allocated"
                type="number"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.quantity_allocated}
                onChange={(e) => setFormData({...formData, quantity_allocated: Number(e.target.value)})}
              />
            ) : (
              <TextField
                label="Hours Allocated"
                type="number"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.hours_allocated}
                onChange={(e) => setFormData({...formData, hours_allocated: Number(e.target.value)})}
              />
            )}
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({...formData, status: e.target.value as ResourceAllocation['status']})}
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocationDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitAllocation} 
            variant="contained" 
            disabled={!formData.resource_id}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 