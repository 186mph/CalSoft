import { useAuth } from '@/lib/AuthContext';
import { Role, Portal, hasPortalAccess, hasPermission, RolePermissions, ROLES } from '@/lib/roles';

export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role as Role;

  const checkPortalAccess = (portal: Portal): boolean => {
    if (!userRole) {
      console.warn('No role found for user:', user?.email);
      return false;
    }
    if (!ROLES[userRole]) {
      console.warn('Invalid role:', userRole, 'for user:', user?.email);
      return false;
    }
    return hasPortalAccess(userRole, portal);
  };

  const checkPermission = (permission: 'canManageUsers' | 'canManageContent' | 'canViewAllData'): boolean => {
    if (!userRole) return false;
    if (!ROLES[userRole]) return false;
    return hasPermission(userRole, permission);
  };

  const getUserRole = (): Role | null => {
    return userRole || null;
  };

  return {
    checkPortalAccess,
    checkPermission,
    getUserRole,
    isAdmin: userRole === 'Admin'
  };
} 