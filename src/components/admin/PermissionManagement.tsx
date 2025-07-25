import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { 
  Permission as LibPermission, 
  PermissionAction, 
  PermissionResource 
} from '@/lib/roles';
import { 
  UserPermission,
  getUserPermissions,
  grantUserPermission,
  revokeUserPermission
} from '@/services/permissionService';
import { Permission } from '@/types/permissions';
import { supabase } from '@/lib/supabase';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { AlertCircle, CheckCircle, Plus, Search, Shield, Trash2, UserPlus, Users, X, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { formatDistance } from 'date-fns';
import { Badge } from '../ui/Badge';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface UserData {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    role?: string;
  };
}

const PermissionManagement: React.FC = () => {
  // Authentication context
  const { user } = useAuth();
  
  // State for user list
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // State for user permissions
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [directPermissions, setDirectPermissions] = useState<UserPermission[]>([]);
  
  // State for adding new permissions
  const [isAdding, setIsAdding] = useState(false);
  const [newResource, setNewResource] = useState<PermissionResource | ''>('');
  const [newAction, setNewAction] = useState<PermissionAction | ''>('');
  const [newScope, setNewScope] = useState<'own' | 'team' | 'division' | 'all'>('own');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  
  // State for UI
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Available resources and actions for permissions
  const availableResources: PermissionResource[] = [
    'users', 'roles', 'customers', 'jobs', 'opportunities', 
    'reports', 'documents', 'settings', 'encryption', 'system',
    'equipment', 'technicians', 'lab', 'engineering', 'hr', 
    'office', 'sales'
  ];
  
  const availableActions: PermissionAction[] = [
    'view', 'create', 'edit', 'delete', 'approve', 'assign',
    'import', 'export', 'share', 'revoke', 'manage', 'configure'
  ];
  
  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);
  
  // Load user permissions when a user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.id);
    } else {
      setUserPermissions([]);
      setDirectPermissions([]);
    }
  }, [selectedUser]);
  
  // Load users from Supabase
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        throw error;
      }
      
      setUsers(users.map(u => ({
        id: u.id,
        email: u.email || '',
        user_metadata: u.user_metadata
      })));
    } catch (err: any) {
      setError(`Error loading users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Load permissions for a specific user
  const loadUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all permissions (role-based + direct)
      const permissions = await getUserPermissions(userId);
      setUserPermissions(permissions as Permission[]);
      
      // Load direct permissions from the database
      const { data, error } = await supabase
        .from('common.user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setDirectPermissions(data as UserPermission[]);
    } catch (err: any) {
      setError(`Error loading permissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle user selection
  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user);
    // Reset the new permission form
    resetPermissionForm();
  };
  
  // Reset the permission form
  const resetPermissionForm = () => {
    setIsAdding(false);
    setNewResource('');
    setNewAction('');
    setNewScope('own');
    setExpirationDate(null);
  };
  
  // Grant a new permission to the selected user
  const handleGrantPermission = async () => {
    if (!selectedUser || !newResource || !newAction) {
      setError('Please select a resource and action');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await grantUserPermission(
        selectedUser.id,
        newResource as PermissionResource,
        newAction as PermissionAction,
        {
          scope: newScope,
          validUntil: expirationDate || undefined,
          grantedBy: user?.id
        }
      );
      
      if (!result) {
        throw new Error('Failed to grant permission');
      }
      
      // Reload permissions
      await loadUserPermissions(selectedUser.id);
      
      // Show success message
      setSuccess(`Permission granted: ${newAction} ${newResource}`);
      
      // Reset form
      resetPermissionForm();
    } catch (err: any) {
      setError(`Error granting permission: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Revoke a permission from the selected user
  const handleRevokePermission = async (permission: UserPermission) => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await revokeUserPermission(
        selectedUser.id,
        permission.resource as PermissionResource,
        permission.action as PermissionAction,
        permission.scope as 'own' | 'team' | 'division' | 'all'
      );
      
      if (!result) {
        throw new Error('Failed to revoke permission');
      }
      
      // Reload permissions
      await loadUserPermissions(selectedUser.id);
      
      // Show success message
      setSuccess(`Permission revoked: ${permission.action} ${permission.resource}`);
    } catch (err: any) {
      setError(`Error revoking permission: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Format time relative to now
  const formatTime = (timestamp: string): string => {
    try {
      return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
    } catch (err) {
      return timestamp;
    }
  };
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.user_metadata?.name?.toLowerCase() || '';
    const role = user.user_metadata?.role?.toLowerCase() || '';
    
    return email.includes(searchLower) ||
           name.includes(searchLower) ||
           role.includes(searchLower);
  });
  
  // Get permission scope badge color
  const getScopeBadge = (scope?: string) => {
    switch(scope) {
      case 'own':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">Own</Badge>;
      case 'team':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">Team</Badge>;
      case 'division':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">Division</Badge>;
      case 'all':
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200">All</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Group permissions by resource type for better organization
  const groupedPermissions = userPermissions.reduce((groups, permission) => {
    const resource = permission.resource;
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Permission Management
        </CardTitle>
        <CardDescription>
          Manage user permissions and access controls
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User selection */}
          <div className="md:col-span-1 border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" /> Users
            </h3>
            
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            <div className="border rounded-lg overflow-y-auto max-h-[500px]">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No users found
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((user) => (
                    <li 
                      key={user.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.user_metadata?.name || 'Unnamed User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.email}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Role: {user.user_metadata?.role || 'No role'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Permissions display */}
          <div className="md:col-span-2 border rounded-lg p-4">
            {!selectedUser ? (
              <div className="text-center py-20 text-gray-500">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Select a user to manage permissions</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Permissions for {selectedUser.user_metadata?.name || selectedUser.email}
                  </h3>
                  
                  <Button
                    variant={isAdding ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                  >
                    {isAdding ? (
                      <>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" /> Add Permission
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Add permission form */}
                {isAdding && (
                  <div className="border rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800">
                    <h4 className="font-medium mb-3">Grant New Permission</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label htmlFor="resource">Resource</Label>
                        <SelectRoot 
                          value={newResource} 
                          onValueChange={(value: string) => setNewResource(value as PermissionResource)}
                        >
                          <SelectTrigger id="resource">
                            <SelectValue placeholder="Select Resource" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableResources.map((resource) => (
                              <SelectItem key={resource} value={resource}>
                                {resource.charAt(0).toUpperCase() + resource.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </SelectRoot>
                      </div>
                      
                      <div>
                        <Label htmlFor="action">Action</Label>
                        <SelectRoot 
                          value={newAction} 
                          onValueChange={(value: string) => setNewAction(value as PermissionAction)}
                        >
                          <SelectTrigger id="action">
                            <SelectValue placeholder="Select Action" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableActions.map((action) => (
                              <SelectItem key={action} value={action}>
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </SelectRoot>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label htmlFor="scope">Scope</Label>
                        <SelectRoot 
                          value={newScope}
                          onValueChange={(value: string) => setNewScope(value as 'own' | 'team' | 'division' | 'all')}
                        >
                          <SelectTrigger id="scope">
                            <SelectValue placeholder="Select Scope" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="own">Own Resources</SelectItem>
                            <SelectItem value="team">Team Resources</SelectItem>
                            <SelectItem value="division">Division Resources</SelectItem>
                            <SelectItem value="all">All Resources</SelectItem>
                          </SelectContent>
                        </SelectRoot>
                      </div>
                      
                      <div>
                        <Label htmlFor="expiration">Expiration (Optional)</Label>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <Input
                              id="expiration"
                              placeholder="Never expires"
                              value={expirationDate ? expirationDate.toLocaleDateString() : ''}
                              readOnly
                              className="cursor-pointer pr-8"
                              onClick={() => document.getElementById('date-picker')?.click()}
                            />
                            <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                          </div>
                          <DatePicker
                            id="date-picker"
                            selected={expirationDate}
                            onChange={(date: Date | null) => setExpirationDate(date)}
                            minDate={new Date()}
                            className="hidden"
                          />
                          {expirationDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              onClick={() => setExpirationDate(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleGrantPermission}
                        disabled={!newResource || !newAction || loading}
                      >
                        <Shield className="h-4 w-4 mr-1" /> Grant Permission
                      </Button>
                    </div>
                  </div>
                )}
                
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All Permissions</TabsTrigger>
                    <TabsTrigger value="direct">Direct Permissions</TabsTrigger>
                  </TabsList>
                  
                  {/* All permissions tab */}
                  <TabsContent value="all">
                    {Object.keys(groupedPermissions).length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>No permissions found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                          <div key={resource} className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 font-medium">
                              {resource.charAt(0).toUpperCase() + resource.slice(1)}
                            </div>
                            <div className="divide-y">
                              {permissions.map((permission, index) => (
                                <div key={index} className="px-4 py-2 flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">
                                      {permission.action.charAt(0).toUpperCase() + permission.action.slice(1)}
                                    </span>
                                    <div className="mt-1">
                                      {getScopeBadge(permission.scope)}
                                      {'condition' in permission && typeof permission.condition === 'string' && (
                                        <span className="text-xs ml-2 text-gray-500">
                                          Condition: {permission.condition}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Direct permissions tab */}
                  <TabsContent value="direct">
                    {directPermissions.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>No direct permissions found</p>
                        <p className="text-xs mt-1">All permissions are inherited from the user's role</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Granted</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {directPermissions.map((permission) => (
                              <tr key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2">
                                  {permission.resource.charAt(0).toUpperCase() + permission.resource.slice(1)}
                                </td>
                                <td className="px-4 py-2">
                                  {permission.action.charAt(0).toUpperCase() + permission.action.slice(1)}
                                </td>
                                <td className="px-4 py-2">
                                  {getScopeBadge(permission.scope)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {formatTime(permission.created_at)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {permission.valid_until ? (
                                    formatTime(permission.valid_until)
                                  ) : (
                                    <span className="text-xs">Never</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRevokePermission(permission)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionManagement; 