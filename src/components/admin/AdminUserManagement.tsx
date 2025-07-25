import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Role, ROLES } from '@/lib/roles';
import { Button } from '../ui/Button';
import { Users, UserPlus, Shield, Edit, Trash2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    name?: string;
    role?: Role | string; // Allow string for initial load, map to Role
    profileImage?: string;
    [key: string]: any; // Allow other metadata properties
  };
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateSuccessUserId, setUpdateSuccessUserId] = useState<string | null>(null); 
  const [updateErrorUserId, setUpdateErrorUserId] = useState<string | null>(null); 

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      console.log("[fetchUsers] Fetching users via RPC...");
      // Use function name WITHOUT schema prefix - client initialized with 'common' schema
      const { data: adminData, error: adminError } = await supabase.rpc('admin_get_users');
      console.log("[fetchUsers] RPC call completed.");

      if (adminError) {
        console.error('[fetchUsers] Error fetching users from RPC:', adminError);
        throw adminError;
      }

      if (adminData) {
        console.log("[fetchUsers] Received raw data length:", adminData.length);
        // Map the raw data (from auth.users) to the UserData interface
        const mappedUsers: UserData[] = adminData.map((user: any) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          // Map raw_user_meta_data to user_metadata
          // Ensure user_metadata is always an object
          user_metadata: user.raw_user_meta_data || {}
        }));
        console.log("[fetchUsers] Mapped data sample (first user):", JSON.stringify(mappedUsers[0], null, 2));
        setUsers(mappedUsers);
      } else {
        console.log("[fetchUsers] No data returned from RPC.");
        setUsers([]); // Ensure users state is empty if no data
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching users:', err);
      setError(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, role: Role) {
    console.log(`[updateUserRole] Attempting to update user ${userId} to role ${role}`);
    try {
      setError(null);
      setUpdateSuccessUserId(null);
      setUpdateErrorUserId(null);

      // Use function name WITHOUT schema prefix - client initialized with 'common' schema
      const { error } = await supabase.rpc('admin_update_user_role', {
        user_id: userId,
        new_role: role
      });

      if (error) {
          console.error('[updateUserRole] Error response from RPC:', error);
          throw error; // Throw error to be caught by catch block
      }

      // Update local state optimistically ONLY if RPC succeeds
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, user_metadata: { ...user.user_metadata, role } }
            : user
        )
      );

      setEditingUser(null);
      setSelectedRole(null);

      // Set success feedback for this user
      setUpdateSuccessUserId(userId);
      setTimeout(() => setUpdateSuccessUserId(null), 3000); // Clear after 3 seconds

    } catch (err: any) { // Catch specific error
      console.error('Error updating user role:', err);
      // Set specific error feedback for this user
      setUpdateErrorUserId(userId);
      setError(`Failed to update role for ${userId}: ${err.message || 'Unknown error'}`);
    }
  }

  const handleStartEdit = (userId: string, currentRole: string | Role | undefined) => {
    setEditingUser(userId);
    // Ensure we set a valid Role type or null
    const validRole = Object.keys(ROLES).includes(currentRole as string) ? currentRole as Role : null;
    setSelectedRole(validRole);
    setUpdateErrorUserId(null); // Clear specific error when starting edit
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setSelectedRole(null);
    setUpdateErrorUserId(null); // Clear specific error on cancel
  };

  const handleSaveRole = (userId: string) => {
    if (selectedRole) {
      updateUserRole(userId, selectedRole);
    } else {
        setError(`Cannot save: No role selected for user ${userId}`);
        setUpdateErrorUserId(userId);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.user_metadata?.name?.toLowerCase() || '';
    const role = (user.user_metadata?.role as string)?.toLowerCase() || ''; // Treat role as string for search

    return email.includes(searchLower) ||
           name.includes(searchLower) ||
           role.includes(searchLower);
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage user accounts and assign roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchUsers}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* Placeholder for Invite User functionality */}
          {/* <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button> */}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search users by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
        />
      </div>

      {/* Users List */}
      <div className="border border-gray-200 dark:border-dark-300 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 dark:bg-dark-200 px-6 py-3 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-700 dark:text-gray-200">All Users ({filteredUsers.length})</h3>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-dark-100 p-6 text-center text-gray-500 dark:text-gray-400">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 p-6 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No users found matching your search.' : 'No users found.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-300">
            {filteredUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-dark-100 hover:bg-gray-50/50 dark:hover:bg-dark-50/50 transition-colors duration-150">
                <div className="flex items-center mb-4 sm:mb-0 flex-grow min-w-0 mr-4">
                  {/* Profile Image/Initial */}
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.user_metadata?.profileImage ? (
                      <img
                        src={user.user_metadata.profileImage}
                        alt={user.user_metadata?.name || 'User'}
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  {/* Name, Email, Status Icons */}
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center">
                      <span className="truncate">{user.user_metadata?.name || 'Unnamed User'}</span>
                      {/* Success Indicator */}
                      {updateSuccessUserId === user.id && (
                        <CheckCircle className="inline-block h-4 w-4 ml-2 text-green-500 flex-shrink-0" />
                      )}
                      {/* Error Indicator */}
                      {updateErrorUserId === user.id && (
                        <AlertCircle className="inline-block h-4 w-4 ml-2 text-red-500 flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role Display/Edit */}
                {editingUser === user.id ? (
                  <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                    <select
                      value={selectedRole || ''} // Ensure value is controlled
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="block w-full pl-3 pr-10 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                    >
                      <option value="" disabled>Select a role</option>
                      {Object.keys(ROLES).map((roleKey) => (
                        <option key={roleKey} value={roleKey}>
                          {roleKey} {/* Display the key (e.g., 'Admin', 'NETA Technician') */}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => handleSaveRole(user.id)}
                      disabled={!selectedRole}
                      className="px-2 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                      aria-label="Save Role"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="px-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-50"
                      aria-label="Cancel Edit"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) :
                  <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                    <div className="mr-2">
                        {/* Role Display Span */}
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                        ${user.user_metadata?.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : user.user_metadata?.role?.includes('Technician')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-dark-300 dark:text-gray-300'}
                      `}>
                        {user.user_metadata?.role || 'No Role'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(user.id, user.user_metadata?.role)}
                      className="px-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-50"
                      aria-label="Edit Role"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Placeholder for Delete User */}
                    {/* <Button 
                      size="sm" 
                      variant="ghost" 
                      className="px-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                      aria-label="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </div>
}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
