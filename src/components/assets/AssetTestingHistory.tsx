import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { 
  type AssetTestingHistory, 
  TestingHistoryStats, 
  AddTestRecordData,
  TEST_TYPES,
  TestMeasurements
} from '@/types/assetTesting';
import { AssetTestingService } from '@/services/assetTestingService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface AssetTestingHistoryProps {
  assetId: string;
  assetName: string;
  schema?: 'neta_ops' | 'lab_ops';
  jobId?: string;
}

export default function AssetTestingHistoryComponent({ 
  assetId, 
  assetName, 
  schema = 'lab_ops',
  jobId 
}: AssetTestingHistoryProps) {
  const [testingHistory, setTestingHistory] = useState<AssetTestingHistory[]>([]);
  const [stats, setStats] = useState<TestingHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddTest, setShowAddTest] = useState(false);
  const [showTestDetail, setShowTestDetail] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AssetTestingHistory | null>(null);
  const [editingTest, setEditingTest] = useState<AssetTestingHistory | null>(null);

  // Form data for adding/editing tests
  const [formData, setFormData] = useState<AddTestRecordData>({
    asset_id: assetId,
    job_id: jobId,
    test_type: '',
    test_date: format(new Date(), 'yyyy-MM-dd'),
    pass_fail_status: 'PASS',
    condition_rating: 8,
    notes: '',
    test_standards: '',
  });

  useEffect(() => {
    loadTestingHistory();
  }, [assetId, schema]);

  const loadTestingHistory = async () => {
    try {
      setLoading(true);
      const history = await AssetTestingService.getAssetTestingHistory(assetId, schema);
      const calculatedStats = AssetTestingService.calculateTestingStats(history);
      
      setTestingHistory(history);
      setStats(calculatedStats);
    } catch (err) {
      console.error('Error loading testing history:', err);
      setError('Failed to load testing history');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async () => {
    try {
      await AssetTestingService.addTestRecord(formData, schema);
      await loadTestingHistory();
      setShowAddTest(false);
      resetForm();
    } catch (err) {
      console.error('Error adding test record:', err);
      setError('Failed to add test record');
    }
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;
    
    try {
      await AssetTestingService.updateTestRecord(editingTest.id, formData, schema);
      await loadTestingHistory();
      setEditingTest(null);
      resetForm();
    } catch (err) {
      console.error('Error updating test record:', err);
      setError('Failed to update test record');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test record?')) return;
    
    try {
      await AssetTestingService.deleteTestRecord(testId, schema);
      await loadTestingHistory();
    } catch (err) {
      console.error('Error deleting test record:', err);
      setError('Failed to delete test record');
    }
  };

  const resetForm = () => {
    setFormData({
      asset_id: assetId,
      job_id: jobId,
      test_type: '',
      test_date: format(new Date(), 'yyyy-MM-dd'),
      pass_fail_status: 'PASS',
      condition_rating: 8,
      notes: '',
      test_standards: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-800';
      case 'FAIL': return 'bg-red-100 text-red-800';
      case 'CONDITIONAL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const chartData = testingHistory
    .filter(test => test.condition_rating !== null)
    .reverse() // Oldest first for chart
    .map(test => ({
      date: format(new Date(test.test_date), 'MMM yyyy'),
      condition: test.condition_rating,
      status: test.pass_fail_status
    }));

  const testTypeData = testingHistory.reduce((acc, test) => {
    acc[test.test_type] = (acc[test.test_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(testTypeData).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count
  }));

  const COLORS = ['#339C5E', '#f26722', '#0088FE', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold">{stats.total_tests}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold">{stats.pass_rate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Condition</p>
                  <p className={`text-2xl font-bold ${getConditionColor(stats.average_condition_rating)}`}>
                    {stats.average_condition_rating.toFixed(1)}/10
                  </p>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.degradation_trend)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tests/Year</p>
                  <p className="text-2xl font-bold">{stats.tests_per_year.toFixed(1)}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Condition Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Condition Rating Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="condition" 
                    stroke="#339C5E" 
                    strokeWidth={2}
                    dot={{ fill: '#339C5E', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Test Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Test Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Testing History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Testing History for {assetName}</CardTitle>
            <Button 
              onClick={() => setShowAddTest(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Test Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testingHistory.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Testing History</h3>
              <p className="text-gray-500 mb-4">Start tracking this asset's performance by adding test records.</p>
              <Button 
                onClick={() => setShowAddTest(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Add First Test Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testingHistory.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(test.test_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {test.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(test.pass_fail_status)}>
                          {test.pass_fail_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {test.condition_rating ? (
                          <span className={`font-medium ${getConditionColor(test.condition_rating)}`}>
                            {test.condition_rating}/10
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {test.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTest(test);
                              setShowTestDetail(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTest(test);
                              setFormData({
                                asset_id: test.asset_id,
                                job_id: test.job_id,
                                test_type: test.test_type,
                                test_date: format(new Date(test.test_date), 'yyyy-MM-dd'),
                                pass_fail_status: test.pass_fail_status,
                                condition_rating: test.condition_rating || undefined,
                                notes: test.notes || '',
                                test_standards: test.test_standards || '',
                                degradation_notes: test.degradation_notes || '',
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Test Dialog */}
      <Dialog open={showAddTest || editingTest !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddTest(false);
          setEditingTest(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Edit Test Record' : 'Add Test Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Date
                </label>
                <Input
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Type
                </label>
                <Select 
                  value={formData.test_type} 
                  onValueChange={(value) => setFormData({ ...formData, test_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEST_TYPES).map(([category, types]) => (
                      <div key={category}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                          {category}
                        </div>
                        {types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pass/Fail Status
                </label>
                <Select 
                  value={formData.pass_fail_status} 
                  onValueChange={(value: any) => setFormData({ ...formData, pass_fail_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">PASS</SelectItem>
                    <SelectItem value="FAIL">FAIL</SelectItem>
                    <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Rating (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.condition_rating || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    condition_rating: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Standards
              </label>
              <Input
                value={formData.test_standards || ''}
                onChange={(e) => setFormData({ ...formData, test_standards: e.target.value })}
                placeholder="e.g., IEEE 43, NETA ATS-2019"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Test observations, measurements, and any relevant details..."
              />
            </div>

            {formData.pass_fail_status === 'FAIL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Degradation Notes
                </label>
                <Textarea
                  value={formData.degradation_notes || ''}
                  onChange={(e) => setFormData({ ...formData, degradation_notes: e.target.value })}
                  rows={2}
                  placeholder="Describe the degradation or issues found..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTest(false);
                setEditingTest(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTest ? handleUpdateTest : handleAddTest}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingTest ? 'Update' : 'Add'} Test Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Detail Dialog */}
      <Dialog open={showTestDetail} onOpenChange={setShowTestDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Record Details</DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Date</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedTest.test_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Type</label>
                  <p className="text-sm text-gray-900">
                    {selectedTest.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <Badge className={getStatusColor(selectedTest.pass_fail_status)}>
                    {selectedTest.pass_fail_status}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition Rating</label>
                  <p className={`text-sm font-medium ${getConditionColor(selectedTest.condition_rating || 0)}`}>
                    {selectedTest.condition_rating ? `${selectedTest.condition_rating}/10` : 'Not rated'}
                  </p>
                </div>
              </div>

              {selectedTest.test_standards && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Standards</label>
                  <p className="text-sm text-gray-900">{selectedTest.test_standards}</p>
                </div>
              )}

              {selectedTest.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTest.notes}</p>
                </div>
              )}

              {selectedTest.degradation_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Degradation Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTest.degradation_notes}</p>
                </div>
              )}

              {selectedTest.test_measurements && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Measurements</label>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                    {JSON.stringify(selectedTest.test_measurements, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowTestDetail(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 