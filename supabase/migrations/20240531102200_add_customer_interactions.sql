-- Create customer interactions table
CREATE TABLE IF NOT EXISTS common.customer_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES common.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL, -- References auth.users(id) but don't enforce foreign key to allow flexibility
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  associated_contact_id UUID REFERENCES common.contacts(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Add indexes for better performance
  CONSTRAINT customer_interaction_type_check CHECK (type IN ('call', 'email', 'meeting', 'note'))
);

-- Add indexes for common queries
CREATE INDEX idx_customer_interactions_customer_id ON common.customer_interactions(customer_id);
CREATE INDEX idx_customer_interactions_type ON common.customer_interactions(type);
CREATE INDEX idx_customer_interactions_created_at ON common.customer_interactions(created_at);
CREATE INDEX idx_customer_interactions_follow_up_date ON common.customer_interactions(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_customer_interactions_completed ON common.customer_interactions(completed) WHERE completed = FALSE;

-- Set up Row Level Security
ALTER TABLE common.customer_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view customer interactions"
  ON common.customer_interactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert customer interactions"
  ON common.customer_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update customer interactions"
  ON common.customer_interactions FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete customer interactions"
  ON common.customer_interactions FOR DELETE
  USING (true);

-- Add comment to the table for documentation
COMMENT ON TABLE common.customer_interactions IS 'Stores interactions with customers such as calls, emails, meetings, and notes'; 