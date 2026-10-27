'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isStaleBuildError, reloadOnce } from '@/lib/stale-build';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const stale = isStaleBuildError(error);
  const digest = error instanceof Error && 'digest' in error ? String((error as { digest?: string }).digest ?? '') : '';

  useEffect(() => {
    console.error(error);
    if (stale) reloadOnce();
  }, [error, stale]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-md flex-col items-start gap-4 p-7">
        <h1 className="text-4xl font-bold">{stale ? 'Der Hof hat umgebaut' : 'Da ist etwas schiefgelaufen'}</h1>
        <p className="text-ink-soft">
          {stale
            ? 'Es gibt eine neue Version vom Großen Jakob. Einmal neu laden, dann geht es weiter.'
            : 'Die Seite konnte nicht geladen werden. Versuch es nochmal – meistens klappt es dann.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
          {!stale && <Button variant="secondary" onClick={() => retry()}>Nochmal versuchen</Button>}
          <Link href="/" className={buttonClass('ghost')}>Zur Startseite</Link>
        </div>
        {digest && <p className="text-xs text-ink-soft">Fehlercode: {digest}</p>}
      </Card>
    </main>
  );
}
