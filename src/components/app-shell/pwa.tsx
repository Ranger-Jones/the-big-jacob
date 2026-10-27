'use client';
import { Fragment, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { removePushSubscriptionAction, savePushSubscriptionAction, testPushAction } from '@/server/push-actions';
import { Icon } from '@/components/ui/icons';
import { useT } from '@/lib/i18n/client';
import { LanguageSwitch } from './language-switch';

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

/** Fills {placeholders} of a translated sentence with elements (e.g. bold words). */
function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/).map((segment, i) => {
    const key = /^\{(\w+)\}$/.exec(segment)?.[1];
    return <Fragment key={i}>{key && key in parts ? parts[key] : segment}</Fragment>;
  });
}

type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on' | 'loading';

/** Install the app and switch push notifications on or off (profile page). */
export function AppSettings() {
  const t = useT();
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
      toast.success(t('Benachrichtigungen sind an'));
    } catch {
      setPush('off');
      toast.error(t('Benachrichtigungen konnten nicht eingeschaltet werden.'));
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-2xl font-bold"><Icon name="book" className="text-gold-soft" /> {t('Sprache')}</h3>
        <LanguageSwitch />
      </div>
      <div>
        <h3 className="text-2xl font-bold"><Icon name="home" className="text-gold-soft" /> {t('Als App installieren')}</h3>
        {standalone ? (
          <p className="text-sm text-ink-soft">{t('Läuft bereits als App.')} <Icon name="crown" className="text-gold-soft" /></p>
        ) : canPrompt ? (
          <Button size="sm" className="mt-2" onClick={async () => { await deferred?.prompt(); deferred = null; }}>{t('App installieren')}</Button>
        ) : isIos() ? (
          <p className="text-sm text-ink-soft">{rich(t('Auf dem iPhone: in Safari auf {share} tippen und {home} wählen.'), { share: <b>{t('Teilen')}</b>, home: <b>{t('„Zum Home-Bildschirm“')}</b> })}</p>
        ) : (
          <p className="text-sm text-ink-soft">{rich(t('Im Browser-Menü {install} bzw. {add} wählen.'), { install: <b>{t('„App installieren“')}</b>, add: <b>{t('„Zum Startbildschirm hinzufügen“')}</b> })}</p>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold"><Icon name="bell" className="text-gold-soft" /> {t('Benachrichtigungen')}</h3>
        <p className="text-sm text-ink-soft">{t('Wenn du dran bist, eingeladen wirst oder eine Freundschaftsanfrage bekommst – auch wenn die Seite zu ist.')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {push === 'on' && (
            <>
              <span className="rounded-full bg-vert/20 px-3 py-1 text-sm font-bold text-vert">{t('An')}</span>
              <Button size="sm" variant="secondary" onClick={() => testPushAction()}>{t('Test senden')}</Button>
              <Button size="sm" variant="ghost" onClick={disable}>{t('Ausschalten')}</Button>
            </>
          )}
          {push === 'off' && <Button size="sm" onClick={enable}>{t('Einschalten')}</Button>}
          {push === 'loading' && <span className="text-sm text-ink-soft">{t('Einen Moment …')}</span>}
          {push === 'denied' && <span className="text-sm text-wax">{t('Im Browser blockiert – in den Website-Einstellungen wieder erlauben.')}</span>}
          {push === 'needs-install' && <span className="text-sm text-ink-soft">{t('Auf dem iPhone gehen Benachrichtigungen nur, wenn die App zum Home-Bildschirm hinzugefügt ist.')}</span>}
          {push === 'unsupported' && <span className="text-sm text-ink-soft">{publicKey ? t('Dein Browser unterstützt leider keine Benachrichtigungen.') : t('Benachrichtigungen sind auf diesem Server noch nicht eingerichtet.')}</span>}
        </div>
      </div>
    </div>
  );
}
