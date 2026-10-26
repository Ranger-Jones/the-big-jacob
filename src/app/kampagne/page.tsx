import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { CampaignMap } from './campaign-map';

export const metadata: Metadata = { title: 'Kampagne' };

export default async function CampaignPage() {
  const user = await requireUser();
  const { data } = await createAdminClient().from('profiles').select('campaign_level').eq('id', user.id).single();
  return <CampaignMap level={data?.campaign_level ?? 0} />;
}
