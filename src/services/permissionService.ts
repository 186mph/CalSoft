import { supabase } from '@/lib/supabase';
import { 
  Permission as RolePermission, 
  PermissionResource, 
  PermissionAction, 
  RolePermissions, 
  Role as LibRole,
  getAllRolePermissions,
  hasActionPermission
} from '@/lib/roles';
import { 
  PermissionContext, 
  PermissionCheckResult, 
  UserPermission as TypeUserPermission, 
  Condition, 
  ConditionGroup, 
  ConditionOperator,
  LogicalOperator,
  Resource,
  Action,
  RoleDefinition,
  Role,
  Permission,
  Scope
} from '../types/permissions';
import { AuditService } from './auditService';

/**
 * Interface for user permission entries
 */
export interface UserPermission {
  id: string;
  user_id: string;
  resource: PermissionResource | string;
  action: PermissionAction | string;
  scope: string; // Can be 'own' | 'team' | 'division' | 'all' or any Scope value
  conditions?: any;
  granted_by?: string;
  valid_until?: string;
  valid_from?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing and checking permissions throughout the application
 */
export class PermissionService {
  private userPermissions: Map<string, UserPermission[]> = new Map();
  private roles: Map<string, RoleDefinition> = new Map();
  private auditService: AuditService;
  
  constructor(auditService: AuditService) {
    this.auditService = auditService;
    this.initializeRoles();
  }
  
  /**
   * Initialize default system roles
   */
  private initializeRoles(): void {
    // System admin has full access
    const systemAdmin: RoleDefinition = {
      id: 'system_admin',
      name: 'System Administrator',
      description: 'Full access to all system resources',
      permissions: [{
        resource: 'system' as Resource,
        action: 'manage' as Action,
        scope: 'global',
        description: 'Manage all system resources'
      }]
    };
    
    // Organization admin role
    const orgAdmin: RoleDefinition = {
      id: 'org_admin',
      name: 'Organization Administrator',
      description: 'Full access to organization resources',
      permissions: [{
        resource: 'organization' as Resource,
        action: 'manage' as Action,
        scope: 'organization',
        description: 'Manage organizational resources'
      }],
      parent_role: 'system_admin'
    };
    
    // Add more predefined roles here
    
    this.roles.set(systemAdmin.id, systemAdmin);
    this.roles.set(orgAdmin.id, orgAdmin);
  }
  
  /**
   * Check if a user has permission to perform an action on a resource
   * @param userId The user ID to check permissions for
   * @param resource The resource to check access to
   * @param action The action to check
   * @param context Additional context for permission evaluation
   * @returns Permission check result
   */
  async checkPermission(
    userId: string, 
    resource: Resource, 
    action: Action, 
    context: PermissionContext = {}
  ): Promise<PermissionCheckResult> {
    const result: PermissionCheckResult = {
      granted: false,
      timestamp: new Date()
    };
    
    // Add user ID to context if not present
    if (!context.userId) {
      context.userId = userId;
    }
    
    // First check direct user permissions
    const directResult = await this.checkDirectPermissions(userId, resource, action, context);
    if (directResult.granted) {
      result.granted = true;
      result.source = 'direct';
      result.permission = directResult.permission;
      result.reason = 'Direct permission granted';
      
      // Log the access
      this.auditService.logPermissionAccess({
        user_id: userId,
        resource,
        action,
        context,
        granted: true,
        source: 'direct',
        timestamp: new Date()
      });
      
      return result;
    }
    
    // Then check role-based permissions
    const roleResult = await this.checkRolePermissions(userId, resource, action, context);
    if (roleResult.granted) {
      result.granted = true;
      result.source = 'role';
      result.permission = roleResult.permission;
      result.reason = `Permission granted via role: ${roleResult.reason}`;
      
      // Log the access
      this.auditService.logPermissionAccess({
        user_id: userId,
        resource,
        action,
        context,
        granted: true,
        source: 'role',
        reason: roleResult.reason,
        timestamp: new Date()
      });
      
      return result;
    }
    
    // Permission denied
    result.granted = false;
    result.reason = 'No matching permissions found';
    result.source = 'denied';
    
    // Log the denied access
    this.auditService.logPermissionAccess({
      user_id: userId,
      resource,
      action,
      context,
      granted: false,
      reason: 'No matching permissions found',
      timestamp: new Date()
    });
    
    return result;
  }
  
