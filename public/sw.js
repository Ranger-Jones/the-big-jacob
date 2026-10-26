/* Service worker for "Der Große Jakob": shows push notifications and opens the right page. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Der Große Jakob', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil((async () => {
    // Skip the notification if the app is already open and visible on that page.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = data.url ? new URL(data.url, self.location.origin).pathname : null;
    const visible = windows.some((w) => w.visibilityState === 'visible' && (!target || new URL(w.url).pathname === target));
    if (visible) return;
    await self.registration.showNotification(data.title || 'Der Große Jakob', {
      body: data.body || '',
      icon: '/pwa-icon/192',
      badge: '/pwa-icon/192',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) {
      if (w.url === url && 'focus' in w) return w.focus();
    }
    if (windows[0] && 'navigate' in windows[0]) {
      await windows[0].navigate(url);
      return windows[0].focus();
    }
    return self.clients.openWindow(url);
  })());
});
