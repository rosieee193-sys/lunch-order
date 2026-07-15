import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lunch-order-dev-secret-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export function verifyCredentials(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return { role: 'admin', username };
  }
  return null;
}

export function signToken(username, role) {
  return jwt.sign({ role, username }, JWT_SECRET, { expiresIn: '7d' });
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
