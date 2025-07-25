'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent,
  CardHeader,
  Divider,
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
  Paper,
  SelectChangeEvent,
  SxProps
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  PieChart as ChartIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  getJobRevenue, 
  addJobRevenue, 
  updateJobRevenue, 
  deleteJobRevenue, 
  JobRevenue, 
  RevenueSummary,
  getRevenueSummary,
  getProfitabilityAnalysis,
  ProfitabilitySummary
} from '../../services/jobService';

// Extend the interfaces to include missing properties
interface FullRevenueSummary {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  totalRevenue: number;
  byStatus: {
    pending: number;
    approved: number;
    paid: number;
    [key: string]: number;
  };
}

interface FullProfitabilitySummary {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  totalCosts: number;
  profitMargin: number;
  revenueByType: {
    invoice: number;
    payment: number;
    other: number;
  };
  costByType: {
    labor: number;
    material: number;
    equipment: number;
    overhead: number;
  };
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface JobProfitabilityAnalysisProps {
  jobId: string;
  budget?: number | null;
}

// Define Grid component alternatives to avoid MUI v7 type errors
interface GridContainerProps {
  sx?: SxProps;
  children?: React.ReactNode;
}

const GridContainer = styled(Box)<GridContainerProps>({
  display: 'flex',
  flexWrap: 'wrap',
  margin: '-8px'
});

interface GridItemProps {
  xs?: number;
  md?: number;
  key?: any;
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

export default function JobProfitabilityAnalysis({ jobId, budget }: JobProfitabilityAnalysisProps) {
  // Revenue state
  const [revenues, setRevenues] = useState<JobRevenue[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<FullRevenueSummary | null>(null);
  
  // Profitability state
  const [profitabilitySummary, setProfitabilitySummary] = useState<FullProfitabilitySummary | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<JobRevenue | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    revenue_type: 'invoice' as JobRevenue['revenue_type'],
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending' as JobRevenue['status'],
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load job revenues
      const revenueData = await getJobRevenue(jobId);
      setRevenues(revenueData);
      
      // Load revenue summary
      const rSummary = await getRevenueSummary(jobId);
      const extendedSummary: FullRevenueSummary = {
        ...rSummary,
        totalRevenue: rSummary.total,
        byStatus: {
          pending: rSummary.pending,
          approved: rSummary.approved,
          paid: rSummary.paid
        }
      };
      setRevenueSummary(extendedSummary);
      
      // Load profitability analysis
      const pSummary = await getProfitabilityAnalysis(jobId);
      const extendedProfitSummary: FullProfitabilitySummary = {
        ...pSummary,
        totalCosts: pSummary.totalCost,
        profitMargin: pSummary.margin,
        recommendations: [
          {
            title: 'Improve Profit Margin',
            description: pSummary.margin < 0.1 ? 'Current profit margin is below target. Consider reviewing costs or increasing revenue.' : 'Profit margin is healthy.',
            priority: pSummary.margin < 0 ? 'high' : pSummary.margin < 0.1 ? 'medium' : 'low'
          }
        ]
      };
      setProfitabilitySummary(extendedProfitSummary);
    } catch (err) {
      console.error('Error loading profitability data:', err);
      setError('Failed to load profitability data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddRevenue = () => {
    resetForm();
    setEditingRevenue(null);
    setFormOpen(true);
  };

  const handleEditRevenue = (revenue: JobRevenue) => {
    setEditingRevenue(revenue);
    setFormData({
      description: revenue.description,
      amount: revenue.amount.toString(),
      revenue_type: revenue.revenue_type,
      date: format(new Date(revenue.date), 'yyyy-MM-dd'),
      status: revenue.status,
      notes: revenue.notes || ''
    });
    setFormOpen(true);
  };

  const handleDeleteRevenue = async (revenueId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this revenue entry?')) {
        await deleteJobRevenue(revenueId);
        await loadData();
      }
    } catch (err) {
      console.error('Error deleting revenue:', err);
      setError('Failed to delete revenue entry. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      revenue_type: 'invoice',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
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
      const revenueData = {
        job_id: jobId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        revenue_type: formData.revenue_type,
        date: formData.date,
        status: formData.status,
        notes: formData.notes
      };

      if (editingRevenue) {
        await updateJobRevenue(editingRevenue.id, revenueData);
      } else {
        await addJobRevenue(revenueData);
      }

      setFormOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error saving revenue:', err);
      setError('Failed to save revenue entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      [name as string]: value
    }));
  };

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getRevenueTypeChip = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Chip label="Invoice" color="primary" size="small" icon={<ReceiptIcon fontSize="small" />} />;
      case 'payment':
        return <Chip label="Payment" color="success" size="small" icon={<PaymentIcon fontSize="small" />} />;
      default:
        return <Chip label="Other" color="default" size="small" icon={<MoneyIcon fontSize="small" />} />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'approved':
        return <Chip label="Approved" color="info" size="small" />;
      case 'paid':
        return <Chip label="Paid" color="success" size="small" />;
      default:
        return <Chip label={status} color="default" size="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 2 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading profitability data...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="profitability analysis tabs">
          <Tab label="Revenue" icon={<MoneyIcon />} iconPosition="start" />
          <Tab label="Summary" icon={<ChartIcon />} iconPosition="start" />
          <Tab label="Profitability" icon={<TrendingUpIcon />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Revenue Entries
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleAddRevenue}
            >
              Add Revenue
            </Button>
          </Box>
          
