/**
 * This file re-exports the supabase client from the main supabase.ts file.
 * This allows for better organization and prevents circular dependencies.
 */

import { supabase } from '../supabase';

export { supabase };
export default supabase; 