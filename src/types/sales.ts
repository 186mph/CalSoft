/**
 * Sales related type definitions
 */

export interface SalesGoal {
  id: string;
  title: string;
  description?: string;
  type: 'Revenue' | 'Deals' | 'Units' | 'Meetings' | 'Calls';
  scope: 'Individual' | 'Team' | 'Department' | 'Company';
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  period: 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
  ownerId?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Territory {
  id: string;
  name: string;
  description?: string;
  region: string;
  manager: string;
  assignedSalesReps: string[];
  revenue: {
    target: number;
    current: number;
  };
  accounts: number;
  opportunities: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  date: string;
}

export interface ForecastData {
  period: string;
  projectedRevenue: number;
  actualRevenue?: number;
  confidence: number;
  opportunities: number;
  pipeline: number;
}

export interface SalesPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

/**
 * Territory related type definitions
 */

export interface TerritorySalesRep {
  id: string;
  name: string;
  email: string;
  role: 'Territory Manager' | 'Account Executive' | 'Sales Development Rep';
  territories: string[];
  profileImage?: string;
  performance?: {
    quota: number;
    achieved: number;
  };
}

export interface TerritoryAssignmentRequest {
  id: string;
  territoryId: string;
  requestedBy: string;
  requestedFor: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Account ownership type definitions
 */

export interface AccountOwnership {
  accountId: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  territoryId: string;
  territoryName: string;
  assignedDate: string;
  lastInteractionDate?: string;
} 