          {revenues.length > 0 ? (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="revenue table">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell component="th" scope="row">
                        {revenue.description}
                      </TableCell>
                      <TableCell>{getRevenueTypeChip(revenue.revenue_type)}</TableCell>
                      <TableCell>{formatCurrency(revenue.amount)}</TableCell>
                      <TableCell>{format(new Date(revenue.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusChip(revenue.status)}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditRevenue(revenue)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteRevenue(revenue.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No revenue entries found. Click "Add Revenue" to create one.
            </Alert>
          )}
          
          {/* Revenue Form Dialog */}
          <Dialog 
            open={formOpen} 
            onClose={() => setFormOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingRevenue ? 'Edit Revenue Entry' : 'Add Revenue Entry'}
            </DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <GridContainer sx={{ mt: 1 }}>
                <GridItem xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    fullWidth
                    value={formData.description}
                    onChange={handleFormChange}
                    error={!!errors.description}
                    helperText={errors.description}
                    disabled={submitting}
                  />
                </GridItem>
                
                <GridItem xs={6}>
                  <TextField
                    name="amount"
                    label="Amount"
                    fullWidth
                    value={formData.amount}
                    onChange={handleFormChange}
                    error={!!errors.amount}
                    helperText={errors.amount}
                    disabled={submitting}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </GridItem>
                
                <GridItem xs={6}>
                  <TextField
                    name="date"
                    label="Date"
                    type="date"
                    fullWidth
                    value={formData.date}
                    onChange={handleFormChange}
                    error={!!errors.date}
                    helperText={errors.date}
                    disabled={submitting}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </GridItem>
                
                <GridItem xs={6}>
                  <FormControl fullWidth disabled={submitting}>
                    <InputLabel id="revenue-type-label">Revenue Type</InputLabel>
                    <Select
                      labelId="revenue-type-label"
                      name="revenue_type"
                      value={formData.revenue_type}
                      onChange={handleSelectChange}
                      label="Revenue Type"
                    >
                      <MenuItem value="invoice">Invoice</MenuItem>
                      <MenuItem value="payment">Payment</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </GridItem>
                
                <GridItem xs={6}>
                  <FormControl fullWidth disabled={submitting}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select
                      labelId="status-label"
                      name="status"
                      value={formData.status}
                      onChange={handleSelectChange}
                      label="Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                    </Select>
                  </FormControl>
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
                    disabled={submitting}
                  />
                </GridItem>
              </GridContainer>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setFormOpen(false)} 
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                color="primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Revenue Summary
          </Typography>
          
          {revenueSummary ? (
            <GridContainer>
              <GridItem xs={12} md={6}>
                <Card>
                  <CardHeader title="Total Revenue" />
                  <CardContent>
                    <Typography variant="h4">
                      {formatCurrency(revenueSummary.totalRevenue)}
                    </Typography>
                    {budget && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Budget: {formatCurrency(budget)}
                        </Typography>
                        <Typography variant="body2" color={revenueSummary.totalRevenue >= budget ? 'success.main' : 'warning.main'}>
                          {revenueSummary.totalRevenue >= budget ? 'On or above' : 'Below'} budget
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </GridItem>
              
              <GridItem xs={12} md={6}>
                <Card>
                  <CardHeader title="Revenue by Status" />
                  <CardContent>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getStatusChip('pending')}
                                <Typography variant="body2" sx={{ ml: 1 }}>Pending</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">{formatCurrency(revenueSummary.byStatus.pending || 0)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getStatusChip('approved')}
                                <Typography variant="body2" sx={{ ml: 1 }}>Approved</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">{formatCurrency(revenueSummary.byStatus.approved || 0)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getStatusChip('paid')}
                                <Typography variant="body2" sx={{ ml: 1 }}>Paid</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">{formatCurrency(revenueSummary.byStatus.paid || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </GridItem>
            </GridContainer>
          ) : (
            <Alert severity="info">
              No revenue data available. Add revenue entries to see the summary.
            </Alert>
          )}
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Profitability Analysis
          </Typography>
          
          {profitabilitySummary ? (
            <>
              <Card sx={{ mb: 3 }}>
                <CardHeader 
                  title="Profit Margin"
                  subheader={formatPercentage(profitabilitySummary.profitMargin)}
                />
                <CardContent>
                  <Box sx={{ width: '100%', mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(profitabilitySummary.profitMargin * 100, 100)} 
                      color={profitabilitySummary.profitMargin < 0 ? "error" : 
                             profitabilitySummary.profitMargin < 0.1 ? "warning" : "success"}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  
                  <GridContainer sx={{ mt: 1 }}>
                    <GridItem xs={4}>
                      <Typography variant="body2" color="text.secondary">Revenue</Typography>
                      <Typography variant="h6">{formatCurrency(profitabilitySummary.totalRevenue)}</Typography>
                    </GridItem>
                    <GridItem xs={4}>
                      <Typography variant="body2" color="text.secondary">Costs</Typography>
                      <Typography variant="h6">{formatCurrency(profitabilitySummary.totalCosts)}</Typography>
                    </GridItem>
                    <GridItem xs={4}>
                      <Typography variant="body2" color="text.secondary">Profit</Typography>
                      <Typography variant="h6" color={profitabilitySummary.profit < 0 ? "error.main" : "success.main"}>
                        {formatCurrency(profitabilitySummary.profit)}
                      </Typography>
                    </GridItem>
                  </GridContainer>
                </CardContent>
              </Card>
              
              <Typography variant="h6" gutterBottom>
                Profitability Recommendations
              </Typography>
              {profitabilitySummary.recommendations.length > 0 ? (
                <GridContainer>
                  {profitabilitySummary.recommendations.map((recommendation, index) => (
                    <GridItem xs={12} key={index}>
                      <Alert severity={recommendation.priority === 'high' ? 'error' : recommendation.priority === 'medium' ? 'warning' : 'info'}>
                        <Typography variant="subtitle2">{recommendation.title}</Typography>
                        <Typography variant="body2">{recommendation.description}</Typography>
                      </Alert>
                    </GridItem>
                  ))}
                </GridContainer>
              ) : (
                <Alert severity="success">
                  No recommendations needed. Job profitability looks good!
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              Insufficient data for profitability analysis. Please add revenue and cost data.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
} 