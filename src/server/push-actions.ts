'use server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { removePushSubscription, savePushSubscription, sendTestPush } from './push-service';
import { fail } from './result';

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export async function savePushSubscriptionAction(sub: unknown) {
  const user = await requireUser();
  const parsed = subscription.safeParse(sub);
  if (!parsed.success) return fail('Ungültiges Abo.');
  return savePushSubscription(createAdminClient(), user.id, parsed.data);
}

export async function removePushSubscriptionAction(endpoint: string) {
  const user = await requireUser();
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return;
  await removePushSubscription(createAdminClient(), user.id, endpoint);
}

export async function testPushAction() {
  const user = await requireUser();
  // A test push only ever reaches the caller's own devices (rate limited in sendTestPush).
  await sendTestPush(createAdminClient(), user.id);
}
