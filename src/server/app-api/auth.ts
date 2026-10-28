import 'server-only';
import { createAdminClient, type AdminClient } from '@/lib/supabase/admin';

export interface AppUser {
  id: string; username: string; avatar_url: string | null; avatar_frame: string | null;
  table_felt: string | null; xp: number; rating: number;
}

/** The mobile app sends the Supabase access token as a bearer token (no cookies). */
export async function appUser(request: Request, admin: AdminClient = createAdminClient()): Promise<AppUser | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token.length > 4096) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await admin.from('profiles')
    .select('id, username, avatar_url, avatar_frame, table_felt, xp, rating').eq('id', user.id).maybeSingle();
  return data;
}
