const CACHE_NAME = 'billooo-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/css/styles.css',
    '/src/js/app.js',
    '/src/js/crdt.js',
    '/src/js/peer-manager.js',
    '/src/js/expense-calculator.js',
    'https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js',
    '/icons/72.png',
    '/icons/96.png',
    '/icons/128.png',
    '/icons/144.png',
    '/icons/152.png',
    '/icons/192.png',
    '/icons/384.png',
    '/icons/512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch new version
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});