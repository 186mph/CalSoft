/*
  # Fix RLS policies for customers table

  1. Changes
    - Add RLS policy for inserting new customers
    - Add RLS policy for selecting customers
    - Add RLS policy for updating customers
    - Add RLS policy for deleting customers

  2. Security
    - All policies are scoped to authenticated users
    - Users can only access their own data
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;

-- Create comprehensive RLS policies
CREATE POLICY "Users can insert their own customers"
ON customers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own customers"
ON customers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
ON customers FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
ON customers FOR DELETE TO authenticated
USING (auth.uid() = user_id);