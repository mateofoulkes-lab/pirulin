import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { getMessaging, isSupported, onRegistered, register } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging.js";

let messaging=null;
let stopRegistered=null;
let booting=false;
let routedHash='';

function state(){return window.PirulinFirebase||null}
function launcher(){return document.getElementById('launcher')}
function registrationDocId(fid){return encodeURIComponent(String(fid||''))}

function removePrompt(){document.getElementById('pirulinNotificationsPrompt')?.remove()}

function installPrompt(){
  if(Notification.permission!=='default'||document.getElementById('pirulinNotificationsPrompt'))return;
  const root=launcher();if(!root)return setTimeout(installPrompt,120);
  const box=document.createElement('div');
  box.id='pirulinNotificationsPrompt';
  box.innerHTML='<div><b>Activar notificaciones</b><span>Recibí avisos de Pirulín aunque esté cerrada.</span></div><button type="button">Activar</button>';
  box.style.cssText='position:absolute;left:18px;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:80;display:flex;align-items:center;gap:12px;padding:12px 13px 12px 15px;border:1px solid #e5e9ef;border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 12px 32px rgba(34,42,58,.12);backdrop-filter:blur(12px);font-family:Nunito,system-ui,sans-serif';
  box.firstElementChild.style.cssText='display:grid;gap:2px;flex:1;min-width:0;color:#333b47';
  box.querySelector('b').style.cssText='font-size:12px;font-weight:900';
  box.querySelector('span').style.cssText='font-size:10px;color:#848c98;font-weight:700';
  const btn=box.querySelector('button');
  btn.style.cssText='border:0;border-radius:12px;padding:9px 12px;background:#303641;color:white;font:900 11px Nunito,system-ui,sans-serif';
  btn.onclick=async()=>{
    btn.disabled=true;btn.textContent='Activando…';
    try{
      const permission=await Notification.requestPermission();
      if(permission==='granted'){removePrompt();await ensurePushRegistration()}
      else{btn.textContent='No permitido';setTimeout(removePrompt,1100)}
    }catch(e){console.error('Pirulín notifications permission',e);btn.disabled=false;btn.textContent='Activar'}
  };
  root.appendChild(box);
}

async function saveFid(fid){
  const s=state();if(!s?.db||!s?.user||!s?.person||!fid)return;
  await setDoc(doc(s.db,'shared','pushRegistrations','items',registrationDocId(fid)),{
    fid:String(fid),uid:s.user.uid,person:s.person,email:s.user.email||null,
    userAgent:navigator.userAgent||null,platform:'web-pwa',updatedAt:serverTimestamp()
  },{merge:true});
}

async function ensurePushRegistration(){
  if(booting||Notification.permission!=='granted')return;
  const s=state();if(!s?.app||!s?.db||!s?.user)return;
  if(!(await isSupported()))return;
  booting=true;
  try{
    const sw=await navigator.serviceWorker.ready;
    if(!messaging)messaging=getMessaging(s.app);
    if(!stopRegistered)stopRegistered=onRegistered(messaging,fid=>saveFid(fid).catch(e=>console.error('Pirulín save FID',e)));
    await register(messaging,{serviceWorkerRegistration:sw});
  }catch(e){console.error('Pirulín FCM registration',e)}finally{booting=false}
}

function openHashDestination(){
  const hash=location.hash;if(!hash||hash===routedHash||!state()?.user)return;
  const buttonId={'#gastos':'openGastosApp','#tareas':'openTasksApp','#comidas':'openComidasApp'}[hash];
  if(!buttonId)return;
  const button=document.getElementById(buttonId);
  if(!button)return setTimeout(openHashDestination,120);
  routedHash=hash;
  setTimeout(()=>{button.click();history.replaceState(null,'',location.pathname+location.search)},180);
}

function sync(){
  if(!state()?.user)return;
  if('Notification'in window&&'serviceWorker'in navigator){
    if(Notification.permission==='granted'){removePrompt();ensurePushRegistration()}
    else if(Notification.permission==='default')installPrompt();
    else removePrompt();
  }
  openHashDestination();
}

window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(sync,80);else removePrompt()});
window.addEventListener('hashchange',openHashDestination);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setTimeout(sync,220);
window.PirulinNotifications={sync,register:ensurePushRegistration};
