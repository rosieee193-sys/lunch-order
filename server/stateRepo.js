import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase, isSupabaseEnabled } from './supabaseClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'data', 'state.json');
const STATE_ID = 'main';

export function storageMode() {
  return isSupabaseEnabled() ? 'supabase' : 'file';
}

/** @returns {Promise<object|null>} raw state or null if empty */
export async function loadRawState() {
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', STATE_ID)
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase load failed: ${error.message}`);
    }
    if (!data?.data || typeof data.data !== 'object') return null;
    return data.data;
  }

  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {
    /* ignore corrupt local file */
  }
  return null;
}

function scrubForJsonb(state) {
  return JSON.parse(
    JSON.stringify(state, (_key, value) =>
      typeof value === 'string' ? value.replace(/\u0000/g, '') : value,
    ),
  );
}

/** @param {object} state */
export async function saveRawState(state) {
  const payload = scrubForJsonb(state);
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('app_state').upsert(
      {
        id: STATE_ID,
        data: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) {
      throw new Error(`Supabase save failed: ${error.message}`);
    }
    return;
  }

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}
