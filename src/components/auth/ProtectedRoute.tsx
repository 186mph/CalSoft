import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPortal?: string;
  requiredPermission?: 'canManageUsers' | 'canManageContent' | 'canViewAllData';
}

export function ProtectedRoute({ 
  children, 
  requiredPortal, 
  requiredPermission 
}: ProtectedRouteProps) {
  const { checkPortalAccess, checkPermission } = usePermissions();
  const location = useLocation();

  // If no requirements, just render the children
  if (!requiredPortal && !requiredPermission) {
    return <>{children}</>;
  }

  // Check portal access if required
  if (requiredPortal && !checkPortalAccess(requiredPortal as any)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Check permission if required
  if (requiredPermission && !checkPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 