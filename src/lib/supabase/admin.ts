import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Next.js memoizes identical GET fetches within one render. Game state can change mid-render
 * (e.g. joining via link), so every request runs fresh.
 */
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store', signal: init?.signal ?? new AbortController().signal });

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY fehlen');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: freshFetch },
  });
}
export type AdminClient = ReturnType<typeof createAdminClient>;
