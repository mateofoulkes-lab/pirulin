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
const standalonePct=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
function standaloneFmt(value){return standaloneMoney.format(Math.round(Number(value||0)*100)/100)}

function getStandaloneExpense(card){
  const id=card?.dataset?.expenseId;
  return (window.PirulinExpensesLive?.items||[]).find(item=>item.id===id);
}

function makeSplitBar(item){
  const total=Math.max(0,Number(item.amount)||0);
  const oweA=Math.max(0,Number(item.oweA ?? total/2));
  const oweB=Math.max(0,Number(item.oweB ?? Math.max(0,total-oweA)));
  const rawA=total>0?(oweA/total)*100:50;
  const pctA=Math.max(0,Math.min(100,rawA));
  const pctB=100-pctA;
  const showPercent=item.splitType==='percent';
  const shownPctA=Number(item.splitPercentA ?? pctA);
  const shownPctB=Number(item.splitPercentB ?? pctB);

  const wrap=document.createElement('div');
  wrap.className='standalone-expense-split';
  wrap.innerHTML=`
    <div class="standalone-splitbar" role="img" aria-label="Mateo ${standaloneFmt(oweA)}, Dani ${standaloneFmt(oweB)}">
      <div class="standalone-split-track">
        <span class="standalone-split-segment mateo" style="width:${pctA}%"></span>
        <span class="standalone-split-segment dani" style="width:${pctB}%"></span>
        <div class="standalone-split-amounts">
          <span class="mateo-amount">${standaloneFmt(oweA)}</span>
          <span class="dani-amount">${standaloneFmt(oweB)}</span>
        </div>
      </div>
      <div class="standalone-split-labels">
        <span class="mateo-label">Mateo${showPercent?` · ${standalonePct.format(shownPctA)}%`:''}</span>
        <span class="dani-label">Dani${showPercent?` · ${standalonePct.format(shownPctB)}%`:''}</span>
      </div>
    </div>`;
  return wrap;
}

function decorateStandaloneCard(card){
  if(!document.body.classList.contains('device-desktop'))return;
  if(card.classList.contains('standalone-desktop-row'))return;
  const item=getStandaloneExpense(card);
  if(!item||item.settlement)return;

  const top=card.querySelector(':scope > .expense-top');
  const title=top?.querySelector('.expense-title');
  const amount=top?.querySelector('.expense-amount');
  const menu=top?.querySelector('.expense-more');
  const meta=card.querySelector(':scope > .expense-meta');
  const legacySplit=card.querySelector(':scope > .expense-split');
  const payer=meta?.querySelector('.payer-pill');
  if(!top||!title||!amount||!menu||!meta||!payer)return;

  const left=document.createElement('div');
  left.className='standalone-expense-left';
  left.append(title,meta);

  const center=item.amountPending===true
    ? (()=>{const x=document.createElement('div');x.className='standalone-expense-split pending';x.textContent='Monto pendiente';return x})()
    : makeSplitBar(item);

  const right=document.createElement('div');
  right.className='standalone-expense-right';
  right.append(amount,payer);

  const menuWrap=document.createElement('div');
  menuWrap.className='standalone-expense-menu';
  menuWrap.append(menu);

  legacySplit?.remove();
  top.remove();
  card.replaceChildren(left,center,right,menuWrap);
  card.classList.add('standalone-desktop-row');
}

function decorateStandaloneCards(){
  if(!document.body.classList.contains('device-desktop'))return;
  document.querySelectorAll('#expenseListMock .expense-card:not(.settlement-card)').forEach(decorateStandaloneCard);
}

function installStandaloneExpenseCardLayout(){
  const list=document.getElementById('expenseListMock');
  if(!list)return setTimeout(installStandaloneExpenseCardLayout,100);
  decorateStandaloneCards();
  new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.matches?.('.expense-card:not(.settlement-card)'))decorateStandaloneCard(node);
      }
    }
  }).observe(list,{childList:true});
}
installStandaloneExpenseCardLayout();
