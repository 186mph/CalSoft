import { useAuth } from '../AuthContext';
import { User } from '../types/auth';

/**
 * Hook that provides easy access to the current user data
 * @returns The current user object or null if not authenticated
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export default useUser; 