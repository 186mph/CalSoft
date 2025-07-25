-- Function to fetch jobs with their customer data
-- This function explicitly joins the schemas to bypass PostgREST schema cache issues

CREATE OR REPLACE FUNCTION get_jobs_with_customers(
  division_filter text DEFAULT NULL,
  limit_val integer DEFAULT 5
)
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY
  WITH job_data AS (
    SELECT 
      j.id,
      j.title,
      j.status,
      j.division,
      j.job_number,
      j.customer_id,
      c.id AS customer_id,
      c.name AS customer_name,
      c.company_name AS customer_company_name
    FROM 
      neta_ops.jobs j
    LEFT JOIN 
      common.customers c ON j.customer_id = c.id
    WHERE 
      (division_filter IS NULL OR j.division = division_filter)
    ORDER BY 
      j.created_at DESC
    LIMIT 
      limit_val
  )
  SELECT 
    json_build_object(
      'id', jd.id,
      'title', jd.title,
      'status', jd.status,
      'division', jd.division,
      'job_number', jd.job_number,
      'customer', json_build_object(
        'id', jd.customer_id,
        'name', jd.customer_name,
        'company_name', jd.customer_company_name
      )
    )
  FROM 
    job_data jd;
END;
$$ LANGUAGE plpgsql;

-- Function to fetch opportunities with their customer data
CREATE OR REPLACE FUNCTION get_opportunities_with_customers(
  limit_val integer DEFAULT 10
)
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY
  WITH opportunity_data AS (
    SELECT 
      o.*,
      c.id AS customer_id,
      c.name AS customer_name,
      c.company_name AS customer_company_name
    FROM 
      business.opportunities o
    LEFT JOIN 
      common.customers c ON o.customer_id = c.id
    ORDER BY 
      o.created_at DESC
    LIMIT 
      limit_val
  )
  SELECT 
    json_build_object(
      'id', od.id,
      'title', od.title,
      'description', od.description,
      'status', od.status,
      'expected_value', od.expected_value,
      'probability', od.probability,
      'created_at', od.created_at,
      'updated_at', od.updated_at,
      'quote_number', od.quote_number,
      'customers', json_build_object(
        'id', od.customer_id,
        'name', od.customer_name,
        'company_name', od.customer_company_name
      )
    )
  FROM 
    opportunity_data od;
END;
$$ LANGUAGE plpgsql;

-- Update the counts function to use explicit schema references
CREATE OR REPLACE FUNCTION get_dashboard_counts(
  division_filter text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  customers_count integer;
  contacts_count integer;
  jobs_count integer;
  active_jobs_count integer;
  upcoming_jobs_count integer;
  completed_jobs_count integer;
BEGIN
  -- Get customer count
  SELECT COUNT(*) INTO customers_count FROM common.customers;
  
  -- Get contacts count
  SELECT COUNT(*) INTO contacts_count FROM common.contacts;
  
  -- Get jobs counts with division filter
  SELECT COUNT(*) INTO jobs_count 
  FROM neta_ops.jobs 
  WHERE (division_filter IS NULL OR division = division_filter);
  
  SELECT COUNT(*) INTO active_jobs_count 
  FROM neta_ops.jobs 
  WHERE status = 'in_progress' AND (division_filter IS NULL OR division = division_filter);
  
  SELECT COUNT(*) INTO upcoming_jobs_count 
  FROM neta_ops.jobs 
  WHERE status = 'pending' AND (division_filter IS NULL OR division = division_filter);
  
  SELECT COUNT(*) INTO completed_jobs_count 
  FROM neta_ops.jobs 
  WHERE status = 'completed' AND (division_filter IS NULL OR division = division_filter);
  
  -- Return all counts as JSON
  RETURN json_build_object(
    'customers', customers_count,
    'contacts', contacts_count,
    'jobs', jobs_count,
    'activeJobs', active_jobs_count,
    'upcomingJobs', upcoming_jobs_count,
    'completedJobs', completed_jobs_count
  );
END;
$$ LANGUAGE plpgsql;

-- Refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config'); 