  /**
   * Check direct user permissions (not role-based)
   */
  private async checkDirectPermissions(
    userId: string, 
    resource: Resource, 
    action: Action, 
    context: PermissionContext
  ): Promise<PermissionCheckResult> {
    const result: PermissionCheckResult = {
      granted: false,
      timestamp: new Date()
    };
    
    // Get user's direct permissions
    const userPerms = this.userPermissions.get(userId) || [];
    
    // Find a matching permission
    for (const perm of userPerms) {
      if (perm.resource === resource && perm.action === action) {
        // Check if permission is active (not expired)
        if (perm.valid_until && new Date(perm.valid_until) < new Date()) {
          continue; // Permission expired
        }
        
        if (perm.valid_from && new Date(perm.valid_from) > new Date()) {
          continue; // Permission not yet valid
        }
        
        // Check conditions if present
        if (perm.conditions) {
          const conditionsMet = this.evaluateConditions(perm.conditions, context);
          if (!conditionsMet) {
            continue; // Conditions not met
          }
        }
        
        // Permission granted
        result.granted = true;
        result.permission = perm as unknown as Permission;
        return result;
      }
    }
    
    return result;
  }
  
  /**
   * Check permissions based on user's roles
   */
  private async checkRolePermissions(
    userId: string, 
    resource: Resource, 
    action: Action, 
    context: PermissionContext
  ): Promise<PermissionCheckResult> {
    const result: PermissionCheckResult = {
      granted: false,
      timestamp: new Date()
    };
    
    // Get user's roles (placeholder - in a real implementation this would come from a database)
    const userRoles = await this.getUserRoles(userId);
    
    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      
      // Check if this role (or its parent roles) has the permission
      const roleResult = this.checkRolePermission(role, resource, action, context);
      if (roleResult.granted) {
        result.granted = true;
        result.permission = roleResult.permission;
        result.reason = `Via role: ${role.name}`;
        return result;
      }
    }
    
    return result;
  }
  
  /**
   * Check if a specific role has a permission
   */
  private checkRolePermission(
    role: RoleDefinition, 
    resource: Resource, 
    action: Action, 
    context: PermissionContext,
    visitedRoles: Set<string> = new Set()
  ): PermissionCheckResult {
    const result: PermissionCheckResult = {
      granted: false,
      timestamp: new Date()
    };
    
    // Prevent circular role dependencies
    if (visitedRoles.has(role.id)) {
      return result;
    }
    visitedRoles.add(role.id);
    
    // Check this role's permissions
    for (const perm of role.permissions) {
      if (this.permissionMatches(perm, resource, action, context)) {
        result.granted = true;
        result.permission = perm;
        return result;
      }
    }
    
    // If not found, check parent roles
    if (role.parent_role) {
      const parentRole = this.roles.get(role.parent_role);
      if (parentRole) {
        return this.checkRolePermission(parentRole, resource, action, context, visitedRoles);
      }
    }
    
    return result;
  }
  
