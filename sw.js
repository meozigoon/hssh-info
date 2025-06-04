self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('v1').then(cache =>
      cache.addAll([
        '/index.html',
        '/style.css',
        '/script.js',
        '/image/hssh_Logo.png',
        '/image/hssh_Logo_192.png',
        '/image/hssh_Logo_512.png',
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
