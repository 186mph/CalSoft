import { 
  Territory, 
  TerritorySalesRep, 
  TerritoryAssignmentRequest,
  AccountOwnership 
} from '../types/sales';
import { v4 as uuidv4 } from 'uuid';

// Mock data for territories
const mockTerritories: Territory[] = [
  {
    id: '1',
    name: 'Western US',
    description: 'Covers California, Oregon, Washington, and Nevada',
    region: 'North America',
    manager: 'John Smith',
    assignedSalesReps: ['101', '102', '103'],
    revenue: {
      target: 2500000,
      current: 1750000,
    },
    accounts: 45,
    opportunities: 18,
    createdAt: new Date(2023, 1, 15).toISOString(),
    updatedAt: new Date(2023, 6, 10).toISOString(),
  },
  {
    id: '2',
    name: 'Northeast',
    description: 'Covers New York, Massachusetts, Connecticut, and New Jersey',
    region: 'North America',
    manager: 'Sarah Johnson',
    assignedSalesReps: ['104', '105'],
    revenue: {
      target: 1800000,
      current: 1350000,
    },
    accounts: 32,
    opportunities: 12,
    createdAt: new Date(2023, 1, 15).toISOString(),
    updatedAt: new Date(2023, 5, 22).toISOString(),
  },
  {
    id: '3',
    name: 'UK & Ireland',
    description: 'Covers all territories in United Kingdom and Ireland',
    region: 'Europe',
    manager: 'Michael Brown',
    assignedSalesReps: ['106', '107', '108'],
    revenue: {
      target: 1500000,
      current: 980000,
    },
    accounts: 28,
    opportunities: 15,
    createdAt: new Date(2023, 2, 10).toISOString(),
    updatedAt: new Date(2023, 4, 5).toISOString(),
  },
];

// Mock data for sales reps
const mockSalesReps: TerritorySalesRep[] = [
  {
    id: '101',
    name: 'Emily Wilson',
    email: 'emily.wilson@example.com',
    role: 'Territory Manager',
    territories: ['1'],
    profileImage: 'https://randomuser.me/api/portraits/women/23.jpg',
    performance: {
      quota: 500000,
      achieved: 420000,
    },
  },
  {
    id: '102',
    name: 'David Miller',
    email: 'david.miller@example.com',
    role: 'Account Executive',
    territories: ['1'],
    profileImage: 'https://randomuser.me/api/portraits/men/42.jpg',
    performance: {
      quota: 350000,
      achieved: 310000,
    },
  },
  {
    id: '103',
    name: 'Jessica Taylor',
    email: 'jessica.taylor@example.com',
    role: 'Sales Development Rep',
    territories: ['1'],
    profileImage: 'https://randomuser.me/api/portraits/women/17.jpg',
    performance: {
      quota: 200000,
      achieved: 175000,
    },
  },
  {
    id: '104',
    name: 'Robert Johnson',
    email: 'robert.johnson@example.com',
    role: 'Territory Manager',
    territories: ['2'],
    profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    performance: {
      quota: 450000,
      achieved: 380000,
    },
  },
  {
    id: '105',
    name: 'Amanda Lewis',
    email: 'amanda.lewis@example.com',
    role: 'Account Executive',
    territories: ['2'],
    profileImage: 'https://randomuser.me/api/portraits/women/52.jpg',
    performance: {
      quota: 300000,
      achieved: 275000,
    },
  },
  {
    id: '106',
    name: 'Thomas Wright',
    email: 'thomas.wright@example.com',
    role: 'Territory Manager',
    territories: ['3'],
    profileImage: 'https://randomuser.me/api/portraits/men/11.jpg',
    performance: {
      quota: 400000,
      achieved: 310000,
    },
  },
];

