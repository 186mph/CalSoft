import React, { useState, useEffect } from 'react';
import { 
  Role, 
  Portal, 
  ROLES, 
  getAllRoles, 
  getSystemRoles, 
  Permission, 
  PermissionResource, 
  PermissionAction, 
  updateRole,
  RolePermissions
} from '@/lib/roles';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Copy,
  Save,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import RoleAuditLogs from './RoleAuditLogs';

// Component for role management in the admin portal
export default function RoleManagement() {
  // State for all roles
  const [roles, setRoles] = useState<Role[]>(getAllRoles());
  const [systemRoles, setSystemRoles] = useState<Role[]>(getSystemRoles());
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  
  // State for role editing
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  
  // State for role properties
  const [selectedPortals, setSelectedPortals] = useState<Portal[]>([]);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canManageContent, setCanManageContent] = useState(false);
  const [canViewAllData, setCanViewAllData] = useState(false);
  const [parentRole, setParentRole] = useState<Role | ''>('');
  
  // State for permissions
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  // State for UI feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Available resources and actions for permissions
  const availableResources: PermissionResource[] = [
    'users', 'roles', 'customers', 'jobs', 'opportunities', 
    'reports', 'documents', 'settings', 'encryption', 'system'
  ];
  
  const availableActions: PermissionAction[] = [
    'view', 'create', 'edit', 'delete', 'approve', 'assign'
  ];
  
  // Available portals
  const availablePortals: Portal[] = [
    'sales', 'neta', 'lab', 'hr', 'office', 'engineering', 'scavenger', 'admin'
  ];
  
  useEffect(() => {
    // Separate system roles from custom roles
    loadRoles();
  }, []);
  
  // Load all roles
  const loadRoles = () => {
    const allRoles = getAllRoles();
    const systemRolesList = getSystemRoles();
    const customRolesList = allRoles.filter(role => !systemRolesList.includes(role));
    
    setRoles(allRoles);
    setSystemRoles(systemRolesList);
    setCustomRoles(customRolesList);
  };
  
  // Load a role for editing
  const loadRole = (role: Role) => {
    setCurrentRole(role);
    setRoleName(role);
    
    if (ROLES[role]) {
      // Set basic properties
      setSelectedPortals(ROLES[role].portals || []);
      setCanManageUsers(ROLES[role].canManageUsers || false);
      setCanManageContent(ROLES[role].canManageContent || false);
      setCanViewAllData(ROLES[role].canViewAllData || false);
      setParentRole(ROLES[role].parentRole || '');
      
      // Set permissions
      setPermissions(ROLES[role].permissions || []);
    }
    
    setIsEditing(true);
    setIsCreating(false);
  };
  
  // Start creating a new role
  const startNewRole = () => {
    setCurrentRole(null);
    setRoleName('');
    setSelectedPortals([]);
    setCanManageUsers(false);
    setCanManageContent(false);
    setCanViewAllData(false);
    setParentRole('');
    setPermissions([]);
    setIsCreating(true);
    setIsEditing(false);
  };
  
  // Cancel editing/creating
  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setCurrentRole(null);
    clearError();
  };
  
  // Add or update a role
  const saveRole = async () => {
    try {
      // Validation
      if (!roleName) {
        setError('Role name is required');
        return;
      }
      
      // If editing a system role, don't allow changing the name
      if (isEditing && systemRoles.includes(currentRole as Role) && roleName !== currentRole) {
        setError('Cannot change the name of a system role');
        return;
      }
      
      // Create/update role configuration
      const roleConfig: Partial<RolePermissions> = {
        portals: selectedPortals,
        canManageUsers,
        canManageContent,
        canViewAllData,
        permissions,
        parentRole: parentRole || undefined
      };
      
      // Update local role data
      updateRole(roleName, roleConfig);
      
      // Save to database
      setLoading(true);
      const { error: dbError } = await supabase.rpc('admin_update_role', {
        role_name: roleName,
        role_config: roleConfig
      });
      
      if (dbError) {
        throw new Error(`Failed to save role: ${dbError.message}`);
      }
      
      // Refresh role list
      loadRoles();
      
      // Show success message
      setSuccess(`Role "${roleName}" saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Exit edit mode
      setIsEditing(false);
      setIsCreating(false);
      setCurrentRole(null);
    } catch (err: any) {
      setError(`Error saving role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a role
  const deleteRole = async (role: Role) => {
    // Don't allow deleting system roles
    if (systemRoles.includes(role)) {
      setError('Cannot delete system roles');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the role "${role}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Remove from database
      const { error: dbError } = await supabase.rpc('admin_delete_role', {
        role_name: role
      });
      
      if (dbError) {
        throw new Error(`Failed to delete role: ${dbError.message}`);
      }
      
      // Update local state
      // In a real app, this would be more complex to update the ROLES object
      // But for now, we'll just reload the roles
      loadRoles();
      
      setSuccess(`Role "${role}" deleted successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Error deleting role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle a portal for the current role
  const togglePortal = (portal: Portal) => {
    if (selectedPortals.includes(portal)) {
      setSelectedPortals(selectedPortals.filter(p => p !== portal));
    } else {
      setSelectedPortals([...selectedPortals, portal]);
    }
  };
  
  // Add a new permission
  const addPermission = () => {
    setPermissions([...permissions, {
      resource: 'users',
      action: 'view',
      scope: 'own'
    }]);
  };
  
  // Update a permission
  const updatePermission = (index: number, field: keyof Permission, value: any) => {
    const newPermissions = [...permissions];
    newPermissions[index] = { ...newPermissions[index], [field]: value };
    setPermissions(newPermissions);
  };
  
  // Remove a permission
  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };
  
  // Clone a role
  const cloneRole = (role: Role) => {
    loadRole(role);
    setRoleName(`${role} Copy`);
    setIsCreating(true);
    setIsEditing(false);
  };
  
  // Clear error message
  const clearError = () => {
    setError(null);
  };
  
  // Role list view
  const renderRoleList = () => (
    <div className="space-y-4">
      <div className="flex justify-end mb-6">
        <Button onClick={startNewRole} size="md" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Role
        </Button>
      </div>
      
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-2">
          <CardTitle className="text-lg">System Roles</CardTitle>
          <CardDescription>
            Built-in roles with predefined permissions. These roles cannot be deleted, but can be cloned.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemRoles.map(role => renderRoleCard(role, true))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm mt-8">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-2">
          <CardTitle className="text-lg">Custom Roles</CardTitle>
          <CardDescription>
            Custom roles that you've created. These can be freely edited and deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {customRoles.length === 0 ? (
            <div className="p-6 text-center text-gray-500 border border-dashed rounded-lg">
              No custom roles defined. Click "Create New Role" to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoles.map(role => renderRoleCard(role, false))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Role card component
  const renderRoleCard = (role: Role, isSystem: boolean) => (
    <Card key={role} className="overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-purple-500" />
            <CardTitle className="text-base">{role}</CardTitle>
          </div>
          <div className="flex gap-1">
            {isSystem ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => cloneRole(role)}
                title="Clone role"
              >
                <Copy className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => loadRole(role)}
                  title="Edit role"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500"
                  onClick={() => deleteRole(role)}
                  title="Delete role"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        <div className="text-xs text-gray-500 space-y-2">
          {ROLES[role]?.parentRole && (
            <div>Inherits from: <span className="font-medium">{ROLES[role].parentRole}</span></div>
          )}
          <div>
            <span className="text-xs text-gray-500 block mb-1">Access to portals:</span>
            <div className="flex flex-wrap gap-1">
              {ROLES[role]?.portals?.map(portal => (
                <span key={portal} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-full">
                  {portal}
                </span>
              )) || <span className="text-gray-500">None</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  // Role edit view
  const renderRoleEdit = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">
          {isCreating ? 'Create New Role' : `Edit Role: ${currentRole}`}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={cancelEdit}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={saveRole}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Role
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Role Properties</CardTitle>
          <CardDescription>Define the basic properties of this role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Enter role name"
              disabled={isEditing && systemRoles.includes(currentRole as Role)}
            />
            {isEditing && systemRoles.includes(currentRole as Role) && (
              <div className="flex items-center text-sm text-amber-600">
                <Lock className="h-4 w-4 mr-1" />
                System role names cannot be changed
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="parent-role">Parent Role (Inherits Permissions)</Label>
            <select
              id="parent-role"
              value={parentRole}
              onChange={(e) => setParentRole(e.target.value as Role)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">None</option>
              {roles
                .filter(r => r !== roleName) // Prevent circular inheritance
                .map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500">
              Child roles inherit all permissions from their parent role
            </p>
          </div>
          
          <div className="space-y-3">
            <Label>Portal Access</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {availablePortals.map(portal => (
                <div key={portal} className="flex items-center space-x-2">
                  <Switch
                    id={`portal-${portal}`}
                    checked={selectedPortals.includes(portal)}
                    onCheckedChange={() => togglePortal(portal)}
                  />
                  <Label htmlFor={`portal-${portal}`} className="cursor-pointer">
                    {portal.charAt(0).toUpperCase() + portal.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Special Abilities</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="can-manage-users"
                  checked={canManageUsers}
                  onCheckedChange={setCanManageUsers}
                />
                <Label htmlFor="can-manage-users" className="cursor-pointer">
                  Can manage users
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="can-manage-content"
                  checked={canManageContent}
                  onCheckedChange={setCanManageContent}
                />
                <Label htmlFor="can-manage-content" className="cursor-pointer">
                  Can manage content
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="can-view-all-data"
                  checked={canViewAllData}
                  onCheckedChange={setCanViewAllData}
                />
                <Label htmlFor="can-view-all-data" className="cursor-pointer">
                  Can view all data (across divisions)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Permissions</CardTitle>
            <CardDescription>Fine-grained access control for this role</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addPermission}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Permission
          </Button>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="text-center text-gray-500 p-4 border border-dashed rounded-md">
              No permissions defined. Add at least one permission or use a Parent Role.
            </div>
          ) : (
            <div className="space-y-4">
              {permissions.map((permission, index) => (
                <div key={index} className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <Label htmlFor={`resource-${index}`}>Resource</Label>
                    <select
                      id={`resource-${index}`}
                      className="w-full p-2 border rounded-md mt-1"
                      value={permission.resource}
                      onChange={(e) => updatePermission(index, 'resource', e.target.value as PermissionResource)}
                    >
                      {availableResources.map(resource => (
                        <option key={resource} value={resource}>
                          {resource}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor={`action-${index}`}>Action</Label>
                    <select
                      id={`action-${index}`}
                      className="w-full p-2 border rounded-md mt-1"
                      value={permission.action}
                      onChange={(e) => updatePermission(index, 'action', e.target.value as PermissionAction)}
                    >
                      {availableActions.map(action => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-2 lg:col-span-4">
                    <Label htmlFor={`scope-${index}`}>Scope</Label>
                    <select
                      id={`scope-${index}`}
                      className="w-full p-2 border rounded-md mt-1"
                      value={permission.scope}
                      onChange={(e) => updatePermission(index, 'scope', e.target.value)}
                    >
                      <option value="own">Own</option>
                      <option value="division">Division</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  
                  <div className="col-span-6 md:col-span-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePermission(index)}
                      className="h-8 w-8 text-red-500 mt-5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Create and manage roles with fine-grained permissions.
          </p>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Success</AlertTitle>
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
      
      {isEditing || isCreating ? (
        renderRoleEdit()
      ) : (
        <Tabs defaultValue="roles">
          <TabsList className="mb-4">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roles">
            {renderRoleList()}
          </TabsContent>
          
          <TabsContent value="audit">
            <RoleAuditLogs />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 