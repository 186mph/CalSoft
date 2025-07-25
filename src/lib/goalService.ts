import { supabase } from './supabase';
import { SalesGoal, GoalProgress } from './types';
import { differenceInDays } from 'date-fns';

/**
 * Fetch all sales goals
 * @param userId Optional user ID to filter goals by user
 * @param teamId Optional team ID to filter goals by team
 * @returns List of sales goals
 */
export async function fetchGoals(userId?: string, teamId?: string) {
  try {
    let query = supabase
      .schema('business')
      .from('sales_goals')
      .select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
    
    return data as SalesGoal[];
  } catch (error) {
    console.error('Error in fetchGoals:', error);
    return [];
  }
}

/**
 * Create a new sales goal
 * @param goal Goal data to create
 * @returns The created goal or null on error
 */
export async function createGoal(goal: Omit<SalesGoal, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .schema('business')
      .from('sales_goals')
      .insert({
        ...goal,
        created_at: new Date().toISOString(),
        current_value: goal.current_value || 0
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
    
    return data as SalesGoal;
  } catch (error) {
    console.error('Error in createGoal:', error);
    return null;
  }
}

/**
 * Update an existing sales goal
 * @param id Goal ID to update
 * @param updates Goal data to update
 * @returns The updated goal or null on error
 */
export async function updateGoal(id: string, updates: Partial<SalesGoal>) {
  try {
    const { data, error } = await supabase
      .schema('business')
      .from('sales_goals')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
    
    return data as SalesGoal;
  } catch (error) {
    console.error('Error in updateGoal:', error);
    return null;
  }
}

/**
 * Delete a sales goal
 * @param id Goal ID to delete
 * @returns Boolean indicating success
 */
export async function deleteGoal(id: string) {
  try {
    const { error } = await supabase
      .schema('business')
      .from('sales_goals')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteGoal:', error);
    return false;
  }
}

/**
 * Calculate progress for a sales goal
 * @param goal The sales goal to calculate progress for
 * @returns Progress data for the goal
 */
export function calculateGoalProgress(goal: SalesGoal): GoalProgress {
  const now = new Date();
  const startDate = new Date(goal.start_date);
  const endDate = new Date(goal.end_date);
  
  const daysTotal = differenceInDays(endDate, startDate) || 1; // Avoid division by zero
  const timeElapsed = Math.max(0, differenceInDays(now, startDate));
  const timeRemaining = Math.max(0, differenceInDays(endDate, now));
  
  // Calculate percentage of target reached
  const percentage = (goal.current_value / goal.target_value) * 100;
  
  // Calculate how much value is left to reach the target
  const remaining = Math.max(0, goal.target_value - goal.current_value);
  
  // Calculate expected progress based on time elapsed
  const expectedProgress = (timeElapsed / daysTotal) * 100;
  
  // Determine if the goal is on track based on expected vs. actual progress
  let status: GoalProgress['status'] = 'on_track';
  
  if (percentage >= 100) {
    status = 'completed';
  } else if (percentage < expectedProgress - 20) {
    status = 'behind';
  } else if (percentage < expectedProgress - 10) {
    status = 'at_risk';
  }
  
  // Calculate projected value at end date based on current rate of progress
  let projectedValue: number | undefined = undefined;
  if (timeElapsed > 0) {
    const dailyRate = goal.current_value / timeElapsed;
    projectedValue = goal.current_value + (dailyRate * timeRemaining);
  }
  
  return {
    percentage,
    remaining,
    status,
    timeRemaining,
    timeElapsed,
    daysTotal,
    projectedValue
  };
}

/**
 * Set up Supabase database schema for sales goals
 * This function should be called once to set up the required tables
 */
export async function setupGoalsTables() {
  try {
    // Create sales_goals table if it doesn't exist
    const { error: createError } = await supabase.rpc('create_sales_goals_table');
    
    if (createError && !createError.message.includes('already exists')) {
      console.error('Error setting up sales_goals table:', createError);
      throw createError;
    }
    
    console.log('Sales goals tables set up successfully');
    return true;
  } catch (error) {
    console.error('Error in setupGoalsTables:', error);
    return false;
  }
} 