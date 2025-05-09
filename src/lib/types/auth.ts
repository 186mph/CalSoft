import { Session, User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Extension of the Supabase User type with additional metadata
 */
export interface User extends SupabaseUser {
  user_metadata: {
    name?: string;
    role?: string;
    bio?: string;
    division?: string;
    birthday?: string;
    profileImage?: string | null;
    coverImage?: string | null;
  };
}

/**
 * Auth context interface
 */
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<void>;
  setAuthError: (error: Error | null) => void;
}

/**
 * Simplified user data structure often used in components
 */
export interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    role?: string;
    bio?: string;
    division?: string;
    birthday?: string;
    profileImage?: string | null;
    coverImage?: string | null;
  };
  created_at?: string;
  last_sign_in_at?: string;
} 