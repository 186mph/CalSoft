import React, { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import Card from "../ui/Card";
import Select, { SelectOption } from "../ui/Select";
import { SalesGoal } from '../../types/sales';
import { fetchGoals } from '../../services/goalService';
import { 
  formatDate, 
  getTimeElapsedPercentage, 
  getDaysRemaining 
} from '../../utils/dateUtils';
import { 
  calculateProgress, 
  projectFinalValue, 
  formatCurrency 
} from '../../utils/salesUtils';
import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns';

interface ForecastPoint {
  date: string;
  label: string;
  actual?: number;
  projected?: number;
  target?: number;
}

interface GoalForecastProps {
  goalId?: string; // Optional: if provided, will forecast only for this goal
}

export const GoalForecast: React.FC<GoalForecastProps> = ({ goalId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | 'all'>(goalId || 'all');
  const [forecastPeriod, setForecastPeriod] = useState<'3months' | '6months' | '12months'>('3months');
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  
  const goalOptions: SelectOption[] = [
    { value: 'all', label: 'All Revenue Goals' },
    ...(goals
      .filter(goal => goal.type === 'Revenue')
      .map(goal => ({ 
        value: goal.id, 
        label: goal.title 
      }))
    )
  ];
  
  const periodOptions: SelectOption[] = [
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '12months', label: '12 Months' }
  ];

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        const data = await fetchGoals();
        
        // Filter to only include revenue goals for forecasting
        const revenueGoals = data.filter(goal => goal.type === 'Revenue');
        setGoals(revenueGoals);
        
        if (goalId && !revenueGoals.some(g => g.id === goalId)) {
          setSelectedGoalId('all');
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load goals. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [goalId]);

  useEffect(() => {
    if (goals.length > 0) {
      generateForecastData();
    }
  }, [goals, selectedGoalId, forecastPeriod]);

  const generateForecastData = () => {
    const forecastPoints: ForecastPoint[] = [];
    const now = new Date();
    
    // Determine how many months to forecast
    const monthsToForecast = forecastPeriod === '3months' ? 3 : 
                            forecastPeriod === '6months' ? 6 : 12;
    
    // Get the relevant goals
    const goalsToForecast = selectedGoalId === 'all' 
      ? goals 
      : goals.filter(g => g.id === selectedGoalId);
    
    if (goalsToForecast.length === 0) {
      setForecastData([]);
      return;
    }
    
    // Get earliest start date and latest end date among all goals
    let earliestStart = new Date();
    let latestEnd = new Date();
    
    goalsToForecast.forEach(goal => {
      const startDate = new Date(goal.startDate);
      const endDate = new Date(goal.endDate);
      
      if (startDate < earliestStart) {
        earliestStart = startDate;
      }
      
      if (endDate > latestEnd) {
        latestEnd = endDate;
      }
    });
    
    // Ensure we forecast at least the specified number of months from now
    const minimumForecastEnd = addMonths(now, monthsToForecast);
    if (latestEnd < minimumForecastEnd) {
      latestEnd = minimumForecastEnd;
    }
    
    // Create data points for each month from earliest start to forecast end
    const startMonth = startOfMonth(earliestStart);
    const endMonth = startOfMonth(addMonths(latestEnd, 1)); // Add 1 to include the last month
    
    let currentMonth = startMonth;
    
    while (currentMonth < endMonth) {
      const monthLabel = format(currentMonth, 'MMM yyyy');
      const dateStr = format(currentMonth, 'yyyy-MM-dd');
      
      // Initialize data point
      const dataPoint: ForecastPoint = {
        date: dateStr,
        label: monthLabel,
        actual: 0,
        projected: 0,
        target: 0
      };
      
      // Process each goal
      goalsToForecast.forEach(goal => {
        const goalStart = new Date(goal.startDate);
        const goalEnd = new Date(goal.endDate);
        
        // Only include if the month is within or after the goal period
        if (currentMonth >= startOfMonth(goalStart)) {
          // For historical data (months that have passed)
          if (currentMonth < startOfMonth(now)) {
            // Calculate what the actual value would have been at this point
            // This is a simple linear projection for demo purposes
            const totalDuration = goalEnd.getTime() - goalStart.getTime();
            const elapsedDuration = currentMonth.getTime() - goalStart.getTime();
            const progress = Math.min(1, Math.max(0, elapsedDuration / totalDuration));
            
            // Add to actual value (accumulate for all goals)
            dataPoint.actual! += goal.currentValue * progress;
          } 
          // For current and future months
          else {
            // Calculate the projected value based on current progress rate
            const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
            const currentProgress = goal.currentValue / goal.targetValue;
            
            // If goal is already complete, use the current value
            if (currentProgress >= 1) {
              dataPoint.actual! += goal.currentValue;
              dataPoint.projected! += goal.currentValue;
            } else {
              // For current month, show actual value so far
              if (format(currentMonth, 'yyyyMM') === format(now, 'yyyyMM')) {
                dataPoint.actual! += goal.currentValue;
              }
              
              // Calculate a projected value based on current trend
              const progressRate = timeElapsed > 0 ? currentProgress / (timeElapsed / 100) : 0;
              const totalMonths = (goalEnd.getFullYear() - goalStart.getFullYear()) * 12 + 
                                  (goalEnd.getMonth() - goalStart.getMonth());
              const monthsPassed = (now.getFullYear() - goalStart.getFullYear()) * 12 + 
                                   (now.getMonth() - goalStart.getMonth());
              const monthsRemaining = totalMonths - monthsPassed;
              
              // Calculate which month this is in the goal timeline
              const thisMonthNum = (currentMonth.getFullYear() - goalStart.getFullYear()) * 12 + 
                                  (currentMonth.getMonth() - goalStart.getMonth());
              
              // Calculate expected progress by this month
              let expectedProgress;
              if (totalMonths === 0) {
                expectedProgress = 1; // If goal is for same month, expect 100%
              } else {
                expectedProgress = Math.min(1, thisMonthNum / totalMonths);
              }
              
              // Apply progress rate to determine the projected value
              // Use either linear or the actual progress rate, whichever is more optimistic
              const linearProjection = goal.targetValue * expectedProgress;
              const trendProjection = progressRate > 0 
                ? goal.currentValue * (1 + ((thisMonthNum - monthsPassed) / monthsPassed) * progressRate)
                : linearProjection;
              
              dataPoint.projected! += Math.min(trendProjection, goal.targetValue);
            }
          }
          
          // Add target value for the month (prorated if this is a partial month)
          if (currentMonth <= startOfMonth(goalEnd)) {
            const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
            const goalEndInMonth = goalEnd.getMonth() === currentMonth.getMonth() && 
                                  goalEnd.getFullYear() === currentMonth.getFullYear();
            
            if (goalEndInMonth) {
              // If goal ends this month, prorate the target
              const daysToEndInMonth = goalEnd.getDate();
              dataPoint.target! += (goal.targetValue * daysToEndInMonth) / daysInMonth;
            } else {
              // Full month target (divided by total months)
              const totalMonths = (goalEnd.getFullYear() - goalStart.getFullYear()) * 12 + 
                                  (goalEnd.getMonth() - goalStart.getMonth()) + 1;
              dataPoint.target! += goal.targetValue / totalMonths;
            }
          }
        }
      });
      
      // Round values for cleaner display
      dataPoint.actual = Math.round(dataPoint.actual!);
      dataPoint.projected = Math.round(dataPoint.projected!);
      dataPoint.target = Math.round(dataPoint.target!);
      
      forecastPoints.push(dataPoint);
      currentMonth = addMonths(currentMonth, 1);
    }
    
    setForecastData(forecastPoints);
  };

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Revenue Forecast</h2>
        <div className="flex space-x-4">
          <Select 
            label="Goal"
            value={selectedGoalId} 
            onChange={(e) => setSelectedGoalId(e.target.value)}
            options={goalOptions}
          />
          <Select 
            label="Forecast Period"
            value={forecastPeriod} 
            onChange={(e) => setForecastPeriod(e.target.value as '3months' | '6months' | '12months')}
            options={periodOptions}
          />
        </div>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Revenue Projection</h3>
          {forecastData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    padding={{ left: 30, right: 30 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'actual') return [formatTooltipValue(value as number), 'Actual'];
                      if (name === 'projected') return [formatTooltipValue(value as number), 'Projected'];
                      if (name === 'target') return [formatTooltipValue(value as number), 'Target'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <ReferenceLine x={format(new Date(), 'MMM yyyy')} stroke="#666" label="Today" />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Actual Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Projected Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Target Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-96 text-gray-500">
              No revenue goals available for forecasting
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Performance Insights</h3>
          {forecastData.length > 0 ? (
            <div className="space-y-4">
              {/* Calculate if we're on track to hit targets */}
              {(() => {
                const latestActual = forecastData.find(d => d.actual! > 0)?.actual || 0;
                const latestTarget = forecastData.find(d => d.target! > 0)?.target || 0;
                const finalProjected = forecastData[forecastData.length - 1]?.projected || 0;
                const finalTarget = forecastData.reduce((sum, point) => sum + (point.target || 0), 0);
                const percentOfTarget = finalTarget > 0 ? (finalProjected / finalTarget) * 100 : 0;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Current Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(latestActual)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Current Target</p>
                      <p className="text-2xl font-bold">{formatCurrency(latestTarget)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Projected by End of Period</p>
                      <p className="text-2xl font-bold">{formatCurrency(finalProjected)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Percent of Target</p>
                      <p className={`text-2xl font-bold ${
                        percentOfTarget >= 100 ? 'text-green-500' : 
                        percentOfTarget >= 85 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {percentOfTarget.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mt-6">
                <h4 className="text-md font-medium mb-2">Recommendation</h4>
                {(() => {
                  const finalProjected = forecastData[forecastData.length - 1]?.projected || 0;
                  const finalTarget = forecastData.reduce((sum, point) => sum + (point.target || 0), 0);
                  const percentOfTarget = finalTarget > 0 ? (finalProjected / finalTarget) * 100 : 0;
                  
                  if (percentOfTarget >= 100) {
                    return (
                      <p className="text-green-500">
                        You're on track to exceed your revenue targets. Consider setting more ambitious goals for the next cycle.
                      </p>
                    );
                  } else if (percentOfTarget >= 85) {
                    return (
                      <p className="text-amber-500">
                        You're close to your targets but may fall slightly short. Focus on closing high-value deals in the pipeline to bridge the gap.
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-red-500">
                        You're significantly behind your revenue targets. Review your sales strategy and consider adjusting your targets or implementing new tactics to accelerate growth.
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No insights available without revenue goals
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GoalForecast; 