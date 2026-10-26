import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';

export function JoinError({ message, spectateHref }: { message: string; spectateHref?: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-sm flex-col items-start gap-4 p-7">
        <h1 className="text-4xl font-bold">Kein Platz am Tisch</h1>
        <p className="text-ink-soft">{message}</p>
        <div className="flex flex-wrap gap-2">
          {spectateHref && <Link href={spectateHref} className={buttonClass('primary')}><Icon name="eye" /> Zuschauen</Link>}
          <Link href="/" className={buttonClass(spectateHref ? 'secondary' : 'primary')}>Zur Startseite</Link>
        </div>
      </Card>
    </main>
  );
}
