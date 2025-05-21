-- Create transformer_reports table
CREATE TABLE IF NOT EXISTS public.transformer_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    report_data JSONB NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.transformer_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reports"
    ON public.transformer_reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
    ON public.transformer_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
    ON public.transformer_reports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
    ON public.transformer_reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transformer_reports_updated_at
    BEFORE UPDATE ON public.transformer_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transformer_reports_user_id ON public.transformer_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_transformer_reports_job_id ON public.transformer_reports(job_id); 