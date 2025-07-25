# Schema Migration Guide

## Overview

This project has moved tables from the `public` schema to more organized schemas:

- `neta_ops` - Operations-related tables
  - `assets`
  - `job_assets`
  - `jobs`
  - `reports`

- `business` - Business and sales tables
  - `estimates`
  - `opportunities`

- `common` - Common entity tables
  - `contacts`
  - `customers`

## Implementation Details

### Database Changes

The database migration has been implemented in the file:
`supabase/migrations/20250330_create_schemas_and_move_tables.sql`

This migration creates the schemas and moves tables from `public` to the new schemas.

### Code Changes

The application code has been updated to use the new schema structure without requiring code modifications throughout the codebase. This was done through:

1. Central schema mapping definitions in `src/lib/schema.ts`
2. Wrapper functions in `src/lib/supabaseHelpers.ts`
3. Updated Supabase client in `src/lib/supabase.ts`

The approach ensures that:
- All references to tables are automatically routed to the correct schema
- No changes were needed throughout the codebase
- Future references to tables will use the appropriate schema

## How It Works

When you call `supabase.from('tableName')`, the wrapper automatically converts this to use the correct schema-qualified name (e.g., `neta_ops.assets`).

Example:
```typescript
// Before: referenced 'assets' in public schema
const { data } = await supabase.from('assets').select('*')

// After: automatically references 'neta_ops.assets'
// No code change required
const { data } = await supabase.from('assets').select('*')
```

## Adding New Tables

When adding new tables, follow this pattern:

1. Add the table name to the schema mapping in `src/lib/schema.ts`
2. Create the table in the appropriate schema in your migration files

## Troubleshooting

If you encounter issues:

1. Check that the table is correctly mapped in `src/lib/schema.ts`
2. Verify the table has been moved to the correct schema in the database
3. Ensure RLS policies have been recreated for the tables in their new schemas
4. Confirm permissions are set correctly for the new schemas

### Fixing Foreign Key Relationships

If you encounter errors like "Schema cache issue: Could not find a relationship between 'neta_ops.jobs' and 'customer_id'", you need to fix cross-schema foreign key relationships. 

The migration to different schemas requires updating foreign key constraints to include the schema qualification. We've provided a SQL script to fix this:

1. Run the `fix_schema_relationships.sql` script on your database:
   - In Supabase Studio: Go to SQL Editor and paste the contents of the file
   - Via command line: `psql -U postgres -f fix_schema_relationships.sql`

2. This script:
   - Drops existing foreign key constraints
   - Recreates them with proper schema-qualified references
   - Refreshes the Supabase schema cache

The script addresses common relationship issues between:
- `neta_ops.jobs` and `common.customers`
- `neta_ops.jobs` and `business.opportunities`
- `neta_ops.assets` and `common.customers`
- Other cross-schema relationships 