const CACHE = "rukodelie-v7";
const CORE = [
  "/",
  "/catalog",
  "/podelki",
  "/podelki/favorites",
  "/inventory",
  "/shopping-list",
  "/boards",
  "/export",
  "/stats",
  "/manifest.json",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const TOP_CRAFTS_LIMIT = 50;
/* maximumFileSizeToCacheInBytes (аналог VitePWA): не кэшируем файлы > 4 МБ */
const MAX_CACHE_BYTES = 4 * 1024 * 1024;
/* globPatterns (аналог VitePWA): статика, которую отдём stale-while-revalidate */
const STATIC_PATTERN = /\.(js|css|svg|png|jpg|jpeg|webp|woff2)$/;

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

/* /api/* — network-first: при сети свежие данные, офлайн — сохранённая копия.
   Статика (js, css, картинки, шрифты) — stale-while-revalidate.
   Навигации и прочие GET — cache-first с фоновым обновлением (как раньше). */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (pathname.startsWith("/_next/static/") || STATIC_PATTERN.test(pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function putInCache(request, response) {
  if (!response || !response.ok) return;
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_CACHE_BYTES) return;
  const copy = response.clone();
  if (!declared) {
    const probe = response.clone();
    const size = (await probe.blob()).size;
    if (size > MAX_CACHE_BYTES) return;
  }
  const cache = await caches.open(CACHE);
  await cache.put(request, copy);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putInCache(request, response);
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putInCache(request, response);
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("", { status: 503 });
  }
}

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
