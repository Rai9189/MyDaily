// Service worker for MyDaily — used only for push notifications.
// No fetch handler on purpose: the app always loads from the network,
// so every redeploy is picked up immediately.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Payload sent by the server: { title, body, url?, tag? }.
// Plain text (e.g. the DevTools "Push" test button) is shown as the body.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'MyDaily', {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      tag: data.tag,  // same tag replaces the previous notification instead of stacking
      data: { url: data.url || '/' },
    })
  );
});

// Focus an open MyDaily tab (or open one) on the notification's page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (!client) return self.clients.openWindow(url);
      // navigate() only works on tabs this worker controls; fall back to a new window
      return client.focus()
        .then((c) => c.navigate(url))
        .catch(() => self.clients.openWindow(url));
    })
  );
});
