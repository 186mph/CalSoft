# Job Notifications System

## Overview

The Job Notifications System provides real-time notifications for job-related events. It tracks status changes, resource assignments, deadline alerts, cost updates, SLA violations, and other job-related notifications.

## Features

- Real-time job status change notifications
- Notification preferences management
- Notification filtering by type
- Unread notification counter
- Notification tray with mark-as-read functionality
- Individual and bulk dismissal options
- Database persistence with proper indexing
- Row-level security policies

## Components

### JobNotifications Component

- `JobNotifications.tsx`: UI component for displaying notifications
  - Can be used in any page with optional jobId filtering
  - Supports tray (dropdown) or dialog display modes
  - Includes notification preferences management

### Notification Service

- `notificationService.ts`: Service for handling notification operations
  - CRUD operations for notifications
  - Preference management
  - Toast display functionality

### Database Schema

- `20250329_add_job_notifications.sql`: Migration file that creates:
  - `job_notifications` table
  - `user_preferences` table (or adds to existing)
  - Indexes and RLS policies
  - Automatic triggers for status changes

## Usage

### Basic Usage

```tsx
// To show all notifications
<JobNotifications />

// To show notifications for a specific job
<JobNotifications jobId="some-job-id" />

// To show as a dialog instead of a dropdown
<JobNotifications showTray={false} />
```

### Integration Points

- **JobDetail.tsx**: Shows job-specific notifications
- **JobList.tsx**: Shows all job notifications

### Notification Types

- `status_change`: Job status updates
- `deadline_approaching`: Deadline reminders
- `resource_assigned`: Resource allocation notifications
- `cost_update`: Budget and cost changes
- `sla_violation`: Service level agreement violations
- `new_job`: New job notifications
- `other`: Miscellaneous notifications

## Database Structure

### job_notifications Table

| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| id          | UUID      | Primary key                            |
| job_id      | UUID      | Foreign key to jobs.id                 |
| user_id     | UUID      | Optional - null for global notifications |
| title       | TEXT      | Notification title                     |
| message     | TEXT      | Notification message content           |
| type        | TEXT      | Type of notification                   |
| is_read     | BOOLEAN   | Whether it's been read                 |
| is_dismissed| BOOLEAN   | Whether it's been dismissed            |
| metadata    | JSONB     | Additional structured data             |
| created_at  | TIMESTAMP | Creation timestamp                     |
| updated_at  | TIMESTAMP | Last updated timestamp                 |

### user_preferences Table

User-specific notification preferences stored as JSONB with:

```json
{
  "enableNotifications": true,
  "emailNotifications": false,
  "notificationTypes": {
    "status_change": true,
    "deadline_approaching": true,
    "resource_assigned": true,
    "cost_update": true, 
    "sla_violation": true,
    "new_job": true
  }
}
```

## Automatic Notification Generation

The following events automatically generate notifications:

- Job status changes via database trigger
- (Future) Deadline approaching via scheduled function
- (Future) Resource assignments
- (Future) Cost updates

## Migration

Run the migration script to set up the database structure:

```bash
node scripts/run_job_notification_migration.js
``` 