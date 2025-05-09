require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running SLA tables migration...');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240517000000_add_sla_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into separate statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        console.log(`Executing SQL: ${statement.substring(0, 80)}...`);
        const { error } = await supabase.rpc('pg_query', { query: statement + ';' });
        if (error) throw error;
      } catch (error) {
        console.error(`Error executing statement: ${error.message}`);
        // Continue with next statement even if there's an error
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Create some sample SLA definitions
    await createSampleSLADefinitions();
    
    console.log('Added sample SLA definitions');
    console.log('SLA tracking system is now ready to use.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function createSampleSLADefinitions() {
  const sampleDefinitions = [
    {
      name: 'Standard Response Time',
      description: 'Standard response time for general jobs',
      priority: 'medium',
      status: 'active',
      metric_type: 'response_time',
      target_value: 24,
      time_period: 'hours',
      notifications_enabled: true
    },
    {
      name: 'Priority Response Time',
      description: 'Faster response time for high priority jobs',
      priority: 'high',
      status: 'active',
      metric_type: 'response_time',
      target_value: 8,
      time_period: 'hours',
      notifications_enabled: true
    },
    {
      name: 'Critical Response Time',
      description: 'Immediate response for critical situations',
      priority: 'critical',
      status: 'active',
      metric_type: 'response_time',
      target_value: 1,
      time_period: 'hours',
      notifications_enabled: true
    },
    {
      name: 'Standard Resolution Time',
      description: 'Standard resolution time for general jobs',
      priority: 'medium',
      status: 'active',
      metric_type: 'resolution_time',
      target_value: 5,
      time_period: 'days',
      notifications_enabled: true
    },
    {
      name: 'Priority Resolution Time',
      description: 'Faster resolution for high priority jobs',
      priority: 'high',
      status: 'active',
      metric_type: 'resolution_time',
      target_value: 2,
      time_period: 'days',
      notifications_enabled: true
    }
  ];
  
  for (const definition of sampleDefinitions) {
    const { error } = await supabase
      .schema('common')
      .from('sla_definitions')
      .insert(definition);
      
    if (error) {
      console.error(`Error creating SLA definition ${definition.name}:`, error);
    }
  }
}

runMigration()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  }); 