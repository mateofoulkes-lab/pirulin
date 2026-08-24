let updateRegistration=null;
let updateWorker=null;
let banner=null;
let checking=false;
let reloading=false;

const CHECK_INTERVAL_MS=15*60*1000;
const $u=(s,r=document)=>r.querySelector(s);

function ensureStyles(){
  if($u('#pirulinUpdateStyles'))return;
  const style=document.createElement('style');
  style.id='pirulinUpdateStyles';
  style.textContent=`
    #pirulinUpdateBanner{position:fixed;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 10px);z-index:1000000;width:min(390px,calc(100vw - 28px));box-sizing:border-box;background:rgba(255,255,255,.97);border:1px solid rgba(225,229,237,.95);border-radius:20px;box-shadow:0 18px 52px rgba(25,32,48,.18),0 3px 10px rgba(25,32,48,.08);padding:13px 14px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 12px;align-items:center;transform:translate(-50%,18px);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .28s cubic-bezier(.16,1,.3,1);font-family:"Nunito",system-ui,sans-serif;color:#343842}
    #pirulinUpdateBanner.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
    #pirulinUpdateBanner .update-copy{min-width:0}
    #pirulinUpdateBanner .update-title{font-size:13px;font-weight:900;line-height:1.2;letter-spacing:-.1px}
    #pirulinUpdateBanner .update-sub{font-size:10.5px;font-weight:700;color:#858b95;margin-top:2px;line-height:1.25}
    #pirulinUpdateBanner .update-actions{display:flex;align-items:center;gap:6px}
    #pirulinUpdateBanner button{border:0;border-radius:12px;padding:9px 11px;font:900 11px/1 "Nunito",system-ui,sans-serif;white-space:nowrap;cursor:pointer}
    #pirulinUpdateLater{background:#f1f3f6;color:#747b88}
    #pirulinUpdateNow{background:#343842;color:white;box-shadow:0 5px 12px rgba(40,43,50,.16)}
    #pirulinUpdateNow:disabled{opacity:.6;cursor:default}
  `;
  document.head.appendChild(style);
}

function ensureBanner(){
  if(banner?.isConnected)return banner;
  ensureStyles();
  banner=document.createElement('div');
  banner.id='pirulinUpdateBanner';
  banner.setAttribute('role','status');
  banner.setAttribute('aria-live','polite');
  banner.innerHTML=`<div class="update-copy"><div class="update-title">Hay una nueva versión de Pirulín ✨</div><div class="update-sub">Podés actualizar ahora sin perder tus datos.</div></div><div class="update-actions"><button id="pirulinUpdateLater" type="button">Después</button><button id="pirulinUpdateNow" type="button">Actualizar</button></div>`;
  document.body.appendChild(banner);
  $u('#pirulinUpdateLater',banner).addEventListener('click',()=>hideBanner());
  $u('#pirulinUpdateNow',banner).addEventListener('click',applyUpdate);
  return banner;
}

function showBanner(reg,worker){
  updateRegistration=reg||updateRegistration;
  updateWorker=worker||reg?.waiting||updateWorker;
  if(!updateWorker)return;
  const el=ensureBanner();
  requestAnimationFrame(()=>el.classList.add('show'));
}
function hideBanner(){banner?.classList.remove('show')}

function watchInstalling(reg){
  const worker=reg.installing;
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller){
      showBanner(reg,reg.waiting||worker);
    }
  });
}

async function checkForUpdate(){
  if(checking||!('serviceWorker' in navigator))return;
  checking=true;
  try{
    const reg=updateRegistration||await navigator.serviceWorker.ready;
    updateRegistration=reg;
    if(reg.waiting){showBanner(reg,reg.waiting);return}
    await reg.update();
    if(reg.waiting)showBanner(reg,reg.waiting);
    else if(reg.installing)watchInstalling(reg);
  }catch(error){
    console.debug('[Pirulín] No pude comprobar actualizaciones',error);
  }finally{checking=false}
}

function applyUpdate(){
  const worker=updateWorker||updateRegistration?.waiting;
  if(!worker)return checkForUpdate();
  const button=$u('#pirulinUpdateNow');
  if(button){button.disabled=true;button.textContent='Actualizando…'}
  worker.postMessage({type:'SKIP_WAITING'});
  // controllerchange normally reloads. This is only a safety valve.
  setTimeout(()=>{if(!reloading)location.reload()},2500);
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.ready.then(reg=>{
    updateRegistration=reg;
    if(reg.waiting)showBanner(reg,reg.waiting);
    if(reg.installing)watchInstalling(reg);
    reg.addEventListener('updatefound',()=>watchInstalling(reg));
    checkForUpdate();
  }).catch(()=>{});

  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)return;
    reloading=true;
    location.reload();
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')checkForUpdate();
  });
  window.addEventListener('focus',checkForUpdate);
  window.addEventListener('online',checkForUpdate);
  setInterval(()=>{if(document.visibilityState==='visible')checkForUpdate()},CHECK_INTERVAL_MS);
}

window.PirulinUpdates={check:checkForUpdate};
