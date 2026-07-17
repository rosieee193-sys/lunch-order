import {
  verifyCredentials,
  signToken,
  verifyToken,
  isAdminRole,
  verifyGoogleAccessToken,
} from '../server/auth.js';
import {
  getStateFresh,
  dispatchAction,
  initStore,
  isStoreReady,
} from '../server/store.js';
import { storageMode } from '../server/stateRepo.js';

let readyPromise = null;

export function ensureStore() {
  if (!readyPromise) {
    readyPromise = initStore().catch((err) => {
      console.error('[api] initStore failed', err);
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

export function authFromReq(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : null;
  const payload = token ? verifyToken(token) : null;
  return {
    token,
    payload,
    isAdmin: isAdminRole(payload?.role),
    username: payload?.username ?? 'guest',
  };
}

export async function readJsonBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body || '{}');
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(data));
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return true;
  }
  return false;
}

export {
  verifyCredentials,
  signToken,
  verifyGoogleAccessToken,
  getStateFresh,
  dispatchAction,
  isStoreReady,
  storageMode,
};
