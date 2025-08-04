#!/usr/bin/env node

/**
 * Database Fixes Application Script
 * 
 * This script applies all the necessary database fixes to resolve
 * the 403, 404, and 406 errors that are causing slow loading.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function readSQLFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return null;
  }
}

async function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ Error executing ${description}:`, error.message);
      return false;
    }
    
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to execute ${description}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database fixes application...\n');
  
  // Read SQL files
  const systemConfigSQL = await readSQLFile('fix-system-config.sql');
  const customRolesSQL = await readSQLFile('fix-custom-roles.sql');
  
  if (!systemConfigSQL || !customRolesSQL) {
    console.error('❌ Failed to read SQL files');
    process.exit(1);
  }
  
  // Execute fixes
  const results = [];
  
  results.push(await executeSQL(systemConfigSQL, 'Creating missing tables and permissions'));
  results.push(await executeSQL(customRolesSQL, 'Creating custom roles and RPC functions'));
  
  // Summary
  console.log('\n📊 Summary:');
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    console.log(`✅ All ${totalCount} fixes applied successfully!`);
    console.log('\n🎉 Your database should now be properly configured.');
    console.log('   The 403, 404, and 406 errors should be resolved.');
    console.log('   Try refreshing your application now.');
  } else {
    console.log(`⚠️  ${successCount}/${totalCount} fixes applied successfully.`);
    console.log('   Some fixes may need to be applied manually in the Supabase dashboard.');
  }
  
  console.log('\n📝 Next steps:');
  console.log('   1. Refresh your browser');
  console.log('   2. Check the console for any remaining errors');
  console.log('   3. If errors persist, run the SQL manually in Supabase SQL Editor');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 