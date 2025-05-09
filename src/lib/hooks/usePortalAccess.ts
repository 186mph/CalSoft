import { useAuth } from '../AuthContext';
import { hasPortalAccess, Portal } from '../roles';

interface PortalAccessControls {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  isAdmin: boolean;
}

/**
 * Hook for checking portal-specific access permissions
 * @param portalType The type of portal to check access for
 * @returns Object with access control flags
 */
export function usePortalAccess(portalType: Portal | string): PortalAccessControls {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role;
  
  // Default to no access if user or role is undefined
  if (!user || !userRole) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      isAdmin: false
    };
  }
  
  // Admin has full access to everything
  const isAdmin = userRole === 'Admin';
  
  // Check portal access
  const hasAccess = isAdmin || hasPortalAccess(userRole, portalType as Portal);
  
  // Check for specific permissions in user metadata
  const hasSpecificPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    const userPermissions = user?.user_metadata?.permissions || [];
    return Array.isArray(userPermissions) && userPermissions.includes(permission);
  };
  
  // Equipment-specific permissions
  if (portalType === 'equipment') {
    return {
      canView: hasAccess || hasSpecificPermission('equipment_view'),
      canEdit: isAdmin || hasSpecificPermission('equipment_manage'),
      canDelete: isAdmin || hasSpecificPermission('equipment_manage'),
      canCreate: isAdmin || hasSpecificPermission('equipment_manage'),
      isAdmin
    };
  }
  
  // Lab-specific permissions
  if (portalType === 'lab') {
    return {
      canView: hasAccess || hasSpecificPermission('lab_view'),
      canEdit: isAdmin || hasSpecificPermission('lab_manage'),
      canDelete: isAdmin || hasSpecificPermission('lab_manage'),
      canCreate: isAdmin || hasSpecificPermission('lab_manage'),
      isAdmin
    };
  }
  
  // NETA-specific permissions
  if (portalType === 'neta') {
    return {
      canView: hasAccess || hasSpecificPermission('neta_view'),
      canEdit: isAdmin || hasSpecificPermission('neta_manage'),
      canDelete: isAdmin || hasSpecificPermission('neta_manage'),
      canCreate: isAdmin || hasSpecificPermission('neta_manage'),
      isAdmin
    };
  }
  
  // Default permissions based on portal access only
  return {
    canView: hasAccess,
    canEdit: isAdmin || hasAccess,
    canDelete: isAdmin,
    canCreate: isAdmin || hasAccess,
    isAdmin
  };
} 