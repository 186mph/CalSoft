# Database Schema Relationships

This document outlines the structure and relationships between the schemas in the database. The database is organized into three main schemas: common, business, and neta_ops.

## Schema Overview

### Common Schema
The common schema contains shared data entities that are referenced by multiple other schemas. It serves as the central repository for customer information.

### Business Schema
The business schema focuses on sales-related data, including opportunities and estimates.

### Neta Ops Schema
The neta_ops schema handles operational data, including jobs, assets, equipment, and related operational information.

## Key Entities and Relationships

### 1. Common Schema Entities

#### Customers
- **Table**: `common.customers`
- **Primary Entity**: Central entity referenced by many other tables
- **Relationships**:
  - One-to-many with `common.contacts`
  - One-to-many with `business.opportunities`
  - One-to-many with `neta_ops.jobs`
  - One-to-many with `neta_ops.assets`
  - One-to-many with `neta_ops.equipment`

#### Contacts
- **Table**: `common.contacts`
- **Relationships**:
  - Many-to-one with `common.customers`

### 2. Business Schema Entities

#### Opportunities
- **Table**: `business.opportunities`
- **Relationships**:
  - Many-to-one with `common.customers`
  - One-to-many with `business.estimates`
  - Bidirectional with `neta_ops.jobs` (opportunity references job and job references opportunity)

#### Estimates
- **Table**: `business.estimates`
- **Relationships**:
  - Many-to-one with `business.opportunities`

### 3. Neta Ops Schema Entities

#### Jobs
- **Table**: `neta_ops.jobs`
- **Relationships**:
  - Many-to-one with `common.customers`
  - Many-to-one with `business.opportunities` (bidirectional)
  - One-to-many with `neta_ops.job_assets`
  - One-to-many with `neta_ops.reports`
  - One-to-many with `neta_ops.equipment_assignments`

#### Assets
- **Table**: `neta_ops.assets`
- **Relationships**:
  - Many-to-one with `common.customers`
  - One-to-many with `neta_ops.job_assets`
  - One-to-many with `neta_ops.equipment` (optional link)

#### Job Assets
- **Table**: `neta_ops.job_assets`
- **Relationships**:
  - Many-to-one with `neta_ops.jobs`
  - Many-to-one with `neta_ops.assets`

#### Reports
- **Table**: `neta_ops.reports`
- **Relationships**:
  - Many-to-one with `neta_ops.jobs`

### 4. Equipment Management Entities (Neta Ops Schema)

#### Equipment
- **Table**: `neta_ops.equipment`
- **Key Entity**: Central entity for equipment management
- **Relationships**:
  - Many-to-one with `common.customers` (optional)
  - Many-to-one with `neta_ops.assets` (optional)
  - One-to-many with `neta_ops.calibrations`
  - One-to-many with `neta_ops.certificates`
  - One-to-many with `neta_ops.quality_metrics`
  - One-to-many with `neta_ops.equipment_assignments`
  - One-to-many with `neta_ops.maintenance_records`
  - One-to-one with `neta_ops.vehicles` (specialized equipment)

#### Calibrations
- **Table**: `neta_ops.calibrations`
- **Relationships**:
  - Many-to-one with `neta_ops.equipment`
  - One-to-many with `neta_ops.certificates`

#### Procedures
- **Table**: `neta_ops.procedures`
- **Standalone Table**: Referenced but not directly linked via foreign keys

#### Certificates
- **Table**: `neta_ops.certificates`
- **Relationships**:
  - Many-to-one with `neta_ops.equipment`
  - Many-to-one with `neta_ops.calibrations` (optional)

#### Quality Metrics
- **Table**: `neta_ops.quality_metrics`
- **Relationships**:
  - Many-to-one with `neta_ops.equipment`

#### Equipment Assignments
- **Table**: `neta_ops.equipment_assignments`
- **Relationships**:
  - Many-to-one with `neta_ops.equipment`
  - Many-to-one with `neta_ops.jobs` (optional)

#### Maintenance Records
- **Table**: `neta_ops.maintenance_records`
- **Relationships**:
  - Many-to-one with `neta_ops.equipment`

#### Vehicles
- **Table**: `neta_ops.vehicles`
- **Relationships**:
  - One-to-one with `neta_ops.equipment` (specialized equipment)

