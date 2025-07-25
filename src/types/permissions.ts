/**
 * Permission System Types
 * These types define the structure of permissions throughout the application.
 */

/**
 * Available resources that can be accessed through permissions
 */
export type Resource = 
  | 'user' 
  | 'project'
  | 'document'
  | 'dashboard'
  | 'report'
  | 'organization'
  | 'billing'
  | 'audit'
  | 'system'
  | 'permission';

/**
 * Available actions that can be performed on resources
 */
export type Action = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'execute'
  | 'view'
  | 'edit'
  | 'assign'
  | 'revoke'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'manage';

/**
 * Available scopes for permissions
 */
export type Scope = 
  | 'global'        // Applies to all resources of this type
  | 'organization'  // Applies within an organization
  | 'team'          // Applies within a team
  | 'personal';     // Applies to user's own resources

/**
 * Comparison operators for condition checking
 */
export type ConditionOperator = 
  | 'equals'
  | 'not-equals'
  | 'greater-than'
  | 'less-than'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'in'
  | 'not-in'
  | 'exists';

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Single condition for permission evaluation
 */
export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | Array<string | number>;
}

/**
 * Complex condition with logical operations
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: Array<Condition | ConditionGroup>;
}

/**
 * Core permission interface
 */
export interface Permission {
  id?: string;
  resource: Resource;
  action: Action;
  scope: Scope;
  conditions?: ConditionGroup | Condition;
  description?: string;
  valid_from?: Date;
  valid_until?: Date;
  created_at?: Date;
  created_by?: string;
}

/**
 * User-specific permission assignment
 */
export interface UserPermission extends Permission {
  user_id: string;
  granted_by: string;
  granted_at: Date;
}

/**
 * Role-based permission
 */
export interface RolePermission extends Permission {
  role_id: string;
}

/**
 * Available user roles in the system
 */
export enum Role {
  SYSTEM_ADMIN = 'system_admin',
  ORG_ADMIN = 'org_admin',
  ORG_MANAGER = 'org_manager',
  TEAM_LEAD = 'team_lead',
  MEMBER = 'member',
  GUEST = 'guest',
}

/**
 * Role definition with associated permissions
 */
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  parent_role?: string; // For role hierarchy
}

/**
 * Permission check context with additional information
 * that might be needed for condition evaluation
 */
export interface PermissionContext {
  [key: string]: any;
  userId?: string;
  orgId?: string;
  teamId?: string;
  resourceOwnerId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  source?: 'role' | 'direct' | 'denied';
  permission?: Permission;
  timestamp: Date;
}

/**
 * Log entry for permission access attempts
 */
export interface PermissionAccessLog {
  id: string;
  user_id: string;
  resource: Resource;
  action: Action;
  context: PermissionContext;
  granted: boolean;
  reason?: string;
  source?: 'role' | 'direct' | 'denied';
  timestamp: Date;
}

/**
 * Log entry for role changes
 */
export interface RoleChangeLog {
  id: string;
  user_id: string; // User affected
  subject_id: string; // User making the change
  old_role?: Role;
  new_role?: Role;
  reason?: string;
  timestamp: Date;
} 