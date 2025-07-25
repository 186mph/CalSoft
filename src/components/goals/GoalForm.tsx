import React, { useState, useEffect } from 'react';
import { SalesGoal } from '../../types/sales';
import { createGoal, updateGoal } from '../../services/goalService';
import { addDays, addMonths, addYears, format } from 'date-fns';

export interface GoalFormProps {
  goalData?: SalesGoal;
  onSave?: (goal: SalesGoal) => void;
  onCancel?: () => void;
}

export function GoalForm({ goalData, onSave, onCancel }: GoalFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SalesGoal['type']>('Revenue');
  const [scope, setScope] = useState<SalesGoal['scope']>('Individual');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [period, setPeriod] = useState<SalesGoal['period']>('Monthly');
  
  // Error handling
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load data if editing an existing goal
  useEffect(() => {
    if (goalData) {
      setTitle(goalData.title);
      setDescription(goalData.description || '');
      setType(goalData.type);
      setScope(goalData.scope);
      setTargetValue(goalData.targetValue.toString());
      setCurrentValue(goalData.currentValue.toString());
      
      // Format dates for input fields
      const start = new Date(goalData.startDate);
      const end = new Date(goalData.endDate);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      
      setPeriod(goalData.period);
    }
  }, [goalData]);

  // Handle period change to automatically adjust the end date
  const handlePeriodChange = (newPeriod: SalesGoal['period']) => {
    setPeriod(newPeriod);
    
    // Update end date based on the new period
    const start = new Date(startDate);
    let end;
    
    switch (newPeriod) {
      case 'Monthly':
        end = addMonths(start, 1);
        break;
      case 'Quarterly':
        end = addMonths(start, 3);
        break;
      case 'Yearly':
        end = addYears(start, 1);
        break;
      default:
        // 'Custom' period - don't auto-adjust
        return;
    }
    
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!targetValue.trim()) {
      newErrors.targetValue = 'Target value is required';
    } else if (isNaN(Number(targetValue)) || Number(targetValue) <= 0) {
      newErrors.targetValue = 'Target value must be a positive number';
    }
    
    if (!currentValue.trim()) {
      newErrors.currentValue = 'Current value is required';
    } else if (isNaN(Number(currentValue)) || Number(currentValue) < 0) {
      newErrors.currentValue = 'Current value must be a non-negative number';
    }
    
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    
    if (new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    
    // If there are validation errors, don't submit
    if (Object.keys(newErrors).length > 0) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      const goalPayload = {
        title,
        description: description.trim() || undefined,
        type,
        scope,
        targetValue: Number(targetValue),
        currentValue: Number(currentValue),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        period
      };
      
      let savedGoal;
      
      if (goalData) {
        // Update existing goal
        savedGoal = await updateGoal(goalData.id, goalPayload);
      } else {
        // Create new goal
        savedGoal = await createGoal(goalPayload);
      }
      
      // Call onSave callback if provided
      if (onSave) {
        onSave(savedGoal);
      } else {
        // If no callback provided, redirect to goals list
        window.location.href = '/sales/goals';
      }
    } catch (err) {
      console.error('Error saving goal:', err);
      setSubmitError('An error occurred while saving the goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {submitError}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Goal Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.title
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            } dark:bg-dark-200 dark:border-dark-300`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Goal Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as SalesGoal['type'])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-200 dark:border-dark-300"
          >
            <option value="Revenue">Revenue</option>
            <option value="Deals">Deals</option>
            <option value="Units">Units</option>
            <option value="Meetings">Meetings</option>
            <option value="Calls">Calls</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="scope" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Goal Scope <span className="text-red-500">*</span>
          </label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as SalesGoal['scope'])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-200 dark:border-dark-300"
          >
            <option value="Individual">Individual</option>
            <option value="Team">Team</option>
            <option value="Department">Department</option>
            <option value="Company">Company</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Period <span className="text-red-500">*</span>
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value as SalesGoal['period'])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-200 dark:border-dark-300"
          >
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="targetValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target Value <span className="text-red-500">*</span>
          </label>
          <input
            id="targetValue"
            type="text"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.targetValue
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            } dark:bg-dark-200 dark:border-dark-300`}
          />
          {errors.targetValue && <p className="mt-1 text-sm text-red-600">{errors.targetValue}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="currentValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Value <span className="text-red-500">*</span>
          </label>
          <input
            id="currentValue"
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.currentValue
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            } dark:bg-dark-200 dark:border-dark-300`}
          />
          {errors.currentValue && <p className="mt-1 text-sm text-red-600">{errors.currentValue}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.startDate
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            } dark:bg-dark-200 dark:border-dark-300`}
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.endDate
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            } dark:bg-dark-200 dark:border-dark-300`}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-200 dark:border-dark-300"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-dark-200 dark:border-dark-300 dark:text-gray-300 dark:hover:bg-dark-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSubmitting
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          }`}
        >
          {isSubmitting ? 'Saving...' : goalData ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
} 