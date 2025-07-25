import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { processAuthToken } from '../../lib/utils';
import { queryByUUID } from '../../lib/supabaseHelpers';
import { Session, User } from '@supabase/supabase-js';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Process the auth callback
    const handleAuthCallback = async () => {
      setLoading(true);
      try {
        // Get the full URL including the hash fragment
        const fullUrl = window.location.href;
        console.log('Processing auth callback from URL:', fullUrl);
        
        // Check if we're getting a direct Supabase callback that needs fixing
        if (fullUrl.includes('supabase.co/ampos.io')) {
          console.log('Detected direct Supabase URL, extracting token...');
          
          // Extract the access token
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1) // Remove the # character
          );
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          if (accessToken) {
            console.log('Found access token, setting session...');
            
            // Set the session manually
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (sessionError) {
              console.error('Error setting session:', sessionError);
              throw sessionError;
            }
            
            // Proceed with successful auth
            setSuccess(true);
            setTimeout(() => {
              window.location.href = 'https://ampos.io/profile-setup';
            }, 2000);
            return;
          }
        }
        
        // Standard token processing
        const { success, data, error: authError } = await processAuthToken(fullUrl);
        
        if (!success || authError) {
          console.error('Error during auth verification:', authError);
          setError('There was a problem verifying your email. Please try again or request a new verification link.');
        } else {
          console.log('Auth verification successful:', data);

          // Extract user ID safely with type checking
          let userId: string | null = null;
          
          // Handle different response formats
          if (data && typeof data === 'object') {
            if ('session' in data && data.session && typeof data.session === 'object' && 
                'user' in data.session && data.session.user && 'id' in data.session.user) {
              userId = data.session.user.id;
            } else if ('user' in data && data.user && 'id' in data.user) {
              userId = (data.user as User).id;
            }
          }
          
          if (userId) {
            try {
              // Example of how to safely check if the user exists in the profiles table
              // Note: We use text casting and proper comparison to avoid numeric literal errors
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .filter('id::text', 'eq', userId);
              
              if (profileError) {
                console.error('Error checking user profile:', profileError);
              } else {
                console.log('Profile check result:', profileData);
              }
            } catch (err) {
              console.error('Error verifying user data:', err);
            }
          }
          
          setSuccess(true);
          // Redirect to profile setup after a short delay to show success message
          setTimeout(() => {
            // Use ampos.io domain for the profile setup route
            window.location.href = 'https://ampos.io/profile-setup';
          }, 2000);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [location, navigate]);

  // Show appropriate UI based on the state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
        <p className="text-gray-600">Please wait while we complete the verification process.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.href = 'https://ampos.io/login'}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Email Verified Successfully!</h2>
          <p>You will be redirected to complete your profile in a moment...</p>
        </div>
      </div>
    );
  }

  // Fallback UI (should not typically be seen)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <p>Processing your verification...</p>
    </div>
  );
} 