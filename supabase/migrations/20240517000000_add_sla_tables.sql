-- Create SLA definitions table
CREATE TABLE IF NOT EXISTS common.sla_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('response_time', 'resolution_time', 'uptime_percentage', 'custom')),
  target_value NUMERIC NOT NULL,
  time_period TEXT NOT NULL CHECK (time_period IN ('hours', 'days', 'weeks', 'months')),
  customer_id UUID REFERENCES common.customers(id) ON DELETE SET NULL,
  job_type TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create SLA tracking table
CREATE TABLE IF NOT EXISTS common.sla_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sla_id UUID NOT NULL REFERENCES common.sla_definitions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES common.jobs(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  target_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  current_value NUMERIC,
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('compliant', 'at_risk', 'violated')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create SLA violations table
CREATE TABLE IF NOT EXISTS common.sla_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sla_tracking_id UUID NOT NULL REFERENCES common.sla_tracking(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES common.jobs(id) ON DELETE CASCADE,
  violation_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sla_definitions_status ON common.sla_definitions(status);
CREATE INDEX IF NOT EXISTS idx_sla_definitions_customer ON common.sla_definitions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sla_definitions_job_type ON common.sla_definitions(job_type) WHERE job_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sla_tracking_job ON common.sla_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_status ON common.sla_tracking(compliance_status);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_target ON common.sla_tracking(target_time);
CREATE INDEX IF NOT EXISTS idx_sla_violations_job ON common.sla_violations(job_id);
CREATE INDEX IF NOT EXISTS idx_sla_violations_acknowledged ON common.sla_violations(acknowledged);

-- Create view for SLA performance summary
CREATE OR REPLACE VIEW common.sla_performance_summary AS
SELECT
  COUNT(*) AS total_slas,
  COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant,
  COUNT(*) FILTER (WHERE compliance_status = 'at_risk') AS at_risk,
  COUNT(*) FILTER (WHERE compliance_status = 'violated') AS violated,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE compliance_status = 'compliant'))::NUMERIC / COUNT(*) * 100, 2)
    ELSE 0
  END AS compliance_percentage
FROM
  common.sla_tracking;

-- Function to check and update SLA status
CREATE OR REPLACE FUNCTION common.check_sla_status()
RETURNS TRIGGER AS $$
DECLARE
  target_time TIMESTAMPTZ;
  time_remaining INTERVAL;
  total_duration INTERVAL;
  risk_threshold INTERVAL;
  new_status TEXT;
BEGIN
  -- Skip if already completed
  IF NEW.actual_time IS NOT NULL THEN
    RETURN NEW;
  END IF;

  target_time := NEW.target_time;
  time_remaining := target_time - NOW();
  
  -- If past target time, mark as violated
  IF time_remaining <= INTERVAL '0 seconds' THEN
    NEW.compliance_status := 'violated';
    
    -- Create a violation record if not already violated
    IF OLD.compliance_status <> 'violated' THEN
      INSERT INTO common.sla_violations (
        sla_tracking_id, 
        job_id, 
        violation_time, 
        acknowledged
      )
      VALUES (
        NEW.id, 
        NEW.job_id, 
        NOW(), 
        FALSE
      );
      
      -- Also create a notification
      INSERT INTO common.job_notifications (
        job_id,
        user_id,
        type,
        title,
        message,
        is_read,
        is_dismissed,
        created_at,
        updated_at
      )
      VALUES (
        NEW.job_id,
        NULL, -- System notification
        'sla_violation',
        'SLA Violation',
        'An SLA has been violated for job #' || NEW.job_id,
        FALSE,
        FALSE,
        NOW(),
        NOW()
      );
    END IF;
  ELSE
    -- Calculate risk threshold (25% of total duration)
    total_duration := target_time - NEW.start_time;
    risk_threshold := total_duration * 0.25;
    
    -- If within risk threshold, mark as at risk
    IF time_remaining <= risk_threshold THEN
      NEW.compliance_status := 'at_risk';
    ELSE
      NEW.compliance_status := 'compliant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update SLA status on updates
CREATE TRIGGER update_sla_status
BEFORE UPDATE ON common.sla_tracking
FOR EACH ROW
EXECUTE FUNCTION common.check_sla_status();

