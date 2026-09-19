// Räumt den Service Worker der früheren Web-App weg.
//
// Die App wurde vorher als installierbare PWA ausgeliefert. Wer sie damals zum
// Startbildschirm hinzugefügt hat, bekommt sonst dauerhaft den alten Stand aus
// dem Cache. Diese Datei liegt unter derselben Adresse wie der alte Worker,
// wird deshalb beim nächsten Aufruf geladen und räumt hinter sich auf.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.navigate(client.url);
    })()
  );
});
