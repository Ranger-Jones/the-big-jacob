import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Backdrop } from '@/components/app-shell/backdrop';
import { Header } from '@/components/app-shell/header';
import { HeaderSlot } from '@/components/app-shell/header-slot';
import { PwaRegister } from '@/components/app-shell/pwa';
import { InviteListener } from '@/components/app-shell/invite-listener';
import { OnlinePresenceProvider } from '@/components/app-shell/online-presence';
import { fontVariables } from '@/lib/fonts';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale, getT } from '@/lib/i18n/server';
import { getFriendLists } from '@/lib/supabase/cached';
import { getCurrentUser } from '@/lib/supabase/server';
import { FriendRequestListener } from '@/components/app-shell/friend-request-listener';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: 'Der Große Jakob', template: '%s – Der Große Jakob' },
    appleWebApp: { capable: true, title: 'Jakob', statusBarStyle: 'black-translucent' },
    description: t('Das Kartenspiel um Krone und Knechtschaft – online mit deinen Freunden.'),
  };
}

export const viewport: Viewport = { themeColor: '#2a1745', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const friendIds = user ? (await getFriendLists(user.id)).friends.map((f) => f.profile.id) : [];
  const content = (
    <>
      <HeaderSlot><Header /></HeaderSlot>
      {children}
    </>
  );
  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`}>
      <body className="relative isolate flex min-h-full flex-col">
        <I18nProvider locale={locale}>
        <Backdrop />
        <PwaRegister />
        {user ? (
          <OnlinePresenceProvider me={user.id} friendIds={friendIds}>
            {content}
            <InviteListener me={user.id} />
            <FriendRequestListener me={user.id} />
          </OnlinePresenceProvider>
        ) : content}
        <Toaster
          position="top-center"
          // Pop-ups start below the iPhone status bar in the installed app.
          offset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
          mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-alegreya)', borderRadius: '1rem', background: '#1f1135', color: '#f6ead2',
              border: '1px solid rgb(244 183 58 / 0.35)', fontSize: '1rem', boxShadow: '0 12px 30px rgb(0 0 0 / 0.45)',
            },
            classNames: {
              actionButton: '!bg-gold !text-[#2b1a12] !font-bold !rounded-lg',
              cancelButton: '!bg-white/10 !text-parchment !font-bold !rounded-lg',
            },
          }}
        />
        </I18nProvider>
      </body>
    </html>
  );
}
