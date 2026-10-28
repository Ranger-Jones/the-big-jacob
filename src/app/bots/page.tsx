import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { botRoster } from '@/server/solo-service';
import { BotArena } from './bot-arena';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Gegen Bots spielen') };
}

export default async function BotsPage() {
  const user = await requireUser();
  const bots = await botRoster(createAdminClient(), user.id);
  return <BotArena bots={bots.map(({ quips, ...b }) => ({ ...b, greeting: quips.greet[0] }))} />;
}
