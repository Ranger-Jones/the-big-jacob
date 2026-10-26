import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // App shell files must load before the access question (installing the app, push notifications).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pwa-icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
