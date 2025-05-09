import { SalesGoal } from '../types/sales';

// Temporary mock data for development
const mockGoals: SalesGoal[] = [
  {
    id: '1',
    title: 'Q2 Revenue Target',
    description: 'Hit quarterly revenue target for the sales team',
    type: 'Revenue',
    scope: 'Team',
    targetValue: 500000,
    currentValue: 325000,
    startDate: '2023-04-01T00:00:00Z',
    endDate: '2023-06-30T23:59:59Z',
    period: 'Quarterly',
    teamId: 'sales-team-1',
    createdAt: '2023-03-15T10:00:00Z',
    updatedAt: '2023-05-20T15:30:00Z'
  },
  {
    id: '2',
    title: 'New Accounts Goal',
    description: 'Acquire new enterprise accounts',
    type: 'Deals',
    scope: 'Individual',
    targetValue: 10,
    currentValue: 7,
    startDate: '2023-01-01T00:00:00Z',
    endDate: '2023-12-31T23:59:59Z',
    period: 'Yearly',
    ownerId: 'user-123',
    createdAt: '2023-01-02T09:00:00Z',
    updatedAt: '2023-05-18T11:20:00Z'
  },
  {
    id: '3',
    title: 'Monthly Sales Calls',
    description: 'Reach monthly target of sales calls',
    type: 'Calls',
    scope: 'Individual',
    targetValue: 100,
    currentValue: 68,
    startDate: '2023-05-01T00:00:00Z',
    endDate: '2023-05-31T23:59:59Z',
    period: 'Monthly',
    ownerId: 'user-123',
    createdAt: '2023-04-28T14:30:00Z',
    updatedAt: '2023-05-22T09:15:00Z'
  }
];

/**
 * Fetch all sales goals
 * @returns Promise resolving to array of SalesGoal objects
 */
export const fetchGoals = async (): Promise<SalesGoal[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real app, this would be an API call:
  // return await api.get('/sales/goals');
  
  return mockGoals;
};

/**
 * Fetch a specific sales goal by ID
 * @param id Goal ID
 * @returns Promise resolving to a SalesGoal object or null if not found
 */
export const fetchGoalById = async (id: string): Promise<SalesGoal | null> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real app, this would be an API call:
  // return await api.get(`/sales/goals/${id}`);
  
  const goal = mockGoals.find(goal => goal.id === id);
  return goal || null;
};

/**
 * Create a new sales goal
 * @param goalData Goal data (without id, createdAt, updatedAt)
 * @returns Promise resolving to the created SalesGoal with ID
 */
export const createGoal = async (goalData: Omit<SalesGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesGoal> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real app, this would be an API call:
  // return await api.post('/sales/goals', goalData);
  
  const now = new Date().toISOString();
  const newGoal: SalesGoal = {
    ...goalData,
    id: `goal-${Math.random().toString(36).substring(2, 11)}`,
    createdAt: now,
    updatedAt: now
  };
  
  // In a real app, this would be stored in the backend
  mockGoals.push(newGoal);
  
  return newGoal;
};

/**
 * Update an existing sales goal
 * @param id Goal ID
 * @param goalData Updated goal data
 * @returns Promise resolving to the updated SalesGoal
 */
export const updateGoal = async (id: string, goalData: Partial<SalesGoal>): Promise<SalesGoal> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real app, this would be an API call:
  // return await api.put(`/sales/goals/${id}`, goalData);
  
  const index = mockGoals.findIndex(goal => goal.id === id);
  
  if (index === -1) {
    throw new Error(`Goal with ID ${id} not found`);
  }
  
  const updatedGoal: SalesGoal = {
    ...mockGoals[index],
    ...goalData,
    updatedAt: new Date().toISOString()
  };
  
  mockGoals[index] = updatedGoal;
  
  return updatedGoal;
};

/**
 * Delete a sales goal
 * @param id Goal ID
 * @returns Promise resolving to success status
 */
export const deleteGoal = async (id: string): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // In a real app, this would be an API call:
  // return await api.delete(`/sales/goals/${id}`);
  
  const index = mockGoals.findIndex(goal => goal.id === id);
  
  if (index === -1) {
    throw new Error(`Goal with ID ${id} not found`);
  }
  
  mockGoals.splice(index, 1);
  
  return true;
}; 