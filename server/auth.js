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

/** Domain workspace được phép đăng nhập Google, phân tách bằng dấu phẩy */
function allowedGoogleDomains() {
  const raw = process.env.ALLOWED_GOOGLE_DOMAINS || 'dinogames.gg';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return superAdminEmails().includes(String(email).trim().toLowerCase());
}

export function isAllowedGoogleEmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  if (isSuperAdminEmail(normalized)) return true;
  const at = normalized.lastIndexOf('@');
  if (at < 0) return false;
  const domain = normalized.slice(at + 1);
  return allowedGoogleDomains().includes(domain);
}

export function roleForGoogleEmail(email) {
  return isSuperAdminEmail(email) ? 'admin' : 'member';
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
 * - Email thuộc ALLOWED_GOOGLE_DOMAINS (mặc định dinogames.gg) được đăng nhập
 * - SUPER_ADMIN_EMAILS → role admin; còn lại → member
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

  if (!isAllowedGoogleEmail(mapped.email)) {
    const domains = allowedGoogleDomains().join(', ');
    return {
      ok: false,
      error: `Chỉ tài khoản Google thuộc workspace (${domains}) được đăng nhập. Email: ${mapped.email}`,
    };
  }

  const role = roleForGoogleEmail(mapped.email);

  return {
    ok: true,
    username: mapped.email,
    email: mapped.email,
    role,
    name: mapped.name,
    avatarUrl: mapped.avatarUrl,
  };
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin' && payload.role !== 'member') return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdminRole(role) {
  return role === 'admin';
}
