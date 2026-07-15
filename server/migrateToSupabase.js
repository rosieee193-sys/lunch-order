/**
 * Migrate server/data/state.json → Supabase app_state
 * Usage: node server/migrateToSupabase.js
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSupabaseEnabled } from './supabaseClient.js';
import { saveRawState, loadRawState, storageMode } from './stateRepo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

if (!isSupabaseEnabled()) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

if (!fs.existsSync(STATE_FILE)) {
  console.error('Không thấy', STATE_FILE);
  process.exit(1);
}

const local = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
console.log('Storage mode:', storageMode());
console.log('Uploading local state.json → Supabase...');
await saveRawState(local);
const check = await loadRawState();
console.log(
  'OK. Supabase có',
  check?.members?.length ?? 0,
  'thành viên,',
  check?.restaurants?.length ?? 0,
  'quán,',
  Object.keys(check?.orderHistory ?? {}).length,
  'ngày lịch sử.',
);
