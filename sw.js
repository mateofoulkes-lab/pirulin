const CACHE='pirulin-pwa-v1';
const CORE=[
  './','./index.html','./manifest.webmanifest','./icon.svg','./icon-maskable.svg',
  './parts/part-00.txt','./parts/part-01.txt','./parts/part-02.txt','./parts/part-03.txt','./parts/part-04.txt','./parts/part-05.txt','./parts/part-06.txt','./parts/part-07.txt','./parts/part-08.txt','./parts/part-09.txt','./parts/part-10.txt','./parts/part-11.txt','./parts/part-12.txt'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,cp));return r}).catch(()=>caches.match('./index.html'))));});
