import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function cacheGet<T>(key: string, maxAgeMs: number): Promise<T | null> {
  const { data, error } = await client()
    .from('cache')
    .select('value, fetched_at')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  if (Date.now() - Number(data.fetched_at) > maxAgeMs) return null;
  return data.value as T;
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  await client()
    .from('cache')
    .upsert({ key, value: value as unknown as object, fetched_at: Date.now() });
}

export async function cacheClear(prefix?: string): Promise<void> {
  if (prefix) {
    await client().from('cache').delete().like('key', `${prefix}%`);
  } else {
    await client().from('cache').delete().neq('key', '');
  }
}

export const TTL = {
  schema: 30 * 24 * 60 * 60 * 1000,
  globalPct: 24 * 60 * 60 * 1000,
  ownedGames: 60 * 60 * 1000,
  playerAch: 10 * 60 * 1000,
};
