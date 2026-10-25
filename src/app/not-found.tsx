import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-sm flex-col items-start gap-4 p-7">
        <h1 className="text-4xl font-bold">Diese Tür ist verschlossen</h1>
        <p className="text-ink-soft">Die Seite gibt es nicht. Vielleicht ein Tippfehler im Link?</p>
        <Link href="/" className={buttonClass('primary')}>Zurück in den Thronsaal</Link>
      </Card>
    </main>
  );
}
