-- Migration to add encryption support for sensitive data
-- This migration adds necessary tables, functions, and triggers for handling encrypted fields

-- First, make sure common schema exists
CREATE SCHEMA IF NOT EXISTS common;

-- Grant usage on the common schema to authenticated users and anon users
GRANT USAGE ON SCHEMA common TO authenticated, anon, service_role;

-- Grant usage on the existing schemas
GRANT USAGE ON SCHEMA neta_ops TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA business TO authenticated, anon, service_role;

-- Create system_config table if it doesn't exist (for storing encryption keys)
CREATE TABLE IF NOT EXISTS common.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions on the system_config table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE common.system_config TO authenticated;
GRANT SELECT ON TABLE common.system_config TO anon;

-- Add JSONB index for faster lookups on system_config values
CREATE INDEX IF NOT EXISTS idx_system_config_key ON common.system_config USING btree (key);

-- Create a function to automatically update timestamps
CREATE OR REPLACE FUNCTION common.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for system_config timestamp updates
DROP TRIGGER IF EXISTS trigger_system_config_timestamp ON common.system_config;
CREATE TRIGGER trigger_system_config_timestamp
BEFORE UPDATE ON common.system_config
FOR EACH ROW
EXECUTE FUNCTION common.update_timestamp();

-- Enable RLS on system_config table
ALTER TABLE common.system_config ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view encryption keys
CREATE POLICY "Only admins can view encryption settings" 
ON common.system_config 
FOR SELECT 
USING (
  auth.jwt() ->> 'role' = 'Admin' OR
  (key != 'encryptionSettings' AND auth.jwt() ->> 'role' IS NOT NULL)
);

-- Only allow admins to modify encryption settings
CREATE POLICY "Only admins can modify encryption settings" 
ON common.system_config 
FOR ALL
USING (auth.jwt() ->> 'role' = 'Admin')
WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- Create encryption_audit_logs table for tracking encryption events
CREATE TABLE IF NOT EXISTS common.encryption_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'key_rotation', 'field_encryption', etc.
  table_name TEXT,
  record_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions on the encryption_audit_logs table
GRANT SELECT, INSERT ON TABLE common.encryption_audit_logs TO authenticated;

-- Enable RLS on encryption_audit_logs
ALTER TABLE common.encryption_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view encryption audit logs
CREATE POLICY "Only admins can view encryption logs" 
ON common.encryption_audit_logs 
FOR SELECT
USING (auth.jwt() ->> 'role' = 'Admin');

-- Create a function to log encryption events
CREATE OR REPLACE FUNCTION common.log_encryption_event(
  p_event_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = common, neta_ops, business
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  -- Get the current user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Insert the log entry
  INSERT INTO common.encryption_audit_logs
    (event_type, table_name, record_id, user_id, metadata)
  VALUES
    (p_event_type, p_table_name, p_record_id, v_user_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION common.log_encryption_event TO authenticated, anon, service_role;

-- Create helper function to check if a value is encrypted
CREATE OR REPLACE FUNCTION common.is_encrypted(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = common, neta_ops, business
AS $$
BEGIN
  -- Check if string starts with the encryption prefix
  RETURN p_value LIKE 'ENC:%';
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION common.is_encrypted TO authenticated, anon, service_role;

-- Add sensitive data tracking for HR records
ALTER TABLE IF EXISTS common.employee_data
  ADD COLUMN IF NOT EXISTS contains_sensitive_data BOOLEAN DEFAULT FALSE;

-- Add sensitive data tracking for customer records
ALTER TABLE IF EXISTS common.customers
  ADD COLUMN IF NOT EXISTS contains_sensitive_data BOOLEAN DEFAULT FALSE;

-- Add a comment to document this migration
COMMENT ON FUNCTION common.log_encryption_event IS 'Logs encryption-related events for audit purposes.';
COMMENT ON FUNCTION common.is_encrypted IS 'Checks if a value appears to be encrypted with the application encryption scheme.';
COMMENT ON TABLE common.system_config IS 'Stores system-wide configuration settings, including encryption keys.';
COMMENT ON TABLE common.encryption_audit_logs IS 'Tracks all encryption-related events for security audit purposes.';

-- Create a view for administrators to check encryption status
CREATE OR REPLACE VIEW common.encryption_status AS
SELECT
  'encryptionSettings' AS config_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM common.system_config WHERE key = 'encryptionSettings') 
    THEN 'Active' 
    ELSE 'Not Configured' 
  END AS status,
  (SELECT value->>'created' FROM common.system_config WHERE key = 'encryptionSettings') AS key_created_date,
  (SELECT value->>'rotationIntervalDays' FROM common.system_config WHERE key = 'encryptionSettings')::INTEGER AS rotation_interval,
  (SELECT jsonb_array_length(value->'previousKeys') FROM common.system_config WHERE key = 'encryptionSettings') AS previous_keys_count;

-- Allow authenticated users to access the view
GRANT SELECT ON common.encryption_status TO authenticated, anon, service_role;

-- Create a special function for rotating encryption keys (called by the application)
CREATE OR REPLACE FUNCTION common.system_rotate_key()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = common, neta_ops, business
AS $$
BEGIN
  -- Log the rotation event
  PERFORM common.log_encryption_event('key_rotation');
  
  -- The actual key rotation is handled in the application
  -- This function just provides a way to trigger and log it from SQL
  
  RETURN TRUE;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION common.system_rotate_key TO authenticated, anon, service_role; 