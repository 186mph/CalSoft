# Cross-Schema Query Solution

## Problem Solved

When working with tables across multiple schemas (neta_ops, business, common), dashboard queries were failing with errors like:

```
Error loading dashboard: relation "public.neta_ops.jobs" does not exist
```

This was happening because Supabase was trying to find a table called "neta_ops.jobs" within the public schema, rather than looking for the "jobs" table in the "neta_ops" schema.

## Solution Approach

We've implemented a proper schema-based solution:

1. **Use the .schema() Method**: Supabase provides a .schema() method to specify which schema to use:
   ```typescript
   // Correct way to query from a non-public schema
   supabase.schema('neta_ops').from('jobs')
   ```

2. **Separate Queries for Related Data**: We handle cross-schema relationships by:
   - First, fetching the main records using the correct schema
   - Then, fetching related data from other schemas in separate queries
   - Combining the results in JavaScript

3. **Explicit Error Handling**: Added robust error handling for both stages of the data fetching process.

## Key Files

- `src/lib/directSchemaQueries.ts` - Helper functions using the .schema() method
- `src/app/NETA dashboard/page.tsx` - Dashboard updated to use .schema()
- `src/app/sales-dashboard/page.tsx` - Updated to use .schema()

## How It Works

### 1. Query Main Records with Correct Schema

```typescript
// Use .schema() to specify the schema
const { data: jobs } = await supabase
  .schema('neta_ops')  // Specify the schema first
  .from('jobs')        // Then the table within that schema
  .select('id, title, status, customer_id')
```

### 2. Fetch Related Data from Other Schemas

```typescript
// For each job, fetch its customer using the proper schema
const jobsWithCustomers = await Promise.all(jobs.map(async (job) => {
  const { data: customer } = await supabase
    .schema('common')    // Specify the schema for customers
    .from('customers')   // Table within common schema
    .select('id, name')
    .eq('id', job.customer_id)
    .maybeSingle();
    
  return {
    ...job,
    customer
  };
}));
```

This approach ensures that each query properly targets the correct schema and table, rather than trying to use schema-qualified table names which can be misinterpreted.

## Schema Arrangement

- `neta_ops` schema:
  - assets
  - job_assets
  - jobs
  - reports

- `business` schema:
  - estimates
  - opportunities

- `common` schema:
  - contacts
  - customers

## Example Helper Function

```typescript
async function queryJobs() {
  // 1. Get jobs from neta_ops schema
  const { data: jobs } = await supabase
    .schema('neta_ops')
    .from('jobs')
    .select('*');
  
  // 2. For each job, get its customer from common schema
  const jobsWithCustomers = await Promise.all(jobs.map(async (job) => {
    const { data: customer } = await supabase
      .schema('common')
      .from('customers')
      .select('*')
      .eq('id', job.customer_id)
      .maybeSingle();
      
    return { ...job, customer };
  }));
  
  return jobsWithCustomers;
}
```

## Troubleshooting

If you encounter schema-related errors:

1. Always use `.schema('schema_name')` before `.from('table_name')`
2. Never use dot notation like `'schema_name.table_name'` in the `from()` function
3. For relationships across schemas, use separate queries and combine in JavaScript
4. Check console logs for specific error messages that may indicate schema problems 