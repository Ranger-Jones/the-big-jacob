import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/safe-next';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Registrieren') };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <AuthForm mode="register" next={next} />;
}