// Mock data for territory assignment requests
const mockAssignmentRequests: TerritoryAssignmentRequest[] = [
  {
    id: 'req-001',
    territoryId: 'ter-001',
    requestedBy: 'user-006',
    requestedFor: 'user-008',
    status: 'pending',
    reason: 'Daniel has expertise in manufacturing accounts which are prevalent in the Northeast region.',
    createdAt: '2023-09-20T14:25:00Z'
  },
  {
    id: 'req-002',
    territoryId: 'ter-004',
    requestedBy: 'user-004',
    requestedFor: 'user-005',
    status: 'approved',
    reason: 'Jessica is relocating to California and has requested a transfer to the West region.',
    createdAt: '2023-09-15T10:30:00Z',
    resolvedAt: '2023-09-18T09:15:00Z',
    resolvedBy: 'user-009'
  },
  {
    id: 'req-003',
    territoryId: 'ter-003',
    requestedBy: 'user-001',
    requestedFor: 'user-002',
    status: 'rejected',
    reason: 'Michael has requested to transfer to the Midwest territory to be closer to family.',
    createdAt: '2023-09-10T16:45:00Z',
    resolvedAt: '2023-09-12T11:20:00Z',
    resolvedBy: 'user-006'
  }
];

// Mock account ownerships
const mockAccountOwnerships: AccountOwnership[] = [
  {
    accountId: 'acc-001',
    accountName: 'Acme Corporation',
    ownerId: 'user-001',
    ownerName: 'Sarah Johnson',
    territoryId: 'ter-001',
    territoryName: 'Northeast',
    assignedDate: '2023-02-15T00:00:00Z',
    lastInteractionDate: '2023-09-18T00:00:00Z'
  },
  {
    accountId: 'acc-002',
    accountName: 'Globex Industries',
    ownerId: 'user-002',
    ownerName: 'Michael Chen',
    territoryId: 'ter-001',
    territoryName: 'Northeast',
    assignedDate: '2023-03-22T00:00:00Z',
    lastInteractionDate: '2023-09-20T00:00:00Z'
  },
  {
    accountId: 'acc-003',
    accountName: 'Oceanic Airlines',
    ownerId: 'user-004',
    ownerName: 'David Lee',
    territoryId: 'ter-002',
    territoryName: 'Southeast',
    assignedDate: '2023-02-10T00:00:00Z',
    lastInteractionDate: '2023-09-15T00:00:00Z'
  },
  {
    accountId: 'acc-004',
    accountName: 'Stark Industries',
    ownerId: 'user-006',
    ownerName: 'Robert Johnson',
    territoryId: 'ter-003',
    territoryName: 'Midwest',
    assignedDate: '2023-04-05T00:00:00Z',
    lastInteractionDate: '2023-09-19T00:00:00Z'
  },
  {
    accountId: 'acc-005',
    accountName: 'Wayne Enterprises',
    ownerId: 'user-009',
    ownerName: 'Thomas Wilson',
    territoryId: 'ter-004',
    territoryName: 'West',
    assignedDate: '2023-03-18T00:00:00Z',
    lastInteractionDate: '2023-09-21T00:00:00Z'
  }
];

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all territories
 * @returns Promise resolving to array of Territory objects
 */
export const fetchTerritories = async (): Promise<Territory[]> => {
  await delay(800); // Simulate API delay
  return [...mockTerritories];
};

/**
 * Fetch a specific territory by ID
 * @param id Territory ID
 * @returns Promise resolving to a Territory object or null if not found
 */
export const fetchTerritoryById = async (id: string): Promise<Territory | null> => {
  await delay(500);
  const territory = mockTerritories.find(t => t.id === id);
  return territory ? { ...territory } : null;
};

/**
 * Fetch sales reps for a specific territory
 * @param territoryId Territory ID
 * @returns Promise resolving to array of TerritorySalesRep objects
 */
export const fetchSalesRepsByTerritory = async (territoryId: string): Promise<TerritorySalesRep[]> => {
  await delay(600);
  return mockSalesReps.filter(rep => rep.territories.includes(territoryId));
};

/**
 * Fetch all sales reps
 * @returns Promise resolving to array of TerritorySalesRep objects
 */
