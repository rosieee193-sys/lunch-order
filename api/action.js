import {
  ensureStore,
  handleOptions,
  sendJson,
  readJsonBody,
  authFromReq,
  dispatchAction,
} from './_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    await ensureStore();
    const body = await readJsonBody(req);
    const { isAdmin } = authFromReq(req);
    const action = body.action ?? body;
    if (!action?.type) {
      return sendJson(res, 400, { ok: false, error: 'Thiếu action' });
    }
    const result = await dispatchAction(action, { isAdmin });
    if (!result.ok) {
      return sendJson(res, 403, result);
    }
    sendJson(res, 200, { ok: true, state: result.state });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message || 'Lỗi server' });
  }
}
