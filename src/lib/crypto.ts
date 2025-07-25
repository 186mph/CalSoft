import * as CryptoJS from 'crypto-js';

// The encryption key should ideally be stored in environment variables
// and accessed securely. For real production, consider using a proper key management system.
let ENCRYPTION_KEY = '';

/**
 * Initialize the encryption system with a key
 * @param key The encryption key to use
 */
export const initEncryption = (key: string): void => {
  ENCRYPTION_KEY = key;
};

/**
 * Encrypt sensitive data
 * @param data Data to encrypt
 * @returns Encrypted string
 */
export const encrypt = (data: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initEncryption first.');
  }
  
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt encrypted data
 * @param encryptedData The encrypted string
 * @returns Decrypted string
 */
export const decrypt = (encryptedData: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initEncryption first.');
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash data for secure storage (one-way encryption)
 * @param data Data to hash
 * @returns Hashed string
 */
export const hash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Encrypt an object's sensitive fields
 * @param data Object containing sensitive data
 * @param sensitiveFields Array of field names to encrypt
 * @returns New object with encrypted fields
 */
export const encryptFields = <T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[]
): T => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initEncryption first.');
  }
  
  const result = { ...data };
  
  for (const field of sensitiveFields) {
    if (data[field] !== undefined && data[field] !== null) {
      // Add a prefix to indicate this field is encrypted
      const encryptedValue = encrypt(String(data[field]));
      result[field] = `ENC:${encryptedValue}` as unknown as T[typeof field];
    }
  }
  
  return result;
};

/**
 * Decrypt an object's encrypted fields
 * @param data Object with encrypted fields
 * @param sensitiveFields Array of field names to decrypt
 * @returns New object with decrypted fields
 */
export const decryptFields = <T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[]
): T => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initEncryption first.');
  }
  
  const result = { ...data };
  
  for (const field of sensitiveFields) {
    if (
      typeof data[field] === 'string' && 
      data[field].startsWith('ENC:')
    ) {
      try {
        // Remove the prefix and decrypt
        const encryptedValue = (data[field] as string).substring(4);
        result[field] = decrypt(encryptedValue) as unknown as T[typeof field];
      } catch (error) {
        console.error(`Failed to decrypt field: ${String(field)}`, error);
        // Keep the encrypted value if decryption fails
      }
    }
  }
  
  return result;
};

/**
 * Generate a secure random key
 * @returns A random encryption key
 */
export const generateEncryptionKey = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

/**
 * Validate if a field is encrypted
 * @param value The value to check
 * @returns True if the value is encrypted
 */
export const isEncrypted = (value: any): boolean => {
  return typeof value === 'string' && value.startsWith('ENC:');
}; 