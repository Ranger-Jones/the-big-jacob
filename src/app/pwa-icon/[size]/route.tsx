import { ImageResponse } from 'next/og';
import { AppIconMarkup } from '@/lib/app-icon';

const SIZES = new Set([192, 512, 1024]);

/** PNG app icons for the web app manifest (192 / 512 px) and the mobile app (1024 px). */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 });
  return new ImageResponse(<AppIconMarkup size={size} />, { width: size, height: size });
}
