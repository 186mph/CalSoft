-- Create function to find available technicians
CREATE OR REPLACE FUNCTION common.find_available_technicians(
  job_id UUID,
  assignment_date DATE,
  start_time TIME,
  end_time TIME,
  portal TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  division TEXT,
  skill_match_score INTEGER,
  availability_conflicts TEXT[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH job_skills AS (
    -- Get required skills for the job
    SELECT skill_name, minimum_proficiency, is_required
    FROM common.job_skill_requirements
    WHERE job_id = $1
  ),
  tech_skills AS (
    -- Get technician skills with skill match scoring
    SELECT 
      ts.user_id,
      SUM(
        CASE 
          WHEN js.is_required AND ts.proficiency_level >= js.minimum_proficiency THEN 2
          WHEN js.is_required AND ts.proficiency_level < js.minimum_proficiency THEN -5
          WHEN NOT js.is_required AND ts.proficiency_level >= js.minimum_proficiency THEN 1
          ELSE 0
        END
      ) AS skill_score
    FROM 
      common.technician_skills ts
    LEFT JOIN
      job_skills js ON ts.skill_name = js.skill_name
    WHERE
      ts.portal_type = $5
    GROUP BY
      ts.user_id
  ),
  day_of_week AS (
    -- Calculate day of week for the assignment date
    SELECT EXTRACT(DOW FROM $2)::integer AS dow
  ),
  tech_availability AS (
    -- Check if technicians are available on the specified day and time
    SELECT
      ta.user_id,
      CASE 
        WHEN ta.start_time <= $3 AND ta.end_time >= $4 THEN TRUE
        ELSE FALSE
      END AS is_available
    FROM
      common.technician_availability ta
    CROSS JOIN
      day_of_week d
    WHERE
      ta.day_of_week = d.dow AND
      ta.portal_type = $5
  ),
  tech_exceptions AS (
    -- Check for any exceptions on the specific date
    SELECT
      te.user_id,
      CASE
        WHEN te.is_available = FALSE THEN FALSE
        WHEN te.is_available = TRUE AND te.start_time <= $3 AND te.end_time >= $4 THEN TRUE
        ELSE FALSE
      END AS is_available,
      te.reason
    FROM
      common.technician_exceptions te
    WHERE
      te.exception_date = $2 AND
      te.portal_type = $5
  ),
  tech_assignments AS (
    -- Check for conflicting assignments
    SELECT
      ta.user_id,
      ARRAY_AGG(
        'Job #' || COALESCE(j.job_number, 'N/A') || 
        ' (' || ta.start_time::text || ' - ' || ta.end_time::text || ')'
      ) AS conflicts
    FROM
      common.technician_assignments ta
    LEFT JOIN
      neta_ops.jobs j ON ta.job_id = j.id AND ta.portal_type = 'neta'
    WHERE
      ta.assignment_date = $2 AND
      ta.portal_type = $5 AND
      (
        (ta.start_time <= $3 AND ta.end_time > $3) OR
        (ta.start_time < $4 AND ta.end_time >= $4) OR
        (ta.start_time >= $3 AND ta.end_time <= $4)
      )
    GROUP BY
      ta.user_id
  )
  -- Final query to combine all the data
  SELECT
    u.id AS user_id,
    u.raw_user_meta_data->>'name' as full_name,
    u.email,
    u.raw_user_meta_data->>'division' as division,
    COALESCE(ts.skill_score, 0) AS skill_match_score,
    COALESCE(ta.conflicts, ARRAY[]::text[]) AS availability_conflicts
  FROM
    auth.users u
  LEFT JOIN
    tech_skills ts ON u.id = ts.user_id
  LEFT JOIN
    tech_availability av ON u.id = av.user_id
  LEFT JOIN
    tech_exceptions ex ON u.id = ex.user_id
  LEFT JOIN
    tech_assignments ta ON u.id = ta.user_id
  WHERE
    u.raw_user_meta_data->>'role' IN ('NETA Technician', 'Lab Technician', 'Scav') AND
    (
      portal IN ('neta') AND u.raw_user_meta_data->>'role' = 'NETA Technician' OR
      portal IN ('lab') AND u.raw_user_meta_data->>'role' = 'Lab Technician' OR
      portal IN ('scavenger') AND u.raw_user_meta_data->>'role' = 'Scav'
    ) AND
    (av.is_available = TRUE OR av.is_available IS NULL) AND
    (ex.is_available = TRUE OR ex.is_available IS NULL)
  ORDER BY
    skill_match_score DESC,
    CASE WHEN ta.conflicts IS NULL THEN 1 ELSE 0 END DESC,
    u.raw_user_meta_data->>'name';
END;
$$; 