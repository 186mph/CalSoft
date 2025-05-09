# Frontend Component Update Guide for Equipment Management

This guide provides instructions for updating frontend components to use the correct schema (`neta_ops`) for equipment management.

## Overview

The equipment management tables have been moved to the `neta_ops` schema. All frontend components that interact with equipment data must be updated to specify this schema in their database queries.

## Common Patterns to Update

### 1. Update Import Statements

```typescript
// Before
import { supabase } from '@/lib/supabase';

// After
import { supabase } from '@/lib/supabase';
// Make sure supabaseHelpers.ts is imported if using the wrapped client
import { schemaSelector } from '@/lib/supabaseHelpers';
```

### 2. Update Query Patterns

#### Basic Queries

```typescript
// Before
const { data, error } = await supabase
  .from('equipment')
  .select('*');

// After
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .select('*');
```

#### Insert Operations

```typescript
// Before
const { data, error } = await supabase
  .from('equipment')
  .insert([{ name: 'Test Equipment' }]);

// After
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .insert([{ name: 'Test Equipment' }]);
```

#### Update Operations

```typescript
// Before
const { data, error } = await supabase
  .from('equipment')
  .update({ status: 'maintenance' })
  .eq('id', equipmentId);

// After
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .update({ status: 'maintenance' })
  .eq('id', equipmentId);
```

#### Delete Operations

```typescript
// Before
const { data, error } = await supabase
  .from('equipment')
  .delete()
  .eq('id', equipmentId);

// After
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .delete()
  .eq('id', equipmentId);
```

### 3. Update Cross-Schema Queries

For queries that join tables across different schemas:

```typescript
// Before (assuming equipment was in a different schema before)
const { data, error } = await supabase
  .from('equipment')
  .select(`
    *,
    customer:customers(name, company_name)
  `)
  .eq('id', equipmentId);

// After
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .select(`
    *,
    customer:common.customers(name, company_name)
  `)
  .eq('id', equipmentId);
```

For complex joins:

```typescript
// For fully qualified foreign table references
const { data, error } = await supabase
  .schema('neta_ops')
  .from('equipment')
  .select(`
    *,
    calibrations!equipment_id(*),
    customer:common.customers(name),
    asset:neta_ops.assets(name)
  `)
  .eq('id', equipmentId);
```

### 4. Schema Selection Helper

For components that need to switch between schemas, consider using a schema selection utility:

```typescript
// supabaseHelpers.ts (ensure this exists or create it)
export const schemaSelector = {
  common: (client = supabase) => client.schema('common'),
  neta_ops: (client = supabase) => client.schema('neta_ops'),
  business: (client = supabase) => client.schema('business'),
};

// Usage example
const { data, error } = await schemaSelector.neta_ops()
  .from('equipment')
  .select('*');
```

## Files to Update

The following components need to be updated to use the correct schema:

1. `src/components/equipment/EquipmentManagement.tsx`
2. `src/components/equipment/EquipmentForm.tsx`
3. `src/components/scheduling/EquipmentTracking.tsx`
4. `src/lib/services/equipmentService.ts` (if exists)
5. Any other components that interact with equipment data

## Testing the Changes

After updating the components, perform the following tests:

1. **Read Operations**: Verify that equipment lists and details load correctly
2. **Create Operations**: Test creating new equipment records
3. **Update Operations**: Test updating existing equipment
4. **Delete Operations**: Test deleting equipment (if applicable)
5. **Cross-Schema Operations**: Test operations that span multiple schemas

## Error Handling

If you encounter the error `The schema must be one of the following: common, neta_ops, business`, it means:

1. You forgot to specify the schema, or
2. You specified an incorrect schema name

In either case, update the query to use the correct schema:

```typescript
await supabase.schema('neta_ops').from('equipment')
```

## Schema Permissions

If you encounter permission errors, check that:

1. The `neta_ops` schema has been granted to the appropriate roles
2. RLS policies are correctly set up for the equipment tables
3. You're using the correct authentication credentials

## Additional Resources

- Refer to the database migration file `supabase/migrations/20250502_equipment_management_tables.sql` for the full schema definition
- See `documentation/schema_relationships.md` for details on schema relationships
- Check `documentation/schema_access_verification.sql` for scripts to verify schema access 