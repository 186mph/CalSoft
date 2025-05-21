import React, { useState, useEffect } from 'react';
import { SalesGoal } from '../../types/sales';
import { fetchGoals } from '../../services/goalService';
import { formatDate, getDaysRemaining } from '../../utils/dateUtils';
import { calculateProgress } from '../../utils/salesUtils';
import Card from '../ui/Card';
import { PieChart, BarChart, LineChart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Badge } from "../ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import Select from '../ui/Select';

type GoalStatus = 'completed' | 'on-track' | 'at-risk' | 'behind';

const GoalDashboard: React.FC = () => {
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [viewType, setViewType] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setLoading(true);
        const data = await fetchGoals();
        setGoals(data);
        setError(null);
      } catch (err) {
        setError('Failed to load goals. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, []);

  // Filter goals based on selected time filter
  const filteredGoals = React.useMemo(() => {
    if (timeFilter === 'all') return goals;
    
    const now = new Date();
    
    if (timeFilter === 'active') {
      return goals.filter(goal => {
        const endDate = new Date(goal.endDate);
        return endDate >= now;
      });
    }
    
    if (timeFilter === 'completed') {
      return goals.filter(goal => {
        const endDate = new Date(goal.endDate);
        return endDate < now || goal.currentValue >= goal.targetValue;
      });
    }
    
    return goals;
  }, [goals, timeFilter]);

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    if (!filteredGoals.length) {
      return {
        totalGoals: 0,
        completedGoals: 0,
        atRiskGoals: 0,
        averageProgress: 0,
        highestProgress: 0
      };
    }

    const completed = filteredGoals.filter(goal => goal.currentValue >= goal.targetValue).length;
    const atRisk = filteredGoals.filter(goal => {
      const progress = calculateProgress(goal.currentValue, goal.targetValue);
      const daysRemaining = getDaysRemaining(goal.endDate);
      return progress < 50 && daysRemaining < 7;
    }).length;

    const progressValues = filteredGoals.map(goal => 
      calculateProgress(goal.currentValue, goal.targetValue)
    );
    
    const averageProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
    const highestProgress = Math.max(...progressValues);

    return {
      totalGoals: filteredGoals.length,
      completedGoals: completed,
      atRiskGoals: atRisk,
      averageProgress: Math.round(averageProgress),
      highestProgress: Math.round(highestProgress)
    };
  }, [filteredGoals]);

  // Determine goal status
  const getGoalStatus = (goal: SalesGoal): GoalStatus => {
    const progress = calculateProgress(goal.currentValue, goal.targetValue);
    const daysRemaining = getDaysRemaining(goal.endDate);
    
    if (progress >= 100) return 'completed';
    if (progress >= 70) return 'on-track';
    if (daysRemaining < 7 && progress < 50) return 'at-risk';
    return 'behind';
  };

  // Get status badge based on goal status
  const getStatusBadge = (status: GoalStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'on-track':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">On Track</Badge>;
      case 'at-risk':
        return <Badge variant="default" className="bg-amber-100 text-amber-800">At Risk</Badge>;
      case 'behind':
        return <Badge variant="destructive">Behind</Badge>;
      default:
        return null;
    }
  };

  if (loading) return <div className="p-4">Loading dashboard data...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Goal Dashboard</h1>
        <div className="flex space-x-4">
          <Select 
            value={timeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeFilter(e.target.value as 'all' | 'active' | 'completed')}
            options={[
              { value: 'active', label: 'Active Goals' },
              { value: 'completed', label: 'Completed Goals' },
              { value: 'all', label: 'All Goals' }
            ]}
          />
          
          <div className="flex rounded-md border border-input">
            <button 
              className={`px-3 py-2 rounded-l-md ${viewType === 'cards' ? 'bg-primary text-white' : 'bg-transparent'}`}
              onClick={() => setViewType('cards')}
            >
              <PieChart className="h-5 w-5" />
            </button>
            <button 
              className={`px-3 py-2 rounded-r-md ${viewType === 'list' ? 'bg-primary text-white' : 'bg-transparent'}`}
              onClick={() => setViewType('list')}
            >
              <BarChart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="pb-2 p-4">
            <h3 className="text-sm font-medium">Total Goals</h3>
          </div>
          <div className="px-4 pb-4">
            <div className="text-2xl font-bold">{summaryMetrics.totalGoals}</div>
          </div>
        </Card>
        
        <Card>
          <div className="pb-2 p-4">
            <h3 className="text-sm font-medium">Completed Goals</h3>
          </div>
          <div className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{summaryMetrics.completedGoals}</div>
            <div className="text-xs text-muted-foreground">
              {summaryMetrics.totalGoals ? Math.round((summaryMetrics.completedGoals / summaryMetrics.totalGoals) * 100) : 0}% of total
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="pb-2 p-4">
            <h3 className="text-sm font-medium">At Risk Goals</h3>
          </div>
          <div className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{summaryMetrics.atRiskGoals}</div>
            <div className="text-xs text-muted-foreground">Require immediate attention</div>
          </div>
        </Card>
        
        <Card>
          <div className="pb-2 p-4">
            <h3 className="text-sm font-medium">Average Progress</h3>
          </div>
          <div className="px-4 pb-4">
            <div className="text-2xl font-bold">{summaryMetrics.averageProgress}%</div>
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${summaryMetrics.averageProgress}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Goals</TabsTrigger>
          <TabsTrigger value="sales">Sales Goals</TabsTrigger>
          <TabsTrigger value="team">Team Goals</TabsTrigger>
          <TabsTrigger value="individual">Individual Goals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {viewType === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map(goal => {
                const status = getGoalStatus(goal);
                const progress = calculateProgress(goal.currentValue, goal.targetValue);
                
                return (
                  <Card key={goal.id}>
                    <div className={`h-1 ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'on-track' ? 'bg-blue-500' :
                      status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{goal.title}</h3>
                        {getStatusBadge(status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="text-sm text-gray-500">Progress</div>
                        <div className="w-full bg-gray-200 h-2 rounded-full">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{goal.currentValue} / {goal.targetValue} {goal.period}</span>
                          <span>{progress}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm flex justify-between">
                        <span>{goal.scope}</span>
                        <span>{goal.type}</span>
                      </div>
                      
                      {goal.description && (
                        <div className="mt-2 text-sm text-gray-500 line-clamp-2">
                          {goal.description}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map(goal => {
                    const status = getGoalStatus(goal);
                    const progress = calculateProgress(goal.currentValue, goal.targetValue);
                    const daysLeft = getDaysRemaining(goal.endDate);
                    
                    return (
                      <TableRow key={goal.id}>
                        <TableCell>{goal.title}</TableCell>
                        <TableCell>{goal.type}</TableCell>
                        <TableCell>{goal.period}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{progress}%</span>
                            <div className="w-20 bg-gray-200 h-2 rounded-full">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Past due'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sales" className="mt-4">
          <div className="text-center p-4 text-muted-foreground">
            {filteredGoals.filter(g => g.type === 'Revenue' || g.type === 'Deals' || g.type === 'Units').length === 0 ? (
              <p>No sales goals found</p>
            ) : (
              <p>Filtering for sales goals only</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="team" className="mt-4">
          <div className="text-center p-4 text-muted-foreground">
            {filteredGoals.filter(g => g.scope === 'Team').length === 0 ? (
              <p>No team goals found</p>
            ) : (
              <p>Filtering for team goals only</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="individual" className="mt-4">
          <div className="text-center p-4 text-muted-foreground">
            {filteredGoals.filter(g => g.scope === 'Individual').length === 0 ? (
              <p>No individual goals found</p>
            ) : (
              <p>Filtering for individual goals only</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoalDashboard; 