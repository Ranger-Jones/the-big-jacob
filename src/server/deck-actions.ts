'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { copyDeck, createDeck, deleteDeck, setDeckPublic, setDefaultDeck, toggleDeckLike, updateDeck } from './deck-service';
import { fail } from './result';

const id = z.string().min(1).max(64);

export async function createDeckAction(name: string, design: unknown) {
  const user = await requireUser();
  const res = await createDeck(createAdminClient(), user.id, name, design);
  revalidatePath('/decks');
  return res;
}

export async function updateDeckAction(deckId: string, name: string, design: unknown) {
  const user = await requireUser();
  if (!id.safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await updateDeck(createAdminClient(), user.id, deckId, name, design);
  revalidatePath('/decks');
  return res;
}

export async function deleteDeckAction(deckId: string) {
  const user = await requireUser();
  if (!id.safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await deleteDeck(createAdminClient(), user.id, deckId);
  revalidatePath('/decks');
  return res;
}

export async function copyDeckAction(deckId: string) {
  const user = await requireUser();
  if (!id.safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await copyDeck(createAdminClient(), user.id, deckId);
  revalidatePath('/decks');
  return res;
}

export async function setDefaultDeckAction(deckId: string | null) {
  const user = await requireUser();
  if (deckId !== null && !id.safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await setDefaultDeck(createAdminClient(), user.id, deckId);
  revalidatePath('/decks');
  return res;
}

export async function setDeckPublicAction(deckId: string, isPublic: boolean) {
  const user = await requireUser();
  if (!z.uuid().safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await setDeckPublic(createAdminClient(), user.id, deckId, isPublic === true);
  revalidatePath('/decks');
  return res;
}

export async function toggleDeckLikeAction(deckId: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(deckId).success) return fail('Deck nicht gefunden.');
  const res = await toggleDeckLike(createAdminClient(), user.id, deckId);
  revalidatePath('/decks');
  return res;
}
