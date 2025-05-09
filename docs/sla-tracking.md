# SLA Tracking System

This document provides an overview of the Service Level Agreement (SLA) tracking system implemented in the application.

## Overview

The SLA tracking system allows businesses to define, apply, and monitor service level agreements for jobs. The system provides real-time monitoring of SLA compliance, automatically detects violations, and sends notifications when SLAs are at risk or violated.

## Key Features

- **SLA Definitions**: Create and manage standard SLA templates with different priorities, metric types, and target times.
- **SLA Application**: Apply SLAs to specific jobs with automatic target time calculation based on SLA definitions.
- **Compliance Monitoring**: Real-time tracking of SLA compliance status (compliant, at-risk, violated).
- **Automatic Notifications**: System generates notifications when SLAs are violated.
- **Visual Indicators**: Color-coded status indicators and badges for easy visualization of SLA status.
- **Violation Management**: Track and acknowledge SLA violations.
- **Performance Metrics**: View SLA performance summaries and compliance percentages.

## Database Structure

The SLA tracking system uses three main tables in the `common` schema:

1. **sla_definitions**: Stores SLA templates with target values and constraints.
2. **sla_tracking**: Tracks individual SLA instances applied to jobs with actual and target times.
3. **sla_violations**: Records violation instances for reporting and acknowledgment.

### Data Model

#### SLA Definition
```typescript
interface SLADefinition {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'archived';
  metric_type: 'response_time' | 'resolution_time' | 'uptime_percentage' | 'custom';
  target_value: number;
  time_period: 'hours' | 'days' | 'weeks' | 'months';
  customer_id?: string;  // Optional: specific customer SLA
  job_type?: string;     // Optional: specific job type SLA
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

#### SLA Tracking
```typescript
interface SLATracking {
  id: string;
  sla_id: string;
  job_id: string;
  start_time: string;
  target_time: string;
  actual_time?: string;
  current_value?: number;
  compliance_status: 'compliant' | 'at_risk' | 'violated';
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  sla_definition?: SLADefinition;
}
```

#### SLA Violation
```typescript
interface SLAViolation {
  id: string;
  sla_tracking_id: string;
  job_id: string;
  violation_time: string;
  reason?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}
```

## Automation and Triggers

The system includes several database triggers and functions for automation:

1. **Automatic Target Time Calculation**: Automatically calculates target time when an SLA is applied to a job.
2. **SLA Status Updates**: Checks and updates SLA compliance status based on current time and target time.
3. **Violation Detection**: Automatically detects and records SLA violations.
4. **Job Completion**: Automatically completes SLAs when jobs are marked as completed, cancelled, or closed.

## User Interface

The SLA tracking system is integrated into the Job Details page as a new tab. The UI provides:

1. **Current SLA Status**: Shows active SLAs with their status and time remaining.
2. **SLA History**: Shows completed SLAs with their final status.
3. **Violation Management**: Allows users to view and acknowledge SLA violations.
4. **SLA Assignment**: Allows adding new SLAs to a job from predefined templates.

## Integration with Notification System

When an SLA is violated, the system automatically creates a notification in the job notifications system. These notifications appear in the notification tray with a destructive styling to highlight their importance.

## Sample SLAs

The system comes pre-configured with several sample SLA definitions:

1. **Standard Response Time**: 24-hour response time for general jobs (medium priority)
2. **Priority Response Time**: 8-hour response time for higher priority jobs (high priority)
3. **Critical Response Time**: 1-hour response time for critical situations (critical priority)
4. **Standard Resolution Time**: 5-day resolution time for general jobs (medium priority)
5. **Priority Resolution Time**: 2-day resolution time for higher priority jobs (high priority)

## Technical Implementation

- **Frontend**: React components in `src/components/jobs/SLAManagement.tsx`
- **Backend**: Service functions in `src/services/slaService.ts`
- **Database**: Migration script in `supabase/migrations/20240517000000_add_sla_tables.sql`
- **Database Setup**: Migration runner in `scripts/run_sla_migration.js`

## Using the SLA System

1. **View SLAs**: Navigate to a job's detail page and click on the "SLA Tracking" tab.
2. **Add SLA**: Click the "Add SLA" button and select from the available SLA templates.
3. **Monitor Status**: Active SLAs show their current status with color indicators (green for compliant, yellow for at-risk, red for violated).
4. **Acknowledge Violations**: Review SLA violations under the "Violations" tab and acknowledge them after review.
5. **Complete SLAs Manually**: Click "Complete" on an active SLA to mark it as completed before job closure.
6. **View Performance**: Use the status counts to monitor overall SLA performance.

## Extending the System

The SLA system can be extended in several ways:

1. **Custom SLA Templates**: Create new SLA templates for specific customer needs.
2. **Job Type-Specific SLAs**: Set up SLAs that apply automatically to specific job types.
3. **Customer-Specific SLAs**: Create SLAs tailored to particular customers.
4. **Additional Metrics**: Implement new metric types beyond response and resolution time.
5. **Reporting**: Add reports for SLA compliance over time or by customer. 