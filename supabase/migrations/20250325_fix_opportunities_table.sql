-- Drop and recreate just the opportunities table
DROP TABLE IF EXISTS opportunities CASCADE;

-- Create opportunities table with ALL potentially needed fields
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    name TEXT, -- Made nullable
    title TEXT, -- Another name field some code might use
    quote_number TEXT,
    opportunity_number TEXT, -- Some applications use this
    expected_value DECIMAL,
    value DECIMAL,
    amount DECIMAL, -- Another way to represent value
    status TEXT DEFAULT 'open', -- Added default
    stage TEXT, -- For pipeline stage
    amp_division TEXT,
    division TEXT,
    department TEXT, -- Sometimes used instead of division
    probability INTEGER,
    description TEXT,
    expected_close_date DATE,
    close_date DATE, -- Alternative name
    created_date DATE, -- Some apps use this instead of created_at
    last_modified_date DATE, -- Some apps use this instead of updated_at
    awarded_date DATE, -- When the opportunity was awarded
    notes TEXT,
    comments TEXT, -- Sometimes used instead of notes
    sales_person TEXT,
    owner TEXT, -- Sometimes used instead of sales_person
    owner_id UUID, -- Some apps might use a different user ID for ownership
    source TEXT, -- Where the opportunity came from
    type TEXT, -- Type of opportunity
    next_step TEXT, -- For sales pipeline management
    priority TEXT, -- For prioritizing opportunities
    reason TEXT, -- For win/loss reason
    forecast_category TEXT, -- For sales forecasting
    campaign_source TEXT, -- For marketing attribution
    is_closed BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to ensure we always have a name (from title or vice versa)
CREATE OR REPLACE FUNCTION ensure_opportunity_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is NULL but title is not, use title for name
  IF NEW.name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.name := NEW.title;
  END IF;
  
  -- If title is NULL but name is not, use name for title
  IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
    NEW.title := NEW.name;
  END IF;
  
  -- If both are NULL, set a default
  IF NEW.name IS NULL AND NEW.title IS NULL THEN
    NEW.name := 'Untitled Opportunity';
    NEW.title := 'Untitled Opportunity';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_opportunity_name_trigger ON opportunities;
CREATE TRIGGER ensure_opportunity_name_trigger
BEFORE INSERT OR UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION ensure_opportunity_name();

-- Enable RLS on the opportunities table
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy that allows all operations for authenticated users
DROP POLICY IF EXISTS "Allow all operations" ON opportunities;
CREATE POLICY "Allow all operations" ON opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true); 