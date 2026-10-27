import type { MetadataRoute } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n/core';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = makeT(locale);
  return {
    name: 'Der Große Jakob',
    short_name: 'Jakob',
    description: t('Das Kartenspiel um Krone und Knechtschaft – online mit deinen Freunden.'),
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#2a1745',
    theme_color: '#2a1745',
    lang: locale,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
