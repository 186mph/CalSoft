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
      const hashParams = new URLSearchParams(hashFragment);
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('Found access_token in URL hash. Attempting supabase.auth.getSession().');
        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError || !sessionData?.session) {
          console.warn(
            'supabase.auth.getSession() failed or found no session after hash token. Attempting supabase.auth.setSession().',
            { getSessionError }
          );
          
          const refreshTokenFromHash = hashParams.get('refresh_token');
          // It's good practice to log if a refresh token is unexpectedly missing, though setSession might handle it.
          if (!refreshTokenFromHash) {
             console.warn('No refresh_token found in URL hash for setSession fallback attempt.');
          }

          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshTokenFromHash || '' // Use empty string if null, as setSession expects a string.
          });

          if (setSessionError || !setSessionData?.session) {
            console.error(
              'supabase.auth.setSession() also failed or found no session.',
              { setSessionError, originalGetSessionError: getSessionError }
            );
            // Return failure, incorporating errors from both attempts if available.
            return { 
              success: false, 
              data: null, 
              error: setSessionError || getSessionError || new Error('Failed to establish session from hash tokens') 
            };
          }
          
          console.log('Successfully established session using supabase.auth.setSession() from hash tokens.');
          return { success: true, data: setSessionData, error: null };
        }
        
        console.log('Successfully established session using supabase.auth.getSession() from hash tokens.');
        return { success: true, data: sessionData, error: null };
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

/**
 * Check if a division should use the lab_ops schema
 */
export function isLabDivision(division?: string | null): boolean {
  if (!division) return false;
  const labDivisions = ['calibration', 'lab'];
  return labDivisions.includes(division.toLowerCase());
}

/**
 * Get the accent color for a specific division
 */
export function getDivisionAccentColor(division: string | null): string {
  if (division === 'calibration') {
    return '#339C5E'; // Green for Calibration Division
  }
  return '#f26722'; // Default orange for all other divisions
}

/**
 * Get the hover accent color for a specific division
 */
export function getDivisionAccentColorHover(division: string | null): string {
  if (division === 'calibration') {
    return '#2d8a54'; // Darker green for hover state
  }
  return '#e55611'; // Default orange hover for all other divisions
}

/**
 * Get Tailwind classes for division-specific accent colors
 */
export function getDivisionAccentClasses(division: string | null): {
  bg: string;
  bgHover: string;
  text: string;
  textHover: string;
  border: string;
  ring: string;
} {
  if (division === 'calibration') {
    return {
      bg: 'bg-[#339C5E]',
      bgHover: 'hover:bg-[#2d8a54]',
      text: 'text-[#339C5E]',
      textHover: 'hover:text-[#2d8a54]',
      border: 'border-[#339C5E]',
      ring: 'focus:ring-[#339C5E]'
    };
  }
  
  return {
    bg: 'bg-[#f26722]',
    bgHover: 'hover:bg-[#e55611]',
    text: 'text-[#f26722]',
    textHover: 'hover:text-[#f26722]/90',
    border: 'border-[#f26722]',
    ring: 'focus:ring-[#f26722]'
  };
}

/**
 * Get division-aware hover classes for sidebar navigation items
 */
export function getDivisionHoverClasses(division: string | null): string {
  if (division === 'calibration') {
    return 'hover:bg-[#339C5E]/10 dark:hover:bg-[#339C5E]/20'; // Green hover for Calibration
  }
  return 'hover:bg-black/5 dark:hover:bg-dark-50'; // Default gray hover for all other divisions
}

/**
 * Get division-aware active classes for sidebar navigation items
 */
export function getDivisionActiveClasses(division: string | null): string {
  if (division === 'calibration') {
    return 'bg-[#339C5E]/10 dark:bg-[#339C5E]/20'; // Green active state for Calibration
  }
  return 'bg-black/5 dark:bg-dark-50'; // Default gray active state for all other divisions
} 
