/* =====================================================================
 * sw.js — service worker za offline delovanje
 *
 * Strategije:
 *   - aplikacija (isti izvor: index.html, manifest, ikone):
 *       cache-first + osvežitev v ozadju (stale-while-revalidate).
 *       Stran se odpre takoj iz cache-a tudi brez signala; sveža verzija
 *       se potegne v ozadju in velja ob naslednjem odprtju. Če se
 *       index.html spremeni, SW obvesti odprte strani (toast v main.js).
 *   - GitHub API / gist (sync): SAMO mreža, nikoli cache — zastarelo
 *       stanje iz cache-a bi ob merge-u obudilo stare/izbrisane seje.
 *   - Google Fonts: cache-first (pisave se ne spreminjajo).
 *
 * VERSION dvigni, ko hočeš prisilno počistiti stari cache (npr. ob
 * spremembi seznama APP_SHELL). Sicer se posodobitve index.html
 * prenesejo same prek osvežitve v ozadju.
 * ===================================================================== */

const VERSION = 'trening-v2';
const APP_SHELL = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'];

const NETWORK_ONLY_HOSTS = ['api.github.com', 'gist.githubusercontent.com'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('trening-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (NETWORK_ONLY_HOSTS.includes(url.hostname)) return; // brskalnik gre naravnost na mrežo

  if (url.origin === self.location.origin) {
    // An install link (index.html?p=mirela) must run the NEWEST app so the
    // parameter is understood → network first, cache only as offline fallback.
    if (req.mode === 'navigate' && url.search) {
      e.respondWith(networkFirst(req));
      return;
    }
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req));
  }
});

/** Serve from cache immediately; refresh the cache in the background. */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req, { ignoreSearch: true })
    || (req.mode === 'navigate' ? await cache.match('./index.html') : null);

  const refresh = fetch(req).then(async res => {
    if (res && res.ok) {
      await cache.put(req, res.clone());
      if (cached && req.mode === 'navigate' && await changed(cached, res)) notifyClients();
    }
    return res;
  }).catch(() => null);

  if (cached) { refresh.catch(() => {}); return cached; }
  const fresh = await refresh;
  return fresh || new Response('Offline — aplikacija še ni bila naložena.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/** Navigations with a query string: fresh copy when online, cache when not. */
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('./index.html'))
      || new Response('Offline — aplikacija še ni bila naložena.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

/** Fonts: cache hit wins; otherwise fetch and store (opaque responses too). */
async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
    return res;
  } catch (e) {
    // Offline and not cached yet: empty stylesheet → system font fallback, no console noise.
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
  }
}

/** Did index.html actually change? Compare validators, fall back to length. */
async function changed(oldRes, newRes) {
  const h = n => [oldRes.headers.get(n), newRes.headers.get(n)];
  for (const n of ['etag', 'last-modified', 'content-length']) {
    const [a, b] = h(n);
    if (a && b) return a !== b;
  }
  return false;
}

async function notifyClients() {
  const list = await self.clients.matchAll({ type: 'window' });
  for (const c of list) c.postMessage({ type: 'app-updated' });
}
