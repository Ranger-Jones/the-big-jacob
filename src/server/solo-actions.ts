'use server';
import { redirect } from 'next/navigation';
import { CAMPAIGN, stageSettings } from '@/lib/campaign';
import { berlinDay, DAILY_BOTS, DAILY_SETTINGS, daySeed } from '@/lib/daily';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDefaultDeckId } from './deck-service';
import { createSoloGame, findOpenSoloGame } from './game-service';

export async function startCampaignAction(level: number): Promise<{ error?: string }> {
  const user = await requireUser();
  const admin = createAdminClient();
  const stage = CAMPAIGN.find((s) => s.level === level);
  if (!stage) return { error: 'Diese Stufe gibt es nicht.' };
  const { data } = await admin.from('profiles').select('campaign_level').eq('id', user.id).single();
  if ((data?.campaign_level ?? 0) + 1 < level) return { error: 'Diese Stufe ist noch verschlossen.' };
  const open = await findOpenSoloGame(admin, user.id, 'campaign', String(level));
  if (open) redirect(`/spiel/${open}`);
  const res = await createSoloGame(admin, user.id, {
    mode: 'campaign', ref: String(level), settings: stageSettings(stage), bots: stage.bots,
    deckId: await getDefaultDeckId(admin, user.id),
  });
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}

export async function startDailyAction(): Promise<{ error?: string }> {
  const user = await requireUser();
  const admin = createAdminClient();
  const day = berlinDay();
  const { data: done } = await admin.from('daily_results').select('day').eq('day', day).eq('user_id', user.id).maybeSingle();
  if (done) return { error: 'Du hast die heutige Herausforderung schon gespielt. Morgen gibt es eine neue!' };
  const open = await findOpenSoloGame(admin, user.id, 'daily', day);
  if (open) redirect(`/spiel/${open}`);
  const res = await createSoloGame(admin, user.id, {
    mode: 'daily', ref: day, settings: DAILY_SETTINGS, bots: Array(DAILY_BOTS).fill('sly'), seed: daySeed(day),
    deckId: await getDefaultDeckId(admin, user.id),
  });
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}
