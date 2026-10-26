'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hasArt } from '@/components/deck/art';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { createCourt, joinCourt, leaveCourt, removeCourtMember, renameCourt } from './court-service';
import { normalizeCode } from './game-service';
import { fail } from './result';

const uuid = z.uuid();
const courtInput = z.object({
  name: z.string().trim().min(2, 'Der Name braucht mindestens 2 Zeichen.').max(40, 'Höchstens 40 Zeichen.'),
  crest: z.string().refine((id) => hasArt(id), 'Unbekanntes Wappen.'),
});

export async function createCourtAction(input: { name: string; crest: string }) {
  const user = await requireUser();
  const parsed = courtInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await createCourt(createAdminClient(), user.id, parsed.data.name, parsed.data.crest);
  revalidatePath('/hoefe');
  return res;
}

export async function joinCourtAction(code: string) {
  const user = await requireUser();
  const c = normalizeCode(String(code ?? ''));
  if (c.length !== 8) return fail('Der Einladungscode hat 8 Zeichen.');
  const res = await joinCourt(createAdminClient(), user.id, c);
  revalidatePath('/hoefe');
  return res;
}

export async function leaveCourtAction(courtId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(courtId).success) return fail('Hof nicht gefunden.');
  const res = await leaveCourt(createAdminClient(), user.id, courtId);
  revalidatePath('/hoefe');
  return res;
}

export async function removeCourtMemberAction(courtId: string, memberId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(courtId).success || !uuid.safeParse(memberId).success) return fail('Mitglied nicht gefunden.');
  const res = await removeCourtMember(createAdminClient(), user.id, courtId, memberId);
  revalidatePath(`/hoefe/${courtId}`);
  return res;
}

export async function updateCourtAction(courtId: string, input: { name: string; crest: string }) {
  const user = await requireUser();
  const parsed = courtInput.safeParse(input);
  if (!uuid.safeParse(courtId).success) return fail('Hof nicht gefunden.');
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await renameCourt(createAdminClient(), user.id, courtId, parsed.data.name, parsed.data.crest);
  revalidatePath(`/hoefe/${courtId}`);
  return res;
}
