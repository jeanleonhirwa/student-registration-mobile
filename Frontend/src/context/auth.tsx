import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, setUnauthorizedHandler, type AuthResult, type Role, type User } from '@/lib/api';
import { storage } from '@/lib/storage';

type AuthContextValue = {
  user: User | null;
  /** True while the saved session is being restored on app start. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const TOKEN_KEY = 'auth-token';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback(async ({ user: u, token }: AuthResult) => {
    setAuthToken(token);
    await storage.set(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await storage.remove(TOKEN_KEY);
    setUser(null);
  }, []);

  // Restore a saved session on launch.
  useEffect(() => {
    (async () => {
      const token = await storage.get(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        try {
          setUser(await api.get<User>('/auth/me'));
        } catch (e: any) {
          // Only drop the token when the server rejected it; keep it if just offline.
          if (e?.status === 401) await logout();
        }
      }
      setLoading(false);
    })();
  }, [logout]);

  // Expired/invalid token on any request → back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      await startSession(await api.post<AuthResult>('/auth/login', { email, password }));
    },
    [startSession]
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; role: Role }) => {
      await startSession(await api.post<AuthResult>('/auth/register', input));
    },
    [startSession]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
