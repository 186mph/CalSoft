import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixProfiles() {
  try {
    console.log('🔍 Checking profiles table...');
    
    // Check if profiles table exists and has data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError);
      return;
    }
    
    console.log(`📊 Found ${profiles?.length || 0} profiles in the table`);
    
    if (profiles && profiles.length > 0) {
      console.log('📋 Sample profiles:');
      profiles.forEach(profile => {
        console.log(`  - ID: ${profile.id}`);
        console.log(`    Email: ${profile.email}`);
        console.log(`    Full Name: ${profile.full_name || 'Not set'}`);
        console.log('    ---');
      });
    }
    
    // Check auth.users table
    console.log('\n🔍 Checking auth.users table...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error accessing auth.users:', usersError);
      return;
    }
    
    console.log(`📊 Found ${users?.length || 0} users in auth.users`);
    
    if (users && users.length > 0) {
      console.log('📋 Sample users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Metadata: ${JSON.stringify(user.raw_user_meta_data)}`);
        console.log('    ---');
      });
    }
    
    // Try to populate profiles table with missing users
    console.log('\n🔄 Attempting to populate profiles table...');
    
    const { data: insertResult, error: insertError } = await supabase
      .from('profiles')
      .upsert(
        users?.map(user => ({
          id: user.id,
          email: user.email,
          full_name: user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || null,
          avatar_url: user.raw_user_meta_data?.profileImage || null
        })) || [],
        { onConflict: 'id' }
      )
      .select();
    
    if (insertError) {
      console.error('❌ Error populating profiles:', insertError);
      return;
    }
    
    console.log(`✅ Successfully populated/updated ${insertResult?.length || 0} profiles`);
    
    // Check final state
    const { data: finalProfiles, error: finalError } = await supabase
      .from('profiles')
      .select('*');
    
    if (!finalError && finalProfiles) {
      console.log(`\n📊 Final profiles count: ${finalProfiles.length}`);
      console.log('📋 All profiles:');
      finalProfiles.forEach(profile => {
        console.log(`  - ${profile.full_name || 'No name'} (${profile.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndFixProfiles(); 