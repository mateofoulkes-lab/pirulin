const CACHE = 'pirulin-pwa-v0.16.2-beta';
const CORE = [
  './','./index.html','./mockup_pirulin_v51.html','./launcher-splash.js','./update-manager.js','./firebase-client.js','./notifications.js',
  './tasks-repository.js','./tasks-preferences.js','./tasks-advanced.js','./tasks-live-adapter.js','./tasks-assign-today.js',
  './notes-repository.js','./notes-ui-v3.js','./notes-editor-fixes.js','./notes-live-v3.js','./notes-colors.js','./notes-keep-polish.js','./notes-menu-dismiss.js',
  './expenses-repository.js','./expenses-live.js','./expenses-final-fixes.js','./expenses-settle-celebration.js','./expenses-ui-polish.js','./expenses-percent-slider.js','./expenses-migration.js','./expenses-categories.js','./expenses-card-compact.js','./expenses-report.js','./expenses-report-motion.js',
  './comidas-repository.js','./comidas-live.js','./comidas-plan.js','./comidas-day-context.js','./comidas-nav.js',
  './subapp-transitions.js','./pirulin-icon.svg','./icon.png','./LOGO PIRULIN.png','./manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload={};
    try{payload=event.data?.json?.()||{}}catch{try{payload={body:event.data?.text?.()||''}}catch{}}
    const data=payload.data||payload;
    const kind=String(data.kind||'general');
    const tag=String(data.tag||`pirulin-${kind}`);
    const now=Date.now();
    const previous=await self.registration.getNotifications({tag});
    const prior=previous[0]?.data||{};
    const grouped=previous.length&&now-Number(prior.groupedAt||0)<=5*60*1000;
    const count=grouped?Number(prior.count||1)+1:1;
    previous.forEach(n=>n.close());
    const rawBody=String(data.body||payload.notification?.body||'Tenés una novedad en Pirulín.');
    const body=count>1?`${count} novedades · ${rawBody}`:rawBody;
    const hash=String(data.url||'');
    await self.registration.showNotification(String(data.title||payload.notification?.title||'Pirulín!'),{
      body,
      icon:'./pirulin-icon.svg',
      badge:'./icon.png',
      tag,
      renotify:true,
      data:{url:`./index.html${hash.startsWith('#')?hash:''}`,kind,count,groupedAt:now}
    });
  })());
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./index.html',self.location.href).href;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      const existing=list.find(client=>client.url.startsWith(self.registration.scope));
      if(existing){
        existing.navigate(target).catch(()=>{});
        return existing.focus();
      }
      return clients.openWindow(target);
    })
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function isCritical(url,request){
  if(request.mode==='navigate')return true;
  return /\/(?:index\.html|mockup_pirulin_v51\.html|launcher-splash\.js|update-manager\.js|firebase-client\.js|notifications\.js|tasks-repository\.js|tasks-preferences\.js|tasks-advanced\.js|tasks-live-adapter\.js|tasks-assign-today\.js|notes-repository\.js|notes-ui-v3\.js|notes-editor-fixes\.js|notes-live-v3\.js|notes-colors\.js|notes-keep-polish\.js|notes-menu-dismiss\.js|expenses-repository\.js|expenses-live\.js|expenses-final-fixes\.js|expenses-settle-celebration\.js|expenses-ui-polish\.js|expenses-percent-slider\.js|expenses-migration\.js|expenses-categories\.js|expenses-card-compact\.js|expenses-report\.js|expenses-report-motion\.js|comidas-repository\.js|comidas-live\.js|comidas-plan\.js|comidas-day-context\.js|comidas-nav\.js|subapp-transitions\.js|pirulin-icon\.svg|icon\.png)$/.test(url.pathname)
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin){
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
    return;
  }
  if(isCritical(url,event.request)){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          if(response&&response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }))
  );
});
