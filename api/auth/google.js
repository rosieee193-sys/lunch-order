import {
  handleOptions,
  sendJson,
  readJsonBody,
  verifyGoogleAccessToken,
  signToken,
} from '../_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await readJsonBody(req);
    const accessToken = body.access_token;
    if (!accessToken) {
      return sendJson(res, 400, { error: 'Thiếu access_token' });
    }
    const result = await verifyGoogleAccessToken(accessToken);
    if (!result.ok) {
      return sendJson(res, 403, { error: result.error });
    }
    const token = signToken(result.username, result.role, {
      email: result.email,
      name: result.name,
      avatarUrl: result.avatarUrl,
      auth: 'google',
    });
    sendJson(res, 200, {
      token,
      username: result.username,
      role: result.role,
      email: result.email,
      name: result.name,
      avatarUrl: result.avatarUrl,
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Lỗi xác thực Google' });
  }
}
