import { supabase } from '../lib/supabase';
import { Permission, RolePermissions } from '../lib/roles';
import { 
  Resource, 
  Action, 
  Permission as PermissionType, 
  Role, 
  PermissionContext,
  PermissionAccessLog as PermissionAccessLogType
} from '../types/permissions';
import { v4 as uuidv4 } from 'uuid';

// Interface for permission access log entries - extending the base type with additional fields
export interface PermissionAccessLog extends PermissionAccessLogType {
  ip_address?: string;
  user_agent?: string;
  component?: string;
}

// Interface for role audit log entries
export interface RoleAuditLog {
  id: string;
  role_name: string;
  action: 'create' | 'update' | 'delete';
  previous_config?: Partial<RolePermissions>;
  new_config?: Partial<RolePermissions>;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Interface for permission change log entry
 */
export interface PermissionChangeLog {
  id?: string;
  user_id: string;      // User whose permissions are being changed
  subject_id: string;   // User making the change
  action: 'grant' | 'revoke' | 'modify';
  resource: Resource;
  permission_action: Action;
  details?: Record<string, any>;
  reason?: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
  component?: string;
}

/**
 * Interface for role change log entry
 */
export interface RoleChangeLog {
  id?: string;
  user_id: string;      // User whose role is changing
  subject_id: string;   // User making the change
  new_role?: Role;
  old_role?: Role;
  reason?: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
  component?: string;
}

/**
 * Interface for system change log entry
 */
export interface SystemChangeLog {
  id?: string;
  subject_id: string;   // User making the change
  action: string;
  component: string;    // Component being changed
  details: Record<string, any>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Helper function to get request headers for client information
 */
const getRequestHeaders = (): { ip: string; userAgent: string } => {
  // In a real implementation, this would get details from the request object
  // For this implementation, we'll return placeholder values
  return {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (compatible; AuditService)'
  };
};

/**
 * Log a permission access attempt for audit purposes
 */
export const logPermissionAccess = async (data: {
  role: string;
  resource: string;
  action: string;
  scope: string;
  granted: boolean;
  reason: string;
  userId?: string;
  targetId?: string;
  permission?: Permission;
  [key: string]: any;
}): Promise<string | null> => {
  try {
    // Get client information
    const headers = getRequestHeaders();
    
    // Prepare the log entry
    const logEntry = {
      user_id: data.userId || 'anonymous',
      role: data.role,
      resource: data.resource,
      action: data.action,
      scope: data.scope,
      target_id: data.targetId,
      granted: data.granted,
      reason: data.reason,
      details: {
        permission: data.permission,
        context: {
          ...data,
          // Remove duplicated fields and sensitive data
          userId: undefined,
          targetId: undefined,
          role: undefined,
          resource: undefined,
          action: undefined,
          scope: undefined,
          granted: undefined,
          reason: undefined,
          permission: undefined
        }
      },
      ip_address: headers.ip,
      user_agent: headers.userAgent
    };
    
    // Insert the log entry into the database
    const { data: result, error } = await supabase
      .from('common.permission_access_logs')
      .insert(logEntry)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error logging permission access:', error);
      return null;
    }
    
    return result.id;
  } catch (error) {
    console.error('Error in logPermissionAccess:', error);
    return null;
  }
};

/**
 * Log a role change for audit purposes
 */
export const logRoleChange = async (data: {
  roleName: string;
  action: 'create' | 'update' | 'delete';
  previousConfig?: Partial<RolePermissions>;
  newConfig?: Partial<RolePermissions>;
  userId?: string;
}): Promise<string | null> => {
  try {
    // Get client information
    const headers = getRequestHeaders();
    
    // Prepare the log entry
    const logEntry = {
      role_name: data.roleName,
      action: data.action,
      previous_config: data.previousConfig,
      new_config: data.newConfig,
      user_id: data.userId || 'system',
      ip_address: headers.ip,
      user_agent: headers.userAgent
    };
    
    // Insert the log entry into the database
    const { data: result, error } = await supabase
      .from('common.role_audit_logs')
      .insert(logEntry)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error logging role change:', error);
      return null;
    }
    
    return result.id;
  } catch (error) {
    console.error('Error in logRoleChange:', error);
    return null;
  }
};

/**
 * Get all role audit logs, optionally filtered by role name
 */
