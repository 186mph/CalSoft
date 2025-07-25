-- Add RLS policies for the technician availability table
DROP POLICY IF EXISTS "Users can view their own availability" ON common.technician_availability;
CREATE POLICY "Users can view their own availability"
  ON common.technician_availability FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all availability" ON common.technician_availability;
CREATE POLICY "Admins can view all availability"
  ON common.technician_availability FOR SELECT
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

DROP POLICY IF EXISTS "Users can manage their own availability" ON common.technician_availability;
CREATE POLICY "Users can manage their own availability"
  ON common.technician_availability FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all availability" ON common.technician_availability;
CREATE POLICY "Admins can manage all availability"
  ON common.technician_availability FOR ALL
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin')
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

-- Add RLS policies for the technician exceptions table
DROP POLICY IF EXISTS "Users can view their own exceptions" ON common.technician_exceptions;
CREATE POLICY "Users can view their own exceptions"
  ON common.technician_exceptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all exceptions" ON common.technician_exceptions;
CREATE POLICY "Admins can view all exceptions"
  ON common.technician_exceptions FOR SELECT
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

DROP POLICY IF EXISTS "Users can manage their own exceptions" ON common.technician_exceptions;
CREATE POLICY "Users can manage their own exceptions"
  ON common.technician_exceptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all exceptions" ON common.technician_exceptions;
CREATE POLICY "Admins can manage all exceptions"
  ON common.technician_exceptions FOR ALL
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin')
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

-- Add RLS policies for the technician skills table
DROP POLICY IF EXISTS "Anyone can view technician skills" ON common.technician_skills;
CREATE POLICY "Anyone can view technician skills"
  ON common.technician_skills FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own skills" ON common.technician_skills;
CREATE POLICY "Users can manage their own skills"
  ON common.technician_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all skills" ON common.technician_skills;
CREATE POLICY "Admins can manage all skills"
  ON common.technician_skills FOR ALL
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin')
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

-- Add RLS policies for the technician assignments table
DROP POLICY IF EXISTS "Users can view their own assignments" ON common.technician_assignments;
CREATE POLICY "Users can view their own assignments"
  ON common.technician_assignments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all assignments" ON common.technician_assignments;
CREATE POLICY "Admins can view all assignments"
  ON common.technician_assignments FOR SELECT
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

DROP POLICY IF EXISTS "Admins can manage all assignments" ON common.technician_assignments;
CREATE POLICY "Admins can manage all assignments"
  ON common.technician_assignments FOR ALL
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin')
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin');

-- Add RLS policies for the job skill requirements table
DROP POLICY IF EXISTS "Anyone can view job skill requirements" ON common.job_skill_requirements;
CREATE POLICY "Anyone can view job skill requirements"
  ON common.job_skill_requirements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage job skill requirements" ON common.job_skill_requirements;
CREATE POLICY "Admins can manage job skill requirements"
  ON common.job_skill_requirements FOR ALL
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin')
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'Admin'); 