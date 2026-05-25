const CACHE_NAME = 'financeiro-v1'
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/firebase.js',
    '/pages/assistente.html',
    '/pages/dashboard.html',
    '/pages/categorias.html',
    '/pages/contas.html',
    '/pages/metas.html',
    '/pages/relatorios.html',
    '/pages/investimentos.html',
    '/pages/perfil.html'
]

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS).catch(function() {})
        })
    )
    self.skipWaiting()
})

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME })
                    .map(function(key) { return caches.delete(key) })
            )
        })
    )
    self.clients.claim()
})

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return
    if (event.request.url.includes('firebase') || event.request.url.includes('gstatic')) return

    event.respondWith(
        fetch(event.request).catch(function() {
            return caches.match(event.request)
        })
    )
})
