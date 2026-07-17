import { handleOptions, sendJson, authFromReq } from '../_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  const { payload } = authFromReq(req);
  if (!payload) {
    return sendJson(res, 200, { authenticated: false });
  }
  sendJson(res, 200, {
    authenticated: true,
    username: payload.username,
    role: payload.role,
    email: payload.email ?? null,
    name: payload.name ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    auth: payload.auth ?? 'password',
  });
}
