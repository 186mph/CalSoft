import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BarChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Filter,
  Search,
  LineChart,
  PieChart,
  Bell,
  BellOff,
  FileText,
  Mail
} from 'lucide-react';
import { labService, QualityMetric, LabEquipment } from '@/lib/services/labService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';

// Import required modules for PDF generation
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface QualityMetricsProps {
  division?: string;
}

const metricCategories = [
  { label: 'Accuracy', value: 'accuracy' },
  { label: 'Precision', value: 'precision' },
  { label: 'Calibration', value: 'calibration' },
  { label: 'Temperature', value: 'temperature' },
  { label: 'Humidity', value: 'humidity' },
  { label: 'Pressure', value: 'pressure' },
  { label: 'Voltage', value: 'voltage' },
  { label: 'Current', value: 'current' },
  { label: 'Resistance', value: 'resistance' },
];

export function QualityMetrics({ division }: QualityMetricsProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<LabEquipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0], // 1 month ago
    end: new Date().toISOString().split('T')[0] // Today
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  
  const defaultFormState: Partial<QualityMetric> = {
    metric_name: '',
    metric_value: 0,
    unit: '',
    date_recorded: new Date().toISOString().split('T')[0],
    target_value: undefined,
    lower_threshold: undefined,
    upper_threshold: undefined,
    status: 'within-threshold',
    equipment_id: '',
    recorded_by: user?.id,
    notes: ''
  };
  
  const [form, setForm] = useState<Partial<QualityMetric>>(defaultFormState);

  // Add new state variables for reports and alerts
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'trends'>('summary');
  const [reportDateRange, setReportDateRange] = useState<{ start: string, end: string }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0], // 3 months ago
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [showAlertSetupDialog, setShowAlertSetupDialog] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    email: '',
    thresholdAlerts: true,
    dailySummary: false,
    weeklyReport: true
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch metrics
        const metricsResponse = await labService.getQualityMetrics(
          equipmentFilter || undefined, 
          { start: dateRange.start, end: dateRange.end }
        );
        
        if (metricsResponse.error) {
          setError("Failed to load quality metrics. Please try again.");
        } else if (metricsResponse.data) {
          setMetrics(metricsResponse.data);
        }
        
        // Fetch equipment for filtering and selection
        const equipResponse = await labService.getEquipment();
        if (!equipResponse.error && equipResponse.data) {
          setEquipment(equipResponse.data);
        }
        
        setError(null);
      } catch (err) {
        console.error("Exception in quality metrics:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [equipmentFilter, dateRange]);

  // Filter metrics based on active tab, search term, and filters
  const filteredMetrics = metrics.filter(metric => {
    // Filter by status tab
    if (activeTab !== 'all' && metric.status !== activeTab) {
      return false;
    }
    
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      metric.metric_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (metric.equipment_name && metric.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by equipment
    const matchesEquipment = equipmentFilter === null || metric.equipment_id === equipmentFilter;
    
    return matchesSearch && matchesEquipment;
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert numeric values
    if (['metric_value', 'target_value', 'lower_threshold', 'upper_threshold'].includes(name)) {
      setForm(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Calculate metric status based on values
  const calculateStatus = (
    value: number, 
    lowerThreshold?: number, 
    upperThreshold?: number
  ): 'below-threshold' | 'within-threshold' | 'above-threshold' => {
    if (lowerThreshold !== undefined && value < lowerThreshold) {
      return 'below-threshold';
    }
    if (upperThreshold !== undefined && value > upperThreshold) {
      return 'above-threshold';
    }
    return 'within-threshold';
  };

  // Get metric status based on target value and thresholds
  const getMetricStatus = (metric: QualityMetric): 'below-threshold' | 'within-threshold' | 'above-threshold' => {
    if (metric.upper_threshold !== undefined && metric.metric_value > metric.upper_threshold) {
      return 'above-threshold';
    }
    if (metric.lower_threshold !== undefined && metric.metric_value < metric.lower_threshold) {
      return 'below-threshold';
    }
    return 'within-threshold';
  };

  // Calculate metrics summary for reporting
  const calculateMetricsSummary = () => {
    if (filteredMetrics.length === 0) {
      return {
        total: 0,
        withinThreshold: 0,
        belowThreshold: 0,
        aboveThreshold: 0
      };
    }
    
    return {
      total: filteredMetrics.length,
      withinThreshold: filteredMetrics.filter(m => m.status === 'within-threshold').length,
      belowThreshold: filteredMetrics.filter(m => m.status === 'below-threshold').length,
      aboveThreshold: filteredMetrics.filter(m => m.status === 'above-threshold').length
    };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.metric_name || form.metric_value === undefined || form.target_value === undefined || !form.date_recorded) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Create the metric object without created_by field (not in interface)
    const newMetric: Partial<QualityMetric> = {
      id: editingMetricId || '',
      metric_name: form.metric_name,
      metric_value: form.metric_value,
      unit: form.unit || '',
      date_recorded: form.date_recorded,
      target_value: form.target_value,
      upper_threshold: form.upper_threshold,
      lower_threshold: form.lower_threshold,
      equipment_id: form.equipment_id || '',
      equipment_name: selectedEquipment?.name || '',
      notes: form.notes || '',
      status: getMetricStatus(
        form as QualityMetric
      ),
      created_at: new Date().toISOString()
    };
    
    setIsLoading(true);
    
    try {
      const response = await labService.saveQualityMetric(newMetric);
      
      // Update the metrics list - ensure all metrics are of type QualityMetric
      if (editingMetricId) {
        if (response.data) {
          setMetrics(metrics.map(m => m.id === editingMetricId ? response.data as QualityMetric : m));
        }
      } else {
        if (response.data) {
          setMetrics([...metrics, response.data as QualityMetric]);
        }
      }
      
      toast({
        title: "Success",
        description: editingMetricId ? "Metric updated successfully" : "Metric added successfully"
      });
      
      // Reset form
      setForm(defaultFormState);
      setShowForm(false);
      setEditingMetricId(null);
    } catch (error) {
      console.error('Error saving metric:', error);
      setError('Failed to save metric. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (metric: QualityMetric) => {
    setEditingMetricId(metric.id);
    setForm({
      ...metric
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quality metric? This action cannot be undone.")) {
      // In a real implementation, this would call a delete method
      // For now, just remove it from the state
      setMetrics(metrics.filter(metric => metric.id !== id));
      toast({
        title: "Success",
        description: "Quality metric deleted successfully"
      });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    switch (status) {
      case 'within-threshold': return 'secondary';
      case 'below-threshold': return 'default';
      case 'above-threshold': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'within-threshold': return <TrendingUp className="h-4 w-4" />;
      case 'below-threshold': return <TrendingDown className="h-4 w-4" />;
      case 'above-threshold': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Generate PDF report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    const metricsSummary = calculateMetricsSummary();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Quality Metrics Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 22);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(reportDateRange.start).toLocaleDateString()} to ${new Date(reportDateRange.end).toLocaleDateString()}`, 14, 30);
    
    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Metrics: ${metricsSummary.total}`, 14, 50);
    doc.text(`Within Threshold: ${metricsSummary.withinThreshold} (${Math.round(metricsSummary.withinThreshold / metricsSummary.total * 100)}%)`, 14, 58);
    doc.text(`Below Threshold: ${metricsSummary.belowThreshold} (${Math.round(metricsSummary.belowThreshold / metricsSummary.total * 100)}%)`, 14, 66);
    doc.text(`Above Threshold: ${metricsSummary.aboveThreshold} (${Math.round(metricsSummary.aboveThreshold / metricsSummary.total * 100)}%)`, 14, 74);
    
    // Add metrics table
    if (reportType !== 'summary') {
      const tableData = filteredMetrics.map(metric => [
        metric.metric_name,
        `${metric.metric_value} ${metric.unit || ''}`,
        metric.status === 'within-threshold' ? 'Within Range' : 
        metric.status === 'below-threshold' ? 'Below Range' : 'Above Range',
        metric.equipment_name || '-',
        new Date(metric.date_recorded).toLocaleDateString()
      ]);
      
      // @ts-ignore - jspdf-autotable method
      doc.autoTable({
        startY: 90,
        head: [['Metric Name', 'Value', 'Status', 'Equipment', 'Date Recorded']],
        body: tableData,
      });
    }
    
    // Save the document
    doc.save(`quality-metrics-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Success",
      description: "Report generated successfully"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Quality Control Metrics</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowReportDialog(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button onClick={() => {
            setEditingMetricId(null);
            setForm(defaultFormState);
            setShowForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Metric
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMetrics.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Within Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredMetrics.filter(m => m.status === 'within-threshold').length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({Math.round(filteredMetrics.filter(m => m.status === 'within-threshold').length / filteredMetrics.length * 100) || 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Below Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredMetrics.filter(m => m.status === 'below-threshold').length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({Math.round(filteredMetrics.filter(m => m.status === 'below-threshold').length / filteredMetrics.length * 100) || 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Above Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredMetrics.filter(m => m.status === 'above-threshold').length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({Math.round(filteredMetrics.filter(m => m.status === 'above-threshold').length / filteredMetrics.length * 100) || 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alert Configuration Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowAlertSetupDialog(true)}
          className="flex items-center text-sm"
        >
          {alertsEnabled ? (
            <Bell className="mr-2 h-4 w-4 text-blue-600" />
          ) : (
            <BellOff className="mr-2 h-4 w-4 text-gray-400" />
          )}
          Configure Alerts
        </Button>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full md:w-64">
          <Select
            value={equipmentFilter || ''}
            onChange={(e) => setEquipmentFilter(e.target.value || null)}
            className="w-full"
            options={[
              { label: 'All Equipment', value: '' },
              ...equipment.map(item => ({
                label: item.name,
                value: item.id
              }))
            ]}
          />
        </div>
        <div className="flex space-x-2">
          <div>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full"
            />
          </div>
          <div>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Tabs for metric status filter */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Metrics</TabsTrigger>
          <TabsTrigger value="within-threshold">Within Threshold</TabsTrigger>
          <TabsTrigger value="below-threshold">Below Threshold</TabsTrigger>
          <TabsTrigger value="above-threshold">Above Threshold</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">
              <p>Loading quality metrics...</p>
            </div>
          ) : (
            <>
              {filteredMetrics.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <BarChart className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quality metrics found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first quality metric to start tracking.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => {
                      setEditingMetricId(null);
                      setForm(defaultFormState);
                      setShowForm(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Metric
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMetrics.map(metric => (
                    <Card key={metric.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{metric.metric_name}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(metric.status)}>
                            <span className="flex items-center">
                              {getStatusIcon(metric.status)}
                              <span className="ml-1">
                                {metric.status === 'within-threshold' ? 'Within Range' : 
                                 metric.status === 'below-threshold' ? 'Below Range' : 'Above Range'}
                              </span>
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Recorded on {new Date(metric.date_recorded).toLocaleDateString()}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Value:</span>
                            <span className="text-sm font-bold">{metric.metric_value} {metric.unit}</span>
                          </div>
                          
                          {metric.target_value !== null && metric.target_value !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Target:</span>
                              <span className="text-sm">{metric.target_value} {metric.unit}</span>
                            </div>
                          )}
                          
                          {(metric.lower_threshold !== null && metric.lower_threshold !== undefined) || 
                           (metric.upper_threshold !== null && metric.upper_threshold !== undefined) ? (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Acceptable Range:</span>
                              <span className="text-sm">
                                {metric.lower_threshold !== null && metric.lower_threshold !== undefined ? metric.lower_threshold : '∞'} 
                                {' - '} 
                                {metric.upper_threshold !== null && metric.upper_threshold !== undefined ? metric.upper_threshold : '∞'} 
                                {' '}{metric.unit}
                              </span>
                            </div>
                          ) : null}
                          
                          {metric.equipment_name && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Equipment:</span>
                              <span className="text-sm">{metric.equipment_name}</span>
                            </div>
                          )}
                          
                          {metric.notes && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Notes: </span>
                              <span>{metric.notes}</span>
                            </div>
                          )}
                          
                          <div className="pt-4 flex justify-end space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(metric)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(metric.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Metric Form Dialog */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMetricId ? 'Edit Metric' : 'Add New Quality Metric'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Metric Name</label>
                <Input
                  name="metric_name"
                  value={form.metric_name || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Measurement Accuracy"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <Input
                    type="number"
                    name="metric_value"
                    value={form.metric_value || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 98.5"
                    step="any"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <Input
                    name="unit"
                    value={form.unit || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., %, ms, Ω"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date Recorded</label>
                <Input
                  type="date"
                  name="date_recorded"
                  value={form.date_recorded || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Target Value (Optional)</label>
                <Input
                  type="number"
                  name="target_value"
                  value={form.target_value === undefined ? '' : form.target_value}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  step="any"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lower Threshold (Optional)</label>
                  <Input
                    type="number"
                    name="lower_threshold"
                    value={form.lower_threshold === undefined ? '' : form.lower_threshold}
                    onChange={handleInputChange}
                    placeholder="e.g., 95"
                    step="any"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Upper Threshold (Optional)</label>
                  <Input
                    type="number"
                    name="upper_threshold"
                    value={form.upper_threshold === undefined ? '' : form.upper_threshold}
                    onChange={handleInputChange}
                    placeholder="e.g., 105"
                    step="any"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Equipment (Optional)</label>
                <Select
                  name="equipment_id"
                  value={form.equipment_id || ''}
                  onChange={handleInputChange}
                  className="w-full"
                  options={equipment.map(item => ({
                    label: item.name,
                    value: item.id
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <Textarea
                  name="notes"
                  value={form.notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Additional information about this quality metric..."
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingMetricId ? 'Update Metric' : 'Add Metric')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Report Generation Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Quality Metrics Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed' | 'trends')}
                className="w-full"
                options={[
                  { label: 'Summary Report', value: 'summary' },
                  { label: 'Detailed Report', value: 'detailed' },
                  { label: 'Trends Analysis', value: 'trends' }
                ]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <Input
                    type="date"
                    value={reportDateRange.start}
                    onChange={(e) => setReportDateRange({...reportDateRange, start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <Input
                    type="date"
                    value={reportDateRange.end}
                    onChange={(e) => setReportDateRange({...reportDateRange, end: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  generatePDFReport();
                  setShowReportDialog(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Generate PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Alert Setup Dialog */}
      <Dialog open={showAlertSetupDialog} onOpenChange={setShowAlertSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Quality Metrics Alerts</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enable Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={alertsEnabled}
                  onChange={() => setAlertsEnabled(!alertsEnabled)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {alertsEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Email for Notifications</label>
                  <Input
                    type="email"
                    value={alertSettings.email}
                    onChange={(e) => setAlertSettings({...alertSettings, email: e.target.value})}
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Alert Settings</label>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="threshold-alerts"
                      checked={alertSettings.thresholdAlerts}
                      onChange={() => setAlertSettings({
                        ...alertSettings, 
                        thresholdAlerts: !alertSettings.thresholdAlerts
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="threshold-alerts" className="ml-2 block text-sm text-gray-700">
                      Immediate alerts for metrics outside thresholds
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="daily-summary"
                      checked={alertSettings.dailySummary}
                      onChange={() => setAlertSettings({
                        ...alertSettings, 
                        dailySummary: !alertSettings.dailySummary
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="daily-summary" className="ml-2 block text-sm text-gray-700">
                      Daily summary report
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="weekly-report"
                      checked={alertSettings.weeklyReport}
                      onChange={() => setAlertSettings({
                        ...alertSettings, 
                        weeklyReport: !alertSettings.weeklyReport
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="weekly-report" className="ml-2 block text-sm text-gray-700">
                      Weekly comprehensive report
                    </label>
                  </div>
                </div>
              </>
            )}
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowAlertSetupDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Success",
                    description: alertsEnabled 
                      ? "Alert settings updated successfully" 
                      : "Alerts have been disabled"
                  });
                  setShowAlertSetupDialog(false);
                }}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 