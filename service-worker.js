const CACHE_NAME = "theeha-pwa-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/kalamkaari.html"
    // Aap yahan apni baaki files jaise CSS/JS bhi daal sakte hain future mein
];

// Install Service Worker
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Opened cache");
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch requests (Offline support)
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Agar file cache mein hai toh wahan se do, warna internet se fetch karo
            return response || fetch(event.request);
        })
    );
});