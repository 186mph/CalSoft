import React, { useState, useEffect } from 'react';
import { SalesGoal } from '../../types/sales';
import { fetchGoals, deleteGoal } from '../../services/goalService';
import { formatDate, getDaysRemaining, getTimeElapsedPercentage } from '../../utils/dateUtils';
import { calculateProgress } from '../../utils/salesUtils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableHeader, 
  TableRow,
  EmptyTableRow
} from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Edit, Trash2, Calendar, AlertTriangle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GoalList() {
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(id);
        setGoals(goals.filter(goal => goal.id !== id));
      } catch (err) {
        setError('Failed to delete goal. Please try again.');
        console.error('Error deleting goal:', err);
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
      <AlertTriangle className="inline mr-2" size={18} />
      {error}
    </div>;
  }

  const determineGoalStatus = (goal: SalesGoal): string => {
    const progress = goal.currentValue / goal.targetValue;
    const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
    const now = new Date();
    const endDate = new Date(goal.endDate);
    
    if (endDate < now) {
      return progress >= 1 ? 'Completed' : 'Behind';
    }
    
    if (progress >= 1) {
      return 'Completed';
    }
    
    if (progress >= timeElapsed / 100) {
      return 'On Track';
    }
    
    if (progress >= (timeElapsed / 100) - 0.15) {
      return 'At Risk';
    }
    
    return 'Behind';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Track':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
          <Check size={14} /> On Track
        </Badge>;
      case 'At Risk':
        return <Badge variant="secondary" className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600">
          <AlertTriangle size={14} /> At Risk
        </Badge>;
      case 'Behind':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle size={14} /> Behind
        </Badge>;
      case 'Completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
          <Check size={14} /> Completed
        </Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/sales/goals/${id}/edit`);
  };

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Goal</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.length === 0 ? (
            <EmptyTableRow colSpan={6} />
          ) : (
            goals.map((goal) => {
              const progress = goal.currentValue / goal.targetValue;
              const status = determineGoalStatus(goal);
              const daysRemaining = getDaysRemaining(goal.endDate);
              
              return (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{goal.title}</div>
                      <div className="text-sm text-gray-500">{goal.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{goal.type}</TableCell>
                  <TableCell>{getStatusBadge(status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm">
                        {goal.type === 'Revenue' 
                          ? `$${goal.currentValue.toLocaleString()} of $${goal.targetValue.toLocaleString()}` 
                          : `${goal.currentValue} of ${goal.targetValue}`}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            status === 'On Track' || status === 'Completed' 
                              ? 'bg-green-500' 
                              : status === 'At Risk' 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(progress * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {daysRemaining > 0 
                          ? `${daysRemaining} days remaining` 
                          : 'Ended'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" 
                        onClick={() => handleEdit(goal.id)}>
                        <Edit size={16} />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600" 
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 size={16} />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default GoalList; 