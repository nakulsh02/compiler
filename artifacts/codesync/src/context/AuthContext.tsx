import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken, clearToken } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('codesync_token');
    if (token) {
      api.auth.me()
        .then(({ user }) => setUser(user))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function signUp(email: string, password: string, displayName?: string) {
    try {
      const { token, user } = await api.auth.signup(email, password, displayName);
      setToken(token);
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { token, user } = await api.auth.signin(email, password);
      setToken(token);
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signOut() {
    clearToken();
    setUser(null);
  }

  async function updateProfile(updates: Partial<User>) {
    try {
      const { user: updated } = await api.auth.updateProfile({
        display_name: updates.display_name,
        avatar_url: updates.avatar_url,
      });
      setUser(updated);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile }}>
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
