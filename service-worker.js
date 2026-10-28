// ATR-GYM · service worker
// Red primero: siempre intenta la versión nueva y usa la caché solo sin conexión,
// así nadie se queda atascado en una versión vieja de la web.
const CACHE_NAME = 'atr-gym-v19';
const archivos = [
    './',
    './index.html',
    './manifest.json',
    './atr.css',
    './bootstrap-atr.css',
    './atr-barra.js',
    './atr-anim.js',
    './atr-vidrio.js',
    './atr-base.js',
    './atr-3d.js',
    './atr-3d-motor.js',
    './atr-3d-boxeo.js',
    './atr-3d-powerlifting.js',
    './atr-3d-culturismo.js',
    './powerlifting.html',
    './boxeo.html',
    './culturismo.html',
    './img/icono-192.png',
    './img/icono-512.png',
    './img/apple-touch-icon.png',
    './img/barra/disco-25.webp',
    './img/barra/disco-20.webp',
    './img/barra/disco-15.webp',
    './img/barra/disco-10.webp',
    './img/barra/disco-5.webp',
    './img/barra/disco-2-5.webp',
    './img/barra/disco-1-25.webp',
    './img/barra/cierre.webp',
    './img/barra/brida.webp',
    './img/barra/eje.webp',
    './img/barra/manga-der.webp',
    './img/barra/manga-izq.webp'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(archivos)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(claves => Promise.all(claves.filter(c => c !== CACHE_NAME).map(c => caches.delete(c))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (res.ok && new URL(e.request.url).origin === location.origin) {
                    const copia = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, copia));
                }
                return res;
            })
            .catch(() => caches.match(e.request).then(res => res || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
});
