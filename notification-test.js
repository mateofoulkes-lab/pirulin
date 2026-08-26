const TEST_DELAY_MS=15000;
let testButton=null;

function ensureStyles(){
  if(document.getElementById('pirulinNotificationTestStyles'))return;
  const style=document.createElement('style');
  style.id='pirulinNotificationTestStyles';
  style.textContent=`
    #pirulinNotificationTest{display:block;margin:18px auto 0;border:1px solid #e3e6ec;border-radius:14px;background:#fff;color:#596170;padding:10px 14px;font:800 11px/1.2 Nunito,system-ui,sans-serif;box-shadow:0 6px 18px rgba(30,38,55,.06);cursor:pointer}
    #pirulinNotificationTest:active{transform:scale(.98)}
    #pirulinNotificationTest:disabled{opacity:.6;cursor:default}
  `;
  document.head.appendChild(style);
}

function removeButton(){
  testButton?.remove();
  testButton=null;
}

function installButton(){
  if(window.PirulinFirebase?.person!=='Mateo')return removeButton();
  const launcher=document.getElementById('launcher');
  const grid=launcher?.querySelector('.app-grid');
  if(!launcher||!grid)return setTimeout(installButton,120);
  if(document.getElementById('pirulinNotificationTest'))return;
  ensureStyles();
  testButton=document.createElement('button');
  testButton.id='pirulinNotificationTest';
  testButton.type='button';
  testButton.textContent='Simular notificación en 15 segundos';
  grid.insertAdjacentElement('afterend',testButton);
  testButton.addEventListener('click',scheduleTest);
}

async function getServiceWorker(){
  if(!('serviceWorker' in navigator))throw new Error('Este navegador no soporta service workers.');
  const reg=await navigator.serviceWorker.ready;
  return reg.active||navigator.serviceWorker.controller;
}

async function scheduleTest(){
  if(!testButton)return;
  testButton.disabled=true;
  try{
    if(!('Notification' in window))throw new Error('Este dispositivo no soporta notificaciones web.');
    let permission=Notification.permission;
    if(permission!=='granted')permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Tenés que permitir las notificaciones para hacer la prueba.');
    const worker=await getServiceWorker();
    if(!worker)throw new Error('El service worker todavía no está listo.');
    worker.postMessage({type:'TEST_NOTIFICATION_15S',delayMs:TEST_DELAY_MS});
    testButton.textContent='Programada ✓ Cerrá Pirulín';
    setTimeout(()=>{
      if(testButton){
        testButton.disabled=false;
        testButton.textContent='Simular notificación en 15 segundos';
      }
    },TEST_DELAY_MS+2500);
  }catch(error){
    console.error('[Pirulín] prueba de notificación',error);
    try{window.eval(`if(typeof say==='function')say(${JSON.stringify(error.message||'No pude programar la notificación')})`)}catch{}
    testButton.disabled=false;
  }
}

window.addEventListener('pirulin-auth-changed',e=>{
  if(e.detail?.signedIn)setTimeout(installButton,0);
  else removeButton();
});

if(window.PirulinFirebase?.person==='Mateo')installButton();
else setTimeout(installButton,250);
