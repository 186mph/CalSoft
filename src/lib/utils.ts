import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from './supabase';

// Add TypeScript declaration for import.meta.env (used by Vite)
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    [key: string]: string | boolean | undefined;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }
}

/**
 * Merges Tailwind CSS classes together
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts and processes tokens from the URL for Supabase authentication flows
 * @param url The full URL with authentication parameters
 * @returns Promise resolving to the verification result
 */
export async function processAuthToken(url: string) {
  try {
    console.log('Processing auth URL:', url);
    
    // Check if we have a hash fragment first (Supabase often uses these)
    const hashFragment = url.split('#')[1];
    if (hashFragment) {
      // The fragment might contain the access_token
      const hashParams = new URLSearchParams(hashFragment);
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('Found access_token in URL hash');
        
        // Let Supabase handle the session with the existing hash
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        return { 
          success: !!data.session, 
          data, 
          error: null 
        };
      }
    }
    
    // If no hash with access_token, check for specific parameters
    const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const token = urlParams.get('token');
    const type = urlParams.get('type') || '';
    const refreshToken = urlParams.get('refresh_token');
    
    if (token) {
      console.log('Found token parameter in URL', { type });
      
      if (type === 'recovery') {
        // Password reset flow
        await supabase.auth.resetPasswordForEmail(token);
        return { 
          success: true, 
          data: { type: 'recovery' }, 
          error: null 
        };
      } else if (type === 'signup' || type === 'email') {
        // Email verification
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });
        
        return { 
          success: !error, 
          data: data || { type: 'signup' }, 
          error 
        };
      }
    } else if (refreshToken) {
      // Handle refresh token flow
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      
      return { 
        success: !!data.session, 
        data, 
        error 
      };
    }
    
    // If we reach here, try a generic getSession call as fallback
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
      return { success: true, data, error: null };
    }
    
    // No valid tokens found
    return { 
      success: false, 
      data: null, 
      error: new Error('No valid authentication parameters found in URL') 
    };
  } catch (error) {
    console.error('Error processing auth token:', error);
    return { 
      success: false, 
      data: null, 
      error 
    };
  }
}

/**
 * Formats a UUID string to be properly used in SQL queries
 * @param uuid The UUID string to format
 * @returns Properly quoted UUID string for SQL
 */
export function formatUUID(uuid: string): string {
  // Remove any existing quotes just to be safe
  const cleanUuid = uuid.replace(/['"]/g, '');
  
  // Return the UUID with proper SQL single quotes
  return `'${cleanUuid}'`;
} 
