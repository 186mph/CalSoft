export type Role = 
  | 'NETA Technician'
  | 'Lab Technician'
  | 'Scav'
  | 'HR Rep'
  | 'Office Admin'
  | 'Sales Representative'
  | 'Engineer'
  | 'Admin'
  | string; // Allow for dynamic custom roles

export type Portal = 
  | 'sales'
  | 'neta'
  | 'lab'
  | 'hr'
  | 'office'
  | 'engineering'
  | 'scavenger'
  | 'admin'; // Add admin as a portal

export type PermissionAction = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'assign'
  | 'import'
  | 'export'
  | 'share'
  | 'revoke'
  | 'manage'
  | 'configure';

export type PermissionResource = 
  | 'users'
  | 'roles'
  | 'customers'
  | 'jobs'
  | 'opportunities'
  | 'reports'
  | 'documents'
  | 'settings'
  | 'encryption'
  | 'system'
  | 'equipment'
  | 'technicians'
  | 'lab'
  | 'engineering'
  | 'hr'
  | 'office'
  | 'sales';

// Structure for fine-grained permissions
export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
  scope?: 'own' | 'team' | 'division' | 'all'; // Added 'division' scope
  condition?: string; // Optional SQL-like condition for advanced filtering
}

export interface RolePermissions {
  portals: Portal[];
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAllData: boolean;
  permissions?: Permission[]; // Fine-grained permissions
  isSystemRole?: boolean; // Used to identify roles that shouldn't be deleted
  parentRole?: Role; // Role hierarchy - inherit permissions from parent
  description?: string; // Added description for better documentation
  priority?: number; // Added priority for conflict resolution in permission inheritance
}

