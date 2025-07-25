-- Sample data for testing role management

-- Insert a custom role (ViewOnly)
INSERT INTO common.custom_roles (name, config, created_by)
VALUES (
  'ViewOnly',
  '{
    "portals": ["sales", "neta", "lab", "hr", "office", "engineering", "scavenger"],
    "canManageUsers": false,
    "canManageContent": false,
    "canViewAllData": true,
    "permissions": [
      {"resource": "users", "action": "view", "scope": "all"},
      {"resource": "customers", "action": "view", "scope": "all"},
      {"resource": "jobs", "action": "view", "scope": "all"},
      {"resource": "opportunities", "action": "view", "scope": "all"},
      {"resource": "reports", "action": "view", "scope": "all"},
      {"resource": "documents", "action": "view", "scope": "all"}
    ]
  }',
  -- Use NULL for created_by instead of a placeholder UUID
  NULL
)
ON CONFLICT (name) DO UPDATE
SET config = EXCLUDED.config;

-- Insert a custom role (Reporter)
INSERT INTO common.custom_roles (name, config, created_by)
VALUES (
  'Reporter',
  '{
    "portals": ["sales", "neta", "lab"],
    "canManageUsers": false,
    "canManageContent": false,
    "canViewAllData": false,
    "permissions": [
      {"resource": "customers", "action": "view", "scope": "all"},
      {"resource": "reports", "action": "view", "scope": "all"},
      {"resource": "reports", "action": "create", "scope": "own"},
      {"resource": "reports", "action": "edit", "scope": "own"}
    ],
    "parentRole": "ViewOnly"
  }',
  -- Use NULL for created_by
  NULL
)
ON CONFLICT (name) DO UPDATE
SET config = EXCLUDED.config;

-- Insert sample audit logs
INSERT INTO common.role_audit_logs 
  (role_name, action, previous_config, new_config, user_id, ip_address, user_agent, created_at)
VALUES
  (
    'ViewOnly',
    'create',
    NULL,
    '{
      "portals": ["sales", "neta", "lab"],
      "canManageUsers": false,
      "canManageContent": false,
      "canViewAllData": true,
      "permissions": [
        {"resource": "users", "action": "view", "scope": "all"},
        {"resource": "customers", "action": "view", "scope": "all"}
      ]
    }',
    NULL,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    NOW() - INTERVAL '2 days'
  ),
  (
    'ViewOnly',
    'update',
    '{
      "portals": ["sales", "neta", "lab"],
      "canManageUsers": false,
      "canManageContent": false,
      "canViewAllData": true,
      "permissions": [
        {"resource": "users", "action": "view", "scope": "all"},
        {"resource": "customers", "action": "view", "scope": "all"}
      ]
    }',
    '{
      "portals": ["sales", "neta", "lab", "hr", "office", "engineering", "scavenger"],
      "canManageUsers": false,
      "canManageContent": false,
      "canViewAllData": true,
      "permissions": [
        {"resource": "users", "action": "view", "scope": "all"},
        {"resource": "customers", "action": "view", "scope": "all"},
        {"resource": "jobs", "action": "view", "scope": "all"},
        {"resource": "opportunities", "action": "view", "scope": "all"},
        {"resource": "reports", "action": "view", "scope": "all"},
        {"resource": "documents", "action": "view", "scope": "all"}
      ]
    }',
    NULL,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    NOW() - INTERVAL '1 day'
  ),
  (
    'Reporter',
    'create',
    NULL,
    '{
      "portals": ["sales", "neta", "lab"],
      "canManageUsers": false,
      "canManageContent": false,
      "canViewAllData": false,
      "permissions": [
        {"resource": "customers", "action": "view", "scope": "all"},
        {"resource": "reports", "action": "view", "scope": "all"},
        {"resource": "reports", "action": "create", "scope": "own"},
        {"resource": "reports", "action": "edit", "scope": "own"}
      ],
      "parentRole": "ViewOnly"
    }',
    NULL,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    NOW() - INTERVAL '12 hours'
  ); 