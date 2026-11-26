/* NutriVision AI service worker — app-shell cache, network-first for API */
const CACHE = 'nutrivision-v7';
const SHELL = [
  './', './index.html', './styles.css', './config.js', './i18n.js', './fooddb.js', './app.js', './supabase.js', './auth.js', './authui.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // network only
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
