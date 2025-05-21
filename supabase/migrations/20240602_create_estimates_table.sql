-- Create estimates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  travel_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_opportunity_id ON public.estimates(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at);

-- Enable RLS on the estimates table
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can manage estimates"
  ON public.estimates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to document table purpose
COMMENT ON TABLE public.estimates IS 'Stores estimate/quote data for opportunities'; 