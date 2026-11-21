const CACHE_NAME = "rimbook-pwa-v16";
const APP_FILES = [
  "./",
  "./index.html",
  "./activation.js",
  "./reminders.js",
  "./pro.js",
  "./voice-ledger.js",
  "./receipts.js",
  "./notebook.js",
  "./workforce.js",
  "./manifest.webmanifest",
  "./app.js",
  "./sync.js",
  "./business.js",
  "./integrations.js",
  "./charts.js",
  "./push.js",
  "./invoices.js",
  "./currency.js",
  "./contacts.js",
  "./attachments.js",
  "./tts.js",
  "./i18n.js",
  "./ai-suggest.js",
  "./crypto.js",
  "./compare.js",
  "./rimbook-icon-192x192.png",
  "./rimbook-icon-512x512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return new Response("", {status:503, statusText:"Offline"});
      });
    })
  );
});