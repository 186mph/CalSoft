import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Filter,
  Users,
  Award,
  BarChart as BarChartIcon,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import Card from "../ui/Card";
import { Button } from "../ui/Button";
import Select from "../ui/Select";
import { Badge } from "../ui/Badge";
import { fetchGoals } from '../../services/goalService';
import { SalesGoal } from '../../types/sales';
import { formatDate, getDaysRemaining, getTimeElapsedPercentage } from '../../utils/dateUtils';
import { calculateProgress } from '../../utils/salesUtils';

export function GoalsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [timeFrame, setTimeFrame] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [goalType, setGoalType] = useState<string>('all');
  
  // Derived data for charts
  const [progressData, setProgressData] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        const data = await fetchGoals();
        setGoals(data);
        setError(null);
      } catch (err) {
        setError('Failed to load goals. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      prepareChartData();
    }
  }, [goals, timeFrame, goalType]);

  const prepareChartData = () => {
    // Filter goals based on current filters
    let filteredGoals = [...goals];
    
    if (goalType !== 'all') {
      filteredGoals = filteredGoals.filter(goal => goal.type === goalType);
    }

    // Filter by time frame (this would use the goal period or dates)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (timeFrame === 'month') {
      filteredGoals = filteredGoals.filter(goal => {
        const endDate = new Date(goal.endDate);
        return endDate.getFullYear() === currentYear && endDate.getMonth() === currentMonth;
      });
    } else if (timeFrame === 'quarter') {
      const currentQuarter = Math.floor(currentMonth / 3);
      filteredGoals = filteredGoals.filter(goal => {
        const endDate = new Date(goal.endDate);
        return endDate.getFullYear() === currentYear && 
               Math.floor(endDate.getMonth() / 3) === currentQuarter;
      });
    } else if (timeFrame === 'year') {
      filteredGoals = filteredGoals.filter(goal => {
        const endDate = new Date(goal.endDate);
        return endDate.getFullYear() === currentYear;
      });
    }

    // Prepare progress data for each goal
    const newProgressData = filteredGoals.map(goal => {
      const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
      const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
      const expected = Math.min(timeElapsed, 100);
      
      return {
        name: goal.title.substring(0, 15) + (goal.title.length > 15 ? '...' : ''),
        actual: Math.round(progress),
        expected: Math.round(expected),
        id: goal.id
      };
    });
    setProgressData(newProgressData);

    // Prepare type distribution data
    const typeMap = new Map<string, number>();
    filteredGoals.forEach(goal => {
      const type = goal.type;
      if (typeMap.has(type)) {
        typeMap.set(type, typeMap.get(type)! + 1);
      } else {
        typeMap.set(type, 1);
      }
    });
    
    const newTypeDistribution = Array.from(typeMap).map(([name, value]) => ({ name, value }));
    setTypeDistribution(newTypeDistribution);

    // Prepare status distribution data
    const statusMap = new Map<string, number>();
    filteredGoals.forEach(goal => {
      // Determine goal status
      const progress = goal.currentValue / goal.targetValue;
      const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
      const now = new Date();
      const endDate = new Date(goal.endDate);
      
      let status = 'On Track';
      
      if (endDate < now) {
        status = progress >= 1 ? 'Completed' : 'Behind';
      } else if (progress >= 1) {
        status = 'Completed';
      } else if (progress >= timeElapsed / 100) {
        status = 'On Track';
      } else if (progress >= (timeElapsed / 100) - 0.15) {
        status = 'At Risk';
      } else {
        status = 'Behind';
      }
      
      if (statusMap.has(status)) {
        statusMap.set(status, statusMap.get(status)! + 1);
      } else {
        statusMap.set(status, 1);
      }
    });
    
    const newStatusDistribution = Array.from(statusMap).map(([name, value]) => ({ 
      name, 
      value,
      color: name === 'On Track' || name === 'Completed' ? '#10b981' : 
             name === 'At Risk' ? '#f59e0b' : '#ef4444'
    }));
    setStatusDistribution(newStatusDistribution);

    // Prepare timeline data (months of the year with goal counts)
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const timelineMap = new Map<string, { total: number, completed: number }>();
    months.forEach(month => {
      timelineMap.set(month, { total: 0, completed: 0 });
    });
    
    filteredGoals.forEach(goal => {
      const endDate = new Date(goal.endDate);
      const month = months[endDate.getMonth()];
      const progress = goal.currentValue / goal.targetValue;
      const isCompleted = progress >= 1;
      
      const current = timelineMap.get(month)!;
      timelineMap.set(month, {
        total: current.total + 1,
        completed: current.completed + (isCompleted ? 1 : 0)
      });
    });
    
    const newTimelineData = months.map(month => ({
      month,
      total: timelineMap.get(month)!.total,
      completed: timelineMap.get(month)!.completed
    }));
    setTimelineData(newTimelineData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track':
      case 'Completed':
        return '#10b981'; // green
      case 'At Risk':
        return '#f59e0b'; // amber
      case 'Behind':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and analyze your sales goals performance
          </p>
        </div>
        <div className="flex space-x-4">
          <Select 
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value as 'month' | 'quarter' | 'year')}
            options={[
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' }
            ]}
          />
          <Select 
            value={goalType} 
            onChange={(e) => setGoalType(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'Revenue', label: 'Revenue' },
              { value: 'Deals', label: 'Deals' },
              { value: 'Units', label: 'Units' },
              { value: 'Meetings', label: 'Meetings' },
              { value: 'Calls', label: 'Calls' }
            ]}
          />
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Goals</p>
                <h3 className="text-2xl font-bold mt-1">{goals.length}</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-md dark:bg-blue-900">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Badge variant="outline" className="text-xs">
                {goalType === 'all' ? 'All Types' : goalType}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">On Track</p>
                <h3 className="text-2xl font-bold mt-1">
                  {goals.filter(goal => {
                    const progress = goal.currentValue / goal.targetValue;
                    const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
                    return progress >= timeElapsed / 100 && progress < 1;
                  }).length}
                </h3>
              </div>
              <div className="p-2 bg-green-100 rounded-md dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="bg-green-100 text-green-800">On Track</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">At Risk</p>
                <h3 className="text-2xl font-bold mt-1">
                  {goals.filter(goal => {
                    const progress = goal.currentValue / goal.targetValue;
                    const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
                    return progress < timeElapsed / 100 && progress >= (timeElapsed / 100) - 0.15;
                  }).length}
                </h3>
              </div>
              <div className="p-2 bg-amber-100 rounded-md dark:bg-amber-900">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="bg-amber-100 text-amber-800">At Risk</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                <h3 className="text-2xl font-bold mt-1">
                  {goals.filter(goal => goal.currentValue >= goal.targetValue).length}
                </h3>
              </div>
              <div className="p-2 bg-purple-100 rounded-md dark:bg-purple-900">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Goal Progress</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={progressData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '']}
                    labelFormatter={(label) => `Goal: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="expected" fill="#9ca3af" name="Expected" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Goal Status Distribution</h3>
            <div className="h-80 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} goals`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Goals Timeline</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timelineData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Goals" />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Goal Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Goal Types</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} goals`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Achievement Rate by Goal Type</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="10%" 
                  outerRadius="80%" 
                  data={
                    Array.from(
                      goals.reduce((acc, goal) => {
                        const type = goal.type;
                        const isCompleted = goal.currentValue >= goal.targetValue;
                        
                        if (!acc.has(type)) {
                          acc.set(type, { total: 0, completed: 0 });
                        }
                        
                        const current = acc.get(type)!;
                        acc.set(type, {
                          total: current.total + 1,
                          completed: current.completed + (isCompleted ? 1 : 0)
                        });
                        
                        return acc;
                      }, new Map<string, { total: number, completed: number }>())
                    ).map(([name, { total, completed }], index) => ({
                      name,
                      value: total > 0 ? Math.round((completed / total) * 100) : 0,
                      fill: COLORS[index % COLORS.length]
                    }))
                  }
                >
                  <RadialBar
                    label={{ position: 'insideStart' }}
                    background
                    dataKey="value"
                  />
                  <Legend 
                    iconSize={10} 
                    layout="vertical" 
                    verticalAlign="middle" 
                    wrapperStyle={{ right: 0, top: 0, bottom: 0 }}
                    formatter={(value) => `${value}`}
                  />
                  <Tooltip formatter={(value) => [`${value}% completion rate`, '']} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 