import { useContext } from 'react';
import { AuthContext } from '../lib/AuthContext';

type AuthContextType = {
  user: any | null;
  setUser: (user: any | null) => void;
  loading: boolean;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 