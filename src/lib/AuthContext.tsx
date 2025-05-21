import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const signOut = async () => {
    try {
      setUser(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        setError(error);
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Error clearing storage:', e);
      }
    } catch (err) {
      console.error('Error in signOut:', err);
      setUser(null);
      setError(err instanceof Error ? err : new Error('Sign out failed'));
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        console.error("Initial session check failed:", sessionError);
        setError(sessionError);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch(err => {
      if (mounted) {
        console.error("Initial session promise error:", err);
        setError(err);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        console.log('onAuthStateChange event:', event, 'session:', !!session);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600">Authentication Error: {error.message}</div>
    </div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const profileIncomplete = !user.user_metadata?.name;
  if (profileIncomplete && location.pathname !== '/profile-setup') {
    console.log("User profile incomplete, redirecting to /profile-setup");
    window.location.href = 'https://ampos.io/profile-setup';
    return null;
  }

  return <>{children}</>;
}