import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Read environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and anon key must be provided.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateJobTitles() {
  try {
    console.log('🔧 Starting job title update...');
    
    // Update jobs in neta_ops.jobs table
    console.log('Updating jobs in neta_ops.jobs...');
    const { data: netaJobs, error: netaError } = await supabase
      .schema('neta_ops')
      .from('jobs')
      .update({ title: 'Project' })
      .eq('title', 'Calibration Job')
      .select('id, title');
    
    if (netaError) {
      console.error('Error updating neta_ops.jobs:', netaError);
    } else {
      console.log(`✅ Updated ${netaJobs?.length || 0} jobs in neta_ops.jobs`);
    }
    
    // Update jobs in lab_ops.lab_jobs table
    console.log('Updating jobs in lab_ops.lab_jobs...');
    const { data: labJobs, error: labError } = await supabase
      .schema('lab_ops')
      .from('lab_jobs')
      .update({ title: 'Project' })
      .eq('title', 'Calibration Job')
      .select('id, title');
    
    if (labError) {
      console.error('Error updating lab_ops.lab_jobs:', labError);
    } else {
      console.log(`✅ Updated ${labJobs?.length || 0} jobs in lab_ops.lab_jobs`);
    }
    
    // Also update "calibration job" (lowercase)
    console.log('Updating jobs with lowercase "calibration job"...');
    const { data: netaJobsLower, error: netaErrorLower } = await supabase
      .schema('neta_ops')
      .from('jobs')
      .update({ title: 'Project' })
      .eq('title', 'calibration job')
      .select('id, title');
    
    if (netaErrorLower) {
      console.error('Error updating neta_ops.jobs (lowercase):', netaErrorLower);
    } else {
      console.log(`✅ Updated ${netaJobsLower?.length || 0} jobs in neta_ops.jobs (lowercase)`);
    }
    
    const { data: labJobsLower, error: labErrorLower } = await supabase
      .schema('lab_ops')
      .from('lab_jobs')
      .update({ title: 'Project' })
      .eq('title', 'calibration job')
      .select('id, title');
    
    if (labErrorLower) {
      console.error('Error updating lab_ops.lab_jobs (lowercase):', labErrorLower);
    } else {
      console.log(`✅ Updated ${labJobsLower?.length || 0} jobs in lab_ops.lab_jobs (lowercase)`);
    }
    
    console.log('🎉 Job title update completed!');
    
  } catch (error) {
    console.error('Error updating job titles:', error);
  }
}

updateJobTitles(); 