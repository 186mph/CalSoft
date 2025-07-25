-- Make circuit_breakers field optional in panelboard_reports table
ALTER TABLE panelboard_reports ALTER COLUMN circuit_breakers DROP NOT NULL;

-- Set default value for circuit_breakers to empty array
ALTER TABLE panelboard_reports ALTER COLUMN circuit_breakers SET DEFAULT '[]'::jsonb; 