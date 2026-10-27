import { getT } from '@/lib/i18n/server';
import { JoinError } from './join-error';

export default async function NotFound() {
  const t = await getT();
  return <JoinError message={t('Kein Tisch mit diesem Code gefunden. Prüf den Code oder lass dir den Link nochmal schicken.')} />;
}
