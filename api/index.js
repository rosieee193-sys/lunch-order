import 'dotenv/config';
import { createApp } from '../server/createApp.js';
import { initStore } from '../server/store.js';

const app = createApp();

let ready = null;
function ensureReady() {
  if (!ready) ready = initStore();
  return ready;
}

export default async function handler(req, res) {
  await ensureReady();
  return app(req, res);
}
