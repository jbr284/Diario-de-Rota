// Mudamos para v7 para forçar a atualização no telemóvel dos utilizadores
const CACHE_NAME = "diario-de-rota-v3";

const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./dashboard.html",
    "./css/style.css",
    "./js/firebase-init.js",
    "./js/auth.js",
    "./js/dashboard.js",
    "./manifest.json"
];

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Força a instalação imediata do novo Service Worker
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Limpa as versões v1 antigas
                    }
                })
            );
        })
    );
});

// ESTRATÉGIA NOVA: Network First (Rede Primeiro)
// Vai sempre à internet buscar o código mais recente. Se não houver internet (estrada), usa a cache.
self.addEventListener("fetch", (event) => {
    if (!(event.request.url.indexOf('http') === 0)) return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
