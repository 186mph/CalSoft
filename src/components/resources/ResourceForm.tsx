import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  FormHelperText,
  IconButton,
  Alert,
  SelectChangeEvent,
  SxProps
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { Resource, ResourceType, AvailabilityStatus, createResource, updateResource } from '../../services/jobService';

interface ResourceFormProps {
  open: boolean;
  onClose: (refreshData?: boolean) => void;
  resource: Resource | null;
}

// Define Grid component alternatives to avoid MUI v7 type errors
interface GridContainerProps {
  sx?: SxProps;
  spacing?: number;
  children?: React.ReactNode;
}

const GridContainer = styled(Box)<GridContainerProps>(({ spacing = 0 }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  margin: spacing ? `-${spacing * 4}px` : 0,
}));

interface GridItemProps {
  xs?: number;
  md?: number;
  children?: React.ReactNode;
}

const GridItem = styled(Box)<GridItemProps>(({ xs, md }) => ({
  padding: '8px',
  flexBasis: xs ? `${(xs / 12) * 100}%` : '100%',
  maxWidth: xs ? `${(xs / 12) * 100}%` : '100%',
  '@media (min-width: 900px)': {
    flexBasis: md ? `${(md / 12) * 100}%` : (xs ? `${(xs / 12) * 100}%` : '100%'),
    maxWidth: md ? `${(md / 12) * 100}%` : (xs ? `${(xs / 12) * 100}%` : '100%')
  }
}));

interface FormState {
  name: string;
  type: ResourceType;
  status: AvailabilityStatus;
  description: string;
  tags: string[];
}

export default function ResourceForm({ open, onClose, resource }: ResourceFormProps) {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    type: 'employee',
    status: 'available',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name,
        type: resource.type,
        status: resource.status,
        description: resource.description || '',
        tags: resource.tags || []
      });
    } else {
      resetForm();
    }
  }, [resource, open]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'employee',
      status: 'available',
      description: '',
      tags: []
    });
    setTagInput('');
    setErrors({});
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value as any
    }));

    // Clear error for this field
    if (errors[name as string]) {
      setErrors(prev => ({
        ...prev,
        [name as string]: ''
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToDelete)
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (resource) {
        // Update existing resource
        await updateResource(resource.id, formData);
      } else {
        // Create new resource
        await createResource(formData);
      }
      onClose(true); // Refresh data after successful submission
    } catch (err) {
      console.error('Error saving resource:', err);
      setError('Failed to save resource. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose()} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {resource ? `Edit Resource: ${resource.name}` : 'Add New Resource'}
          <IconButton onClick={() => onClose()} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <GridContainer spacing={2}>
          <GridItem xs={12} md={6}>
            <TextField
              name="name"
              label="Resource Name"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              error={!!errors.name}
              helperText={errors.name}
              required
              disabled={submitting}
            />
          </GridItem>
          
          <GridItem xs={12} md={6}>
            <FormControl fullWidth margin="normal" error={!!errors.type} required disabled={submitting}>
              <InputLabel id="resource-type-label">Resource Type</InputLabel>
              <Select
                labelId="resource-type-label"
                name="type"
                value={formData.type}
                onChange={handleSelectChange}
                label="Resource Type"
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="material">Material</MenuItem>
                <MenuItem value="vehicle">Vehicle</MenuItem>
              </Select>
              {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
            </FormControl>
          </GridItem>
          
          <GridItem xs={12} md={6}>
            <FormControl fullWidth margin="normal" error={!!errors.status} required disabled={submitting}>
              <InputLabel id="resource-status-label">Status</InputLabel>
              <Select
                labelId="resource-status-label"
                name="status"
                value={formData.status}
                onChange={handleSelectChange}
                label="Status"
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="unavailable">Unavailable</MenuItem>
                <MenuItem value="partially_available">Partially Available</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="out_of_service">Out of Service</MenuItem>
              </Select>
              {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
            </FormControl>
          </GridItem>
          
          <GridItem xs={12}>
            <TextField
              name="description"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              disabled={submitting}
            />
          </GridItem>
          
          <GridItem xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  label="Add Tag"
                  size="small"
                  disabled={submitting}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  sx={{ mr: 1, flexGrow: 1 }}
                />
                <Button 
                  onClick={handleAddTag} 
                  startIcon={<AddIcon />}
                  variant="outlined"
                  disabled={!tagInput.trim() || submitting}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)}
                    color="primary"
                    variant="outlined"
                    disabled={submitting}
                  />
                ))}
                {formData.tags.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No tags added yet
                  </Typography>
                )}
              </Box>
            </Box>
          </GridItem>
        </GridContainer>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => onClose()} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : (resource ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 