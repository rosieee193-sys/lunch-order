import express from 'express';
import cors from 'cors';
import {
  verifyCredentials,
  signToken,
  verifyToken,
  isAdminRole,
  verifyGoogleAccessToken,
} from './auth.js';
import {
  getStateFresh,
  dispatchAction,
  isStoreReady,
} from './store.js';
import { storageMode } from './stateRepo.js';

function authFromReq(req) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  return {
    token,
    payload,
    isAdmin: isAdminRole(payload?.role),
    username: payload?.username ?? 'guest',
  };
}

function buildApiRouter() {
  const api = express.Router();

  api.get('/health', (_req, res) => {
    res.json({
      ok: true,
      online: null,
      storage: storageMode(),
      storeReady: isStoreReady(),
    });
  });

  api.get('/state', async (_req, res) => {
    try {
      const state = await getStateFresh();
      res.json({ state, online: null });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Không tải được state' });
    }
  });

  api.post('/action', async (req, res) => {
    const { isAdmin } = authFromReq(req);
    const action = req.body?.action ?? req.body;
    if (!action?.type) {
      return res.status(400).json({ ok: false, error: 'Thiếu action' });
    }
    try {
      const result = await dispatchAction(action, { isAdmin });
      if (!result.ok) {
        return res.status(403).json(result);
      }
      res.json({ ok: true, state: result.state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Lỗi server' });
    }
  });

  api.post('/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu username hoặc password' });
    }
    const cred = verifyCredentials(username, password);
    if (!cred) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = signToken(cred.username, cred.role);
    res.json({ token, username: cred.username, role: cred.role });
  });

  api.post('/auth/google', async (req, res) => {
    const { access_token: accessToken } = req.body ?? {};
    if (!accessToken) {
      return res.status(400).json({ error: 'Thiếu access_token' });
    }
    try {
      const result = await verifyGoogleAccessToken(accessToken);
      if (!result.ok) {
        return res.status(403).json({ error: result.error });
      }
      const token = signToken(result.username, result.role, {
        email: result.email,
        name: result.name,
        avatarUrl: result.avatarUrl,
        auth: 'google',
      });
      res.json({
        token,
        username: result.username,
        role: result.role,
        email: result.email,
        name: result.name,
        avatarUrl: result.avatarUrl,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message || 'Lỗi xác thực Google',
      });
    }
  });

  api.get('/auth/me', (req, res) => {
    const { payload } = authFromReq(req);
    if (!payload) return res.json({ authenticated: false });
    res.json({
      authenticated: true,
      username: payload.username,
      role: payload.role,
      email: payload.email ?? null,
      name: payload.name ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      auth: payload.auth ?? 'password',
    });
  });

  return api;
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  const api = buildApiRouter();
  // Local + Vite proxy: /api/...
  app.use('/api', api);
  // Vercel rewrite đôi khi strip /api → mount thêm ở root
  app.use(api);

  return app;
}