export const fetchAllSalesReps = async (): Promise<TerritorySalesRep[]> => {
  await delay(700);
  return [...mockSalesReps];
};

/**
 * Create a new territory
 * @param territoryData Territory data without id or timestamps
 * @returns Promise resolving to the created Territory with ID
 */
export const createTerritory = async (territoryData: Omit<Territory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Territory> => {
  await delay(1000);
  
  const now = new Date().toISOString();
  const newTerritory: Territory = {
    ...territoryData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  
  mockTerritories.push(newTerritory);
  return { ...newTerritory };
};

/**
 * Update an existing territory
 * @param id Territory ID
 * @param territoryData Updated territory data
 * @returns Promise resolving to the updated Territory
 */
export const updateTerritory = async (territoryData: Partial<Territory> & { id: string }): Promise<Territory> => {
  await delay(1000);
  
  const index = mockTerritories.findIndex(t => t.id === territoryData.id);
  if (index === -1) {
    throw new Error(`Territory with ID ${territoryData.id} not found`);
  }
  
  const updatedTerritory = {
    ...mockTerritories[index],
    ...territoryData,
    updatedAt: new Date().toISOString(),
  };
  
  mockTerritories[index] = updatedTerritory;
  return { ...updatedTerritory };
};

/**
 * Delete a territory
 * @param id Territory ID
 * @returns Promise resolving to success status
 */
export const deleteTerritory = async (id: string): Promise<void> => {
  await delay(800);
  
  const index = mockTerritories.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error(`Territory with ID ${id} not found`);
  }
  
  mockTerritories.splice(index, 1);
};

/**
 * Fetch all territory assignment requests
 * @returns Promise resolving to array of TerritoryAssignmentRequest objects
 */
export const fetchAssignmentRequests = async (): Promise<TerritoryAssignmentRequest[]> => {
  await delay(700);
  return [...mockAssignmentRequests];
};

/**
 * Create a new territory assignment request
 * @param requestData Assignment request data without id or timestamps
 * @returns Promise resolving to the created TerritoryAssignmentRequest with ID
 */
export const createAssignmentRequest = async (
  requestData: Omit<TerritoryAssignmentRequest, 'id' | 'createdAt' | 'status'>
): Promise<TerritoryAssignmentRequest> => {
  await delay(900);
  
  const newRequest: TerritoryAssignmentRequest = {
    ...requestData,
    id: `req-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  mockAssignmentRequests.push(newRequest);
  return newRequest;
};

/**
 * Update the status of a territory assignment request
 * @param id Request ID
 * @param status New status (approved/rejected)
 * @param resolvedBy ID of the user who resolved the request
 * @returns Promise resolving to the updated TerritoryAssignmentRequest
 */
export const updateAssignmentRequestStatus = async (
  id: string,
  status: 'approved' | 'rejected',
  resolvedBy: string
): Promise<TerritoryAssignmentRequest> => {
  await delay(800);
  
  const index = mockAssignmentRequests.findIndex(request => request.id === id);
  
  if (index === -1) {
    throw new Error(`Assignment request with ID ${id} not found`);
  }
  
  const updatedRequest: TerritoryAssignmentRequest = {
    ...mockAssignmentRequests[index],
    status,
    resolvedBy,
    resolvedAt: new Date().toISOString()
  };
  
  mockAssignmentRequests[index] = updatedRequest;
  
  // If approved, update the sales rep's territories
  if (status === 'approved') {
    const request = mockAssignmentRequests[index];
    const repIndex = mockSalesReps.findIndex(rep => rep.id === request.requestedFor);
    
    if (repIndex !== -1) {
      if (!mockSalesReps[repIndex].territories.includes(request.territoryId)) {
        mockSalesReps[repIndex].territories.push(request.territoryId);
      }
    }
  }
  
  return updatedRequest;
};

/**
 * Fetch account ownerships by territory
 * @param territoryId Territory ID
 * @returns Promise resolving to array of AccountOwnership objects
 */
export const fetchAccountOwnershipsByTerritory = async (
  territoryId: string
): Promise<AccountOwnership[]> => {
  await delay(600);
  return mockAccountOwnerships.filter(ownership => ownership.territoryId === territoryId);
};

/**
 * Update account ownership
 * @param accountId Account ID
 * @param newOwnerId New owner ID
 * @returns Promise resolving to the updated AccountOwnership
 */
export const updateAccountOwnership = async (
  accountId: string,
  newOwnerId: string
): Promise<AccountOwnership> => {
  await delay(700);
  
  const index = mockAccountOwnerships.findIndex(ownership => ownership.accountId === accountId);
  
  if (index === -1) {
    throw new Error(`Account ownership for account ID ${accountId} not found`);
  }
  
  // Find the new owner
  const newOwner = mockSalesReps.find(rep => rep.id === newOwnerId);
  
  if (!newOwner) {
    throw new Error(`Sales rep with ID ${newOwnerId} not found`);
  }
  
  // Make sure the new owner is assigned to the territory
  const territoryId = mockAccountOwnerships[index].territoryId;
  if (!newOwner.territories.includes(territoryId)) {
    throw new Error(`Sales rep ${newOwnerId} is not assigned to territory ${territoryId}`);
  }
  
  const updatedOwnership: AccountOwnership = {
    ...mockAccountOwnerships[index],
    ownerId: newOwnerId,
    ownerName: newOwner.name,
    assignedDate: new Date().toISOString()
  };
  
  mockAccountOwnerships[index] = updatedOwnership;
  
  return updatedOwnership;
};

/**
 * Fetch sales reps
 */
export const fetchSalesReps = async (): Promise<TerritorySalesRep[]> => {
  await delay(600);
  return [...mockSalesReps];
};

/**
 * Assign a sales rep to a territory
 * @param territoryId Territory ID
 * @param salesRepId Sales rep ID
 * @returns Promise resolving to boolean success status
 */
export const assignSalesRepToTerritory = async (territoryId: string, salesRepId: string): Promise<boolean> => {
  await delay(600); // Simulate API delay
  
  // Find the territory and sales rep
  const territory = mockTerritories.find(t => t.id === territoryId);
  
  if (!territory) {
    throw new Error(`Territory with ID ${territoryId} not found`);
  }
  
  // Check if the sales rep is already assigned
  if (territory.assignedSalesReps.includes(salesRepId)) {
    return true; // Already assigned
  }
  
  // Add sales rep to territory
  territory.assignedSalesReps.push(salesRepId);
  territory.updatedAt = new Date().toISOString();
  
  // Also update the sales rep's territories
  const salesRep = mockSalesReps.find(r => r.id === salesRepId);
  if (salesRep && !salesRep.territories.includes(territoryId)) {
    salesRep.territories.push(territoryId);
  }
  
  return true;
};

/**
 * Remove a sales rep from a territory
 * @param territoryId Territory ID
 * @param salesRepId Sales rep ID
 * @returns Promise resolving to boolean success status
 */
export const removeSalesRepFromTerritory = async (territoryId: string, salesRepId: string): Promise<boolean> => {
  await delay(600); // Simulate API delay
  
  // Find the territory and sales rep
  const territory = mockTerritories.find(t => t.id === territoryId);
  
  if (!territory) {
    throw new Error(`Territory with ID ${territoryId} not found`);
  }
  
  // Check if the sales rep is assigned
  const index = territory.assignedSalesReps.indexOf(salesRepId);
  if (index === -1) {
    return true; // Not assigned
  }
  
  // Remove sales rep from territory
  territory.assignedSalesReps.splice(index, 1);
  territory.updatedAt = new Date().toISOString();
  
  // Also update the sales rep's territories
  const salesRep = mockSalesReps.find(r => r.id === salesRepId);
  if (salesRep) {
    const repTerritoryIndex = salesRep.territories.indexOf(territoryId);
    if (repTerritoryIndex !== -1) {
      salesRep.territories.splice(repTerritoryIndex, 1);
    }
  }
  
  return true;
}; 