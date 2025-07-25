-- Create customer satisfaction survey tables
CREATE TABLE IF NOT EXISTS common.survey_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL, -- References auth.users(id)
  is_active BOOLEAN DEFAULT TRUE,
  auto_send BOOLEAN DEFAULT FALSE,
  frequency TEXT -- 'after_job', 'monthly', 'quarterly', 'annual'
);

CREATE TABLE IF NOT EXISTS common.survey_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES common.survey_templates(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'rating', 'text', 'multiple_choice', 'boolean'
  order_index INTEGER NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  options JSONB -- For multiple choice questions
);

CREATE TABLE IF NOT EXISTS common.customer_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES common.customers(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES common.survey_templates(id),
  job_id UUID REFERENCES neta_ops.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID, -- References auth.users(id)
  email_sent_to TEXT,
  unique_token TEXT NOT NULL,
  status TEXT NOT NULL, -- 'draft', 'sent', 'completed', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  feedback_summary TEXT,
  satisfaction_score INTEGER
);

CREATE TABLE IF NOT EXISTS common.survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES common.customer_surveys(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES common.survey_questions(id) ON DELETE CASCADE,
  response TEXT,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_survey_templates_is_active ON common.survey_templates(is_active);
CREATE INDEX idx_survey_questions_template_id ON common.survey_questions(template_id);
CREATE INDEX idx_customer_surveys_customer_id ON common.customer_surveys(customer_id);
CREATE INDEX idx_customer_surveys_status ON common.customer_surveys(status);
CREATE INDEX idx_customer_surveys_completed_at ON common.customer_surveys(completed_at);
CREATE INDEX idx_survey_responses_survey_id ON common.survey_responses(survey_id);

-- Create materialized view for customer satisfaction scores
CREATE MATERIALIZED VIEW common.customer_satisfaction_scores AS
SELECT 
  c.id AS customer_id,
  c.company_name,
  COALESCE(AVG(cs.satisfaction_score), 0) AS avg_score,
  COUNT(cs.id) FILTER (WHERE cs.status = 'completed') AS completed_surveys,
  COUNT(cs.id) AS total_surveys,
  MAX(cs.completed_at) AS last_survey_date
FROM 
  common.customers c
LEFT JOIN 
  common.customer_surveys cs ON c.id = cs.customer_id
GROUP BY 
  c.id, c.company_name;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION common.refresh_customer_satisfaction_scores()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW common.customer_satisfaction_scores;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh the materialized view when surveys are updated
CREATE TRIGGER refresh_satisfaction_scores
AFTER INSERT OR UPDATE OR DELETE ON common.customer_surveys
FOR EACH STATEMENT
EXECUTE FUNCTION common.refresh_customer_satisfaction_scores();

-- Set up Row Level Security
ALTER TABLE common.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.customer_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE common.survey_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view survey templates"
  ON common.survey_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can insert survey templates"
  ON common.survey_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update survey templates"
  ON common.survey_templates FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete survey templates"
  ON common.survey_templates FOR DELETE
  USING (true);

-- Define similar policies for other tables
CREATE POLICY "Users can view survey questions"
  ON common.survey_questions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert survey questions"
  ON common.survey_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update survey questions"
  ON common.survey_questions FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete survey questions"
  ON common.survey_questions FOR DELETE
  USING (true);

CREATE POLICY "Users can view customer surveys"
  ON common.customer_surveys FOR SELECT
  USING (true);

CREATE POLICY "Users can insert customer surveys"
  ON common.customer_surveys FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update customer surveys"
  ON common.customer_surveys FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete customer surveys"
  ON common.customer_surveys FOR DELETE
  USING (true);

CREATE POLICY "Users can view survey responses"
  ON common.survey_responses FOR SELECT
  USING (true);

CREATE POLICY "Users can insert survey responses"
  ON common.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update survey responses"
  ON common.survey_responses FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete survey responses"
  ON common.survey_responses FOR DELETE
  USING (true);

-- Add table comments for documentation
COMMENT ON TABLE common.survey_templates IS 'Stores survey templates for customer satisfaction surveys';
COMMENT ON TABLE common.survey_questions IS 'Stores questions for survey templates';
COMMENT ON TABLE common.customer_surveys IS 'Stores surveys sent to customers';
COMMENT ON TABLE common.survey_responses IS 'Stores individual responses to survey questions';
COMMENT ON MATERIALIZED VIEW common.customer_satisfaction_scores IS 'Aggregated customer satisfaction scores'; 