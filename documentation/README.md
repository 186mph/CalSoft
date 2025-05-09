# Database Schema Documentation

This directory contains comprehensive documentation for the database schema structure and relationships.

## Documentation Contents

### Schema Structure

- **schema_relationships.md**: Detailed documentation of the relationships between schemas, tables, and entities
- **schema_diagram.dbml**: Database diagram in DBML format (can be imported into dbdiagram.io)
- **schema_access_verification.sql**: SQL script to verify schema access and permissions

### Frontend Integration

- **update_frontend_guide.md**: Guide for updating frontend components to use the correct schema for equipment management

## Schema Overview

The database is organized into three main schemas:

1. **Common Schema**: Central data entities shared across the system
   - Customers
   - Contacts

2. **Business Schema**: Sales and opportunity management
   - Opportunities
   - Estimates

3. **Neta Ops Schema**: Operations and equipment management
   - Jobs
   - Assets
   - Equipment and related tables

## Equipment Management

Equipment management has been migrated to the `neta_ops` schema. The migration file `supabase/migrations/20250502_equipment_management_tables.sql` creates the following tables:

- `equipment`: Core equipment tracking
- `calibrations`: Calibration history and scheduling
- `procedures`: Testing and maintenance procedures
- `certificates`: Equipment certifications
- `quality_metrics`: Equipment performance metrics
- `equipment_assignments`: Equipment assignment tracking
- `maintenance_records`: Maintenance history
- `vehicles`: Specialized equipment (vehicles)

## Key Relationships

- Customers (common) are the central entity referenced by many tables across schemas
- Jobs (neta_ops) reference both customers (common) and opportunities (business)
- Equipment (neta_ops) can be linked to assets (neta_ops) and customers (common)
- There's a circular reference between opportunities and jobs (bidirectional relationship)

## Next Steps

1. Deploy the database migration for equipment management tables
2. Update frontend components to use the correct schema
3. Implement proper schema switching in the application
4. Set up monitoring and validation for cross-schema queries

## Usage Instructions

- Import `schema_diagram.dbml` into dbdiagram.io to view the database diagram
- Run `schema_access_verification.sql` against your database to verify permissions
- Follow `update_frontend_guide.md` to update frontend components 