// Service Worker for HouseFinance PWA
// Handles push notifications even when the app is closed.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event: triggered by server push
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'HouseFinance', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '🏠 HouseFinance';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'housefinance',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click event: open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Else open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
