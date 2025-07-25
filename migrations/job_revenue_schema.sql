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

-- Create job_revenue table
CREATE TABLE IF NOT EXISTS neta_ops.job_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    revenue_type TEXT NOT NULL CHECK (revenue_type IN ('invoice', 'payment', 'other')),
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update timestamp trigger for job_revenue
DROP TRIGGER IF EXISTS update_job_revenue_timestamp ON neta_ops.job_revenue;
CREATE TRIGGER update_job_revenue_timestamp
BEFORE UPDATE ON neta_ops.job_revenue
FOR EACH ROW
EXECUTE FUNCTION neta_ops.update_timestamp();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_revenue_job_id ON neta_ops.job_revenue(job_id);
CREATE INDEX IF NOT EXISTS idx_job_revenue_revenue_type ON neta_ops.job_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_job_revenue_date ON neta_ops.job_revenue(date);
CREATE INDEX IF NOT EXISTS idx_job_revenue_status ON neta_ops.job_revenue(status);

-- Enable row level security
ALTER TABLE neta_ops.job_revenue ENABLE ROW LEVEL SECURITY;

-- Create policies for job_revenue
CREATE POLICY job_revenue_select_policy ON neta_ops.job_revenue
    FOR SELECT
    USING (true);  -- All authenticated users can view revenue

CREATE POLICY job_revenue_insert_policy ON neta_ops.job_revenue
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);  -- Any authenticated user can insert

CREATE POLICY job_revenue_update_policy ON neta_ops.job_revenue
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);  -- Any authenticated user can update

CREATE POLICY job_revenue_delete_policy ON neta_ops.job_revenue
    FOR DELETE
    USING (auth.uid() IS NOT NULL);  -- Any authenticated user can delete

-- Create a stored procedure to create the job_revenue table
CREATE OR REPLACE FUNCTION neta_ops.create_job_revenue_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'neta_ops' AND tablename = 'job_revenue') THEN
        -- Create the table
        CREATE TABLE neta_ops.job_revenue (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id UUID NOT NULL REFERENCES neta_ops.jobs(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            revenue_type TEXT NOT NULL CHECK (revenue_type IN ('invoice', 'payment', 'other')),
            date DATE NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'paid')),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create update timestamp trigger
        CREATE TRIGGER update_job_revenue_timestamp
        BEFORE UPDATE ON neta_ops.job_revenue
        FOR EACH ROW
        EXECUTE FUNCTION neta_ops.update_timestamp();

        -- Add indexes
        CREATE INDEX idx_job_revenue_job_id ON neta_ops.job_revenue(job_id);
        CREATE INDEX idx_job_revenue_revenue_type ON neta_ops.job_revenue(revenue_type);
        CREATE INDEX idx_job_revenue_date ON neta_ops.job_revenue(date);
        CREATE INDEX idx_job_revenue_status ON neta_ops.job_revenue(status);

        -- Enable RLS
        ALTER TABLE neta_ops.job_revenue ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY job_revenue_select_policy ON neta_ops.job_revenue
            FOR SELECT
            USING (true);

        CREATE POLICY job_revenue_insert_policy ON neta_ops.job_revenue
            FOR INSERT
            WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY job_revenue_update_policy ON neta_ops.job_revenue
            FOR UPDATE
            USING (auth.uid() IS NOT NULL);

        CREATE POLICY job_revenue_delete_policy ON neta_ops.job_revenue
            FOR DELETE
            USING (auth.uid() IS NOT NULL);
            
        RAISE NOTICE 'Created job_revenue table';
    ELSE
        RAISE NOTICE 'job_revenue table already exists';
    END IF;
END;
$$; 