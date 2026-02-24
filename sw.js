// Nome e versão do Cache. Se você mudar o CSS ou JS no futuro, 
// altere o "v1" para "v2" para forçar o celular a atualizar os arquivos.
const CACHE_NAME = "diario-de-rota-v1";

// Lista de todos os arquivos que o celular precisa baixar para funcionar offline
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

// 1. INSTALAÇÃO: Pega os arquivos da lista e salva no celular
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("🔥 Service Worker: Fazendo cache dos arquivos estáticos");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ATIVAÇÃO: Limpa caches antigos (útil quando você atualizar para v2, v3...)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("🔥 Service Worker: Limpando cache antigo -", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 3. INTERCEPTAÇÃO (FETCH): Onde a mágica offline acontece
self.addEventListener("fetch", (event) => {
    // Ignora requisições de outras origens e foca só nos arquivos do app
    if (!(event.request.url.indexOf('http') === 0)) return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Se encontrou no cache, retorna do celular. Se não, vai na internet (fetch)
            return response || fetch(event.request);
        })
    );
});
