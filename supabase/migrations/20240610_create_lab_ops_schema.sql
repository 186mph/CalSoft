-- Create lab_ops schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS lab_ops;

-- Create lab_customers table
CREATE TABLE IF NOT EXISTS lab_ops.lab_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lab_jobs table
CREATE TABLE IF NOT EXISTS lab_ops.lab_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES lab_ops.lab_customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    job_number TEXT UNIQUE,
    description TEXT,
    status TEXT DEFAULT 'pending',
    division TEXT DEFAULT 'calibration',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    budget DECIMAL,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lab_assets table
CREATE TABLE IF NOT EXISTS lab_ops.lab_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    file_url TEXT,
    job_id UUID REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calibration_gloves_reports table
CREATE TABLE IF NOT EXISTS lab_ops.calibration_gloves_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    report_info JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE lab_ops.lab_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.lab_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.lab_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops.calibration_gloves_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.lab_customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.lab_jobs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.lab_assets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.calibration_gloves_reports
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create job number sequence for lab_jobs
CREATE SEQUENCE IF NOT EXISTS lab_ops.lab_job_number_seq START 1000;

-- Create function to generate lab job numbers
CREATE OR REPLACE FUNCTION lab_ops.generate_lab_job_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.job_number := 'LAB-' || nextval('lab_ops.lab_job_number_seq')::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating lab job numbers
CREATE TRIGGER set_lab_job_number
    BEFORE INSERT ON lab_ops.lab_jobs
    FOR EACH ROW
    WHEN (NEW.job_number IS NULL)
    EXECUTE FUNCTION lab_ops.generate_lab_job_number(); 