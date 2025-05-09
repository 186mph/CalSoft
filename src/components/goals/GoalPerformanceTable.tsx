import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/Table";
import { Badge } from "../ui/Badge";
import Card from "../ui/Card";
import Select, { SelectOption } from "../ui/Select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { fetchGoals } from '../../services/goalService';
import { SalesGoal } from '../../types/sales';
import { 
  formatDate, 
  getDaysRemaining 
} from '../../utils/dateUtils';
import { 
  calculateProgress, 
  determineGoalStatus, 
  formatCurrency 
} from '../../utils/salesUtils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface TeamPerformance {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  goals: SalesGoal[];
  averageCompletion: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsBehind: number;
}

// Mock team data for demonstration
const mockTeams: TeamPerformance[] = [
  {
    teamId: 'sales-team-1',
    teamName: 'Enterprise Sales',
    members: [
      { id: 'user-1', name: 'John Smith', role: 'Senior Account Executive' },
      { id: 'user-2', name: 'Sarah Johnson', role: 'Account Executive' },
      { id: 'user-3', name: 'David Lee', role: 'Sales Development Rep' }
    ],
    goals: [],
    averageCompletion: 0,
    goalsOnTrack: 0,
    goalsAtRisk: 0,
    goalsBehind: 0
  },
  {
    teamId: 'sales-team-2',
    teamName: 'Mid-Market Sales',
    members: [
      { id: 'user-4', name: 'Michael Chen', role: 'Account Executive' },
      { id: 'user-5', name: 'Emily Wilson', role: 'Sales Development Rep' }
    ],
    goals: [],
    averageCompletion: 0,
    goalsAtRisk: 0,
    goalsOnTrack: 0,
    goalsBehind: 0
  }
];

interface GoalPerformanceTableProps {
  scope?: 'Individual' | 'Team' | 'All';
  timeFrame?: 'month' | 'quarter' | 'year';
}

