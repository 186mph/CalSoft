import { supabase } from '../lib/supabase';

/**
 * Gets the next sequential asset ID for a customer in the format customer_id-number
 * Only used for Calibration Division
 */
export const getNextAssetId = async (customerId: string): Promise<string | null> => {
  console.log('=== DEBUG: getNextAssetId called with customerId:', customerId);
  
  try {
    // Only proceed if we have a valid customer ID
    if (!customerId) {
      console.error('=== DEBUG: Invalid customer ID provided to getNextAssetId');
      return null;
    }
    
    // Ensure we're using a simple numeric ID, not a UUID
    let normalizedCustomerId = customerId;
    if (customerId.includes('-')) {
      console.log('=== DEBUG: customerId appears to be a UUID, using default "1" instead');
      normalizedCustomerId = '1';
    }
    
    console.log('=== DEBUG: Using normalized customerId for RPC call:', normalizedCustomerId);
    
    // Use the RPC function to get the next asset ID
    const { data, error } = await supabase.rpc(
      'get_next_asset_id',
      { p_customer_id: normalizedCustomerId }
    );
    
    if (error) {
      console.error('=== DEBUG: Error calling get_next_asset_id RPC:', error);
      return null;
    }
    
    console.log('=== DEBUG: get_next_asset_id RPC returned:', data);
    return data;
  } catch (error) {
    console.error('=== DEBUG: Exception in getNextAssetId:', error);
    return null;
  }
}; 