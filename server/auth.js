import jwt from 'jsonwebtoken';
import { getSupabase, isSupabaseEnabled } from './supabaseClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lunch-order-dev-secret-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/** Email được cấp Super Admin (Google), phân tách bằng dấu phẩy */
function superAdminEmails() {
  const raw = process.env.SUPER_ADMIN_EMAILS || 'linhptn@dinogames.gg';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return superAdminEmails().includes(String(email).trim().toLowerCase());
}

export function verifyCredentials(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return { role: 'admin', username };
  }
  return null;
}

export function signToken(username, role, extra = {}) {
  return jwt.sign({ role, username, ...extra }, JWT_SECRET, { expiresIn: '7d' });
}

function supabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || '';
}

function supabaseApiKey() {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''
  );
}

function mapUser(user) {
  const email = String(user.email || '')
    .trim()
    .toLowerCase();
  if (!email) return null;
  return {
    email,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email,
    avatarUrl:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
  };
}

/** Xác thực JWT user qua Auth REST (không phụ thuộc service_role js client). */
async function fetchUserViaRest(accessToken) {
  const base = supabaseUrl();
  const apikey = supabaseApiKey();
  if (!base || !apikey) {
    return { ok: false, error: 'Thiếu SUPABASE_URL hoặc anon/service key trên server' };
  }
  const res = await fetch(`${base}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data.msg || data.error_description || data.message || 'Token Google/Supabase không hợp lệ',
    };
  }
  const mapped = mapUser(data);
  if (!mapped) {
    return { ok: false, error: 'Token Google/Supabase không hợp lệ' };
  }
  return { ok: true, user: mapped, raw: data };
}

/**
 * Xác thực access_token từ Supabase Auth (sau Google login).
 * Chỉ email trong SUPER_ADMIN_EMAILS được cấp role admin.
 */
export async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken) {
    return { ok: false, error: 'Thiếu access_token' };
  }

  let mapped = null;

  // 1) REST + anon/service key (ổn định trên Vercel)
  const rest = await fetchUserViaRest(accessToken);
  if (rest.ok) {
    mapped = rest.user;
  } else if (isSupabaseEnabled()) {
    // 2) Fallback supabase-js service role
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      mapped = mapUser(data.user);
    } else {
      return { ok: false, error: rest.error || error?.message || 'Token không hợp lệ' };
    }
  } else {
    return { ok: false, error: rest.error };
  }

  if (!mapped?.email) {
    return { ok: false, error: 'Token Google/Supabase không hợp lệ' };
  }

  if (!isSuperAdminEmail(mapped.email)) {
    return {
      ok: false,
      error: `Tài khoản ${mapped.email} chưa được cấp quyền Super Admin`,
    };
  }

  return {
    ok: true,
    username: mapped.email,
    email: mapped.email,
    role: 'admin',
    name: mapped.name,
    avatarUrl: mapped.avatarUrl,
  };
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdminRole(role) {
  return role === 'admin';
}
