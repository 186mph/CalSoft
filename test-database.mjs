import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mqlwslexdyqjzuvdtrbc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbHdzbGV4ZHlxanp1dmR0cmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDk5MzY1NCwiZXhwIjoyMDQ2NTY5NjU0fQ.RLhTJ4AqXOhWLRxD_0v6iDJFxFf-NPsJ-NxWAV8K8Xk'
);

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // 1. Check existing schemas
    console.log('\n1. Checking existing schemas...');
    const { data: schemas, error: schemaError } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .in('schema_name', ['public', 'lab_ops', 'neta_ops', 'common', 'calibration']);
    
    if (schemaError) {
      console.error('Error checking schemas:', schemaError);
    } else {
      console.log('Available schemas:', schemas?.map(s => s.schema_name));
    }
    
    // 2. Check tables in all schemas
    console.log('\n2. Checking tables in all schemas...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'lab_ops', 'neta_ops', 'common', 'calibration'])
      .like('table_name', '%meter%');
    
    if (tableError) {
      console.error('Error checking tables:', tableError);
    } else {
      console.log('Tables with "meter" in name:', tables);
    }
    
    // 3. Check for existing calibration-related tables
    console.log('\n3. Checking calibration tables...');
    const { data: calibTables, error: calibError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'lab_ops', 'neta_ops', 'common', 'calibration'])
      .like('table_name', '%calibration%');
    
    if (calibError) {
      console.error('Error checking calibration tables:', calibError);
    } else {
      console.log('Calibration-related tables:', calibTables);
    }
    
    // 4. Try to find the correct schema for lab operations
    console.log('\n4. Checking for lab-related tables...');
    const { data: labTables, error: labError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'lab_ops', 'neta_ops', 'common', 'calibration'])
      .or('table_name.like.%lab%,table_name.like.%asset%,table_name.like.%glove%');
    
    if (labError) {
      console.error('Error checking lab tables:', labError);
    } else {
      console.log('Lab-related tables:', labTables);
    }
    
    // 5. Test creating the table in neta_ops schema (which seems to be used)
    console.log('\n5. Attempting to create table in neta_ops schema...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS neta_ops.meter_template_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID,
        user_id UUID REFERENCES auth.users(id),
        report_info JSONB NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE neta_ops.meter_template_reports ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Allow all operations for authenticated users" 
      ON neta_ops.meter_template_reports
      FOR ALL TO authenticated 
      USING (true) 
      WITH CHECK (true);
    `;
    
    const { error: createError } = await supabase.rpc('exec', {
      query: createTableSQL
    });
    
    if (createError) {
      console.error('Error creating table in neta_ops:', createError);
    } else {
      console.log('✅ Table created successfully in neta_ops schema');
    }
    
    // 6. Test table access
    console.log('\n6. Testing table access...');
    const { data: testData, error: testError } = await supabase
      .schema('neta_ops')
      .from('meter_template_reports')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('Error testing table access:', testError);
    } else {
      console.log('✅ Table access working in neta_ops schema');
    }
    
  } catch (error) {
    console.error('Failed to test database:', error);
  }
}

testDatabase().then(() => process.exit(0)); 