import React from 'react';
import { Link } from 'react-router-dom';
import { GoalList } from '../../../../components/goals/GoalList';
import { Button } from '../../../../components/ui/Button';
import { PlusIcon, BarChartIcon } from 'lucide-react';

export default function GoalsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Goals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create, track, and manage your sales goals and targets
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/sales/goals/dashboard">
            <Button variant="outline" className="mr-2">
              <BarChartIcon className="h-5 w-5 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to="/sales/goals/new">
            <Button>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Goal
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-sm p-6">
        <GoalList />
      </div>
    </div>
  );
} 