-- Reset due dates on jobs converted from opportunities to ensure they start blank
UPDATE jobs
SET due_date = NULL
FROM opportunities
WHERE opportunities.job_id = jobs.id;

-- Add a comment to the database to document this change
COMMENT ON TABLE jobs IS 'Jobs table with due_date intentionally starting as NULL for jobs created from opportunities.'; 