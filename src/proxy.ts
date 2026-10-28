import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // App shell files must load before the access question (installing the app, push notifications).
  // The mobile app API authenticates itself with bearer tokens (no cookies).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pwa-icon|apple-icon|api/app/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
