const CHECK_INTERVAL_MS=15*60*1000;
let registration=null;
let refreshing=false;
let dismissedWorker=null;

const $u=(s,r=document)=>r.querySelector(s);

function addStyles(){
  if($u('#pirulinUpdateStyle'))return;
  const style=document.createElement('style');
  style.id='pirulinUpdateStyle';
  style.textContent=`
    #pirulinUpdateBanner{position:fixed;left:14px;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:999996;display:flex;align-items:center;gap:12px;max-width:430px;margin:0 auto;padding:12px 12px 12px 15px;border:1px solid rgba(226,229,236,.95);border-radius:18px;background:rgba(255,255,255,.97);box-shadow:0 14px 38px rgba(31,41,55,.16),0 2px 8px rgba(31,41,55,.06);backdrop-filter:blur(16px);color:#343842;font-family:"Nunito",system-ui,sans-serif;opacity:0;transform:translateY(18px) scale(.98);transition:opacity .2s ease,transform .28s cubic-bezier(.16,1,.3,1)}
    #pirulinUpdateBanner.show{opacity:1;transform:none}
    #pirulinUpdateBanner .update-copy{flex:1;min-width:0}
    #pirulinUpdateBanner strong{display:block;font-size:13px;font-weight:900;line-height:1.18}
    #pirulinUpdateBanner small{display:block;margin-top:2px;color:#858b95;font-size:10px;font-weight:750}
    #pirulinUpdateBanner .update-actions{display:flex;align-items:center;gap:6px;flex:none}
    #pirulinUpdateBanner button{border:0;border-radius:12px;padding:9px 11px;font:850 11px/1 "Nunito",system-ui,sans-serif;cursor:pointer}
    #pirulinUpdateLater{background:#f1f3f6;color:#747b88}
    #pirulinUpdateNow{background:#343842;color:white}
    #pirulinUpdateNow:disabled{opacity:.58;cursor:default}
    @media(max-width:360px){#pirulinUpdateBanner{align-items:flex-start;flex-wrap:wrap}.update-actions{width:100%;justify-content:flex-end}}
  `;
  document.head.appendChild(style);
}

function ensureBanner(){
  let banner=$u('#pirulinUpdateBanner');
  if(banner)return banner;
  addStyles();
  banner=document.createElement('div');
  banner.id='pirulinUpdateBanner';
  banner.setAttribute('role','status');
  banner.setAttribute('aria-live','polite');
  banner.innerHTML=`<div class="update-copy"><strong>Nueva versión de Pirulín ✨</strong><small>Está lista para instalar.</small></div><div class="update-actions"><button id="pirulinUpdateLater" type="button">Después</button><button id="pirulinUpdateNow" type="button">Actualizar</button></div>`;
  document.body.appendChild(banner);
  $u('#pirulinUpdateLater',banner).addEventListener('click',()=>{
    dismissedWorker=registration?.waiting||null;
    banner.classList.remove('show');
  });
  $u('#pirulinUpdateNow',banner).addEventListener('click',()=>activateWaiting());
  return banner;
}

function offer(worker){
  if(!worker||worker===dismissedWorker)return;
  const banner=ensureBanner();
  requestAnimationFrame(()=>banner.classList.add('show'));
}

function watchInstalling(worker){
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker);
  });
}

async function activateWaiting(){
  const worker=registration?.waiting;
  if(!worker)return;
  const button=$u('#pirulinUpdateNow');
  if(button){button.disabled=true;button.textContent='Actualizando…'}
  refreshing=true;
  worker.postMessage({type:'SKIP_WAITING'});
  setTimeout(()=>{if(refreshing)location.reload()},2500);
}

async function checkForUpdate(){
  try{
    if(!registration)return;
    await registration.update();
    if(registration.waiting)offer(registration.waiting);
  }catch(error){console.debug('[Pirulín] No pude comprobar actualizaciones',error)}
}

async function install(){
  if(!('serviceWorker'in navigator))return;
  try{
    registration=await (window.PirulinSWRegistrationPromise||navigator.serviceWorker.ready);
    if(registration.waiting)offer(registration.waiting);
    if(registration.installing)watchInstalling(registration.installing);
    registration.addEventListener('updatefound',()=>watchInstalling(registration.installing));

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!refreshing)return;
      refreshing=false;
      location.reload();
    });

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')checkForUpdate();
    });
    window.addEventListener('focus',checkForUpdate);
    setInterval(()=>{if(document.visibilityState==='visible')checkForUpdate()},CHECK_INTERVAL_MS);
    setTimeout(checkForUpdate,1200);
  }catch(error){console.debug('[Pirulín] Actualizador PWA no disponible',error)}
}

install();
window.PirulinPwaUpdates={check:checkForUpdate};
