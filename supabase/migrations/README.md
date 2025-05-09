# Database Migrations

This directory contains SQL migration files for the Supabase database. These files should be applied in order to set up all the required tables, views, and relationships.

## Running the Migrations

### Option 1: Using Supabase CLI (Recommended)

If you have the Supabase CLI installed, you can run:

```bash
supabase db reset
```

This will apply all migrations in sequence.

### Option 2: Using the Supabase Dashboard

1. Login to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open each migration file in order (by date prefix)
4. Execute the SQL scripts one by one

## Migration Files

- `20250325_fix_jobs_table.sql` - Updates to the jobs table structure
- `20250325_fix_opportunities_table.sql` - Updates to the opportunities table structure
- `20250501_scheduling_tables.sql` - Creates all required tables for the technician scheduling system

## Scheduling Tables Schema

The scheduling system requires the following tables and views:

1. `common.technician_availability` - Regular weekly availability slots for technicians
2. `common.technician_exceptions` - Exceptions to regular availability (time off, special hours)
3. `common.technician_skills` - Skills and certifications for technicians
4. `common.job_skill_requirements` - Required skills for specific jobs
5. `common.technician_assignments` - Assignments of technicians to jobs
6. `common.available_technicians` - VIEW that joins users with their availability

## Troubleshooting

If you encounter errors related to missing database objects while using the application:

1. Check the console for specific error messages
2. Verify that all migrations have been applied
3. Check that the schema names match what's defined in `src/lib/schema.ts`
4. Ensure that foreign key relationships are valid (e.g., referenced tables exist)

The application has fallback mechanisms for some missing database objects, but for full functionality, all schema objects should be properly created. 