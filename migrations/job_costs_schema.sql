-- Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION neta_ops.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create job_costs table
CREATE TABLE IF NOT EXISTS neta_ops.job_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    cost_type TEXT NOT NULL CHECK (cost_type IN ('labor', 'material', 'equipment', 'overhead')),
    date DATE NOT NULL,
    quantity DECIMAL(12, 2),
    unit_price DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update timestamp trigger for job_costs
DROP TRIGGER IF EXISTS update_job_costs_timestamp ON neta_ops.job_costs;
CREATE TRIGGER update_job_costs_timestamp
BEFORE UPDATE ON neta_ops.job_costs
FOR EACH ROW
EXECUTE FUNCTION neta_ops.update_timestamp();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_costs_job_id ON neta_ops.job_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_cost_type ON neta_ops.job_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_job_costs_date ON neta_ops.job_costs(date);

-- Enable row level security
ALTER TABLE neta_ops.job_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for job_costs
CREATE POLICY job_costs_select_policy ON neta_ops.job_costs
    FOR SELECT
    USING (true);  -- All authenticated users can view costs

CREATE POLICY job_costs_insert_policy ON neta_ops.job_costs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);  -- Any authenticated user can insert

CREATE POLICY job_costs_update_policy ON neta_ops.job_costs
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);  -- Any authenticated user can update

CREATE POLICY job_costs_delete_policy ON neta_ops.job_costs
    FOR DELETE
    USING (auth.uid() IS NOT NULL);  -- Any authenticated user can delete 