/* Мост для выхода из сломанного офлайн-кэша: предыдущий cache-first воркер
   раздавал устаревшие страницы и чанки. Этот воркер ничего не кэширует:
   при установке он стирает все кэши, снимает себя с регистрации и
   перезагружает открытые страницы приложения. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) =>
        clients.map((client) => client.navigate(client.url))
      )
      .then(() => self.skipWaiting())
  );
});
