# Permission System Documentation

## Overview

The permission system provides granular access control throughout the application with a flexible and secure architecture. It combines role-based access control (RBAC) with attribute-based access control (ABAC) features to create a comprehensive security model.

## Core Components

### Permission Service (`src/services/permissionService.ts`)

The central service that handles permission checks, grants, and revocations:

- `checkPermission(userId, resource, action, context)`: Verifies if a user has permission to perform an action on a resource
- `grantUserPermission(userId, permission)`: Assigns a specific permission to a user
- `revokeUserPermission(userId, permissionId)`: Removes a specific permission from a user
- `getUserPermissions(userId)`: Retrieves all permissions for a user (both role-based and direct)

### Audit Service (`src/services/auditService.ts`)

Provides comprehensive logging of all permission-related activities:

- `logPermissionAccess(userId, resource, action, granted, context)`: Records permission checks
- `logRoleChange(userId, subjectId, oldRole, newRole, reason)`: Records role changes
- `hasPermissionWithLog(userId, resource, action, context)`: Combines permission check with logging

### Role Management (`src/lib/roles.ts`)

Manages role assignments and hierarchies:

- `assignRole(userId, role)`: Assigns a role to a user
- `revokeRole(userId, role)`: Removes a role from a user
- `hasRole(userId, role)`: Checks if a user has a specific role
- `getUserRoles(userId)`: Retrieves all roles for a user

## Database Schema

### Tables

- `common.roles`: Stores role definitions
- `common.user_roles`: Maps users to roles
- `common.permissions`: Defines permissions associated with roles
- `common.user_permissions`: Stores direct user permissions
- `common.permission_access_logs`: Audit trail of permission checks
- `common.role_change_logs`: Audit trail of role changes

## User Interfaces

### Permission Management (`src/components/admin/PermissionManagement.tsx`)

Administrative interface for managing user permissions:
- View all users and their permissions
- Grant new permissions to users
- Revoke existing permissions
- Set expiration dates for temporary permissions
- Filter users by email or name

### Role Management (`src/components/admin/RoleManagement.tsx`)

Administrative interface for managing user roles:
- Assign roles to users
- Revoke roles from users
- View role hierarchies
- View permissions associated with each role

## Usage Examples

### Basic Permission Check

```typescript
import { checkPermission } from '@/services/permissionService';

// In a component or API route
const canViewDashboard = await checkPermission(
  user.id,
  'dashboard',
  'view',
  { orgId: currentOrg.id }
);

if (canViewDashboard) {
  // Show dashboard
} else {
  // Show access denied
}
```

### Advanced Permission with Conditions

```typescript
// Grant a permission with conditions
await grantUserPermission(userId, {
  resource: 'project',
  action: 'edit',
  scope: 'organization',
  conditions: {
    operator: 'AND',
    conditions: [
      { field: 'project.ownerId', operator: 'equals', value: '${user.id}' },
      { field: 'project.status', operator: 'not-equals', value: 'archived' }
    ]
  },
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});
```

## Best Practices

1. **Always use the permission service**: Avoid direct database queries for permission checks
2. **Use context objects**: Pass relevant context data to permission checks
3. **Implement least privilege**: Grant minimal permissions needed for each role/user
4. **Set expirations for temporary access**: Use the `valid_until` field for temporary permissions
5. **Log important permission changes**: Use the audit service for significant permission changes

## Extending the System

### Adding New Resources

1. Update the TypeScript types in `src/types/permissions.ts`
2. Add appropriate database entries for role-based permissions
3. Update UI components to include the new resource

### Adding New Actions

1. Update the TypeScript types in `src/types/permissions.ts`
2. Add appropriate database entries for role-based permissions
3. Update UI components to include the new action

## Troubleshooting

### Common Issues

1. **Permission denied unexpectedly**: Check if conditions are evaluating as expected
2. **Missing permissions**: Verify role assignments and direct permissions
3. **Permission not applying**: Check for expired permissions (`valid_until` date)

### Debugging

Use the audit logs to trace permission checks:

```sql
SELECT * FROM common.permission_access_logs 
WHERE user_id = '[user_id]' 
AND resource = '[resource]'
AND action = '[action]'
ORDER BY created_at DESC
LIMIT 10;
``` 