## Cross-Schema Query Patterns

The database structure requires several common cross-schema query patterns:

### 1. Job Information with Customer Details
```sql
SELECT j.*, c.name as customer_name, c.company_name
FROM neta_ops.jobs j
JOIN common.customers c ON j.customer_id = c.id
WHERE j.id = '[job_id]';
```

### 2. Opportunity Information with Customer Details
```sql
SELECT o.*, c.name as customer_name, c.company_name
FROM business.opportunities o
JOIN common.customers c ON o.customer_id = c.id
WHERE o.id = '[opportunity_id]';
```

### 3. Job with Related Opportunity
```sql
SELECT j.*, o.name as opportunity_name, o.quote_number, o.value
FROM neta_ops.jobs j
LEFT JOIN business.opportunities o ON j.opportunity_id = o.id
WHERE j.id = '[job_id]';
```

### 4. Equipment with Customer and Asset Information
```sql
SELECT e.*, c.name as customer_name, a.name as asset_name
FROM neta_ops.equipment e
LEFT JOIN common.customers c ON e.customer_id = c.id
LEFT JOIN neta_ops.assets a ON e.asset_id = a.id
WHERE e.id = '[equipment_id]';
```

### 5. Equipment with Calibration History
```sql
SELECT e.*, cal.*
FROM neta_ops.equipment e
LEFT JOIN neta_ops.calibrations cal ON e.id = cal.equipment_id
WHERE e.id = '[equipment_id]'
ORDER BY cal.calibration_date DESC;
```

## RLS Policies

Row Level Security (RLS) policies have been implemented for all tables to restrict access based on user authentication and roles:

### Common Pattern
All tables have at minimum:
```sql
-- Allow authenticated users to view data
CREATE POLICY "Allow authenticated users to view [table]"
ON [schema].[table] FOR SELECT
TO authenticated
USING (true);
```

Role-specific policies typically follow the pattern:
```sql
-- Allow specific roles to insert/update/delete
CREATE POLICY "Allow [role] to [action] [table]"
ON [schema].[table] FOR [action]
TO authenticated
USING ([role_check_expression])
WITH CHECK ([role_check_expression]);
```

## Schema-Specific Access Requirements

### Common Schema
- Read access: All authenticated users
- Write access: Admins, Customer Management roles

### Business Schema
- Read access: All authenticated users
- Write access: Admins, Sales roles, Manager roles

### Neta Ops Schema
- Read access: All authenticated users
- Write access: Admins, Technician roles, Manager roles
- Equipment-specific access: Equipment technicians, Calibration technicians

## Cross-Schema Functions & Triggers

### 1. Job Creation from Opportunity
When a job is created from an opportunity, a bidirectional relationship is established:
- The job references the opportunity via `opportunity_id`
- The opportunity is updated to reference the job via `job_id`

### 2. Equipment Assignment
When equipment is assigned to a job:
- An entry is created in `equipment_assignments`
- The equipment status is updated to 'assigned'

### 3. Calibration Management
When a calibration is recorded:
- The `last_maintenance_date` on the equipment is updated
- The `next_maintenance_date` is calculated based on calibration frequency

## Data Integrity Constraints

### Foreign Key Constraints
All relationships between tables are enforced using foreign key constraints with appropriate actions:
- `ON DELETE CASCADE`: For child records that should be deleted when the parent is deleted
- `ON DELETE SET NULL`: For references that should be nullified when the referenced record is deleted

### Check Constraints
Several tables include check constraints to enforce valid values:
- Equipment status values
- Calibration result values
- Certificate status values
- Procedure status values

## Circular References

A circular reference exists between `business.opportunities` and `neta_ops.jobs`:
- `opportunities.job_id` references `jobs.id`
- `jobs.opportunity_id` references `opportunities.id`

This circular reference is intentional and represents a bidirectional relationship between opportunities and jobs. Special application logic is required to manage this relationship correctly to avoid circular dependency issues.

## Conclusion

The database schema is designed to support a comprehensive business management system with clear separation of concerns between common data, business operations, and operational activities. The schema structure allows for efficient cross-schema queries while maintaining data integrity and proper access control through RLS policies. 