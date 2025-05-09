'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  Timer as TimerIcon,
  Category as CategoryIcon,
  LocalShipping as ShippingIcon,
  PieChart as ChartIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  getJobCosts, 
  addJobCost, 
  updateJobCost, 
  deleteJobCost, 
  JobCost, 
  CostType,
  getCostSummary,
  CostSummary
} from '../../services/jobService';

interface JobCostTrackingProps {
  jobId: string;
  budget?: number | null;
}

// Create a typed Grid wrapper to solve the "item" prop type issue
const GridItem = (props: any) => {
  return <Grid {...props} />;
};

export default function JobCostTracking({ jobId, budget }: JobCostTrackingProps) {
  const [costs, setCosts] = useState<JobCost[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<JobCost | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    cost_type: 'labor' as CostType,
    date: format(new Date(), 'yyyy-MM-dd'),
    quantity: '1',
    unit_price: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCostData();
  }, [jobId]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load job costs
      const costsData = await getJobCosts(jobId);
      setCosts(costsData);
      
      // Load cost summary
      const summary = await getCostSummary(jobId);
      setCostSummary(summary);
    } catch (err) {
      console.error('Error loading cost data:', err);
      setError('Failed to load cost data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddCost = () => {
    resetForm();
    setEditingCost(null);
    setFormOpen(true);
  };

  const handleEditCost = (cost: JobCost) => {
    setEditingCost(cost);
    setFormData({
      description: cost.description,
      amount: cost.amount.toString(),
      cost_type: cost.cost_type,
      date: format(new Date(cost.date), 'yyyy-MM-dd'),
      quantity: (cost.quantity || 1).toString(),
      unit_price: (cost.unit_price || cost.amount).toString(),
      notes: cost.notes || ''
    });
    setFormOpen(true);
  };

  const handleDeleteCost = async (costId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this cost entry?')) {
        await deleteJobCost(costId);
        await loadCostData();
      }
    } catch (err) {
      console.error('Error deleting cost:', err);
      setError('Failed to delete cost entry. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      cost_type: 'labor',
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: '1',
      unit_price: '',
      notes: ''
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Amount must be a valid number';
    }
    
    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    }
    
    if (formData.cost_type === 'material' || formData.cost_type === 'equipment') {
      if (!formData.quantity.trim() || isNaN(parseFloat(formData.quantity))) {
        newErrors.quantity = 'Valid quantity is required';
      }
      if (!formData.unit_price.trim() || isNaN(parseFloat(formData.unit_price))) {
        newErrors.unit_price = 'Valid unit price is required';
      }
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
      const costData = {
        job_id: jobId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        cost_type: formData.cost_type,
        date: formData.date,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        notes: formData.notes
      };

      if (editingCost) {
        // Update existing cost
        await updateJobCost(editingCost.id, costData);
      } else {
        // Add new cost
        await addJobCost(costData);
      }
      
      setFormOpen(false);
      await loadCostData();
    } catch (err) {
      console.error('Error saving cost:', err);
      setError('Failed to save cost entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });

    // Auto-calculate amount for material costs
    if (name === 'quantity' || name === 'unit_price') {
      if (formData.cost_type === 'material' || formData.cost_type === 'equipment') {
        const quantity = name === 'quantity' ? value : formData.quantity;
        const unitPrice = name === 'unit_price' ? value : formData.unit_price;
        
        const numQuantity = parseFloat(quantity as string);
        const numUnitPrice = parseFloat(unitPrice as string);
        
        if (!isNaN(numQuantity) && !isNaN(numUnitPrice)) {
          setFormData({
            ...formData,
            [name as string]: value,
            amount: (numQuantity * numUnitPrice).toFixed(2)
          });
        } else {
          setFormData({
            ...formData,
            [name as string]: value
          });
        }
      }
    }

    // When cost type changes, reset relevant fields
    if (name === 'cost_type') {
      if (value === 'material' || value === 'equipment') {
        setFormData({
          ...formData,
          cost_type: value as CostType,
          quantity: formData.quantity || '1',
          unit_price: formData.unit_price || ''
        });
      } else {
        setFormData({
          ...formData,
          cost_type: value as CostType,
          quantity: '1',
          unit_price: formData.amount
        });
      }
    }
    
    // Clear error for this field
    if (errors[name as string]) {
      setErrors({
        ...errors,
        [name as string]: ''
      });
    }
  };

  const getCostTypeIcon = (type: CostType) => {
    switch (type) {
      case 'labor':
        return <TimerIcon />;
      case 'material':
        return <CategoryIcon />;
      case 'equipment':
        return <ShippingIcon />;
      case 'overhead':
        return <MoneyIcon />;
      default:
        return <MoneyIcon />;
    }
  };

  const getCostTypeColor = (type: CostType) => {
    switch (type) {
      case 'labor':
        return 'primary';
      case 'material':
        return 'secondary';
      case 'equipment':
        return 'info';
      case 'overhead':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateBudgetStatus = () => {
    if (!budget || !costSummary) return null;
    
    const totalCost = costSummary.total;
    const remaining = budget - totalCost;
    const percentUsed = (totalCost / budget) * 100;
    
    let color = 'success';
    if (percentUsed > 90) color = 'error';
    else if (percentUsed > 75) color = 'warning';
    
    return {
      used: totalCost,
      remaining,
      percentUsed,
      color
    };
  };

  const budgetStatus = calculateBudgetStatus();

  // Render the cost entries table
  const renderCostsTable = () => {
    return (
      <TableContainer>
        <Table aria-label="job costs table">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costs.length > 0 ? (
              costs.map((cost) => (
                <TableRow key={cost.id} hover>
                  <TableCell>{format(new Date(cost.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{cost.description}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getCostTypeIcon(cost.cost_type)}
                      label={cost.cost_type.charAt(0).toUpperCase() + cost.cost_type.slice(1)}
                      color={getCostTypeColor(cost.cost_type) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{cost.quantity}</TableCell>
                  <TableCell align="right">{cost.unit_price ? formatCurrency(cost.unit_price) : '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(cost.amount)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEditCost(cost)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteCost(cost.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No cost entries found. Click "Add Cost" to add a new entry.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render the cost summary
  const renderCostSummary = () => {
    if (!costSummary) return null;

    return (
      <Grid container spacing={3}>
        <GridItem xs={12} md={6}>
          <Card>
            <CardHeader title="Cost Breakdown" />
            <Divider />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography>Labor</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(costSummary.labor)}</TableCell>
                      <TableCell align="right">{(costSummary.labor / costSummary.total * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 1, color: 'secondary.main' }} />
                          <Typography>Materials</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(costSummary.material)}</TableCell>
                      <TableCell align="right">{(costSummary.material / costSummary.total * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ShippingIcon sx={{ mr: 1, color: 'info.main' }} />
                          <Typography>Equipment</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(costSummary.equipment)}</TableCell>
                      <TableCell align="right">{(costSummary.equipment / costSummary.total * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MoneyIcon sx={{ mr: 1, color: 'warning.main' }} />
                          <Typography>Overhead</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(costSummary.overhead)}</TableCell>
                      <TableCell align="right">{(costSummary.overhead / costSummary.total * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle1">Total Costs</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1">{formatCurrency(costSummary.total)}</Typography>
                      </TableCell>
                      <TableCell align="right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </GridItem>
        
        {budget && budgetStatus && (
          <GridItem xs={12} md={6}>
            <Card>
              <CardHeader title="Budget Status" />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <GridItem xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Total Budget: {formatCurrency(budget)}
                    </Typography>
                  </GridItem>
                  <GridItem xs={12} sm={6}>
                    <Typography variant="body1" color="text.secondary">
                      Spent
                    </Typography>
                    <Typography variant="h6" color={budgetStatus.percentUsed > 100 ? 'error' : 'inherit'}>
                      {formatCurrency(budgetStatus.used)}
                    </Typography>
                  </GridItem>
                  <GridItem xs={12} sm={6}>
                    <Typography variant="body1" color="text.secondary">
                      Remaining
                    </Typography>
                    <Typography variant="h6" color={budgetStatus.remaining < 0 ? 'error' : 'inherit'}>
                      {formatCurrency(budgetStatus.remaining)}
                    </Typography>
                  </GridItem>
                  <GridItem xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(budgetStatus.percentUsed, 100)} 
                          color={budgetStatus.color as any}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="text.secondary">
                          {budgetStatus.percentUsed.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography 
                      variant="caption" 
                      color={budgetStatus.percentUsed > 100 ? 'error' : 'text.secondary'}
                      sx={{ display: 'block', mt: 1 }}
                    >
                      {budgetStatus.percentUsed > 100 
                        ? `Over budget by ${formatCurrency(Math.abs(budgetStatus.remaining))}`
                        : budgetStatus.percentUsed > 90
                          ? 'Approaching budget limit'
                          : 'Budget on track'}
                    </Typography>
                  </GridItem>
                </Grid>
              </CardContent>
            </Card>
          </GridItem>
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          Job Cost Tracking
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCost}
        >
          Add Cost
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="cost tracking tabs">
              <Tab label="Costs" />
              <Tab label="Summary" />
            </Tabs>
          </Box>
          
          <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-costs">
            {activeTab === 0 && renderCostsTable()}
          </Box>
          
          <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-summary">
            {activeTab === 1 && renderCostSummary()}
          </Box>
        </Box>
      )}

      {/* Cost Entry Dialog */}
      <Dialog 
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCost ? 'Edit Cost Entry' : 'Add New Cost Entry'}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <GridItem xs={12} md={6}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                value={formData.description}
                onChange={handleFormChange}
                margin="normal"
                error={!!errors.description}
                helperText={errors.description}
                required
              />
            </GridItem>
            
            <GridItem xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Cost Type</InputLabel>
                <Select
                  name="cost_type"
                  value={formData.cost_type}
                  onChange={handleFormChange as any}
                  label="Cost Type"
                >
                  <MenuItem value="labor">Labor</MenuItem>
                  <MenuItem value="material">Material</MenuItem>
                  <MenuItem value="equipment">Equipment</MenuItem>
                  <MenuItem value="overhead">Overhead</MenuItem>
                </Select>
              </FormControl>
            </GridItem>
            
            <GridItem xs={12} md={6}>
              <TextField
                name="date"
                label="Date"
                type="date"
                fullWidth
                value={formData.date}
                onChange={handleFormChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={errors.date}
                required
              />
            </GridItem>
            
            {(formData.cost_type === 'material' || formData.cost_type === 'equipment') && (
              <>
                <GridItem xs={12} md={6}>
                  <TextField
                    name="quantity"
                    label="Quantity"
                    fullWidth
                    value={formData.quantity}
                    onChange={handleFormChange}
                    margin="normal"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    error={!!errors.quantity}
                    helperText={errors.quantity}
                    required
                  />
                </GridItem>
                
                <GridItem xs={12} md={6}>
                  <TextField
                    name="unit_price"
                    label="Unit Price"
                    fullWidth
                    value={formData.unit_price}
                    onChange={handleFormChange}
                    margin="normal"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    error={!!errors.unit_price}
                    helperText={errors.unit_price}
                    required
                  />
                </GridItem>
              </>
            )}
            
            <GridItem xs={12} md={6}>
              <TextField
                name="amount"
                label="Total Amount"
                fullWidth
                value={formData.amount}
                onChange={handleFormChange}
                margin="normal"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                error={!!errors.amount}
                helperText={errors.amount}
                required
                disabled={formData.cost_type === 'material' || formData.cost_type === 'equipment'}
              />
            </GridItem>
            
            <GridItem xs={12}>
              <TextField
                name="notes"
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleFormChange}
                margin="normal"
              />
            </GridItem>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (editingCost ? 'Update' : 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 