export const ROLES: Record<Role, RolePermissions> = {
  'NETA Technician': {
    portals: ['neta'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: true,
    isSystemRole: true,
    permissions: [
      { resource: 'customers', action: 'view', scope: 'all' },
      { resource: 'jobs', action: 'view', scope: 'all' },
      { resource: 'jobs', action: 'edit', scope: 'own' },
      { resource: 'reports', action: 'create', scope: 'own' },
      { resource: 'reports', action: 'view', scope: 'own' }
    ]
  },
  'Lab Technician': {
    portals: ['lab'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: false,
    isSystemRole: true,
    permissions: [
      { resource: 'reports', action: 'create', scope: 'own' },
      { resource: 'reports', action: 'view', scope: 'own' },
      { resource: 'reports', action: 'edit', scope: 'own' }
    ]
  },
  'Scav': {
    portals: ['scavenger'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: false,
    isSystemRole: true,
    permissions: [
      { resource: 'jobs', action: 'view', scope: 'own' },
      { resource: 'jobs', action: 'edit', scope: 'own' }
    ]
  },
  'HR Rep': {
    portals: ['hr'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: false,
    isSystemRole: true,
    permissions: [
      { resource: 'users', action: 'view', scope: 'all' },
      { resource: 'documents', action: 'view', scope: 'all' },
      { resource: 'documents', action: 'create', scope: 'all' }
    ]
  },
  'Office Admin': {
    portals: ['office'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: false,
    isSystemRole: true,
    permissions: [
      { resource: 'documents', action: 'view', scope: 'all' },
      { resource: 'documents', action: 'create', scope: 'all' },
      { resource: 'documents', action: 'edit', scope: 'all' },
      { resource: 'documents', action: 'delete', scope: 'all' }
    ]
  },
  'Sales Representative': {
    portals: ['sales'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: true,
    isSystemRole: true,
    permissions: [
      { resource: 'customers', action: 'view', scope: 'all' },
      { resource: 'customers', action: 'create', scope: 'all' },
      { resource: 'customers', action: 'edit', scope: 'all' },
      { resource: 'opportunities', action: 'view', scope: 'all' },
      { resource: 'opportunities', action: 'create', scope: 'all' },
      { resource: 'opportunities', action: 'edit', scope: 'all' }
    ]
  },
  'Engineer': {
    portals: ['engineering'],
    canManageUsers: false,
    canManageContent: false,
    canViewAllData: false,
    isSystemRole: true,
    permissions: [
      { resource: 'reports', action: 'view', scope: 'all' },
      { resource: 'reports', action: 'approve', scope: 'all' }
    ]
  },
  'Admin': {
    portals: ['sales', 'neta', 'lab', 'hr', 'office', 'engineering', 'scavenger', 'admin'],
    canManageUsers: true,
    canManageContent: true,
    canViewAllData: true,
    isSystemRole: true,
    permissions: [
      // Admin has all permissions
      { resource: 'users', action: 'view', scope: 'all' },
      { resource: 'users', action: 'create', scope: 'all' },
      { resource: 'users', action: 'edit', scope: 'all' },
      { resource: 'users', action: 'delete', scope: 'all' },
      { resource: 'roles', action: 'view', scope: 'all' },
      { resource: 'roles', action: 'create', scope: 'all' },
      { resource: 'roles', action: 'edit', scope: 'all' },
      { resource: 'roles', action: 'delete', scope: 'all' },
      { resource: 'settings', action: 'view', scope: 'all' },
      { resource: 'settings', action: 'edit', scope: 'all' },
      { resource: 'encryption', action: 'view', scope: 'all' },
      { resource: 'encryption', action: 'edit', scope: 'all' },
      { resource: 'system', action: 'view', scope: 'all' },
      { resource: 'system', action: 'edit', scope: 'all' }
    ]
  }
};

// Helper function to check if a user has access to a specific portal
export const hasPortalAccess = (userRole: Role, portal: Portal): boolean => {
  // For custom roles not in ROLES, default to no access
  if (!ROLES[userRole]) {
    return false;
  }
  return ROLES[userRole].portals.includes(portal);
};

// Helper function to check if a user has a specific permission
export const hasPermission = (userRole: Role, permission: keyof Omit<RolePermissions, 'portals'>): boolean => {
  // For custom roles not in ROLES, default to no permissions
  if (!ROLES[userRole]) {
    return false;
  }
  // Make sure we handle boolean properties safely
  return Boolean(ROLES[userRole][permission]);
};

// Enhanced helper function to check if a user has a specific fine-grained permission
// with support for inheritance, conditions, and audit logging
export const hasActionPermission = (
  userRole: Role, 
  resource: PermissionResource, 
  action: PermissionAction,
  scope: 'own' | 'team' | 'division' | 'all' = 'own',
  context?: {
    userId?: string;
    targetId?: string;
    division?: string;
    logAccess?: boolean; // Flag to enable access logging
    additionalData?: Record<string, any>; // Additional data for logging
  }
): boolean => {
  // For custom roles not in ROLES, default to no permissions
  if (!ROLES[userRole] || !ROLES[userRole].permissions) {
    // Log denied access if logging is enabled
    if (context?.logAccess) {
      logAccessAttempt({
        role: userRole,
        resource,
        action,
        scope,
        granted: false,
        reason: 'Role not found or has no permissions',
        ...context
      });
    }
    return false;
  }
  
  // Check if the role has the exact permission
  const matchingPermission = ROLES[userRole].permissions?.find(
    p => p.resource === resource && 
         p.action === action && 
         (!p.scope || p.scope === scope || p.scope === 'all' || 
          (p.scope === 'division' && scope === 'team')) // Division scope also grants team scope
  );
  
  if (matchingPermission) {
    // Check if there's a condition to evaluate
    if (matchingPermission.condition && context) {
      // Evaluate the condition with the context
      const conditionMet = evaluatePermissionCondition(matchingPermission.condition, context);
      
      // Log access attempt if logging is enabled
      if (context?.logAccess) {
        logAccessAttempt({
          role: userRole,
          resource,
          action,
          scope,
          granted: conditionMet,
          reason: conditionMet ? 'Direct permission with condition (met)' : 'Direct permission with condition (not met)',
          permission: matchingPermission,
          ...context
        });
      }
      
      return conditionMet;
    }
    
    // No condition or context not provided, permission is granted
    if (context?.logAccess) {
      logAccessAttempt({
        role: userRole,
        resource,
        action,
        scope,
        granted: true,
        reason: 'Direct permission',
        permission: matchingPermission,
        ...context
      });
    }
    
    return true;
  }
  
  // If role has a parent, check permissions of parent role (inheritance)
  if (ROLES[userRole].parentRole && ROLES[ROLES[userRole].parentRole]) {
    const parentResult = hasActionPermission(
      ROLES[userRole].parentRole, 
      resource, 
      action, 
      scope, 
      context ? { ...context, logAccess: false } : undefined // Don't log intermediate checks
    );
    
    // Log the inherited result if logging was requested
    if (context?.logAccess) {
      logAccessAttempt({
        role: userRole,
        resource,
        action,
        scope,
        granted: parentResult,
        reason: `Inherited from parent role: ${ROLES[userRole].parentRole}`,
        ...context
      });
    }
    
    return parentResult;
  }
  
  // Log denied access if logging is enabled
  if (context?.logAccess) {
    logAccessAttempt({
      role: userRole,
      resource,
      action,
      scope,
      granted: false,
      reason: 'No matching permission found',
      ...context
    });
  }
  
  return false;
};

// Helper function to evaluate permission conditions
// This allows for dynamic permission rules based on context
const evaluatePermissionCondition = (
  condition: string,
  context: Record<string, any>
): boolean => {
  try {
    // Simple condition parser for basic expressions
    // For complex scenarios, this could use a proper expression evaluator
    
    // Example conditions:
    // "userId = targetId" - User can only access their own records
    // "division = userDivision" - User can only access records in their division
    
    const parts = condition.split(/\s*(=|!=|>|<|>=|<=)\s*/);
    if (parts.length !== 3) return false;
    
    const [leftKey, operator, rightKey] = parts;
    const leftValue = getNestedValue(context, leftKey);
    const rightValue = getNestedValue(context, rightKey);
    
    switch (operator) {
      case '=': return leftValue === rightValue;
      case '!=': return leftValue !== rightValue;
      case '>': return leftValue > rightValue;
      case '<': return leftValue < rightValue;
      case '>=': return leftValue >= rightValue;
      case '<=': return leftValue <= rightValue;
      default: return false;
    }
  } catch (error) {
    console.error('Error evaluating permission condition:', error);
    return false;
  }
};

// Helper to safely get nested object values from dot notation
const getNestedValue = (obj: Record<string, any>, path: string): any => {
  // Handle literal values with quotes
  if (path.startsWith('"') && path.endsWith('"')) {
    return path.slice(1, -1);
  }
  
  return path.split('.').reduce(
    (value, key) => (value === undefined || value === null) ? undefined : value[key], 
    obj
  );
};

// Function to log access attempts for auditing
export const logAccessAttempt = async (data: {
  role: string;
  resource: string;
  action: string;
  scope: string;
  granted: boolean;
  reason: string;
  userId?: string;
  targetId?: string;
  permission?: Permission;
  [key: string]: any; // Allow additional context data
}): Promise<void> => {
  try {
    // Log to console during development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Access ${data.granted ? 'GRANTED' : 'DENIED'}: ${data.role} -> ${data.action} ${data.resource} (${data.scope}) - Reason: ${data.reason}`);
    }
    
    // Log to database for production
    // This would typically call a service function that inserts into an audit log table
    if (process.env.NODE_ENV === 'production') {
      // Import here to avoid circular dependencies
      const { logPermissionAccess } = require('@/services/auditService');
      
      // Ensure the function exists before calling
      if (typeof logPermissionAccess === 'function') {
        await logPermissionAccess(data);
      }
    }
  } catch (error) {
    // Ensure logging errors don't break core functionality
    console.error('Error logging permission access:', error);
  }
};

// Get all available roles
export const getAllRoles = (): Role[] => {
  return Object.keys(ROLES) as Role[];
};

// Get all built-in/system roles
export const getSystemRoles = (): Role[] => {
  return Object.entries(ROLES)
    .filter(([_, properties]) => properties.isSystemRole)
    .map(([roleName]) => roleName as Role);
};

// Get all permissions for a role, including inherited from parent roles
export const getAllRolePermissions = (role: Role): Permission[] => {
  const roleConfig = ROLES[role];
  if (!roleConfig) return [];
  
  // Start with the role's own permissions
  const ownPermissions = roleConfig.permissions || [];
  
  // If no parent role, return just the role's permissions
  if (!roleConfig.parentRole) return ownPermissions;
  
  // Get parent permissions recursively
  const parentPermissions = getAllRolePermissions(roleConfig.parentRole);
  
  // Merge permissions, with the role's own permissions taking precedence
  // for the same resource+action+scope combination
  const mergedPermissions: Permission[] = [...parentPermissions];
  
  ownPermissions.forEach(ownPerm => {
    // Check if there's a conflicting parent permission
    const conflictIndex = mergedPermissions.findIndex(
      p => p.resource === ownPerm.resource && 
           p.action === ownPerm.action && 
           p.scope === ownPerm.scope
    );
    
    if (conflictIndex >= 0) {
      // Replace the parent permission with the role's own permission
      mergedPermissions[conflictIndex] = ownPerm;
    } else {
      // No conflict, add the permission
      mergedPermissions.push(ownPerm);
    }
  });
  
  return mergedPermissions;
};

// Function to check if a user has access to a resource based on ownership
export const hasResourceOwnership = async (
  userId: string,
  resource: PermissionResource,
  resourceId: string
): Promise<boolean> => {
  try {
    // Import here to avoid circular dependencies
    const { checkResourceOwnership } = require('@/services/resourceService');
    
    // Call the appropriate service function if it exists
    if (typeof checkResourceOwnership === 'function') {
      return await checkResourceOwnership(userId, resource, resourceId);
    }
    
    // Default implementation for basic ownership checks
    // This would be replaced with actual database queries in a real implementation
    const { supabase } = require('@/lib/supabase');
    
    switch (resource) {
      case 'customers':
        const { data: customer } = await supabase
          .from('customers')
          .select('created_by')
          .eq('id', resourceId)
          .single();
        return customer?.created_by === userId;
        
      case 'jobs':
        const { data: job } = await supabase
          .from('jobs')
          .select('assigned_to')
          .eq('id', resourceId)
          .single();
        return job?.assigned_to === userId;
        
      // Add more resource types as needed
        
      default:
        // For unknown resource types, default to false
        return false;
    }
  } catch (error) {
    console.error(`Error checking resource ownership: ${error}`);
    return false;
  }
};

// Add or update a custom role with enhanced auditing
export const updateRole = (
  roleName: Role,
  roleConfig: Partial<RolePermissions>,
  userId?: string
): void => {
  // Track previous configuration for audit logging
  const previousConfig = ROLES[roleName] ? { ...ROLES[roleName] } : null;
  
  if (!ROLES[roleName]) {
    // Create new role
    ROLES[roleName] = {
      portals: roleConfig.portals || [],
      canManageUsers: roleConfig.canManageUsers || false,
      canManageContent: roleConfig.canManageContent || false,
      canViewAllData: roleConfig.canViewAllData || false,
      permissions: roleConfig.permissions || [],
      isSystemRole: false,
      parentRole: roleConfig.parentRole,
      description: roleConfig.description || `Custom role: ${roleName}`,
      priority: roleConfig.priority || 0
    };
  } else {
    // Update existing role
    ROLES[roleName] = {
      ...ROLES[roleName],
      ...roleConfig,
      // Don't allow changing isSystemRole for built-in roles
      isSystemRole: ROLES[roleName].isSystemRole
    };
  }
  
  // Log the role change to the audit system
  try {
    const { logRoleChange } = require('@/services/auditService');
    
    if (typeof logRoleChange === 'function') {
      logRoleChange({
        roleName,
        action: previousConfig ? 'update' : 'create',
        previousConfig,
        newConfig: { ...ROLES[roleName] },
        userId
      });
    }
  } catch (error) {
    console.error('Error logging role change:', error);
  }
}; 