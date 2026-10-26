'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { removePushSubscriptionAction, savePushSubscriptionAction, testPushAction } from '@/server/push-actions';

/** Registers the service worker once per page load. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
}

function subscribeInstall(listener: () => void) {
  installListeners.add(listener);
  return () => void installListeners.delete(listener);
}

const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on' | 'loading';

/** Install the app and switch push notifications on or off (profile page). */
export function AppSettings() {
  const canPrompt = useSyncExternalStore(subscribeInstall, () => deferred !== null, () => false);
  const standalone = useSyncExternalStore(() => () => undefined, isStandalone, () => false);
  const [push, setPush] = useState<PushState>('loading');
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: PushState;
      if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) next = isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
      else if (Notification.permission === 'denied') next = 'denied';
      else {
        const reg = await navigator.serviceWorker.ready;
        next = (await reg.pushManager.getSubscription()) ? 'on' : 'off';
      }
      if (!cancelled) setPush(next);
    })();
    return () => { cancelled = true; };
  }, [publicKey]);

  async function enable() {
    setPush('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setPush(permission === 'denied' ? 'denied' : 'off');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const res = await savePushSubscriptionAction(sub.toJSON());
      if (!res.ok) throw new Error(res.error);
      setPush('on');
      toast.success('Benachrichtigungen sind an');
    } catch {
      setPush('off');
      toast.error('Benachrichtigungen konnten nicht eingeschaltet werden.');
    }
  }

  async function disable() {
    setPush('loading');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscriptionAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setPush('off');
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-2xl font-bold">📲 Als App installieren</h3>
        {standalone ? (
          <p className="text-sm text-ink-soft">Läuft bereits als App. 👑</p>
        ) : canPrompt ? (
          <Button size="sm" className="mt-2" onClick={async () => { await deferred?.prompt(); deferred = null; }}>App installieren</Button>
        ) : isIos() ? (
          <p className="text-sm text-ink-soft">Auf dem iPhone: in Safari auf <b>Teilen</b> tippen und <b>„Zum Home-Bildschirm“</b> wählen.</p>
        ) : (
          <p className="text-sm text-ink-soft">Im Browser-Menü <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.</p>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold">🔔 Benachrichtigungen</h3>
        <p className="text-sm text-ink-soft">Wenn du dran bist, eingeladen wirst oder eine Freundschaftsanfrage bekommst – auch wenn die Seite zu ist.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {push === 'on' && (
            <>
              <span className="rounded-full bg-vert/20 px-3 py-1 text-sm font-bold text-vert">An</span>
              <Button size="sm" variant="secondary" onClick={() => testPushAction()}>Test senden</Button>
              <Button size="sm" variant="ghost" onClick={disable}>Ausschalten</Button>
            </>
          )}
          {push === 'off' && <Button size="sm" onClick={enable}>Einschalten</Button>}
          {push === 'loading' && <span className="text-sm text-ink-soft">Einen Moment …</span>}
          {push === 'denied' && <span className="text-sm text-wax">Im Browser blockiert – in den Website-Einstellungen wieder erlauben.</span>}
          {push === 'needs-install' && <span className="text-sm text-ink-soft">Auf dem iPhone gehen Benachrichtigungen nur, wenn die App zum Home-Bildschirm hinzugefügt ist.</span>}
          {push === 'unsupported' && <span className="text-sm text-ink-soft">{publicKey ? 'Dein Browser unterstützt leider keine Benachrichtigungen.' : 'Benachrichtigungen sind auf diesem Server noch nicht eingerichtet.'}</span>}
        </div>
      </div>
    </div>
  );
}
