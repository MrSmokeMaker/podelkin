const CACHE = "rukodelie-v3";
const CORE = [
  "/",
  "/catalog",
  "/podelki",
  "/podelki/favorites",
  "/inventory",
  "/boards",
  "/export",
  "/stats",
  "/manifest.json",
  "/icon.svg",
];
const TOP_CRAFTS_LIMIT = 50;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Все GET — cache-first с обновлением из сети; POST/PUT в кэш не попадают. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* Offline sync: mock-сигнал premium от страницы
   ({ type: "RUKODELIE_SYNC", premium: true }).
   premium — предкэш топ-50 поделок и недавних проектов;
   free — только app shell (уже закэширован при install).
   В проде сигнал придёт от реальной сессии (ENABLE_OFFLINE_SYNC). */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "RUKODELIE_SYNC") return;
  event.source?.postMessage({
    type: "RUKODELIE_SYNC_RESULT",
    premium: Boolean(data.premium),
  });
  if (!data.premium) return;
  event.waitUntil(syncPremiumData());
});

async function syncPremiumData() {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch("/api/crafts", { cache: "no-store" });
    if (!response.ok) return;
    await cache.put("/api/crafts", response.clone());
    const data = await response.json();
    const slugs = (data.results ?? [])
      .slice(0, TOP_CRAFTS_LIMIT)
      .map((craft) => craft.slug);
    const urls = ["/api/projects", ...slugs.map((slug) => `/craft/${slug}`)];
    await Promise.allSettled(urls.map((url) => cache.add(url)));
  } catch {
    /* офлайн — синхронизация повторится при следующем сигнале */
  }
}
