'use server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { startCampaign, startDaily } from './solo-service';

export async function startCampaignAction(level: number): Promise<{ error?: string }> {
  const user = await requireUser();
  const res = await startCampaign(createAdminClient(), user.id, level);
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}

export async function startDailyAction(): Promise<{ error?: string }> {
  const user = await requireUser();
  const res = await startDaily(createAdminClient(), user.id);
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}
