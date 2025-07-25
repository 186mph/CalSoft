import { supabase } from '../supabase';

/**
 * Gets the next asset ID for a customer in the Calibration Division
 * in the format {customer_id}-{sequential_number}
 * This function will find the highest existing asset ID for the customer and increment from there,
 * which allows reuse of deleted asset IDs.
 */
export async function getNextAssetId(customerId: string): Promise<string | null> {
  try {
    if (!customerId) {
      console.error('Customer ID is required to generate asset ID');
      return customerId + '-1'; // Fallback to customerId-1
    }

    console.log(`getNextAssetId called with customerId: ${customerId}`);

    // Sanitize customer ID - ensure it's a simple numeric or string without special chars
    const sanitizedCustomerId = customerId.includes('-') ? '1' : customerId;
    console.log(`Using sanitized customer ID for asset generation: ${sanitizedCustomerId}`);
    
    // Check for existing assets with this customer ID prefix
    try {
      console.log(`Searching for existing assets with customer ID prefix: ${sanitizedCustomerId}-`);
      
      // Query lab_assets to find all asset IDs for this customer
      const { data: existingAssets, error: assetsError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('asset_id')
        .like('asset_id', `${sanitizedCustomerId}-%`)
        .order('asset_id', { ascending: false });
        
      if (assetsError) {
        console.error('Error querying existing assets:', assetsError);
        throw assetsError;
      }
      
      console.log(`Found ${existingAssets?.length || 0} existing assets with this customer ID`);
      
      // Find the highest existing asset ID number
      let highestNumber = 0;
      
      if (existingAssets && existingAssets.length > 0) {
        for (const asset of existingAssets) {
          if (asset.asset_id && asset.asset_id.startsWith(`${sanitizedCustomerId}-`)) {
            // Extract the number part from the asset_id
            const parts = asset.asset_id.split('-');
            if (parts.length === 2) {
              const numPart = parseInt(parts[1], 10);
              if (!isNaN(numPart) && numPart > highestNumber) {
                highestNumber = numPart;
              }
            }
          }
        }
      }
      
      console.log(`Highest existing asset ID number: ${highestNumber}`);
      
      // Next asset ID is one higher than the current highest
      const nextNumber = highestNumber + 1;
      const nextAssetId = `${sanitizedCustomerId}-${nextNumber}`;
      
      console.log(`Generated next asset ID: ${nextAssetId}`);
      
      // Still update the counter for consistency, but we're not using its value
      try {
        const { data: counterData, error: counterError } = await supabase
          .schema('lab_ops')
          .from('customer_asset_counters')
          .select('next_counter')
          .eq('customer_id', sanitizedCustomerId)
          .maybeSingle();
          
        if (!counterError && counterData) {
          // Only update if the new number is higher than the stored counter
          if (nextNumber >= counterData.next_counter) {
            await supabase
              .schema('lab_ops')
              .from('customer_asset_counters')
              .update({ 
                next_counter: nextNumber + 1,
                updated_at: new Date().toISOString()
              })
              .eq('customer_id', sanitizedCustomerId);
          }
        } else {
          // Insert new counter starting at the next value after what we're using
          await supabase
            .schema('lab_ops')
            .from('customer_asset_counters')
            .insert({ 
              customer_id: sanitizedCustomerId, 
              next_counter: nextNumber + 1,
              created_at: new Date().toISOString()
            });
        }
      } catch (counterError) {
        console.warn('Error updating counter, but continuing with generated ID:', counterError);
      }
      
      return nextAssetId;
    } catch (error) {
      console.error('Error finding highest existing asset ID:', error);
      
      // Fall back to the original counter-based method
      console.log('Falling back to counter-based method');
      return fallbackToCounterMethod(sanitizedCustomerId);
    }
  } catch (error) {
    console.error('Error in getNextAssetId:', error);
    
    // Return a deterministic fallback ID in case of error
    return `${customerId}-1-fallback`;
  }
}

/**
 * Fallback method using the counter table if querying existing assets fails
 */
async function fallbackToCounterMethod(customerId: string): Promise<string | null> {
  try {
    console.log('Using fallback counter method for:', customerId);
    
    const counterResponse = await supabase
      .schema('lab_ops')
      .from('customer_asset_counters')
      .select('next_counter')
      .eq('customer_id', customerId)
      .maybeSingle();
      
    console.log('Counter query response:', counterResponse);
    
    if (counterResponse.error || !counterResponse.data) {
      console.log('Counter not found, creating new entry with initial value 1');
      
      try {
        // Insert new counter
        await supabase
          .schema('lab_ops')
          .from('customer_asset_counters')
          .insert({ 
            customer_id: customerId, 
            next_counter: 2, // Start at 2 so first ID will be 1
            created_at: new Date().toISOString()
          });
          
        return `${customerId}-1`;  // First asset is always ID 1
      } catch (insertError) {
        console.error('Error creating counter:', insertError);
        return `${customerId}-1`;  // Fallback to default
      }
    } else {
      // Increment counter
      const currentCounter = counterResponse.data.next_counter || 1;
      const nextCounter = currentCounter + 1;
      
      console.log(`Incrementing counter from ${currentCounter} to ${nextCounter}`);
      
      try {
        await supabase
          .schema('lab_ops')
          .from('customer_asset_counters')
          .update({ 
            next_counter: nextCounter,
            updated_at: new Date().toISOString()
          })
          .eq('customer_id', customerId);
      } catch (updateError) {
        console.error('Error updating counter, but continuing with current value:', updateError);
      }
      
      return `${customerId}-${currentCounter}`;
    }
  } catch (error) {
    console.error('Fallback method failed:', error);
    return `${customerId}-${new Date().getTime()}`;  // Last resort fallback
  }
}

/**
 * Creates a new calibration asset and links it to a job
 */
export async function createCalibrationAsset(
  jobId: string,
  customerId: string,
  name: string,
  fileUrl: string,
  userId: string,
  customerIdForAsset?: string, // Added for generating asset_id
  parentReportId?: string // Added for linking to parent reports like bucket truck
): Promise<any> {
  try {
    console.log('Creating calibration asset with params:', {
      jobId,
      customerId,
      name,
      fileUrl,
      userId,
      customerIdForAsset,
      parentReportId
    });
    
    // Always generate a new asset ID for calibration assets to ensure uniqueness
    // This prevents assets created within bucket truck reports from sharing the same Asset ID
    let assetId = '';
    
    if (customerIdForAsset) {
      console.log('Generating new Asset ID for asset creation');
      const generatedAssetId = await getNextAssetId(customerIdForAsset);
      if (generatedAssetId) {
        assetId = generatedAssetId;
        console.log('Generated unique Asset ID for asset:', assetId);
      } else {
        console.warn('Failed to generate Asset ID, proceeding without Asset ID');
      }
    }
    
    // Create the asset record
    const assetData = {
      name,
      file_url: fileUrl,
      job_id: jobId,
      user_id: userId,
      created_at: new Date().toISOString(),
      ...(assetId && { asset_id: assetId }),
      ...(parentReportId && { report_id: parentReportId })
    };
    
    console.log('Creating asset with data:', assetData);
    
    const { data, error } = await supabase
      .schema('lab_ops')
      .from('lab_assets')
      .insert(assetData)
      .select()
      .single();

    if (error) {
      console.error('Error creating calibration asset:', error);
      throw error;
    }

    console.log('Successfully created calibration asset:', data);
    return data;
  } catch (error) {
    console.error('Error in createCalibrationAsset:', error);
    throw error;
  }
} 