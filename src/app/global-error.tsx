'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { isLocale, LOCALE_COOKIE, localeFromHeader, makeT, type Locale } from '@/lib/i18n/core';
import { isStaleBuildError, reloadOnce } from '@/lib/stale-build';

/** The root layout (and its language provider) failed, so read the language from the cookie or the browser. */
function browserLocale(): Locale {
  const saved = document.cookie.split('; ').find((c) => c.startsWith(`${LOCALE_COOKIE}=`))?.split('=')[1];
  return isLocale(saved) ? saved : localeFromHeader(navigator.language);
}

/** Last resort when even the root layout fails; brings its own document and inline styles. */
export default function GlobalError({ error }: { error: unknown; retry: () => void }) {
  const locale = useSyncExternalStore(() => () => undefined, browserLocale, (): Locale => 'de');
  const t = makeT(locale);
  useEffect(() => {
    console.error(error);
    if (isStaleBuildError(error)) reloadOnce();
  }, [error]);

  return (
    <html lang={locale}>
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#2a1745', color: '#fbf0d9', fontFamily: 'Georgia, serif' }}>
        <title>Der Große Jakob</title>
        <div style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }} aria-hidden>👑</div>
          <h1 style={{ fontSize: 32, margin: '8px 0' }}>{t('Da ist etwas schiefgelaufen')}</h1>
          <p style={{ opacity: 0.85 }}>{t('Die Seite konnte nicht geladen werden. Einmal neu laden hilft meistens.')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '12px 24px', borderRadius: 16, border: 0, background: '#f4b73a', color: '#2b1a12', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            {t('Seite neu laden')}
          </button>
        </div>
      </body>
    </html>
  );
}
