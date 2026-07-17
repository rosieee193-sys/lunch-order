import {
  ensureStore,
  handleOptions,
  sendJson,
  getStateFresh,
} from './_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    await ensureStore();
    const state = await getStateFresh();
    sendJson(res, 200, { state, online: null });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Không tải được state' });
  }
}
