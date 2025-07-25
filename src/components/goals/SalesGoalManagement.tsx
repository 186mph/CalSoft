import React, { useState, useEffect } from 'react';
import { PlusCircle, Filter, BarChart2, Target, Calendar, AlertTriangle } from 'lucide-react';

import { fetchGoals, deleteGoal } from '../../services/goalService';
import { SalesGoal } from '../../types/sales';

import { GoalList } from './GoalList';
import { GoalForm } from './GoalForm';
import { GoalProgress } from './GoalProgress';

import { Button } from '../ui/Button';
import Card from '../ui/Card';

const SalesGoalManagement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SalesGoal | undefined>(undefined);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setsScopeFilter] = useState<string>('all');

  // Load goals on component mount and when refreshKey changes
  useEffect(() => {
    const loadGoals = async () => {
      try {
        setLoading(true);
        const goalsData = await fetchGoals();
        setGoals(goalsData);
        setError(null);
      } catch (err) {
        setError('Failed to load sales goals. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [refreshKey]);

  // Get unique goal types and scopes for filtering
  const goalTypes = React.useMemo(() => {
    const types = [...new Set(goals.map(g => g.type))];
    return types;
  }, [goals]);

  const goalScopes = React.useMemo(() => {
    const scopes = [...new Set(goals.map(g => g.scope))];
    return scopes;
  }, [goals]);

  // Filter goals by type and scope
  const filteredGoals = React.useMemo(() => {
    let filtered = [...goals];
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(g => g.type === typeFilter);
    }
    
    if (scopeFilter !== 'all') {
      filtered = filtered.filter(g => g.scope === scopeFilter);
    }
    
    return filtered;
  }, [goals, typeFilter, scopeFilter]);

  const handleAddGoal = () => {
    setSelectedGoal(undefined);
    setShowForm(true);
  };

  const handleEditGoal = (goal: SalesGoal) => {
    setSelectedGoal(goal);
    setShowForm(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        setRefreshKey(prevKey => prevKey + 1);
      } catch (err) {
        setError('Failed to delete goal. Please try again later.');
        console.error('Error deleting goal:', err);
      }
    }
  };

  const handleFormSave = (goal: SalesGoal) => {
    setShowForm(false);
    setSelectedGoal(undefined);
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedGoal(undefined);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const handleScopeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setsScopeFilter(e.target.value);
  };

  // Show loading spinner when initially loading
  if (loading && goals.length === 0) {
    return (
      <div className="container py-4">
        <div className="flex justify-center items-center" style={{ height: '300px' }}>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-2">Loading sales goals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-0">Sales Goal Management</h1>
          <p className="text-gray-500">Create, track, and manage sales goals across your organization</p>
        </div>
        <div>
          {!showForm && (
            <Button variant="primary" onClick={handleAddGoal}>
              <PlusCircle size={16} className="mr-2" />
              Create New Goal
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 rounded relative">
          <AlertTriangle size={16} className="inline mr-2" />
          {error}
          <button 
            className="absolute top-0 bottom-0 right-0 px-4" 
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {showForm ? (
        <GoalForm
          goalData={selectedGoal}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <>
          {filteredGoals.length > 0 ? (
            <>
              <Card className="mb-4">
                <div className="p-4 bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h5 className="font-medium flex items-center">
                        <Filter size={18} className="mr-2" />
                        Filter Goals
                      </h5>
                    </div>
                    <div className="w-64 mr-2">
                      <select
                        className="w-full rounded border p-2"
                        value={typeFilter}
                        onChange={handleTypeFilterChange}
                      >
                        <option value="all">All Types</option>
                        {goalTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-64">
                      <select
                        className="w-full rounded border p-2"
                        value={scopeFilter}
                        onChange={handleScopeFilterChange}
                      >
                        <option value="all">All Scopes</option>
                        {goalScopes.map(scope => (
                          <option key={scope} value={scope}>{scope}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="md:col-span-8">
                  <GoalList />
                </div>
                <div className="md:col-span-4">
                  <Card>
                    <div className="p-4 bg-gray-50 border-b">
                      <h5 className="font-medium flex items-center">
                        <BarChart2 size={18} className="mr-2" />
                        Goal Metrics
                      </h5>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        <h6 className="mb-3 font-medium flex items-center">
                          <Target size={16} className="mr-2" />
                          Goals by Type
                        </h6>
                        {goalTypes.map(type => {
                          const count = goals.filter(g => g.type === type).length;
                          return (
                            <div key={type} className="flex justify-between mb-2">
                              <span>{type} Goals</span>
                              <span className="bg-primary text-white px-2 py-1 rounded-full text-xs">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <h6 className="mb-3 font-medium flex items-center">
                          <Calendar size={16} className="mr-2" />
                          Goals by Period
                        </h6>
                        {['Monthly', 'Quarterly', 'Yearly', 'Custom'].map(period => {
                          const count = goals.filter(g => g.period === period).length;
                          return (
                            <div key={period} className="flex justify-between mb-2">
                              <span>{period}</span>
                              <span className="bg-secondary text-white px-2 py-1 rounded-full text-xs">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <Card className="text-center p-5">
              <div className="p-8">
                <h4 className="text-xl font-bold">No Sales Goals Found</h4>
                <p className="text-gray-500 my-3">
                  You don't have any sales goals yet. Create your first goal to get started.
                </p>
                <Button variant="primary" onClick={handleAddGoal}>
                  <PlusCircle size={16} className="mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SalesGoalManagement; 