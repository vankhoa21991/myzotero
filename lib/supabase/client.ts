import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = { url: 'myzotero_supabase_url', anonKey: 'myzotero_supabase_anon_key' };

/**
 * Build a synchronous storage adapter backed by an in-memory map.
 * The map is pre-populated from browser.storage.local before the client is
 * created, so that Supabase's synchronous getItem calls always resolve
 * immediately. Writes are mirrored back to browser.storage.local in the
 * background so the session survives extension restarts.
 */
function buildSyncStorage(initial: Record<string, string>) {
  const mem = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      return mem.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      mem.set(key, value);
      browser.storage.local.set({ [key]: value }).catch(() => undefined);
    },
    removeItem(key: string): void {
      mem.delete(key);
      browser.storage.local.remove(key).catch(() => undefined);
    },
  };
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const stored = await browser.storage.local.get(null);
  const url = stored[STORAGE_KEYS.url] as string | undefined;
  const anonKey = stored[STORAGE_KEYS.anonKey] as string | undefined;
  if (!url || !anonKey) return null;

  // Pre-populate memory with everything currently in browser.storage.local
  // so the sync adapter can serve Supabase's synchronous getItem calls.
  const initial: Record<string, string> = {};
  for (const [k, v] of Object.entries(stored)) {
    if (typeof v === 'string') initial[k] = v;
  }

  return createClient(url, anonKey, {
    auth: { storage: buildSyncStorage(initial), persistSession: true, autoRefreshToken: true },
  });
}

export async function setSupabaseConfig(url: string, anonKey: string): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.url]: url,
    [STORAGE_KEYS.anonKey]: anonKey,
  });
}

export async function getSupabaseConfig(): Promise<{ url: string; anonKey: string } | null> {
  const stored = await browser.storage.local.get([STORAGE_KEYS.url, STORAGE_KEYS.anonKey]);
  const url = stored[STORAGE_KEYS.url] as string | undefined;
  const anonKey = stored[STORAGE_KEYS.anonKey] as string | undefined;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function clearSupabaseConfig(): Promise<void> {
  await browser.storage.local.remove([STORAGE_KEYS.url, STORAGE_KEYS.anonKey]);
}

export type { SupabaseClient };
