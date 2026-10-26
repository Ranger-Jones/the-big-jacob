import Link from 'next/link';
import { cookies } from 'next/headers';
import { LevelPip } from '@/components/rating/rating-badge';
import { Avatar } from '@/components/ui/avatar';
import { levelFromXp } from '@/lib/jakob/rating';
import { Logo } from '@/components/ui/logo';
import { GATE_COOKIE, verifyGateToken } from '@/lib/gate';
import { getFriendLists } from '@/lib/supabase/cached';
import { getCurrentUser } from '@/lib/supabase/server';
import { MusicToggle } from './music-toggle';
import { NavLink } from './nav-link';

export async function Header() {
  const user = await getCurrentUser();
  const requests = user ? (await getFriendLists(user.id)).incoming.length : 0;
  const unlocked = await verifyGateToken((await cookies()).get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-4">
      <Link href="/" aria-label="Startseite" className="shrink-0">
        <span className="hidden sm:inline"><Logo /></span>
        <span className="sm:hidden"><Logo compact /></span>
      </Link>
      {user ? (
        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1" aria-label="Hauptmenü">
          <NavLink href="/decks" icon="cards">Decks</NavLink>
          <NavLink href="/freunde" icon="friends" badge={requests}>Freunde</NavLink>
          <NavLink href="/hoefe" icon="castle">Höfe</NavLink>
          <NavLink href="/bestenliste" icon="trophy">Bestenliste</NavLink>
          <NavLink href="/regeln" icon="scroll">Regeln</NavLink>
          <MusicToggle className="hidden text-parchment/80 sm:flex" />
          <Link href={`/profil/${user.username}`} className="relative ml-1 shrink-0 rounded-full" aria-label={`Dein Profil, Level ${levelFromXp(user.xp ?? 0)}`}>
            <Avatar profile={user} size="sm" />
            <LevelPip xp={user.xp ?? 0} className="absolute -bottom-1.5 -right-1.5" />
          </Link>
        </nav>
      ) : unlocked && (
        <nav className="flex items-center gap-1">
          <NavLink href="/regeln" icon="scroll">Regeln</NavLink>
          <NavLink href="/login" icon="key">Einloggen</NavLink>
        </nav>
      )}
    </header>
  );
}
