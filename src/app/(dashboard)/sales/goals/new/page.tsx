import React from 'react';
import { Link } from 'react-router-dom';
import { GoalForm } from '../../../../../components/goals/GoalForm';
import { ChevronLeft } from 'lucide-react';

export default function NewGoalPage() {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Goal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Set up a new sales goal, target, or objective
          </p>
        </div>
      
        <GoalForm />
      </div>
    </div>
  );
} 