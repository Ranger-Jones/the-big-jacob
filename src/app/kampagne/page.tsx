import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { campaignLockedToday } from '@/lib/campaign';
import { berlinDay } from '@/lib/daily';
import { CampaignMap } from './campaign-map';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Kampagne') };
}

export default async function CampaignPage() {
  const user = await requireUser();
  const { data } = await createAdminClient().from('profiles').select('campaign_level, campaign_won_on').eq('id', user.id).single();
  return <CampaignMap level={data?.campaign_level ?? 0} lockedToday={campaignLockedToday(data?.campaign_won_on, berlinDay())} />;
}
