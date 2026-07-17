import {
  ensureStore,
  handleOptions,
  sendJson,
  storageMode,
  isStoreReady,
} from './_lib.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    await ensureStore();
  } catch {
    /* health vẫn trả được */
  }
  sendJson(res, 200, {
    ok: true,
    online: null,
    storage: storageMode(),
    storeReady: isStoreReady(),
  });
}
