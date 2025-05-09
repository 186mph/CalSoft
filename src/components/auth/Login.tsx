import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../theme/theme-provider';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { Button, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input } from '../ui';
import Card from '../ui/Card';
import { EditProfilePopup } from '../profile/EditProfilePopup';

// Helper function to clear only user-specific storage
const clearAllStorage = () => {
  try {
    // Save essential data
    const themePreference = localStorage.getItem('vite-ui-theme');
    const supabaseAuth = localStorage.getItem('sb-auth-token');
    
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Clear only specific items from localStorage
    keys.forEach(key => {
      // Keep theme, auth token, and Supabase cache data
      if (!key.includes('theme') && 
          !key.includes('sb-auth-token') && 
          !key.startsWith('sb-') && 
          !key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear only user-specific sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (!key.includes('supabase') && !key.startsWith('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Remove only user-specific cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      // Keep theme, auth, and Supabase-related cookies
      if (!name.includes('theme') && 
          !name.includes('sb-') && 
          !name.includes('supabase')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    
    console.log("User-specific storage cleared while preserving app data");
  } catch (e) {
    console.error("Storage clear failed:", e);
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Store the current theme and force light mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('vite-ui-theme') as 'light' | 'dark' | 'system';
    setTheme('light');

    // Restore the previous theme when component unmounts
    return () => {
      if (savedTheme && savedTheme !== 'light') {
        setTheme(savedTheme);
      }
    };
  }, [setTheme]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/portal');
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      
      navigate('/portal');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check email domain
    if (!email.endsWith('@ampqes.com')) {
      setError('Only @ampqes.com email addresses are allowed to create accounts.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting signup with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: email
          }
        },
      });

      if (error) throw error;

      if (data?.user) {
        console.log('Signup successful, user:', data.user.id);
        setShowProfileSetup(true);
        setError('Account created successfully! Please check your email for a verification link.');
      } else {
        console.log('No user data returned from signup');
        setError('Account created! Please check your email for a verification link.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetupComplete = () => {
    // This function might not be needed here anymore if setup happens on a different page
    // Or it could navigate the user away after setup
    setShowProfileSetup(false);
    navigate('/portal'); // Navigate to portal after setup is complete
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AMP%20Logo-FdmXGeXuGBlr2AcoAFFlM8AqzmoyM1.png"
            alt="AMP Logo"
            className="h-24"
          />
        </div>
        <p className="mt-1 text-sm text-gray-600 text-center">
          {isSignUpMode ? 'Create your account to get started' : 'Sign in to your account to continue'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-amber-200/50 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              {isSignUpMode ? 'Create Account' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isSignUpMode 
                ? 'Enter your email and password to create your account' 
                : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form className="space-y-4" onSubmit={isSignUpMode ? handleSignUp : handleSubmit}>
              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-gray-500" />}
                placeholder="you@example.com"
                className="bg-white border-gray-200"
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUpMode ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-gray-500" />}
                minLength={6}
                hint={isSignUpMode ? "Password must be at least 6 characters" : undefined}
                className="bg-white border-gray-200"
              />

              {error && (
                <div className={`rounded-lg p-4 ${
                  error.startsWith('Success') 
                    ? 'bg-amber-50 border border-amber-200 text-amber-800' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <div className="text-sm">
                    {error}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  fullWidth
                  isLoading={loading}
                  leftIcon={isSignUpMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  className="bg-amp-orange-500 hover:bg-amp-orange-600 text-white border-transparent"
                >
                  {isSignUpMode ? 'Create Account' : 'Sign in'}
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col">
            <div className="relative w-full mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-600">
                  {isSignUpMode ? 'Already have an account?' : 'New to AMP Field?'}
                </span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setError(null);
              }}
              disabled={loading}
              leftIcon={isSignUpMode ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {isSignUpMode ? 'Sign in instead' : 'Create account'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Remove the direct rendering of EditProfilePopup from the Login component */}
      {/* {showProfileSetup && (
        <EditProfilePopup
          isOpen={showProfileSetup}
          onClose={handleProfileSetupComplete}
          currentUser={{
            email: email // This would need the actual user object after verification
          }}
          isNewUser={true}
        />
      )} */}
    </div>
  );
}