  /**
   * Check if a permission matches the requested resource, action, and conditions
   */
  private permissionMatches(
    permission: Permission, 
    resource: Resource, 
    action: Action, 
    context: PermissionContext
  ): boolean {
    // Check resource and action match
    if (permission.resource !== resource && permission.resource !== 'system') {
      return false;
    }
    
    if (permission.action !== action && permission.action !== 'manage') {
      return false;
    }
    
    // Check if permission is active (not expired)
    if ('valid_until' in permission && permission.valid_until && permission.valid_until < new Date()) {
      return false;
    }
    
    if ('valid_from' in permission && permission.valid_from && permission.valid_from > new Date()) {
      return false;
    }
    
    // Check conditions if present
    if ('conditions' in permission && permission.conditions) {
      return this.evaluateConditions(permission.conditions, context);
    } else if ('condition' in permission && permission.condition) {
      // Try using 'condition' property if 'conditions' doesn't exist
      try {
        const conditions = typeof permission.condition === 'string' 
          ? JSON.parse(permission.condition) 
          : permission.condition;
        return this.evaluateConditions(conditions, context);
      } catch (e) {
        console.error('Error parsing condition:', e);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate permission conditions against the current context
   */
  private evaluateConditions(
    conditions: Condition | ConditionGroup, 
    context: PermissionContext
  ): boolean {
    if ('field' in conditions) {
      // Single condition
      return this.evaluateCondition(conditions, context);
    } else {
      // Condition group with logical operator
      return this.evaluateConditionGroup(conditions, context);
    }
  }
  
  /**
   * Evaluate a single condition against the context
   */
  private evaluateCondition(condition: Condition, context: PermissionContext): boolean {
    const { field, operator, value } = condition;
    
    // Get the field value from context
    const fieldValue = this.getFieldFromContext(field, context);
    if (fieldValue === undefined && operator !== 'exists') {
      return false;
    }
    
    // Evaluate based on operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not-equals':
        return fieldValue !== value;
      case 'greater-than':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case 'less-than':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof value === 'string' && 
          fieldValue.includes(value);
      case 'starts-with':
        return typeof fieldValue === 'string' && typeof value === 'string' && 
          fieldValue.startsWith(value);
      case 'ends-with':
        return typeof fieldValue === 'string' && typeof value === 'string' && 
          fieldValue.endsWith(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not-in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined;
      default:
        return false;
    }
  }
  
  /**
   * Evaluate a condition group against the context
   */
  private evaluateConditionGroup(group: ConditionGroup, context: PermissionContext): boolean {
    const { operator, conditions } = group;
    
    if (conditions.length === 0) {
      return true; // Empty conditions always pass
    }
    
    if (operator === 'AND') {
      // All conditions must be true
      return conditions.every(condition => this.evaluateConditions(condition, context));
    } else {
      // At least one condition must be true
      return conditions.some(condition => this.evaluateConditions(condition, context));
    }
  }
  
  /**
   * Get a field value from the context, supporting nested paths like 'user.organization.id'
   */
  private getFieldFromContext(field: string, context: PermissionContext): any {
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Get a user's assigned roles
   * In a real implementation, this would fetch from a database
   */
  private async getUserRoles(userId: string): Promise<string[]> {
    // This is a placeholder. In a real implementation, you would:
    // 1. Query the database for the user's roles
    // 2. Return the role IDs
    
    // For demo purposes, assume user 'admin' has the system_admin role
    if (userId === 'admin') {
      return ['system_admin'];
    }
    
    // Default role for all users
    return ['member'];
  }
  
  /**
   * Grant a permission to a user
   */
  async grantUserPermission(
    userId: string, 
    permission: Permission, 
    grantedBy: string
  ): Promise<UserPermission> {
    const userPerm: UserPermission = {
      id: crypto.randomUUID(),
      user_id: userId,
      resource: permission.resource as string,
      action: permission.action as string,
      scope: permission.scope as string,
      conditions: 'condition' in permission ? permission.condition : undefined,
      granted_by: grantedBy,
      valid_until: 'valid_until' in permission && permission.valid_until ? 
        permission.valid_until.toISOString() : undefined,
      valid_from: 'valid_from' in permission && permission.valid_from ? 
        permission.valid_from.toISOString() : undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add to user's permissions
    if (!this.userPermissions.has(userId)) {
      this.userPermissions.set(userId, []);
    }
    
    this.userPermissions.get(userId)!.push(userPerm);
    
    // Log the permission grant
    this.auditService.logPermissionChange({
      user_id: userId,
      subject_id: grantedBy,
      action: 'grant',
      resource: permission.resource,
      permission_action: permission.action,
      details: { permission: JSON.stringify(permission) },
      timestamp: new Date()
    });
    
    return userPerm;
  }
  
  /**
   * Revoke a user permission
   */
  async revokeUserPermission(
    userId: string, 
    permissionId: string, 
    revokedBy: string
  ): Promise<boolean> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;
    
    const permIndex = userPerms.findIndex(p => p.id === permissionId);
    if (permIndex === -1) return false;
    
    // Store the permission for logging
    const permission = userPerms[permIndex];
    
    // Remove the permission
    userPerms.splice(permIndex, 1);
    
    // Log the permission revocation
    this.auditService.logPermissionChange({
      user_id: userId,
      subject_id: revokedBy,
      action: 'revoke',
      resource: permission.resource as Resource,
      permission_action: permission.action as Action,
      details: { permission: JSON.stringify(permission) },
      timestamp: new Date()
    });
    
    return true;
  }
  
  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return this.userPermissions.get(userId) || [];
  }
  
  /**
   * Check if a user has a specific role
   */
  async userHasRole(userId: string, roleId: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.includes(roleId);
  }
  
  /**
   * Assign a role to a user
   */
  async assignRoleToUser(
    userId: string, 
    roleId: string, 
    assignedBy: string
  ): Promise<boolean> {
    // In a real implementation, this would update a database
    // For now, we'll just log it
    this.auditService.logRoleChange({
      user_id: userId,
      subject_id: assignedBy,
      new_role: roleId as unknown as Role,
      reason: 'Role assigned by admin',
      timestamp: new Date()
    });
    
    return true;
  }
  
  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(
    userId: string, 
    roleId: string, 
    removedBy: string
  ): Promise<boolean> {
    // In a real implementation, this would update a database
    // For now, we'll just log it
    this.auditService.logRoleChange({
      user_id: userId,
      subject_id: removedBy,
      old_role: roleId as unknown as Role,
      reason: 'Role removed by admin',
      timestamp: new Date()
    });
    
    return true;
  }
  
  /**
   * Create a new role definition
   */
  async createRole(roleDef: RoleDefinition, createdBy: string): Promise<RoleDefinition> {
    // Add to roles map
    this.roles.set(roleDef.id, roleDef);
    
    // Log the role creation
    this.auditService.logSystemChange({
      action: 'create_role',
      component: 'role-management',
      subject_id: createdBy,
      details: {
        role_id: roleDef.id,
        role_name: roleDef.name
      },
      timestamp: new Date()
    });
    
    return roleDef;
  }
  
  /**
   * Get all role definitions
   */
  async getAllRoles(): Promise<RoleDefinition[]> {
    return Array.from(this.roles.values());
  }
}

/**
 * Check if a user has permission to perform an action on a resource
 * This combines role-based permissions with direct user permissions
 */
export const checkPermission = async (
  userId: string,
  resource: PermissionResource,
  action: PermissionAction,
  options?: {
    scope?: 'own' | 'team' | 'division' | 'all';
    targetId?: string;
    logAccess?: boolean;
    additionalData?: Record<string, any>;
  }
): Promise<boolean> => {
  try {
    const {
      scope = 'own',
      targetId,
      logAccess = true,
      additionalData = {}
    } = options || {};
    
    // First, get the user's role
    const { data: userData, error: userError } = await supabase.auth.getUser(userId);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      return false;
    }
    
    const userRole = userData.user.user_metadata?.role as Role;
    
    // If no role assigned, user has no permissions
    if (!userRole) {
      if (logAccess) {
        await logPermissionCheck(userId, 'unknown', resource, action, scope, targetId, false, 'No role assigned', additionalData);
      }
      return false;
    }
    
    // Check role-based permissions
    if (hasActionPermission(userRole, resource, action, scope, {
      userId,
      targetId,
      logAccess: false // We'll log the final result ourselves
    })) {
      if (logAccess) {
        await logPermissionCheck(userId, userRole, resource, action, scope, targetId, true, 'Role-based permission', additionalData);
      }
      return true;
    }
    
    // Check direct user permissions (these override role permissions)
    const { data: userPermissions, error: permissionError } = await supabase
      .from('common.user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('is_active', true)
      .or(`scope.eq.${scope},scope.eq.all`);
    
    if (permissionError) {
      console.error('Error checking user permissions:', permissionError);
      if (logAccess) {
        await logPermissionCheck(userId, userRole, resource, action, scope, targetId, false, 'Error checking permissions', additionalData);
      }
      return false;
    }
    
    // Check if any valid permissions exist
    const now = new Date().toISOString();
    const validPermission = userPermissions.find(p => {
      // Check expiration
      if (p.valid_until && new Date(p.valid_until) < new Date(now)) {
        return false;
      }
      
      // Check conditions if present
      if (p.conditions && Object.keys(p.conditions).length > 0) {
        return evaluateConditions(p.conditions, { userId, targetId, ...additionalData });
      }
      
      return true;
    });
    
    const granted = !!validPermission;
    
    if (logAccess) {
      await logPermissionCheck(
        userId, 
        userRole, 
        resource, 
        action, 
        scope, 
        targetId, 
        granted,
        granted ? 'Direct user permission' : 'No matching permission',
        additionalData
      );
    }
    
    return granted;
  } catch (error) {
    console.error('Error in checkPermission:', error);
    return false;
  }
};

/**
 * Grant a specific permission to a user
 */
export const grantUserPermission = async (
  userId: string,
  resource: PermissionResource,
  action: PermissionAction,
  options?: {
    scope?: 'own' | 'team' | 'division' | 'all';
    conditions?: Record<string, any>;
    validUntil?: Date;
    grantedBy?: string;
  }
): Promise<string | null> => {
  try {
    const {
      scope = 'own',
      conditions,
      validUntil,
      grantedBy
    } = options || {};
    
    // Check if this permission already exists
    const { data: existingPermission } = await supabase
      .from('common.user_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('scope', scope)
      .single();
    
    if (existingPermission) {
      // Update existing permission
      const { data: updatedPermission, error: updateError } = await supabase
        .from('common.user_permissions')
        .update({
          conditions,
          valid_until: validUntil?.toISOString(),
          granted_by: grantedBy,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPermission.id)
        .select('id')
        .single();
      
      if (updateError) {
        console.error('Error updating permission:', updateError);
        return null;
      }
      
      return updatedPermission.id;
    } else {
      // Create new permission
      const { data: newPermission, error: insertError } = await supabase
        .from('common.user_permissions')
        .insert({
          user_id: userId,
          resource,
          action,
          scope,
          conditions,
          valid_until: validUntil?.toISOString(),
          granted_by: grantedBy,
          is_active: true
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Error inserting permission:', insertError);
        return null;
      }
      
      return newPermission.id;
    }
  } catch (error) {
    console.error('Error in grantUserPermission:', error);
    return null;
  }
};

/**
 * Revoke a specific permission from a user
 */
export const revokeUserPermission = async (
  userId: string,
  resource: PermissionResource,
  action: PermissionAction,
  scope: 'own' | 'team' | 'division' | 'all' = 'own'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('common.user_permissions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('scope', scope);
    
    if (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in revokeUserPermission:', error);
    return false;
  }
};

/**
 * Get all permissions for a user, combining role permissions and direct permissions
 */
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  try {
    // Get user's role
    const { data: userData, error: userError } = await supabase.auth.getUser(userId);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      return [];
    }
    
    const userRole = userData.user.user_metadata?.role as Role;
    
    // Get role-based permissions
    const rolePermissions = userRole ? getAllRolePermissions(userRole).map(convertRolePermission) : [];
    
    // Get direct user permissions
    const { data: userPermissions, error: permissionError } = await supabase
      .from('common.user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (permissionError) {
      console.error('Error getting user permissions:', permissionError);
      return rolePermissions;
    }
    
    // Convert user permissions to Permission objects
    const now = new Date().toISOString();
    const directPermissions: Permission[] = userPermissions
      .filter(p => !p.valid_until || new Date(p.valid_until) >= new Date(now))
      .map(p => ({
        resource: p.resource as Resource,
        action: p.action as Action,
        scope: mapScope(p.scope),
        condition: p.conditions ? JSON.stringify(p.conditions) : undefined
      }));
    
    // Merge permissions, with direct permissions taking precedence
    const allPermissions = [...rolePermissions];
    
    directPermissions.forEach(directPerm => {
      const existingIndex = allPermissions.findIndex(
        p => p.resource === directPerm.resource && 
             p.action === directPerm.action && 
             p.scope === directPerm.scope
      );
      
      if (existingIndex >= 0) {
        allPermissions[existingIndex] = directPerm;
      } else {
        allPermissions.push(directPerm);
      }
    });
    
    return allPermissions;
  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    return [];
  }
};

/**
 * Helper function to convert RolePermission to Permission
 */
const convertRolePermission = (rolePermission: RolePermission): Permission => {
  return {
    resource: rolePermission.resource as unknown as Resource,
    action: rolePermission.action as unknown as Action,
    scope: mapScope(rolePermission.scope || 'global'),
    conditions: rolePermission.condition ? 
      (typeof rolePermission.condition === 'string' ? 
        JSON.parse(rolePermission.condition) : rolePermission.condition) : 
      undefined
  };
};

/**
 * Map scope values between different types
 */
const mapScope = (scope: string): Scope => {
  switch(scope) {
    case 'own':
      return 'personal';
    case 'team':
      return 'team';
    case 'division':
    case 'all':
      return 'organization';
    default:
      return 'global';
  }
};

/**
 * Log a permission check to the audit log
 */
const logPermissionCheck = async (
  userId: string,
  role: string,
  resource: PermissionResource,
  action: PermissionAction,
  scope: string,
  targetId?: string,
  granted: boolean = false,
  reason: string = 'Unknown',
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    await supabase.rpc('common.log_permission_access', {
      p_user_id: userId,
      p_role: role,
      p_resource: resource,
      p_action: action,
      p_scope: scope,
      p_target_id: targetId,
      p_granted: granted,
      p_reason: reason,
      p_details: additionalData ? JSON.stringify(additionalData) : null
    });
  } catch (error) {
    console.error('Error logging permission check:', error);
  }
};

/**
 * Evaluate permission conditions
 */
const evaluateConditions = (
  conditions: Record<string, any>,
  context: Record<string, any>
): boolean => {
  try {
    // Handle different condition types
    
    // "AND" condition - all must be true
    if (conditions.AND && Array.isArray(conditions.AND)) {
      return conditions.AND.every(condition => 
        evaluateConditions(condition, context)
      );
    }
    
    // "OR" condition - at least one must be true
    if (conditions.OR && Array.isArray(conditions.OR)) {
      return conditions.OR.some(condition => 
        evaluateConditions(condition, context)
      );
    }
    
    // Simple equality condition
    if (conditions.equals) {
      const { field, value } = conditions.equals;
      return getNestedValue(context, field) === value;
    }
    
    // Contains condition
    if (conditions.contains) {
      const { field, value } = conditions.contains;
      const fieldValue = getNestedValue(context, field);
      return Array.isArray(fieldValue) 
        ? fieldValue.includes(value)
        : String(fieldValue).includes(String(value));
    }
    
    // Comparison conditions
    if (conditions.gt) {
      const { field, value } = conditions.gt;
      return getNestedValue(context, field) > value;
    }
    
    if (conditions.lt) {
      const { field, value } = conditions.lt;
      return getNestedValue(context, field) < value;
    }
    
    if (conditions.gte) {
      const { field, value } = conditions.gte;
      return getNestedValue(context, field) >= value;
    }
    
    if (conditions.lte) {
      const { field, value } = conditions.lte;
      return getNestedValue(context, field) <= value;
    }
    
    // Custom function condition
    if (conditions.function && typeof conditions.function === 'string') {
      // This would typically call a database function or API endpoint
      // For now, just return true for demonstration
      console.log(`Would call custom function: ${conditions.function}`);
      return true;
    }
    
    // Default to false for unknown condition types
    return false;
  } catch (error) {
    console.error('Error evaluating permission conditions:', error);
    return false;
  }
};

/**
 * Helper to safely get nested object values
 */
const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce(
    (value, key) => (value === undefined || value === null) ? undefined : value[key], 
    obj
  );
}; 