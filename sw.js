const CACHE_NAME = "diario-rota-v5"; // Mudamos a versão para forçar a quebra do cache atual

const urlsToCache = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-init.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// INSTALAÇÃO: Força o novo código a assumir o controle imediatamente
self.addEventListener("install", (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// ATIVAÇÃO: Limpa o lixo velho e atualiza a tela na mesma hora
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

// FETCH: Estratégia "Network First" (Rede primeiro, Cache de emergência)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se tem internet e baixou o código novo, atualiza o cache silenciosamente
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // Se o celular estiver sem internet, usa a memória offline
        return caches.match(event.request);
      })
  );
});
