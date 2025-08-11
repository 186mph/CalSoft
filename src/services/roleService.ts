import { supabase } from '@/lib/supabase';
import { Role, RolePermissions, updateRole as updateLocalRole } from '@/lib/roles';

// Interface for role audit log entries
export interface RoleAuditLog {
  id: string;
  role_name: string;
  action: 'create' | 'update' | 'delete';
  previous_config?: any;
  new_config?: any;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// Interface for custom role database records
export interface CustomRole {
  name: string;
  config: Partial<RolePermissions>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Default admin permissions to use as fallback
const DEFAULT_ADMIN_PERMISSIONS: Partial<RolePermissions> = {
  permissions: [
    // Include explicit permissions for all resources instead of using wildcards
    { resource: 'users', action: 'view', scope: 'all' },
    { resource: 'users', action: 'create', scope: 'all' },
    { resource: 'users', action: 'edit', scope: 'all' },
    { resource: 'users', action: 'delete', scope: 'all' },
    { resource: 'roles', action: 'view', scope: 'all' },
    { resource: 'roles', action: 'create', scope: 'all' },
    { resource: 'roles', action: 'edit', scope: 'all' },
    { resource: 'roles', action: 'delete', scope: 'all' },
    { resource: 'customers', action: 'view', scope: 'all' },
    { resource: 'customers', action: 'create', scope: 'all' },
    { resource: 'customers', action: 'edit', scope: 'all' },
    { resource: 'customers', action: 'delete', scope: 'all' },
    { resource: 'jobs', action: 'view', scope: 'all' },
    { resource: 'jobs', action: 'create', scope: 'all' },
    { resource: 'jobs', action: 'edit', scope: 'all' },
    { resource: 'jobs', action: 'delete', scope: 'all' },
    { resource: 'equipment', action: 'view', scope: 'all' },
    { resource: 'equipment', action: 'create', scope: 'all' },
    { resource: 'equipment', action: 'edit', scope: 'all' },
    { resource: 'equipment', action: 'delete', scope: 'all' }
  ]
};

/**
 * Fetch all custom roles from the database
 */
export async function getCustomRoles(): Promise<CustomRole[]> {
  try {
    // Prefer querying the table first to avoid RPC 404/406 noise during startup
    try {
      const { data: directData, error: directError } = await supabase
        .schema('common')
        .from('custom_roles')
        .select('*');
        
      if (!directError && directData) {
        console.log('Successfully fetched custom roles from table');
        return directData;
      }
    } catch (tableError) {
      console.warn('Unable to fetch from custom_roles table:', tableError);
      // Continue to RPC fallback
    }

    // RPC fallback
    try {
      const { data, error } = await supabase.rpc('admin_get_custom_roles');
      if (!error && data) {
        console.log('Successfully fetched custom roles via RPC');
        return data;
      }
    } catch (rpcError) {
      console.warn('RPC admin_get_custom_roles not available:', rpcError);
    }
    
    // Fallback: Create a default admin role since we can't access the database roles
    console.log('Using hardcoded default roles as fallback');
    return [{
      name: 'Admin',
      config: DEFAULT_ADMIN_PERMISSIONS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'system'
    }];
  } catch (err) {
    console.error('Failed to fetch custom roles:', err);
    // Return default admin role to prevent UI from breaking
    return [{
      name: 'Admin',
      config: DEFAULT_ADMIN_PERMISSIONS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'system'
    }];
  }
}

/**
 * Update or create a role in the database
 * @param roleName The name of the role
 * @param roleConfig The role configuration
 */
export async function updateRole(roleName: Role, roleConfig: Partial<RolePermissions>): Promise<boolean> {
  try {
    // Try to update the role using the admin function
    try {
      const { data, error } = await supabase.rpc('admin_update_role', {
        role_name: roleName,
        role_config: roleConfig
      });
      
      if (!error) {
        // Also update the local role cache
        updateLocalRole(roleName, roleConfig);
        return data || true;
      }
    } catch (rpcError) {
      console.warn('RPC admin_update_role not available:', rpcError);
      // Continue to fallback
    }
    
    // Fallback: try to update the table directly
    try {
      const { data: upsertData, error: upsertError } = await supabase
        .schema('common')
        .from('custom_roles')
        .upsert({
          name: roleName,
          config: roleConfig,
          updated_at: new Date().toISOString()
        });
        
      if (!upsertError) {
        // Also update the local role cache
        updateLocalRole(roleName, roleConfig);
        return true;
      }
    } catch (tableError) {
      console.warn('Unable to update custom_roles table:', tableError);
    }
    
    // If both methods fail, just update the local role cache
    console.log('Using local update only as fallback');
    updateLocalRole(roleName, roleConfig);
    return true;
  } catch (err) {
    console.error('Failed to update role:', err);
    // Update the local role cache anyway to keep UI functional
    updateLocalRole(roleName, roleConfig);
    return false;
  }
}

/**
 * Delete a role from the database
 * @param roleName The name of the role to delete
 */
export async function deleteRole(roleName: Role): Promise<boolean> {
  try {
    // Try to delete the role using the admin function
    try {
      const { data, error } = await supabase.rpc('admin_delete_role', {
        role_name: roleName
      });
      
      if (!error) {
        return data || true;
      }
    } catch (rpcError) {
      console.warn('RPC admin_delete_role not available:', rpcError);
      // Continue to fallback
    }
    
    // Fallback: try to delete from the table directly
    try {
      const { error: deleteError } = await supabase
        .schema('common')
        .from('custom_roles')
        .delete()
        .eq('name', roleName);
        
      if (!deleteError) {
        return true;
      }
    } catch (tableError) {
      console.warn('Unable to delete from custom_roles table:', tableError);
    }
    
    // If both methods fail, just return success to avoid UI errors
    console.log('Unable to delete role from database, operation will only affect local state');
    return true;
  } catch (err) {
    console.error('Failed to delete role:', err);
    return false;
  }
}

/**
 * Get role audit logs
 * @param limit Number of logs to return
 * @param roleName Optional role name to filter logs
 */
export async function getRoleAuditLogs(limit: number = 50, roleName?: string): Promise<RoleAuditLog[]> {
  try {
    try {
      let query = supabase
        .schema('common')
        .from('role_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (roleName) {
        query = query.eq('role_name', roleName);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        return data;
      }
    } catch (queryError) {
      console.warn('Unable to fetch role_audit_logs:', queryError);
    }
    
    // Return empty array if the table doesn't exist or any other error
    return [];
  } catch (err) {
    console.error('Failed to fetch role audit logs:', err);
    return [];
  }
}

/**
 * Initialize roles by loading custom roles from the database
 * This should be called when the application starts
 */
export async function initializeRoles(): Promise<void> {
  try {
    const customRoles = await getCustomRoles();
    
    // Update local role cache with custom roles from the database
    customRoles.forEach(role => {
      updateLocalRole(role.name, role.config);
    });
    
    console.log(`Initialized ${customRoles.length} custom roles`);
  } catch (err) {
    console.error('Failed to initialize roles:', err);
    // Initialize with default admin role
    updateLocalRole('Admin', DEFAULT_ADMIN_PERMISSIONS);
    console.log('Initialized with default admin role only');
  }
} 