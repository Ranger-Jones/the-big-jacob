import { EN } from '@/lib/i18n/en';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderArt, renderIcons, renderLoot } from '@/server/app-api/art';
import { appUser } from '@/server/app-api/auth';
import { GET as GETS, POST as POSTS, PUBLIC_POST } from '@/server/app-api/handlers';

/**
 * JSON API for the mobile app: /api/app/<handler>/<params…>. Authenticated with the Supabase access
 * token as bearer token; every handler reuses the same services as the web server actions.
 */
type Route = { params: Promise<{ path: string[] }> };

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const unauthorized = () => json({ ok: false, error: 'Bitte melde dich an.' }, 401);

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest, { params }: Route) {
  const [name, ...rest] = (await params).path;
  // Card art is public and immutable: no session needed, cached everywhere.
  if (name === 'art') {
    const svg = renderArt(rest[0] ?? '', request.nextUrl.searchParams);
    if (!svg) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }
  // `loot/<id>` is the public artwork; bare `loot` is the player's treasury (handled below).
  if (name === 'loot' && rest.length > 0) {
    const svg = renderLoot(rest[0]);
    if (!svg) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
  }
  // The UI icon set, bundled into the app by mobile/tool/sync_icons.sh.
  if (name === 'icons') return json({ ok: true, data: renderIcons() });
  // The English dictionary (German text → English), bundled into the app by mobile/tool/sync_i18n.sh.
  if (name === 'i18n') return json({ ok: true, data: EN });
  const handler = Object.hasOwn(GETS, name) ? GETS[name] : undefined;
  if (!handler) return json({ ok: false, error: 'Unbekannte Anfrage.' }, 404);
  const admin = createAdminClient();
  const user = await appUser(request, admin);
  if (!user) return unauthorized();
  return json(await handler({ admin, user, params: rest, body: {}, query: request.nextUrl.searchParams }));
}

export async function POST(request: NextRequest, { params }: Route) {
  const [name, ...rest] = (await params).path;
  const body = await readBody(request);
  if (Object.hasOwn(PUBLIC_POST, name)) return json(await PUBLIC_POST[name](body));
  const handler = Object.hasOwn(POSTS, name) ? POSTS[name] : undefined;
  if (!handler) return json({ ok: false, error: 'Unbekannte Anfrage.' }, 404);
  const admin = createAdminClient();
  const user = await appUser(request, admin);
  if (!user) return unauthorized();
  return json(await handler({ admin, user, params: rest, body, query: request.nextUrl.searchParams }));
}
