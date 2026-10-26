import 'server-only';
import webpush from 'web-push';
import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, type ServiceResult } from './result';

export interface PushPayload { title: string; body: string; url: string; tag?: string }

let ready: boolean | null = null;

/** Push works only when the VAPID keys are configured (see ANLEITUNG.md). */
function setup(): boolean {
  if (ready !== null) return ready;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (ready = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://the-big-jacob.vercel.app', publicKey, privateKey);
  return (ready = true);
}

export function pushEnabled(): boolean {
  return setup();
}

export async function sendPush(admin: AdminClient, userIds: string[], payload: PushPayload) {
  if (!setup() || userIds.length === 0) return;
  const { data } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds);
  await Promise.all((data ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 600 });
    } catch (err) {
      // Gone subscriptions (uninstalled app, revoked permission) are cleaned up.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }));
}

export interface SubscriptionInput { endpoint: string; keys: { p256dh: string; auth: string } }

export async function savePushSubscription(admin: AdminClient, userId: string, sub: SubscriptionInput): Promise<ServiceResult> {
  let url: URL;
  try {
    url = new URL(sub.endpoint);
  } catch {
    return fail('Ungültiges Abo.');
  }
  if (url.protocol !== 'https:' || sub.endpoint.length > 1000) return fail('Ungültiges Abo.');
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(sub.keys.p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(sub.keys.auth)) return fail('Ungültiges Abo.');
  const { error } = await admin.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
  return ok(undefined);
}

export async function removePushSubscription(admin: AdminClient, userId: string, endpoint: string) {
  await admin.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
}
