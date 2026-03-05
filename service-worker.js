const CACHE_NAME = 'chess-tournament-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/tournament.js',
    '/js/pairing.js',
    '/js/utils.js',
    '/js/db.js',
    '/manifest.json',
    '/assets/icons/chess-icon.svg',
    'https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('fonts.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((response) => {
                        // Don't cache if not valid
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Cache the fetched response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If both cache and network fail, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-tournaments') {
        event.waitUntil(syncTournaments());
    }
});

// Function to sync tournaments when back online
async function syncTournaments() {
    try {
        const db = await openDB();
        const unsynced = await db.getAll('unsynced');
        
        for (const item of unsynced) {
            // In a real app, you'd send this to a server
            console.log('Syncing:', item);
            await db.delete('unsynced', item.id);
        }
    } catch (error) {
        console.log('Sync failed:', error);
    }
}

// Helper to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TournamentDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tournaments')) {
                db.createObjectStore('tournaments', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('unsynced')) {
                db.createObjectStore('unsynced', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}