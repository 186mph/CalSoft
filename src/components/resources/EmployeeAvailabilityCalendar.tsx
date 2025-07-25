import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';

import { 
  getResources, 
  getEmployeeAvailabilitySchedule, 
  ResourceAllocation,
  EmployeeResource
} from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const useSnackbar = (): SnackbarContextType => {
  return {
    showSnackbar: (message: string, severity = 'info') => {
      console.log(`[${severity}] ${message}`);
    }
  };
};

interface EmployeeAvailabilityCalendarProps {
  onResourceSelect?: (resourceId: string) => void;
}

export const EmployeeAvailabilityCalendar: React.FC<EmployeeAvailabilityCalendarProps> = ({ 
  onResourceSelect 
}) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [employees, setEmployees] = useState<EmployeeResource[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load employees on component mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        const resources = await getResources('employee');
        setEmployees(resources as EmployeeResource[]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading employees:', error);
        setError('Failed to load employees');
        setLoading(false);
      }
    };

    if (user) {
      loadEmployees();
    }
  }, [user]);

  // Update weekDays when current date changes
  useEffect(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, [currentDate]);

  // Load allocations when employee or date changes
  useEffect(() => {
    const loadAllocations = async () => {
      if (!selectedEmployee) return;
      
      try {
        setLoading(true);
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        
        const schedule = await getEmployeeAvailabilitySchedule(
          selectedEmployee,
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd')
        );
        
        setAllocations(schedule.allocations);
        setLoading(false);
      } catch (error) {
        console.error('Error loading allocations:', error);
        setError('Failed to load availability schedule');
        setLoading(false);
      }
    };

    if (user && selectedEmployee) {
      loadAllocations();
    }
  }, [user, selectedEmployee, currentDate]);

  const handleEmployeeChange = (event: SelectChangeEvent) => {
    setSelectedEmployee(event.target.value);
    if (onResourceSelect) {
      onResourceSelect(event.target.value);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setCurrentDate(date);
    }
  };

  // Calculate hours allocated for each day
  const getHoursForDay = (day: Date) => {
    return allocations.filter(allocation => 
      isWithinInterval(day, {
        start: new Date(allocation.start_date),
        end: new Date(allocation.end_date)
      })
    ).reduce((total, allocation) => total + (allocation.hours_allocated || 0), 0);
  };

  // Determine availability status based on allocated hours
  const getAvailabilityStatus = (hours: number) => {
    if (hours === 0) return 'available';
    if (hours < 8) return 'partially_available';
    return 'unavailable';
  };

  // Get color based on availability status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#e6ffec'; // Light green
      case 'partially_available': return '#fff9c4'; // Light yellow
      case 'unavailable': return '#ffebee'; // Light red
      default: return '#ffffff'; // White
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Employee Availability Calendar</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="employee-select-label">Employee</InputLabel>
          <Select
            labelId="employee-select-label"
            id="employee-select"
            value={selectedEmployee}
            label="Employee"
            onChange={handleEmployeeChange}
          >
            {employees.map(employee => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Week Starting"
            value={currentDate}
            onChange={handleDateChange}
          />
        </LocalizationProvider>
        
        <Button variant="outlined" onClick={handlePreviousWeek}>Previous Week</Button>
        <Button variant="outlined" onClick={handleNextWeek}>Next Week</Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ mt: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
            {weekDays.map(day => (
              <Box 
                key={format(day, 'yyyy-MM-dd')} 
                sx={{ 
                  flex: 1, 
                  p: 1, 
                  textAlign: 'center',
                  borderRight: '1px solid #e0e0e0',
                  '&:last-child': { borderRight: 'none' }
                }}
              >
                <Typography variant="subtitle2">{format(day, 'E')}</Typography>
                <Typography variant="body2">{format(day, 'MMM d')}</Typography>
              </Box>
            ))}
          </Box>
          
          {selectedEmployee ? (
            <Box sx={{ display: 'flex', height: '120px' }}>
              {weekDays.map(day => {
                const hours = getHoursForDay(day);
                const status = getAvailabilityStatus(hours);
                const bgColor = getStatusColor(status);
                
                return (
                  <Box 
                    key={format(day, 'yyyy-MM-dd')} 
                    sx={{ 
                      flex: 1, 
                      p: 1, 
                      textAlign: 'center',
                      borderRight: '1px solid #e0e0e0',
                      '&:last-child': { borderRight: 'none' },
                      backgroundColor: bgColor,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="h6">{hours}</Typography>
                    <Typography variant="body2">hours</Typography>
                    <Chip 
                      label={status.replace('_', ' ')} 
                      size="small"
                      sx={{ 
                        mt: 1,
                        backgroundColor: status === 'available' ? '#4caf50' : 
                                        status === 'partially_available' ? '#ff9800' : 
                                        '#f44336',
                        color: 'white',
                        textTransform: 'capitalize'
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                Select an employee to view their availability
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {selectedEmployee && allocations.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Scheduled Allocations</Typography>
          
          {allocations.map(allocation => (
            <Box key={allocation.id} sx={{ 
              mb: 1, 
              p: 1, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              backgroundColor: '#f5f5f5'
            }}>
              <Typography variant="body2">
                <strong>Job:</strong> {allocation.job_id}
              </Typography>
              <Typography variant="body2">
                <strong>Period:</strong> {format(new Date(allocation.start_date), 'MMM d, yyyy')} - 
                {format(new Date(allocation.end_date), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2">
                <strong>Hours:</strong> {allocation.hours_allocated}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {allocation.status}
              </Typography>
              {allocation.notes && (
                <Typography variant="body2">
                  <strong>Notes:</strong> {allocation.notes}
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default EmployeeAvailabilityCalendar; 