/* Only public content is cached. Orders, APIs, tokens and downloads never enter Cache Storage. */
const CACHE='epic-public-__BUILD_ID__';
const CORE=['/offline.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);await cache.addAll(CORE);
  try{const r=await fetch('/precache.json',{cache:'no-store'});if(r.ok){const files=await r.json();if(Array.isArray(files))await Promise.allSettled(files.map(url=>cache.add(url)));}}catch{}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('epic-public-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
const privatePath=path=>/^\/(api|library|checkout|studio|advisor|private|store)(\/|$)/.test(path);
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||privatePath(url.pathname)||url.searchParams.has('token')||url.searchParams.has('session_id')||url.searchParams.has('studio_token')||url.pathname.startsWith('/art/studio-')||url.pathname.startsWith('/media/art/studio-'))return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(req);if(response.ok&&!response.headers.get('Cache-Control')?.includes('no-store')){await cache.put(req,response.clone());}return response;}catch{return await cache.match(req)||await cache.match('/offline.html');}})());return;
 }
 if(!/^\/(assets\/|artworks\/|media\/art\/|fonts\/|icons\/|favicon\.svg)/.test(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(req);if(cached)return cached;const response=await fetch(req);if(response.ok){await cache.put(req,response.clone());const keys=await cache.keys();if(keys.length>130){const first=keys.find(k=>!CORE.includes(new URL(k.url).pathname));if(first)await cache.delete(first);}}return response;})());
});
