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



const standaloneMoney=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2});
function standaloneFmt(value){return standaloneMoney.format(Math.round(Number(value||0)*100)/100)}

function splitBarForCard(card){
  const split=card.querySelector(':scope > .expense-split, .standalone-expense-split');
  if(!split)return null;

  const id=card.dataset.expenseId;
  const item=(window.PirulinExpensesLive?.items||[]).find(x=>x.id===id);
  if(!item||item.settlement||item.amountPending===true)return split;

  const total=Number(item.amount)||0;
  const oweA=Number(item.oweA ?? total/2);
  const oweB=Number(item.oweB ?? Math.max(0,total-oweA));
  const pctA=total>0?Math.max(0,Math.min(100,oweA/total*100)):50;
  const pctB=Math.max(0,100-pctA);
  const showPercent=item.splitType==='percent';

  let bar=split.querySelector('.standalone-splitbar');
  if(!bar){
    split.classList.add('standalone-expense-split');
    split.innerHTML=`
      <div class="standalone-splitbar">
        <div class="standalone-split-segments">
          <div class="standalone-split-segment mateo"></div>
          <div class="standalone-split-segment dani"></div>
          <div class="standalone-split-amounts">
            <span class="mateo-amount"></span>
            <span class="dani-amount"></span>
          </div>
        </div>
        <div class="standalone-split-labels">
          <span class="mateo-label"></span>
          <span class="dani-label"></span>
        </div>
      </div>`;
    bar=split.querySelector('.standalone-splitbar');
  }

  const mateo=bar.querySelector('.standalone-split-segment.mateo');
  const dani=bar.querySelector('.standalone-split-segment.dani');
  const mateoAmount=bar.querySelector('.mateo-amount');
  const daniAmount=bar.querySelector('.dani-amount');
  const mateoLabel=bar.querySelector('.mateo-label');
  const daniLabel=bar.querySelector('.dani-label');

  mateo.style.width=`${pctA}%`;
  dani.style.width=`${pctB}%`;
  mateoAmount.textContent=standaloneFmt(oweA);
  daniAmount.textContent=standaloneFmt(oweB);
  mateoLabel.textContent=showPercent?`Mateo · ${Math.round(Number(item.splitPercentA ?? pctA)*100)/100}%`:'Mateo';
  daniLabel.textContent=showPercent?`Dani · ${Math.round(Number(item.splitPercentB ?? pctB)*100)/100}%`:'Dani';

  return split;
}

function layoutStandaloneExpenseCards(){
  if(!document.body.classList.contains('device-desktop'))return;

  document.querySelectorAll('#expenseListMock .expense-card:not(.settlement-card)').forEach(card=>{
    const top=card.querySelector(':scope > .expense-top');
    const title=card.querySelector('.expense-title');
    const amount=card.querySelector('.expense-amount');
    const menu=card.querySelector('.expense-more');
    const meta=card.querySelector(':scope > .expense-meta, .standalone-expense-left > .expense-meta');
    const payer=card.querySelector('.payer-pill');
    const split=splitBarForCard(card);
    if(!top||!title||!amount||!menu||!meta||!split||!payer)return;

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
      card.appendChild(right);
    }
    if(!menuWrap){
      menuWrap=document.createElement('div');
      menuWrap.className='standalone-expense-menu';
      card.appendChild(menuWrap);
    }

    if(title.parentElement!==left)left.appendChild(title);
    if(meta.parentElement!==left)left.appendChild(meta);
    if(amount.parentElement!==right)right.appendChild(amount);
    if(payer.parentElement!==right)right.appendChild(payer);
    if(menu.parentElement!==menuWrap)menuWrap.appendChild(menu);
    if(!top.hidden)top.hidden=true;
    card.classList.add('standalone-desktop-row');
  });
}

let standaloneLayoutQueued=false;
function queueStandaloneExpenseLayout(){
  if(standaloneLayoutQueued)return;
  standaloneLayoutQueued=true;
  requestAnimationFrame(()=>{
    standaloneLayoutQueued=false;
    layoutStandaloneExpenseCards();
  });
}
function installStandaloneExpenseCardLayout(){
  const list=document.getElementById('expenseListMock');
  if(!list)return setTimeout(installStandaloneExpenseCardLayout,100);
  queueStandaloneExpenseLayout();
  new MutationObserver(queueStandaloneExpenseLayout).observe(list,{childList:true,subtree:true});
  addEventListener('resize',queueStandaloneExpenseLayout,{passive:true});
  addEventListener('pirulin-expense-saved',()=>setTimeout(queueStandaloneExpenseLayout,60));
}
installStandaloneExpenseCardLayout();
