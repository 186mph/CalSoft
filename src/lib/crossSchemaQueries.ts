/**
 * Cross Schema Query Helpers
 * 
 * This file provides helpers for making queries that need to join tables across different schemas.
 * It includes fallback mechanisms that try standard queries first, then explicit schema-qualified 
 * queries if relationship errors occur.
 */

import { supabase } from './supabase';
import { SCHEMAS } from './schema';

/**
 * Fetches jobs with customer information with schema-aware relationship handling
 * 
 * @param options Optional query parameters
 * @returns Jobs with related customer data
 */
export async function fetchJobsWithCustomers(options: {
  limit?: number;
  division?: string | null;
  orderBy?: string;
  orderDirection?: 'ascending' | 'descending';
} = {}) {
  const {
    limit = 5, 
    division = null, 
    orderBy = 'created_at', 
    orderDirection = 'descending'
  } = options;

  try {
    // For cross-schema relationships, directly use explicit schema-qualified approach
    let query = supabase
      .from(SCHEMAS.JOBS)
      .select(`
        id,
        title,
        status,
        division,
        job_number,
        customer:customer_id(*)
      `)
      .order(orderBy, { ascending: orderDirection === 'ascending' })
      .limit(limit);
        
    if (division) {
      query = query.eq('division', division);
    }
    
    const { data: schemaData, error: schemaQueryError } = await query;
    
    if (schemaQueryError) {
      // If there's still an error with relationship, try the most explicit approach
      console.error('Error with first explicit schema query:', schemaQueryError);
      console.log('Trying most explicit approach with inline RPC query');
      
      // Build a manual query using RPC to work around schema cache issues
      const { data: manualData, error: manualError } = await supabase.rpc('get_jobs_with_customers', { 
        division_filter: division,
        limit_val: limit
      });
      
      if (manualError) {
        console.error('Error with manual RPC query:', manualError);
        throw manualError;
      }
      
      return manualData || [];
    }
    
    return schemaData || [];
  } catch (error) {
    console.error('Error fetching jobs with customers:', error);
    throw error;
  }
}

/**
 * Fetches opportunities with customer information with schema-aware relationship handling
 * 
 * @param options Optional query parameters
 * @returns Opportunities with related customer data
 */
export async function fetchOpportunitiesWithCustomers(options: {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ascending' | 'descending';
} = {}) {
  const {
    limit = 10, 
    orderBy = 'created_at', 
    orderDirection = 'descending'
  } = options;

  try {
    // Use RPC function to directly handle the cross-schema relationship
    console.log('Using RPC function for opportunities with customers');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_opportunities_with_customers', { 
      limit_val: limit 
    });
      
    if (rpcError) {
      console.error('Error with RPC-based query:', rpcError);
      console.log('Attempting explicit schema qualification fallback');
      
      // Try with explicit schema qualification
      try {
        const query = supabase
          .from(SCHEMAS.OPPORTUNITIES)
          .select('*, customers:customer_id(name, company_name)')
          .order(orderBy, { ascending: orderDirection === 'ascending' });
        
        if (limit) {
          query.limit(limit);
        }
        
        const { data: schemaData, error: schemaQueryError } = await query;
        
        if (schemaQueryError) {
          console.error('Error with explicit schema query:', schemaQueryError);
          throw schemaQueryError;
        }
        
        return schemaData || [];
      } catch (schemaError) {
        // Final fallback - try standard query
        const query = supabase
          .from('opportunities')
          .select('*, customers(name, company_name)')
          .order(orderBy, { ascending: orderDirection === 'ascending' });
        
        if (limit) {
          query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('All approaches failed:', error);
          throw error;
        }

        return data || [];
      }
    }
    
    return rpcData || [];
  } catch (error) {
    console.error('Error fetching opportunities with customers:', error);
    throw error;
  }
} 