import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Backdrop } from '@/components/app-shell/backdrop';
import { Header } from '@/components/app-shell/header';
import { HeaderSlot } from '@/components/app-shell/header-slot';
import { InviteListener } from '@/components/app-shell/invite-listener';
import { OnlinePresenceProvider } from '@/components/app-shell/online-presence';
import { fontVariables } from '@/lib/fonts';
import { getFriendLists } from '@/lib/supabase/cached';
import { getCurrentUser } from '@/lib/supabase/server';
import { FriendRequestListener } from '@/components/app-shell/friend-request-listener';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Der Große Jakob', template: '%s – Der Große Jakob' },
  description: 'Das Kartenspiel um Krone und Knechtschaft – online mit deinen Freunden.',
};

export const viewport: Viewport = { themeColor: '#2a1745', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  const friendIds = user ? (await getFriendLists(user.id)).friends.map((f) => f.profile.id) : [];
  const content = (
    <>
      <HeaderSlot><Header /></HeaderSlot>
      {children}
    </>
  );
  return (
    <html lang="de" className={`${fontVariables} h-full antialiased`}>
      <body className="relative isolate flex min-h-full flex-col">
        <Backdrop />
        {user ? (
          <OnlinePresenceProvider me={user.id} friendIds={friendIds}>
            {content}
            <InviteListener me={user.id} />
            <FriendRequestListener me={user.id} />
          </OnlinePresenceProvider>
        ) : content}
        <Toaster
          position="top-center"
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
      </body>
    </html>
  );
}
