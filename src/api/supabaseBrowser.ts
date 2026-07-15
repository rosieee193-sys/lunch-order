import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function isGoogleAuthConfigured() {
  return Boolean(url?.trim() && anonKey?.trim());
}

export function getBrowserSupabase() {
  if (!isGoogleAuthConfigured()) return null;
  if (!client) {
    client = createClient(url!.trim(), anonKey!.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
