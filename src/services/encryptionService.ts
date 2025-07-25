import { supabase } from '../lib/supabase';
import * as crypto from '../lib/crypto';

// Key constants
const ENCRYPTION_CONFIG_KEY = 'encryptionSettings';
const KEY_ROTATION_INTERVAL_DAYS = 90; // Default key rotation interval

// Initialization status
let isInitialized = false;

/**
 * Initialize the encryption service
 * This should be called early in the application bootstrap process
 */
export const initEncryptionService = async (): Promise<boolean> => {
  try {
    // Try to get existing encryption settings from the system_config table
    const { data, error } = await supabase
      .from('common.system_config')
      .select('value')
      .eq('key', ENCRYPTION_CONFIG_KEY)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error code
      console.error('Error fetching encryption config:', error);
      return false;
    }

    let encryptionKey: string;
    
    if (!data) {
      // First-time setup: Generate a new encryption key
      encryptionKey = crypto.generateEncryptionKey();
      
      // Store the encryption settings
      const { error: insertError } = await supabase
        .from('common.system_config')
        .insert({
          key: ENCRYPTION_CONFIG_KEY,
          value: {
            currentKey: encryptionKey,
            created: new Date().toISOString(),
            rotationIntervalDays: KEY_ROTATION_INTERVAL_DAYS,
            previousKeys: [] // Store previous keys for data that hasn't been re-encrypted yet
          }
        });
      
      if (insertError) {
        console.error('Failed to store encryption settings:', insertError);
        return false;
      }
    } else {
      // Use existing key
      encryptionKey = data.value.currentKey;
      
      // Check if key rotation is needed
      const keyCreatedDate = new Date(data.value.created);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - keyCreatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCreation >= (data.value.rotationIntervalDays || KEY_ROTATION_INTERVAL_DAYS)) {
        await rotateEncryptionKey();
        // Re-fetch the encryption settings after rotation
        const { data: updatedData, error: refetchError } = await supabase
          .from('common.system_config')
          .select('value')
          .eq('key', ENCRYPTION_CONFIG_KEY)
          .single();
          
        if (refetchError) {
          console.error('Error fetching updated encryption config:', refetchError);
          return false;
        }
        
        encryptionKey = updatedData.value.currentKey;
      }
    }

    // Initialize the crypto library with the key
    crypto.initEncryption(encryptionKey);
    isInitialized = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize encryption service:', err);
    return false;
  }
};

/**
 * Rotate the encryption key
 * This creates a new key while keeping the old one for decryption of existing data
 */
export const rotateEncryptionKey = async (): Promise<boolean> => {
  try {
    // Fetch current encryption settings
    const { data, error } = await supabase
      .from('common.system_config')
      .select('value')
      .eq('key', ENCRYPTION_CONFIG_KEY)
      .single();
      
    if (error) {
      console.error('Error fetching encryption config for rotation:', error);
      return false;
    }
    
    const currentSettings = data.value;
    const newKey = crypto.generateEncryptionKey();
    
    // Store the old key in previous keys list
    const previousKeys = currentSettings.previousKeys || [];
    previousKeys.push({
      key: currentSettings.currentKey,
      created: currentSettings.created,
      retired: new Date().toISOString()
    });
    
    // Update with new key
    const { error: updateError } = await supabase
      .from('common.system_config')
      .update({
        value: {
          currentKey: newKey,
          created: new Date().toISOString(),
          rotationIntervalDays: currentSettings.rotationIntervalDays || KEY_ROTATION_INTERVAL_DAYS,
          previousKeys
        }
      })
      .eq('key', ENCRYPTION_CONFIG_KEY);
      
    if (updateError) {
      console.error('Failed to update encryption key:', updateError);
      return false;
    }
    
    // Use the new key
    crypto.initEncryption(newKey);
    return true;
  } catch (err) {
    console.error('Failed to rotate encryption key:', err);
    return false;
  }
};

/**
 * Encrypt sensitive data
 * @param data The data to encrypt
 * @returns Encrypted string or null if encryption fails
 */
export const encryptData = (data: string): string | null => {
  if (!isInitialized) {
    console.error('Encryption service not initialized');
    return null;
  }
  
  try {
    return crypto.encrypt(data);
  } catch (err) {
    console.error('Encryption failed:', err);
    return null;
  }
};

/**
 * Decrypt sensitive data
 * @param encryptedData The encrypted data
 * @returns Decrypted string or null if decryption fails
 */
export const decryptData = (encryptedData: string): string | null => {
  if (!isInitialized) {
    console.error('Encryption service not initialized');
    return null;
  }
  
  try {
    return crypto.decrypt(encryptedData);
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
};

/**
 * Encrypt specific fields in a data object
 * @param data The data object
 * @param fieldsToEncrypt Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export const encryptFields = <T extends Record<string, any>>(
  data: T, 
  fieldsToEncrypt: (keyof T)[]
): T => {
  if (!isInitialized) {
    console.error('Encryption service not initialized');
    return data;
  }
  
  try {
    return crypto.encryptFields(data, fieldsToEncrypt);
  } catch (err) {
    console.error('Field encryption failed:', err);
    return data;
  }
};

/**
 * Decrypt specific fields in a data object
 * @param data The data object
 * @param fieldsToDecrypt Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export const decryptFields = <T extends Record<string, any>>(
  data: T, 
  fieldsToDecrypt: (keyof T)[]
): T => {
  if (!isInitialized) {
    console.error('Encryption service not initialized');
    return data;
  }
  
  try {
    return crypto.decryptFields(data, fieldsToDecrypt);
  } catch (err) {
    console.error('Field decryption failed:', err);
    return data;
  }
};

/**
 * Hash sensitive data for secure storage (e.g., password verification)
 * @param data The data to hash
 * @returns Hashed string
 */
export const hashData = (data: string): string => {
  return crypto.hash(data);
};

/**
 * Check if the encryption service is initialized
 */
export const isEncryptionInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Get the current encryption settings (for admin use only)
 */
export const getEncryptionSettings = async (): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('common.system_config')
      .select('value')
      .eq('key', ENCRYPTION_CONFIG_KEY)
      .single();
      
    if (error) {
      console.error('Error fetching encryption settings:', error);
      return null;
    }
    
    // Don't return the actual keys, just the metadata
    return {
      created: data.value.created,
      rotationIntervalDays: data.value.rotationIntervalDays,
      previousKeysCount: (data.value.previousKeys || []).length
    };
  } catch (err) {
    console.error('Failed to get encryption settings:', err);
    return null;
  }
}; 