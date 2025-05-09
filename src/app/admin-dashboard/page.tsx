import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserMinus, ShieldCheck, Settings, Users, ArrowLeft, FileText, Database, Sliders, LockKeyhole, Shield } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import SystemHealthMonitoring from '@/components/admin/SystemHealthMonitoring';
import { SystemLogsCard } from '@/components/admin/SystemLogsCard';
import { PortalConfiguration } from '@/components/admin/PortalConfiguration';
import { DataBackupControls } from '@/components/admin/DataBackupControls';
import { EncryptionSettings } from '@/components/admin/EncryptionSettings';
import RoleManagement from '@/components/admin/RoleManagement';
import PermissionManagement from '@/components/admin/PermissionManagement';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<
    'dashboard' | 
    'userManagement' | 
    'systemHealth' | 
    'systemLogs' | 
    'portalConfig' | 
    'dataBackup' | 
    'encryptionSettings' |
    'roleManagement' |
    'permissionManagement'
  >('dashboard');

  // Redirect non-admin users
  React.useEffect(() => {
    if (user && user.user_metadata?.role !== 'Admin') {
      navigate('/portal');
    }
  }, [user, navigate]);

  if (!user || user.user_metadata?.role !== 'Admin') {
    return <div className="p-10">Loading or unauthorized access...</div>;
  }

  const handleBackClick = () => {
    if (currentView === 'dashboard') {
      navigate('/portal');
    } else {
      setCurrentView('dashboard');
    }
  };

  // Render current view based on state
  const renderView = () => {
    switch (currentView) {
      case 'userManagement':
        return <AdminUserManagement />;
      case 'systemHealth':
        return <SystemHealthMonitoring />;
      case 'systemLogs':
        return <SystemLogsCard />;
      case 'portalConfig':
        return <PortalConfiguration />;
      case 'dataBackup':
        return <DataBackupControls />;
      case 'encryptionSettings':
        return <EncryptionSettings />;
      case 'roleManagement':
        return <RoleManagement />;
      case 'permissionManagement':
        return <PermissionManagement />;
      default:
        return renderDashboard();
    }
  };

  // Render the main dashboard cards
  const renderDashboard = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('userManagement')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">User Management</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage users, roles, and permissions</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        {/* Role Management Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('roleManagement')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">Role Management</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Define and assign user roles</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Permission Management Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('permissionManagement')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">Permission Management</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fine-grained access control for users</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('systemHealth')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">System Health</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monitor system performance and status</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* System Logs Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('systemLogs')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">System Logs</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">View system logs and audit trails</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Portal Configuration Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('portalConfig')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">Portal Configuration</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Customize portal appearance and behavior</p>
              </div>
              <Sliders className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Data Backup Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('dataBackup')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">Data Backup</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage data backups and recovery</p>
              </div>
              <Database className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        {/* Encryption Settings Card */}
        <Card className="transition-all hover:shadow-md cursor-pointer" onClick={() => setCurrentView('encryptionSettings')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg mb-2">Encryption Settings</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage encryption keys and settings</p>
              </div>
              <LockKeyhole className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          className="mr-4"
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentView === 'dashboard' ? 'Back to Portal' : 'Back to Dashboard'}
        </Button>
        <h1 className="text-2xl font-bold">
          {currentView === 'dashboard' ? 'Admin Dashboard' : (
            currentView === 'userManagement' ? 'User Management' :
            currentView === 'systemHealth' ? 'System Health' : 
            currentView === 'systemLogs' ? 'System Logs' :
            currentView === 'portalConfig' ? 'Portal Configuration' :
            currentView === 'dataBackup' ? 'Data Backup' :
            currentView === 'encryptionSettings' ? 'Encryption Settings' :
            currentView === 'roleManagement' ? 'Role Management' :
            currentView === 'permissionManagement' ? 'Permission Management' :
            'Admin Dashboard'
          )}
        </h1>
      </div>
      
      {renderView()}
    </div>
  );
};

// Add both export styles to ensure compatibility with different import methods
export default AdminDashboard; 