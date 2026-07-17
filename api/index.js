import 'dotenv/config';
import { createApp } from '../server/createApp.js';
import { initStore } from '../server/store.js';

const app = createApp();

let ready = null;
function ensureReady() {
  if (!ready) ready = initStore();
  return ready;
}

/** Chuẩn hóa path khi Vercel rewrite /api/* → /api */
function normalizeReq(req) {
  const original = req.url || '/';
  // Giữ path gốc nếu Vercel đưa qua x-forwarded hoặc query
  if (typeof original === 'string' && original.startsWith('/api')) {
    return;
  }
  // Một số runtime đưa url dạng /auth/google sau khi strip prefix
  if (typeof original === 'string' && !original.startsWith('/api')) {
    const q = original.includes('?') ? original.slice(original.indexOf('?')) : '';
    const path = original.split('?')[0] || '/';
    if (path === '/' || path === '') {
      req.url = `/api${q || ''}`;
    } else if (!path.startsWith('/api')) {
      req.url = `/api${path.startsWith('/') ? path : `/${path}`}${q}`;
    }
  }
}

export default async function handler(req, res) {
  await ensureReady();
  normalizeReq(req);
  return app(req, res);
}
