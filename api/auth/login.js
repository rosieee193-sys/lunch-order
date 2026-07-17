import {
  handleOptions,
  sendJson,
  readJsonBody,
  verifyCredentials,
  signToken,
} from '../_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await readJsonBody(req);
    const { username, password } = body;
    if (!username || !password) {
      return sendJson(res, 400, { error: 'Thiếu username hoặc password' });
    }
    const cred = verifyCredentials(username, password);
    if (!cred) {
      return sendJson(res, 401, { error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = signToken(cred.username, cred.role);
    sendJson(res, 200, {
      token,
      username: cred.username,
      role: cred.role,
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Lỗi đăng nhập' });
  }
}
