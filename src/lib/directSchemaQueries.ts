/**
 * Direct Schema Query Helpers
 * 
 * This file provides helper functions for querying tables with explicit schema references
 * using the .schema() method.
 */

import { supabase } from './supabase';

/**
 * Queries neta_ops.jobs with customer data
 */
export async function queryJobs({
  division = null,
  limit = 10,
  offset = 0,
  orderBy = 'created_at',
  orderDirection = 'desc'
} = {}) {
  try {
    // First, get the jobs without the relationship
    let query = supabase
      .schema('neta_ops')
      .from('jobs')
      .select(`
        id,
        title,
        description,
        status,
        division,
        job_number,
        priority,
        start_date,
        due_date,
        budget,
        created_at,
        updated_at,
        customer_id
      `)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (division) {
      query = query.eq('division', division);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error querying jobs:', error);
      throw error;
    }

    // Now get the customer data for each job
    const jobsWithCustomers = await Promise.all((data || []).map(async (job) => {
      try {
        if (!job.customer_id) {
          return { ...job, customer: null };
        }
        
        // Get customer data for this job
        const { data: customerData, error: customerError } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .eq('id', job.customer_id)
          .maybeSingle();
        
        if (customerError) {
          console.warn('Error fetching customer for job:', job.id, customerError);
          return { ...job, customer: null };
        }

        // Return job with customer data
        return {
          ...job,
          customer: customerData
        };
      } catch (err) {
        console.warn('Error processing customer for job:', job.id, err);
        return { ...job, customer: null };
      }
    }));

    return { data: jobsWithCustomers, count };
  } catch (error) {
    console.error('Error in queryJobs:', error);
    throw error;
  }
}

/**
 * Queries business.opportunities with customer data
 */
export async function queryOpportunities({
  limit = 10,
  offset = 0,
  orderBy = 'created_at',
  orderDirection = 'desc',
  status = null
} = {}) {
  try {
    // First, fetch opportunities without the relationship
    let query = supabase
      .schema('business')
      .from('opportunities')
      .select(`
        *
      `)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error querying opportunities:', error);
      throw error;
    }

    // Now fetch customer data for each opportunity
    const opportunitiesWithCustomers = await Promise.all((data || []).map(async (opportunity) => {
      try {
        if (!opportunity.customer_id) {
          return { ...opportunity, customers: null };
        }
        
        // Get customer data for this opportunity
        const { data: customerData, error: customerError } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .eq('id', opportunity.customer_id)
          .maybeSingle();
        
        if (customerError) {
          console.warn('Error fetching customer for opportunity:', opportunity.id, customerError);
          return { ...opportunity, customers: null };
        }

        // Return opportunity with customer data
        // We use "customers" key to match the original API shape
        return {
          ...opportunity,
          customers: customerData
        };
      } catch (err) {
        console.warn('Error processing customer for opportunity:', opportunity.id, err);
        return { ...opportunity, customers: null };
      }
    }));

    return { data: opportunitiesWithCustomers, count };
  } catch (error) {
    console.error('Error in queryOpportunities:', error);
    throw error;
  }
}

/**
 * Queries common.customers
 */
export async function queryCustomers({
  limit = 20,
  offset = 0,
  orderBy = 'name',
  orderDirection = 'asc'
} = {}) {
  const { data, error, count } = await supabase
    .schema('common')
    .from('customers')
    .select(`*`, { count: 'exact' })
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error querying customers:', error);
    throw error;
  }

  return { data, count };
}

/**
 * Queries common.contacts
 */
export async function queryContacts({
  customerId = null,
  limit = 20,
  offset = 0,
  orderBy = 'name',
  orderDirection = 'asc'
} = {}) {
  let query = supabase
    .schema('common')
    .from('contacts')
    .select(`*`, { count: 'exact' })
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error querying contacts:', error);
    throw error;
  }

  return { data, count };
}

/**
 * Queries neta_ops.assets
 */
export async function queryAssets({
  limit = 20,
  offset = 0,
  orderBy = 'created_at',
  orderDirection = 'desc'
} = {}) {
  const { data, error, count } = await supabase
    .schema('neta_ops')
    .from('assets')
    .select(`*`, { count: 'exact' })
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error querying assets:', error);
    throw error;
  }

  return { data, count };
}

/**
 * Queries neta_ops.job_assets for a specific job
 */
export async function queryJobAssets(jobId) {
  const { data, error } = await supabase
    .schema('neta_ops')
    .from('job_assets')
    .select(`
      asset_id,
      assets:asset_id(*)
    `)
    .eq('job_id', jobId);

  if (error) {
    console.error('Error querying job assets:', error);
    throw error;
  }

  return data || [];
} 