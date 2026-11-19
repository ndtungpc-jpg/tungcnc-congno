const CACHE='tunggiang-congno-pwa-2.0.4-1';
const ASSETS=['./','./index.html','./safety.js','./recovery.js','./excel.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tunggiang-congno-')&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const url=new URL(e.request.url);
 if(!ASSETS.some(a=>new URL(a,self.registration.scope).pathname===url.pathname))return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const fresh=await fetch(e.request,{cache:'no-store'});if(fresh.ok)await cache.put(e.request,fresh.clone());return fresh}
  catch(err){const fallback=await cache.match(e.request,{ignoreSearch:true});if(fallback)return fallback;throw err}
 })());
});
