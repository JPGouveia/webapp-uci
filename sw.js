/* Service worker: funciona offline depois da primeira visita.
 * ⚠ Sempre que alterar ficheiros, incrementar VERSION para os telemóveis receberem a atualização.
 */
const VERSION = "uci-calc-v0.8.1";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/core/util.js",
  "js/core/app.js",
  "js/modules/perfusoes/perfusoes.calc.js",
  "js/modules/perfusoes/drugs.js",
  "js/modules/perfusoes/perfusoes.view.js",
  "js/modules/renal/renal.calc.js",
  "js/modules/renal/renal.view.js",
  "assets/img/hdfvvc.webp",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Rede primeiro (para receber atualizações), cache como alternativa offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
