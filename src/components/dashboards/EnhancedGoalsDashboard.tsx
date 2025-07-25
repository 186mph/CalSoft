import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { Target, BarChart2, Users, TrendingUp } from "lucide-react";
import { GoalsDashboard } from './GoalsDashboard';
import GoalPerformanceTable from '../goals/GoalPerformanceTable';
import GoalForecast from '../goals/GoalForecast';

export function EnhancedGoalsDashboard() {
  const [currentTab, setCurrentTab] = useState<string>('overview');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Goals Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track, analyze, and optimize your sales goals performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Team Performance</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Revenue Forecast</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Goals Management</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <GoalsDashboard />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <GoalPerformanceTable />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <GoalForecast />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
              This tab will contain goal management functionality - create, edit, and delete goals.
            </p>
            {/* Goal list and management functionality would go here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 