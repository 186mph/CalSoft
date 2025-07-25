-- Create a helper function for creating lab jobs with automatic customer validation
CREATE OR REPLACE FUNCTION create_lab_job_with_customer_check(job_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_id_value UUID;
    customer_exists BOOLEAN;
    job_result RECORD;
    result_json JSON;
BEGIN
    -- Extract customer_id from the job_data
    customer_id_value := (job_data->>'customer_id')::UUID;
    
    -- Check if customer exists in lab_customers
    SELECT EXISTS(
        SELECT 1 FROM lab_ops.lab_customers 
        WHERE id = customer_id_value
    ) INTO customer_exists;
    
    -- If customer doesn't exist, try to find in common.customers and copy
    IF NOT customer_exists THEN
        INSERT INTO lab_ops.lab_customers (id, name, company_name, address, phone, email, status, created_at, updated_at)
        SELECT id, name, company_name, address, phone, email, 
               COALESCE(status, 'active'), created_at, updated_at
        FROM common.customers 
        WHERE id = customer_id_value
        ON CONFLICT (id) DO NOTHING;
        
        -- If still no customer found, create a minimal one
        INSERT INTO lab_ops.lab_customers (id, name, company_name, status)
        VALUES (customer_id_value, 'Auto-created Customer', 'Unknown Company', 'active')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Now create the job
    INSERT INTO lab_ops.lab_jobs (
        customer_id, title, description, status, start_date, due_date, 
        budget, notes, priority, division
    ) VALUES (
        customer_id_value,
        job_data->>'title',
        job_data->>'description',
        COALESCE(job_data->>'status', 'pending'),
        (job_data->>'start_date')::DATE,
        (job_data->>'due_date')::DATE,
        (job_data->>'budget')::DECIMAL,
        job_data->>'notes',
        COALESCE(job_data->>'priority', 'medium'),
        job_data->>'division'
    ) RETURNING * INTO job_result;
    
    -- Convert the result to JSON
    result_json := to_json(job_result);
    
    RETURN result_json;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN json_build_object(
            'error', TRUE,
            'code', SQLSTATE,
            'message', SQLERRM
        );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_lab_job_with_customer_check TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_lab_job_with_customer_check IS 'Helper function to create lab jobs with automatic customer validation and creation if needed'; 