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


function layoutStandaloneExpenseCards(){
  const desktop=document.body.classList.contains('device-desktop');

  document.querySelectorAll('#expenseListMock .expense-card:not(.settlement-card)').forEach(card=>{
    const top=card.querySelector(':scope > .expense-top');
    const title=card.querySelector('.expense-title');
    const amount=card.querySelector('.expense-amount');
    const menu=card.querySelector('.expense-more');
    const meta=card.querySelector(':scope > .expense-meta, .standalone-expense-left > .expense-meta');
    const split=card.querySelector(':scope > .expense-split');
    const payer=card.querySelector('.payer-pill');
    if(!top||!title||!amount||!menu||!meta||!split||!payer)return;

    if(desktop){
      let left=card.querySelector(':scope > .standalone-expense-left');
      let right=card.querySelector(':scope > .standalone-expense-right');
      let menuWrap=card.querySelector(':scope > .standalone-expense-menu');

      if(!left){
        left=document.createElement('div');
        left.className='standalone-expense-left';
        card.insertBefore(left,top);
      }
      if(!right){
        right=document.createElement('div');
        right.className='standalone-expense-right';
        card.insertBefore(right,menuWrap||null);
      }
      if(!menuWrap){
        menuWrap=document.createElement('div');
        menuWrap.className='standalone-expense-menu';
        card.appendChild(menuWrap);
      }

      left.append(title,meta);
      right.append(amount,payer);
      menuWrap.append(menu);
      top.hidden=true;
      card.classList.add('standalone-desktop-row');
    }else if(card.classList.contains('standalone-desktop-row')){
      top.hidden=false;
      top.append(title,amount,menu);
      card.insertBefore(meta,split);
      meta.append(payer);
      card.querySelector(':scope > .standalone-expense-left')?.remove();
      card.querySelector(':scope > .standalone-expense-right')?.remove();
      card.querySelector(':scope > .standalone-expense-menu')?.remove();
      card.classList.remove('standalone-desktop-row');
    }
  });
}

function installStandaloneExpenseCardLayout(){
  const list=document.getElementById('expenseListMock');
  if(!list)return setTimeout(installStandaloneExpenseCardLayout,100);
  layoutStandaloneExpenseCards();
  new MutationObserver(()=>queueMicrotask(layoutStandaloneExpenseCards)).observe(list,{childList:true,subtree:true});
  addEventListener('resize',()=>queueMicrotask(layoutStandaloneExpenseCards),{passive:true});
}
installStandaloneExpenseCardLayout();
