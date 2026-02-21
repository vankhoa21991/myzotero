import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = { url: 'myzotero_supabase_url', anonKey: 'myzotero_supabase_anon_key' };

const extensionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const o = await browser.storage.local.get(key);
    return (o[key] as string) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await browser.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await browser.storage.local.remove(key);
  },
};

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const stored = await browser.storage.local.get([STORAGE_KEYS.url, STORAGE_KEYS.anonKey]);
  const url = stored[STORAGE_KEYS.url] as string | undefined;
  const anonKey = stored[STORAGE_KEYS.anonKey] as string | undefined;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { storage: extensionStorage, persistSession: true },
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
