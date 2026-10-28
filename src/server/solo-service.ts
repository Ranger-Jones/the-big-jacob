import { CAMPAIGN, stageSettings } from '@/lib/campaign';
import { berlinDay, DAILY_BOTS, DAILY_SETTINGS, daySeed } from '@/lib/daily';
import type { AdminClient } from '@/lib/supabase/admin';
import { getDefaultDeckId } from './deck-service';
import { createSoloGame, findOpenSoloGame } from './game-service';
import { fail, ok, type ServiceResult } from './result';

/** Starts (or continues) a campaign stage; returns the table code. */
export async function startCampaign(admin: AdminClient, userId: string, level: number): Promise<ServiceResult<{ code: string }>> {
  const stage = CAMPAIGN.find((s) => s.level === level);
  if (!stage) return fail('Diese Stufe gibt es nicht.');
  const { data } = await admin.from('profiles').select('campaign_level').eq('id', userId).single();
  if ((data?.campaign_level ?? 0) + 1 < level) return fail('Diese Stufe ist noch verschlossen.');
  const open = await findOpenSoloGame(admin, userId, 'campaign', String(level));
  if (open) return ok({ code: open });
  return createSoloGame(admin, userId, {
    mode: 'campaign', ref: String(level), settings: stageSettings(stage), bots: stage.bots,
    deckId: await getDefaultDeckId(admin, userId),
  });
}

/** Starts (or continues) today's challenge; one attempt per player and day. */
export async function startDaily(admin: AdminClient, userId: string): Promise<ServiceResult<{ code: string }>> {
  const day = berlinDay();
  const { data: done } = await admin.from('daily_results').select('day').eq('day', day).eq('user_id', userId).maybeSingle();
  if (done) return fail('Du hast die heutige Herausforderung schon gespielt. Morgen gibt es eine neue!');
  const open = await findOpenSoloGame(admin, userId, 'daily', day);
  if (open) return ok({ code: open });
  // Leaving the table also uses up the attempt – otherwise the known deal could be replayed.
  // The primary key of daily_attempts makes this race-free: only one request can claim the day.
  const { error: claimed } = await admin.from('daily_attempts').insert({ day, user_id: userId });
  if (claimed) return fail('Du hast die heutige Herausforderung schon begonnen. Morgen gibt es eine neue!');
  return createSoloGame(admin, userId, {
    mode: 'daily', ref: day, settings: DAILY_SETTINGS, bots: Array(DAILY_BOTS).fill('sly'), seed: daySeed(day),
    deckId: await getDefaultDeckId(admin, userId),
  });
}