export const GoalPerformanceTable: React.FC<GoalPerformanceTableProps> = ({ 
  scope = 'All', 
  timeFrame = 'quarter' 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamPerformance[]>(mockTeams);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [currentScope, setCurrentScope] = useState<'Individual' | 'Team' | 'All'>(scope);
  const [currentTimeFrame, setCurrentTimeFrame] = useState<'month' | 'quarter' | 'year'>(timeFrame);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        const data = await fetchGoals();
        setGoals(data);
        
        // Distribute goals to teams for the mock data
        const updatedTeams = [...teams];
        
        // Assign goals to teams based on teamId or randomly for demo
        updatedTeams.forEach(team => {
          // Filter goals that belong to this team
          team.goals = data.filter(goal => 
            goal.teamId === team.teamId || 
            (goal.scope === 'Team' && !goal.teamId) // Assign "orphan" team goals randomly
          );
          
          // Calculate metrics
          team.averageCompletion = calculateTeamAverageCompletion(team.goals);
          team.goalsOnTrack = calculateTeamGoalsByStatus(team.goals, 'on-track');
          team.goalsAtRisk = calculateTeamGoalsByStatus(team.goals, 'at-risk');
          team.goalsBehind = calculateTeamGoalsByStatus(team.goals, 'behind');
        });
        
        setTeams(updatedTeams);
        setError(null);
      } catch (err) {
        setError('Failed to load goal performance data. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, []);

  useEffect(() => {
    prepareChartData();
  }, [teams, currentScope, currentTimeFrame]);

  const calculateTeamAverageCompletion = (teamGoals: SalesGoal[]): number => {
    if (teamGoals.length === 0) return 0;
    
    const completionSum = teamGoals.reduce((sum, goal) => {
      return sum + calculateProgress(goal.currentValue, goal.targetValue);
    }, 0);
    
    return Math.round(completionSum / teamGoals.length);
  };

  const calculateTeamGoalsByStatus = (teamGoals: SalesGoal[], status: 'on-track' | 'at-risk' | 'behind'): number => {
    return teamGoals.filter(goal => {
      const progress = calculateProgress(goal.currentValue, goal.targetValue);
      const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
      return determineGoalStatus(progress, timeElapsed) === status;
    }).length;
  };

  const getTimeElapsedPercentage = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = now.getTime() - start.getTime();
    
    if (totalDuration <= 0) return 100;
    if (now > end) return 100;
    if (now < start) return 0;
    
    return Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  };

  const prepareChartData = () => {
    // Prepare data for the team performance chart
    const newChartData = teams.map(team => ({
      name: team.teamName,
      completion: team.averageCompletion,
      onTrack: team.goalsOnTrack,
      atRisk: team.goalsAtRisk,
      behind: team.goalsBehind,
      totalGoals: team.goals.length
    }));
    
    setChartData(newChartData);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | undefined => {
    switch (status) {
      case 'on-track':
        return 'default';
      case 'at-risk':
        return 'secondary';
      case 'behind':
        return 'destructive';
      default:
        return undefined;
    }
  };

  // Select options for filtering
  const scopeOptions: SelectOption[] = [
    { value: 'All', label: 'All Scopes' },
    { value: 'Individual', label: 'Individual' },
    { value: 'Team', label: 'Team' }
  ];

  const timeFrameOptions: SelectOption[] = [
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

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
        <h2 className="text-xl font-semibold">Goal Performance Analysis</h2>
        <div className="flex space-x-4">
          <Select 
            value={currentScope} 
            onChange={(e) => setCurrentScope(e.target.value as 'Individual' | 'Team' | 'All')}
            options={scopeOptions}
          />
          <Select 
            value={currentTimeFrame} 
            onChange={(e) => setCurrentTimeFrame(e.target.value as 'month' | 'quarter' | 'year')}
            options={timeFrameOptions}
          />
        </div>
      </div>

      {/* Performance Chart */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Team Performance Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    switch (name) {
                      case 'completion':
                        return [`${value}%`, 'Average Completion'];
                      case 'onTrack':
                        return [`${value} goals`, 'On Track'];
                      case 'atRisk':
                        return [`${value} goals`, 'At Risk'];
                      case 'behind':
                        return [`${value} goals`, 'Behind'];
                      default:
                        return [value, name];
                    }
                  }}
                />
                <Legend />
                <Bar dataKey="completion" fill="#3b82f6" name="Average Completion %" />
                <Bar dataKey="onTrack" fill="#10b981" name="On Track" />
                <Bar dataKey="atRisk" fill="#f59e0b" name="At Risk" />
                <Bar dataKey="behind" fill="#ef4444" name="Behind" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Team Performance Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Team Performance Details</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Total Goals</TableHead>
                <TableHead>Average Completion</TableHead>
                <TableHead>Status Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map(team => (
                <TableRow key={team.teamId}>
                  <TableCell className="font-medium">{team.teamName}</TableCell>
                  <TableCell>{team.members.length}</TableCell>
                  <TableCell>{team.goals.length}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${team.averageCompletion}%` }}
                        ></div>
                      </div>
                      <span>{team.averageCompletion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Badge variant="default" className="bg-green-100 text-green-800">{team.goalsOnTrack} on track</Badge>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">{team.goalsAtRisk} at risk</Badge>
                      <Badge variant="destructive">{team.goalsBehind} behind</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Team Member Performance */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Individual Performance</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Goal Progress</TableHead>
                <TableHead>Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.flatMap(team => 
                team.members.map(member => {
                  // Mock individual performance data for demonstration
                  const memberGoals = goals.filter(g => g.ownerId === member.id || g.scope === 'Individual');
                  const avgCompletion = memberGoals.length > 0 
                    ? Math.round(memberGoals.reduce((sum, g) => sum + calculateProgress(g.currentValue, g.targetValue), 0) / memberGoals.length) 
                    : 0;
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{team.teamName}</TableCell>
                      <TableCell>{memberGoals.length} goals</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${avgCompletion}%` }}
                            ></div>
                          </div>
                          <span>{avgCompletion}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default GoalPerformanceTable; 