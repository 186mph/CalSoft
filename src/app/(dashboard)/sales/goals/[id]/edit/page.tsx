import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoalForm } from '../../../../../../components/goals/GoalForm';
import { fetchGoalById } from '../../../../../../services/goalService';
import { SalesGoal } from '../../../../../../types/sales';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EditGoalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [goal, setGoal] = useState<SalesGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadGoal = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!id) {
          setError('Invalid goal ID');
          return;
        }
        
        const goalData = await fetchGoalById(id);
        if (!goalData) {
          setError('Goal not found');
          return;
        }
        
        setGoal(goalData);
      } catch (err) {
        console.error('Error loading goal:', err);
        setError('Failed to load goal. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGoal();
  }, [id]);
  
  const handleCancel = () => {
    navigate('/sales/goals');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error || 'An unexpected error occurred'}
        </div>
        <div className="mt-4">
          <Link
            to="/sales/goals"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Goals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/sales/goals"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Goals
        </Link>
      </div>
      
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Goal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Update the details of your sales goal
          </p>
        </div>
      
        <GoalForm 
          goalData={goal} 
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
} 