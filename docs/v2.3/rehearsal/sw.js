// Rehearsal scope only. Never caches API responses or touches ledger storage.
const CACHE='tg-rc1-rehearsal-page-v1';
const ASSETS=['./','index.html','app.js','../../../sync/safety.js','../../../sync/core.js','../../../sync/reconcile.js','../../../sync/engine.js'].map(p=>new URL(p,self.location.href).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!ASSETS.includes(event.request.url))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch(error){const cached=await cache.match(event.request);if(cached)return cached;throw error;}})());});
