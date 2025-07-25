-- Migration for technician time-off requests table
-- This script will create the necessary table for managing time-off requests in the scheduling system

-- Create the technician time-off requests table
CREATE TABLE IF NOT EXISTS common.technician_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('neta', 'lab', 'scavenger')),
  division TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_technician_time_off_timestamp
BEFORE UPDATE ON common.technician_time_off
FOR EACH ROW EXECUTE FUNCTION common.update_timestamp();

-- Add RLS policies for security
ALTER TABLE common.technician_time_off ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time-off table
CREATE POLICY "Users can view their own time-off requests"
  ON common.technician_time_off
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time-off requests"
  ON common.technician_time_off
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time-off requests with pending status"
  ON common.technician_time_off
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins and Schedulers have full access to time-off requests"
  ON common.technician_time_off
  USING (
    (auth.jwt() ->> 'role')::text = 'Admin' OR 
    (auth.jwt() ->> 'role')::text LIKE '%Scheduler%'
  );

-- Index for faster lookups
CREATE INDEX idx_technician_time_off_user_id ON common.technician_time_off(user_id);
CREATE INDEX idx_technician_time_off_status ON common.technician_time_off(status);
CREATE INDEX idx_technician_time_off_dates ON common.technician_time_off(start_date, end_date); 