import { CrownLoader } from '@/components/ui/crown-loader';
import { getT } from '@/lib/i18n/server';

export default async function Loading() {
  const t = await getT();
  return <main className="flex flex-1 items-start justify-center"><CrownLoader label={t('Die Karten werden gemischt …')} /></main>;
}
