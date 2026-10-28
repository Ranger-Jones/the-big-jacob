import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n/server';
import { isGateOpen } from '@/lib/gate-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, requireUser } from '@/lib/supabase/server';
import { USERNAME_RE } from '@/lib/username';
import { listFriends, type ProfileLite } from '@/server/social-service';
import { FriendsClient } from './friends-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Freunde') };
}

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ add?: string | string[] }> }) {
  const rawAdd = (await searchParams).add;
  const add = typeof rawAdd === 'string' && USERNAME_RE.test(rawAdd.trim()) ? rawAdd.trim() : null;

  // A scanned friend code should survive the login detour.
  if (add && (await isGateOpen()) && !(await getCurrentUser())) {
    redirect(`/login?next=${encodeURIComponent(`/freunde?add=${add}`)}`);
  }

  const user = await requireUser();
  const admin = createAdminClient();
  const lists = await listFriends(admin, user.id);

  // ?add=<username> (friend QR code): look the person up by username (exact, ignoring case). Hidden for myself and
  // for anyone who is already a friend or has a pending request in either direction.
  let addProfile: ProfileLite | null = null;
  if (add) {
    const { data } = await admin.from('profiles').select('id, username, avatar_url, avatar_frame').ilike('username', add.replace(/_/g, '\\_')).maybeSingle();
    const known = new Set([...lists.friends, ...lists.incoming, ...lists.outgoing].map((f) => f.profile.id));
    if (data && data.id !== user.id && !known.has(data.id)) addProfile = data;
  }

  return <FriendsClient me={user.id} lists={lists} addProfile={addProfile} hasAddParam={rawAdd !== undefined} />;
}
