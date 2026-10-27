import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getT } from '@/lib/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-sm flex-col items-start gap-4 p-7">
        <h1 className="text-4xl font-bold">{t('Diese Tür ist verschlossen')}</h1>
        <p className="text-ink-soft">{t('Die Seite gibt es nicht. Vielleicht ein Tippfehler im Link?')}</p>
        <Link href="/" className={buttonClass('primary')}>{t('Zurück in den Thronsaal')}</Link>
      </Card>
    </main>
  );
}
