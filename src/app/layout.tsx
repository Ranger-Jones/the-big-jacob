import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Header } from '@/components/app-shell/header';
import { InviteListener } from '@/components/app-shell/invite-listener';
import { OnlinePresenceProvider } from '@/components/app-shell/online-presence';
import { fontVariables } from '@/lib/fonts';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import { listFriends } from '@/server/social-service';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Der Große Jakob', template: '%s – Der Große Jakob' },
  description: 'Das Kartenspiel um Krone und Knechtschaft – online mit deinen Freunden.',
};

export const viewport: Viewport = { themeColor: '#2a1745', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  const friendIds = user ? (await listFriends(createAdminClient(), user.id)).friends.map((f) => f.profile.id) : [];
  const content = (
    <>
      <Header />
      {children}
    </>
  );
  return (
    <html lang="de" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {user ? (
          <OnlinePresenceProvider me={user.id} friendIds={friendIds}>
            {content}
            <InviteListener me={user.id} />
          </OnlinePresenceProvider>
        ) : content}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-alegreya)', borderRadius: '1rem', background: '#fbf0d9', color: '#2b1a12',
              border: '2px solid #e3cfa6', fontSize: '1rem',
            },
            classNames: {
              actionButton: '!bg-gold !text-ink !font-bold !rounded-lg',
              cancelButton: '!bg-parchment-dark !text-ink-soft !font-bold !rounded-lg',
            },
          }}
        />
      </body>
    </html>
  );
}
