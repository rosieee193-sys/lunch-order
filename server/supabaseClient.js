import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function isSupabaseEnabled() {
  return Boolean(url && key);
}

let client = null;

export function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
