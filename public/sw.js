/* Học Tiếng Trung – Gấu Trúc Mập service worker: offline app shell + daily reminder. */
const VERSION = '__BUILD_ID__';
const PRECACHE = self.__PRECACHE__ || []; // filled in by the Vite build (vite.config.ts)
const SHELL = `htt-shell-${VERSION}`;
const RUNTIME = 'htt-runtime';
const REMINDER_DB = 'htt-reminder';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['./', ...PRECACHE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('htt-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Firebase / Google APIs – Firestore has its own offline cache.
  if (/googleapis\.com|firebase|gstatic\.com\/firebasejs|google\.com/.test(url.host) && !/fonts\.(googleapis|gstatic)\.com/.test(url.host)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!sameOrigin && !isFont) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

/* ---------- Daily reminder (local, no push server) ---------- */
let reminder = null; // { on, time: 'HH:mm', lastStudy: 'yyyy-mm-dd' | null }
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const store = (method, value) =>
  caches.open(REMINDER_DB).then((c) =>
    method === 'put' ? c.put('state', new Response(JSON.stringify(value))) : c.match('state').then((r) => (r ? r.json() : null)),
  );

self.addEventListener('message', (event) => {
  if (event.data?.type === 'reminder-state') {
    reminder = { ...(reminder || {}), ...event.data.state };
    event.waitUntil(store('put', reminder));
  }
});

async function maybeRemind() {
  const s = reminder || (await store('get'));
  if (!s || !s.on) return;
  const now = new Date();
  const [h, m] = (s.time || '19:00').split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  if (s.lastStudy === today() || s.lastNotified === today()) return;
  const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (open.some((c) => c.visibilityState === 'visible')) return; // the page handles it
  s.lastNotified = today();
  reminder = s;
  await store('put', s);
  await self.registration.showNotification('Đến giờ học tiếng Trung rồi!', {
    body: 'Học một bài ngắn để giữ chuỗi ngày nhé 🐼',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'daily-reminder',
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') event.waitUntil(maybeRemind());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list.find((w) => 'focus' in w);
      return c ? c.focus() : self.clients.openWindow('./');
    }),
  );
});
