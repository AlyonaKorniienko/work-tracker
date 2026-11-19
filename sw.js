/* Офлайн-оболонка трекера.
   Сторінка і іконки лежать у кеші, тож додаток відкривається без мережі.
   Запити до Google Apps Script через кеш НЕ йдуть — синхронізація завжди жива. */

const CACHE = 'tracker-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-64.png',
  './icon-180.jpg',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // усе, що не наш сайт (зокрема Apps Script), віддаємо мережі без втручання
  if (url.origin !== self.location.origin) return;

  // сторінку беремо з мережі, якщо вона є: так оновлення доїжджає саме
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // решта файлів: спершу кеш, потім мережа
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit))
  );
});
