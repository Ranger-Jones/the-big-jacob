'use client';
import { useEffect } from 'react';
import { isStaleBuildError, reloadOnce } from '@/lib/stale-build';

/** Last resort when even the root layout fails; brings its own document and inline styles. */
export default function GlobalError({ error }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    if (isStaleBuildError(error)) reloadOnce();
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#2a1745', color: '#fbf0d9', fontFamily: 'Georgia, serif' }}>
        <title>Der Große Jakob</title>
        <div style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }} aria-hidden>👑</div>
          <h1 style={{ fontSize: 32, margin: '8px 0' }}>Da ist etwas schiefgelaufen</h1>
          <p style={{ opacity: 0.85 }}>Die Seite konnte nicht geladen werden. Einmal neu laden hilft meistens.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '12px 24px', borderRadius: 16, border: 0, background: '#f4b73a', color: '#2b1a12', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Seite neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
