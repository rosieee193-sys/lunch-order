import jwt from 'jsonwebtoken';
import { getSupabase, isSupabaseEnabled } from './supabaseClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lunch-order-dev-secret-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/** Email được cấp Super Admin (Google), phân tách bằng dấu phẩy */
function superAdminEmails() {
  const raw =
    process.env.SUPER_ADMIN_EMAILS || 'linhptn@dinogames.gg';
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

/**
 * Xác thực access_token từ Supabase Auth (sau Google login).
 * Chỉ email trong SUPER_ADMIN_EMAILS được cấp role admin.
 */
export async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken || !isSupabaseEnabled()) {
    return { ok: false, error: 'Supabase Auth chưa cấu hình' };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.email) {
    return { ok: false, error: 'Token Google/Supabase không hợp lệ' };
  }
  const email = data.user.email.trim().toLowerCase();
  if (!isSuperAdminEmail(email)) {
    return {
      ok: false,
      error: `Tài khoản ${email} chưa được cấp quyền Super Admin`,
    };
  }
  return {
    ok: true,
    username: email,
    email,
    role: 'admin',
    name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email,
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
