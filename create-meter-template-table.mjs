// Simple script to create meter_template_reports table
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Get values from .env file
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

// Configure Supabase client
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key:', supabaseKey?.substring(0, 15) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMeterTemplateTable() {
  console.log('Creating meter_template_reports table...');
  
  try {
    // First, let's check if the table already exists
    console.log('Checking if table already exists...');
    const { data: existingTable, error: checkError } = await supabase
      .schema('lab_ops')
      .from('meter_template_reports')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Table does not exist, creating it...');
      
      // Create the table using raw SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS lab_ops.meter_template_reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id UUID REFERENCES lab_ops.lab_jobs(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id),
            report_info JSONB NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_query: createTableSQL
      });
      
      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      
      console.log('✅ Table created successfully!');
      
      // Create RLS policy
      console.log('Creating RLS policy...');
      const policySQL = `
        ALTER TABLE lab_ops.meter_template_reports ENABLE ROW LEVEL SECURITY;
        
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_catalog.pg_policy
                WHERE polrelid = 'lab_ops.meter_template_reports'::regclass
                AND polname = 'Allow all operations for authenticated users'
            ) THEN
                CREATE POLICY "Allow all operations for authenticated users" ON lab_ops.meter_template_reports
                    FOR ALL TO authenticated USING (true) WITH CHECK (true);
            END IF;
        END
        $$;
      `;
      
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql_query: policySQL
      });
      
      if (policyError) {
        console.error('Error creating RLS policy:', policyError);
        return;
      }
      
      console.log('✅ RLS policy created successfully!');
      
    } else if (checkError) {
      console.error('Error checking table existence:', checkError);
      return;
    } else {
      console.log('✅ Table already exists!');
    }
    
    // Test the table by trying to query it
    console.log('Testing table access...');
    const { data: testData, error: testError } = await supabase
      .schema('lab_ops')
      .from('meter_template_reports')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Error testing table access:', testError);
    } else {
      console.log('✅ Table access test successful!');
    }
    
  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

createMeterTemplateTable().catch(err => {
  console.error('Script failed:', err);
}); 