'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { removeAvatar, renameUser, setAvatarUrl, setCosmetics, setQuickEmojis } from './profile-service';
import { fail } from './result';

export async function renameAction(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const username = String(form.get('username') ?? '');
  const res = await renameUser(createAdminClient(), user.id, username);
  if (!res.ok) return { error: res.error };
  revalidatePath('/', 'layout');
  redirect(`/profil/${username.trim()}`);
}

export async function setAvatarAction(url: string) {
  const user = await requireUser();
  if (typeof url !== 'string') return fail('Ungültige Bild-URL.');
  const res = await setAvatarUrl(createAdminClient(), user.id, url);
  revalidatePath('/', 'layout');
  return res;
}

export async function setQuickEmojisAction(emojis: string[]) {
  const user = await requireUser();
  return setQuickEmojis(createAdminClient(), user.id, emojis);
}

export async function removeAvatarAction() {
  const user = await requireUser();
  const res = await removeAvatar(createAdminClient(), user.id);
  revalidatePath('/', 'layout');
  return res;
}

export async function setCosmeticsAction(choice: { felt?: string; frame?: string }) {
  const user = await requireUser();
  const clean = {
    felt: typeof choice?.felt === 'string' ? choice.felt.slice(0, 32) : undefined,
    frame: typeof choice?.frame === 'string' ? choice.frame.slice(0, 32) : undefined,
  };
  const res = await setCosmetics(createAdminClient(), user.id, user.username, clean);
  revalidatePath('/', 'layout');
  return res;
}
