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
      if (!isPushEndpoint(new URL(sub.endpoint))) return;
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 600 });
    } catch (err) {
      // Gone subscriptions (uninstalled app, revoked permission) are cleaned up.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }));
}

/** Endpoints must belong to a known browser push service, so the server never posts to arbitrary hosts. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/, /^([a-z0-9-]+\.)*notify\.windows\.com$/, /^web\.push\.apple\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/];
export const MAX_SUBSCRIPTIONS = 10;

export function isPushEndpoint(url: URL): boolean {
  return url.protocol === 'https:' && url.port === '' && !url.username && !url.password && PUSH_HOSTS.some((re) => re.test(url.hostname));
}

export interface SubscriptionInput { endpoint: string; keys: { p256dh: string; auth: string } }

export async function savePushSubscription(admin: AdminClient, userId: string, sub: SubscriptionInput): Promise<ServiceResult> {
  let url: URL;
  try {
    url = new URL(sub.endpoint);
  } catch {
    return fail('Ungültiges Abo.');
  }
  if (!isPushEndpoint(url) || sub.endpoint.length > 1000) return fail('Dieser Push-Dienst wird nicht unterstützt.');
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(sub.keys.p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(sub.keys.auth)) return fail('Ungültiges Abo.');

  const { data: existing } = await admin.from('push_subscriptions').select('id, user_id, p256dh, auth').eq('endpoint', sub.endpoint).maybeSingle();
  if (existing) {
    // Another account may take over an endpoint only from the same browser, proven by its key pair.
    const sameBrowser = existing.p256dh === sub.keys.p256dh && existing.auth === sub.keys.auth;
    if (existing.user_id !== userId && !sameBrowser) return fail('Ungültiges Abo.');
    const { error } = await admin.from('push_subscriptions')
      .update({ user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }).eq('id', existing.id);
    if (error) throw error;
    return ok(undefined);
  }

  const { count } = await admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if ((count ?? 0) >= MAX_SUBSCRIPTIONS) {
    // Drop the oldest device instead of refusing the newest.
    const { data: oldest } = await admin.from('push_subscriptions').select('id').eq('user_id', userId).order('created_at').limit(1);
    if (oldest?.[0]) await admin.from('push_subscriptions').delete().eq('id', oldest[0].id);
  }
  const { error } = await admin.from('push_subscriptions')
    .insert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
  if (error && error.code !== '23505') throw error;
  return ok(undefined);
}

export async function removePushSubscription(admin: AdminClient, userId: string, endpoint: string) {
  await admin.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
}
