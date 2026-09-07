const mobileQuery=matchMedia('(max-width: 699px)');
function applyDeviceMode(){
  const mobile=mobileQuery.matches || (matchMedia('(pointer: coarse)').matches && innerWidth<900);
  document.body.classList.toggle('device-mobile',mobile);
  document.body.classList.toggle('device-desktop',!mobile);
  const badge=document.getElementById('deviceModeBadge');
  if(badge) badge.textContent=mobile?'CELULAR':'ESCRITORIO';
}
applyDeviceMode();
mobileQuery.addEventListener?.('change',applyDeviceMode);
addEventListener('resize',applyDeviceMode,{passive:true});
if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error),{once:true});
window.addEventListener('pirulin-auth-changed',event=>{
  document.getElementById('login')?.classList.toggle('hidden',!!event.detail?.signedIn);
});

let gastosInstallPrompt=null;
function syncInstallButton(){
  const menu=document.getElementById('gastosTopMenuMock');
  if(!menu)return;
  let button=document.getElementById('installGastosPwa');
  const standalone=matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
  if(standalone){
    button?.remove();
    return;
  }
  if(!gastosInstallPrompt){
    button?.remove();
    return;
  }
  if(!button){
    button=document.createElement('button');
    button.id='installGastosPwa';
    button.type='button';
    button.textContent='Instalar Pirulín! Gastos';
    button.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopPropagation();
      document.getElementById('gastosTopMenuMock')?.classList.remove('show');
      if(!gastosInstallPrompt)return;
      gastosInstallPrompt.prompt();
      try{await gastosInstallPrompt.userChoice}catch{}
      gastosInstallPrompt=null;
      syncInstallButton();
    });
    menu.prepend(button);
  }
}
addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  gastosInstallPrompt=event;
  syncInstallButton();
});
addEventListener('appinstalled',()=>{
  gastosInstallPrompt=null;
  syncInstallButton();
  try{say('Pirulín! Gastos instalado')}catch{}
});
setTimeout(syncInstallButton,250);