export const getRoleAuditLogs = async (
  limit: number = 50,
  roleName?: string
): Promise<RoleAuditLog[]> => {
  try {
    let query = supabase
      .from('common.role_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Filter by role name if provided
    if (roleName) {
      query = query.eq('role_name', roleName);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching role audit logs:', error);
      return [];
    }
    
    return data as RoleAuditLog[];
  } catch (error) {
    console.error('Error in getRoleAuditLogs:', error);
    return [];
  }
};

/**
 * Get permission access logs, with various filtering options
 */
export const getPermissionAccessLogs = async (options: {
  userId?: string;
  resource?: string;
  action?: string;
  granted?: boolean;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<PermissionAccessLog[]> => {
  try {
    const {
      userId,
      resource,
      action,
      granted,
      from,
      to,
      limit = 50
    } = options;
    
    let query = supabase
      .from('common.permission_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply filters
    if (userId) query = query.eq('user_id', userId);
    if (resource) query = query.eq('resource', resource);
    if (action) query = query.eq('action', action);
    if (granted !== undefined) query = query.eq('granted', granted);
    if (from) query = query.gte('created_at', from.toISOString());
    if (to) query = query.lte('created_at', to.toISOString());
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching permission access logs:', error);
      return [];
    }
    
    return data as PermissionAccessLog[];
  } catch (error) {
    console.error('Error in getPermissionAccessLogs:', error);
    return [];
  }
};

/**
 * Create a database migration to add permission audit logging tables
 * This is a utility function that generates SQL commands
 */
export const generatePermissionAuditTables = (): string => {
  return `
    -- Permission access logs table
    CREATE TABLE IF NOT EXISTS common.permission_access_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      context JSONB,
      granted BOOLEAN NOT NULL,
      reason TEXT,
      source TEXT,
      ip_address TEXT,
      user_agent TEXT,
      component TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Permission change logs table
    CREATE TABLE IF NOT EXISTS common.permission_change_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      permission_action TEXT NOT NULL,
      details JSONB,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      component TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Role change logs table
    CREATE TABLE IF NOT EXISTS common.role_change_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      old_role TEXT,
      new_role TEXT,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      component TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- System change logs table
    CREATE TABLE IF NOT EXISTS common.system_change_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      subject_id TEXT NOT NULL,
      action TEXT NOT NULL,
      component TEXT NOT NULL,
      details JSONB,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
};

/**
 * Service for logging audit events related to permissions and roles
 */
export class AuditService {
  // In-memory log caches for batch processing if needed
  private permissionAccessLogs: PermissionAccessLog[] = [];
  private permissionChangeLogs: PermissionChangeLog[] = [];
  private roleChangeLogs: RoleChangeLog[] = [];
  private systemChangeLogs: SystemChangeLog[] = [];
  
  /**
   * Log a permission access event
   */
  async logPermissionAccess(log: Omit<PermissionAccessLog, 'id'>): Promise<void> {
    try {
      // Get client information if not provided
      const headers = getRequestHeaders();
      const fullLog: PermissionAccessLog = {
        ...log,
        id: uuidv4(), // Use uuidv4 instead of crypto.randomUUID
        ip_address: log.ip_address || headers.ip,
        user_agent: log.user_agent || headers.userAgent,
        timestamp: log.timestamp || new Date()
      };

      // Add to in-memory cache
      this.permissionAccessLogs.push(fullLog);
      
      // Persist to database
      await this.persistPermissionAccessLog(fullLog);
      
      // Debug output (can be removed in production)
      console.debug(`Permission access logged: ${fullLog.user_id} | ${fullLog.resource} | ${fullLog.action} | ${fullLog.granted ? 'GRANTED' : 'DENIED'}`);
    } catch (error) {
      console.error('Error logging permission access:', error);
    }
  }
  
  /**
   * Log a permission change event
   */
  async logPermissionChange(log: Omit<PermissionChangeLog, 'id'>): Promise<void> {
    try {
      // Get client information if not provided
      const headers = getRequestHeaders();
      const fullLog: PermissionChangeLog = {
        ...log,
        id: uuidv4(), // Use uuidv4 instead of crypto.randomUUID
        ip_address: log.ip_address || headers.ip,
        user_agent: log.user_agent || headers.userAgent,
        timestamp: log.timestamp || new Date()
      };

      // Add to in-memory cache
      this.permissionChangeLogs.push(fullLog);
      
      // Persist to database
      await this.persistPermissionChangeLog(fullLog);
      
      // Debug output (can be removed in production)
      console.debug(`Permission change logged: ${fullLog.user_id} | ${fullLog.action} | ${fullLog.resource} | ${fullLog.permission_action}`);
    } catch (error) {
      console.error('Error logging permission change:', error);
    }
  }
  
  /**
   * Log a role change event
   */
  async logRoleChange(log: Omit<RoleChangeLog, 'id'>): Promise<void> {
    try {
      // Get client information if not provided
      const headers = getRequestHeaders();
      const fullLog: RoleChangeLog = {
        ...log,
        id: uuidv4(), // Use uuidv4 instead of crypto.randomUUID
        ip_address: log.ip_address || headers.ip,
        user_agent: log.user_agent || headers.userAgent,
        timestamp: log.timestamp || new Date()
      };

      // Add to in-memory cache
      this.roleChangeLogs.push(fullLog);
      
      // Persist to database
      await this.persistRoleChangeLog(fullLog);
      
      // Debug output (can be removed in production)
      console.debug(`Role change logged: ${fullLog.user_id} | ${fullLog.old_role} → ${fullLog.new_role}`);
    } catch (error) {
      console.error('Error logging role change:', error);
    }
  }
  
  /**
   * Log a system change event
   */
  async logSystemChange(log: Omit<SystemChangeLog, 'id'>): Promise<void> {
    try {
      // Get client information if not provided
      const headers = getRequestHeaders();
      const fullLog: SystemChangeLog = {
        ...log,
        id: uuidv4(), // Use uuidv4 instead of crypto.randomUUID
        ip_address: log.ip_address || headers.ip,
        user_agent: log.user_agent || headers.userAgent,
        timestamp: log.timestamp || new Date()
      };

      // Add to in-memory cache
      this.systemChangeLogs.push(fullLog);
      
      // Persist to database
      await this.persistSystemChangeLog(fullLog);
      
      // Debug output (can be removed in production)
      console.debug(`System change logged: ${fullLog.subject_id} | ${fullLog.component} | ${fullLog.action}`);
    } catch (error) {
      console.error('Error logging system change:', error);
    }
  }
  
  /**
   * Persist a permission access log to the database
   */
  private async persistPermissionAccessLog(log: PermissionAccessLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('common.permission_access_logs')
        .insert({
          user_id: log.user_id,
          resource: log.resource,
          action: log.action,
          context: log.context,
          granted: log.granted,
          reason: log.reason,
          source: log.source,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          component: log.component,
          timestamp: log.timestamp,
        });
      
      if (error) {
        throw new Error(`Error persisting permission access log: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to persist permission access log:', error);
    }
  }
  
  /**
   * Persist a permission change log to the database
   */
  private async persistPermissionChangeLog(log: PermissionChangeLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('common.permission_change_logs')
        .insert({
          user_id: log.user_id,
          subject_id: log.subject_id,
          action: log.action,
          resource: log.resource,
          permission_action: log.permission_action,
          details: log.details,
          reason: log.reason,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          component: log.component,
          timestamp: log.timestamp,
        });
      
      if (error) {
        throw new Error(`Error persisting permission change log: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to persist permission change log:', error);
    }
  }
  
  /**
   * Persist a role change log to the database
   */
  private async persistRoleChangeLog(log: RoleChangeLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('common.role_change_logs')
        .insert({
          user_id: log.user_id,
          subject_id: log.subject_id,
          old_role: log.old_role,
          new_role: log.new_role,
          reason: log.reason,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          component: log.component,
          timestamp: log.timestamp,
        });
      
      if (error) {
        throw new Error(`Error persisting role change log: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to persist role change log:', error);
    }
  }
  
  /**
   * Persist a system change log to the database
   */
  private async persistSystemChangeLog(log: SystemChangeLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('common.system_change_logs')
        .insert({
          subject_id: log.subject_id,
          action: log.action,
          component: log.component,
          details: log.details,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          timestamp: log.timestamp,
        });
      
      if (error) {
        throw new Error(`Error persisting system change log: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to persist system change log:', error);
    }
  }
  
  /**
   * Get permission access logs for a specific user
   */
  async getPermissionAccessLogs(userId: string, component?: string): Promise<PermissionAccessLog[]> {
    let query = supabase
      .from('common.permission_access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (component) {
      query = query.eq('component', component);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching permission access logs:', error);
      return [];
    }
    
    return data as PermissionAccessLog[];
  }
  
  /**
   * Get permission change logs for a specific user
   */
  async getPermissionChangeLogs(userId: string, component?: string): Promise<PermissionChangeLog[]> {
    let query = supabase
      .from('common.permission_change_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (component) {
      query = query.eq('component', component);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching permission change logs:', error);
      return [];
    }
    
    return data as PermissionChangeLog[];
  }
  
  /**
   * Get role change logs for a specific user
   */
  async getRoleChangeLogs(userId: string, component?: string): Promise<RoleChangeLog[]> {
    let query = supabase
      .from('common.role_change_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (component) {
      query = query.eq('component', component);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching role change logs:', error);
      return [];
    }
    
    return data as RoleChangeLog[];
  }
  
  /**
   * Get all system change logs
   */
  async getSystemChangeLogs(limit: number = 100): Promise<SystemChangeLog[]> {
    const { data, error } = await supabase
      .from('common.system_change_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching system change logs:', error);
      return [];
    }
    
    return data as SystemChangeLog[];
  }
  
  /**
   * Get system change logs for a specific component
   */
  async getSystemChangeLogsByComponent(component: string, limit: number = 100): Promise<SystemChangeLog[]> {
    const { data, error } = await supabase
      .from('common.system_change_logs')
      .select('*')
      .eq('component', component)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching system change logs by component:', error);
      return [];
    }
    
    return data as SystemChangeLog[];
  }
  
  /**
   * Get system change logs made by a specific user
   */
  async getSystemChangeLogsByUser(subjectId: string, limit: number = 100): Promise<SystemChangeLog[]> {
    const { data, error } = await supabase
      .from('common.system_change_logs')
      .select('*')
      .eq('subject_id', subjectId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching system change logs by user:', error);
      return [];
    }
    
    return data as SystemChangeLog[];
  }
  
  /**
   * Generate SQL for creating all audit tables
   */
  generateAuditTables(): string {
    return generatePermissionAuditTables();
  }
} 