// Sales Goal Types
export interface SalesGoal {
  id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  user_id?: string;
  team_id?: string;
  goal_type: 'revenue' | 'deals' | 'customers' | 'other';
  goal_scope: 'individual' | 'team' | 'company';
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  created_at: string;
  notifications_enabled: boolean;
}

export interface GoalProgress {
  percentage: number;
  remaining: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  timeRemaining: number; // In days
  timeElapsed: number; // In days
  daysTotal: number;
  projectedValue?: number;
} 