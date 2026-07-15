import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, UserRole } from '../types';
import {
  getBrowserSupabase,
  isGoogleAuthConfigured,
} from '../api/supabaseBrowser';

const TOKEN_KEY = 'lunch-order-token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  logout: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  googleAuthEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function exchangeGoogleToken(accessToken: string) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: (data.error as string) ?? 'Đăng nhập Google thất bại' };
  }
  return {
    token: data.token as string,
    username: data.username as string,
    role: data.role as UserRole,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const supabase = getBrowserSupabase();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const accessToken = data.session?.access_token;
          if (accessToken) {
            const exchanged = await exchangeGoogleToken(accessToken);
            if (!cancelled && !exchanged.error && exchanged.token) {
              localStorage.setItem(TOKEN_KEY, exchanged.token);
              setToken(exchanged.token);
              setUser({
                username: exchanged.username!,
                role: exchanged.role!,
              });
              setLoading(false);
              return;
            }
            if (exchanged.error) {
              await supabase.auth.signOut();
            }
          }
        }

        const stored = localStorage.getItem(TOKEN_KEY);
        if (!stored) {
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated) {
          setUser({
            username: data.username,
            role: data.role as UserRole,
          });
          setToken(stored);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Đăng nhập thất bại';
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser({ username: data.username, role: data.role });
    return null;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      return 'Chưa cấu hình VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY';
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) return error.message;
    return null;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    const supabase = getBrowserSupabase();
    void supabase?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      loginWithGoogle,
      logout,
      isAdmin: user?.role === 'admin',
      isLoggedIn: !!user,
      googleAuthEnabled: isGoogleAuthConfigured(),
    }),
    [user, token, loading, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