-- Create a function to calculate target time for new SLAs
CREATE OR REPLACE FUNCTION common.calculate_sla_target_time()
RETURNS TRIGGER AS $$
DECLARE
  sla_def RECORD;
BEGIN
  SELECT * INTO sla_def FROM common.sla_definitions WHERE id = NEW.sla_id;
  
  -- Skip if no SLA definition found
  IF sla_def IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate target time based on definition
  CASE sla_def.time_period
    WHEN 'hours' THEN
      NEW.target_time := NEW.start_time + (sla_def.target_value || ' hours')::INTERVAL;
    WHEN 'days' THEN
      NEW.target_time := NEW.start_time + (sla_def.target_value || ' days')::INTERVAL;
    WHEN 'weeks' THEN
      NEW.target_time := NEW.start_time + (sla_def.target_value * 7 || ' days')::INTERVAL;
    WHEN 'months' THEN
      NEW.target_time := NEW.start_time + (sla_def.target_value || ' months')::INTERVAL;
    ELSE
      NEW.target_time := NEW.start_time + (sla_def.target_value || ' hours')::INTERVAL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate target time for new SLA tracking records
CREATE TRIGGER calculate_sla_target
BEFORE INSERT ON common.sla_tracking
FOR EACH ROW
WHEN (NEW.target_time IS NULL)
EXECUTE FUNCTION common.calculate_sla_target_time();

-- Function to mark SLA as complete when job is closed
CREATE OR REPLACE FUNCTION common.complete_sla_on_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when job status changes to a closed status
  IF NEW.status IN ('completed', 'cancelled', 'closed') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'cancelled', 'closed')) THEN
    
    -- Update all incomplete SLA tracking records for this job
    UPDATE common.sla_tracking
    SET 
      actual_time = NOW(),
      compliance_status = CASE
        WHEN target_time < NOW() THEN 'violated'
        ELSE 'compliant'
      END,
      updated_at = NOW()
    WHERE 
      job_id = NEW.id AND 
      actual_time IS NULL;
      
    -- Create violation records for any newly violated SLAs
    INSERT INTO common.sla_violations (
      sla_tracking_id,
      job_id,
      violation_time,
      reason,
      acknowledged,
      created_at,
      updated_at
    )
    SELECT
      id,
      job_id,
      NOW(),
      'Job closed after SLA target time',
      FALSE,
      NOW(),
      NOW()
    FROM
      common.sla_tracking
    WHERE
      job_id = NEW.id AND
      actual_time = NOW() AND
      compliance_status = 'violated' AND
      -- Check that we don't already have a violation record
      NOT EXISTS (
        SELECT 1 FROM common.sla_violations WHERE sla_tracking_id = common.sla_tracking.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to complete SLAs when job status changes
CREATE TRIGGER complete_sla_on_job_status_change
AFTER UPDATE OF status ON common.jobs
FOR EACH ROW
EXECUTE FUNCTION common.complete_sla_on_job_status_change();

-- Row Level Security policies
ALTER TABLE common.sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.sla_violations ENABLE ROW LEVEL SECURITY;

-- Policies for SLA definitions
CREATE POLICY "Users can view all SLA definitions" 
  ON common.sla_definitions FOR SELECT 
  USING (true);
  
CREATE POLICY "Users can create SLA definitions" 
  ON common.sla_definitions FOR INSERT 
  WITH CHECK (true);
  
CREATE POLICY "Users can update SLA definitions" 
  ON common.sla_definitions FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete SLA definitions" 
  ON common.sla_definitions FOR DELETE 
  USING (true);

-- Policies for SLA tracking
CREATE POLICY "Users can view all SLA tracking records" 
  ON common.sla_tracking FOR SELECT 
  USING (true);
  
CREATE POLICY "Users can create SLA tracking records" 
  ON common.sla_tracking FOR INSERT 
  WITH CHECK (true);
  
CREATE POLICY "Users can update SLA tracking records" 
  ON common.sla_tracking FOR UPDATE 
  USING (true);

-- Policies for SLA violations
CREATE POLICY "Users can view all SLA violations" 
  ON common.sla_violations FOR SELECT 
  USING (true);
  
CREATE POLICY "Users can create SLA violations" 
  ON common.sla_violations FOR INSERT 
  WITH CHECK (true);
  
CREATE POLICY "Users can update SLA violations" 
  ON common.sla_violations FOR UPDATE 
  USING (true); 