const CACHE='tunggiang-baogia-async-inbox-20261121-r2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./inbox-client.js','./inbox-sender.js','./icons/bao-gia-nhanh-192.png','./icons/bao-gia-nhanh-512.png','./icons/bao-gia-nhanh-1024.png','./icons/bao-gia-nhanh-maskable-192.png','./icons/bao-gia-nhanh-maskable-512.png'].map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ASSETS)})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('tunggiang-baogia-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);u.search='';if(!ASSETS.includes(u.href))return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok)await c.put(u.href,r.clone());return r}catch(err){const r=await c.match(u.href);if(r)return r;throw err}})())});

