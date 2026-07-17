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
const AUTH_ERROR_KEY = 'lunch-order-auth-error';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (username: string, password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  logout: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  googleAuthEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(data: {
  username: string;
  role: UserRole;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  auth?: 'google' | 'password';
}): AuthUser {
  return {
    username: data.username,
    role: data.role,
    email: data.email ?? null,
    name: data.name ?? data.username,
    avatarUrl: data.avatarUrl ?? null,
    auth: data.auth ?? (data.email ? 'google' : 'password'),
  };
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? 'Phản hồi server không hợp lệ'
        : `API lỗi (${res.status}). Kiểm tra deploy /api trên Vercel.`,
    );
  }
}

async function exchangeGoogleToken(accessToken: string) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    return {
      error: (data.error as string) ?? 'Đăng nhập Google thất bại',
    };
  }
  return {
    token: data.token as string,
    user: toAuthUser({
      username: data.username as string,
      role: data.role as UserRole,
      email: data.email as string | undefined,
      name: data.name as string | undefined,
      avatarUrl: data.avatarUrl as string | undefined,
      auth: 'google',
    }),
  };
}

function rememberAuthError(message: string) {
  try {
    sessionStorage.setItem(AUTH_ERROR_KEY, message);
  } catch {
    /* ignore */
  }
}

function consumeAuthError() {
  try {
    const msg = sessionStorage.getItem(AUTH_ERROR_KEY);
    if (msg) sessionStorage.removeItem(AUTH_ERROR_KEY);
    return msg;
  } catch {
    return null;
  }
}

function provisionalFromSession(session: {
  user: {
    email?: string | null;
    user_metadata?: Record<string, string | undefined>;
  };
}): AuthUser | null {
  const email = session.user.email?.trim().toLowerCase();
  if (!email) return null;
  const meta = session.user.user_metadata || {};
  return toAuthUser({
    username: email,
    role: 'member',
    email,
    name: meta.full_name || meta.name || email,
    avatarUrl: meta.avatar_url || meta.picture || null,
    auth: 'google',
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(() =>
    consumeAuthError(),
  );

  const applyGoogleSession = useCallback(
    async (accessToken: string, provisional?: AuthUser | null) => {
      if (provisional) {
        setUser(provisional);
      }
      const exchanged = await exchangeGoogleToken(accessToken);
      if (exchanged.error || !exchanged.token || !exchanged.user) {
        const msg = exchanged.error || 'Đăng nhập Google thất bại';
        rememberAuthError(msg);
        setAuthError(msg);
        const supabase = getBrowserSupabase();
        await supabase?.auth.signOut();
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        return false;
      }
      localStorage.setItem(TOKEN_KEY, exchanged.token);
      setToken(exchanged.token);
      setUser(exchanged.user);
      setAuthError(null);
      return true;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();

    async function restorePasswordSession() {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        const data = await readJson(res);
        if (cancelled) return;
        if (data.authenticated) {
          setUser(
            toAuthUser({
              username: data.username as string,
              role: data.role as UserRole,
              email: data.email as string | null,
              name: data.name as string | null,
              avatarUrl: data.avatarUrl as string | null,
              auth: data.auth as 'google' | 'password' | undefined,
            }),
          );
          setToken(stored);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Không kiểm tra được phiên đăng nhập',
          );
        }
      }
    }

    async function bootstrap() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          const accessToken = session?.access_token;
          if (accessToken && session) {
            await applyGoogleSession(
              accessToken,
              provisionalFromSession(session),
            );
            return;
          }
        }
        await restorePasswordSession();
      } catch (err) {
        if (!cancelled) {
          setAuthError(
            err instanceof Error ? err.message : 'Lỗi khởi tạo đăng nhập',
          );
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (event === 'SIGNED_IN' && session?.access_token) {
            void applyGoogleSession(
              session.access_token,
              provisionalFromSession(session),
            ).finally(() => {
              if (!cancelled) setLoading(false);
            });
          }
        })
      : { data: { subscription: null } };

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [applyGoogleSession]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await readJson(res);
      if (!res.ok) return (data.error as string) ?? 'Đăng nhập thất bại';
      localStorage.setItem(TOKEN_KEY, data.token as string);
      setToken(data.token as string);
      setUser(
        toAuthUser({
          username: data.username as string,
          role: data.role as UserRole,
          name: data.username as string,
          auth: 'password',
        }),
      );
      setAuthError(null);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Đăng nhập thất bại';
    }
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
    setAuthError(null);
    const supabase = getBrowserSupabase();
    void supabase?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      authError,
      clearAuthError,
      login,
      loginWithGoogle,
      logout,
      isAdmin: user?.role === 'admin',
      isLoggedIn: !!user,
      googleAuthEnabled: isGoogleAuthConfigured(),
    }),
    [
      user,
      token,
      loading,
      authError,
      clearAuthError,
      login,
      loginWithGoogle,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
