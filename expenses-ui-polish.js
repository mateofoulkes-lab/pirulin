const $g=(s,r=document)=>r.querySelector(s);

function monthShift(value,delta){
  const m=String(value||'').match(/^(\d{4})-(\d{2})$/);
  const base=m?new Date(Number(m[1]),Number(m[2])-1,1):new Date();
  base.setMonth(base.getMonth()+delta);
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(value){
  const [y,m]=String(value).split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('es-AR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
}
function ensureMonthOption(select,value){
  if(![...select.options].some(o=>o.value===value)){
    const option=document.createElement('option');option.value=value;option.textContent=monthLabel(value);select.appendChild(option);
  }
}
function syncSettleVisibility(){
  const main=$g('#gastosSuite .money-balance .balance-main'),button=$g('#openSettleMock');
  if(!main||!button)return;
  const atZero=/están a mano/i.test(main.textContent||'');
  button.style.display=atZero?'none':'';
}
function ensureBottomDock(){
  const suite=$g('#gastosSuite'),balance=$g('#gastosSuite .money-balance'),fab=$g('#gastosSuite .gastos-fab');
  if(!suite||!balance||!fab)return;
  let dock=$g('#gastosBottomDock');
  if(!dock){dock=document.createElement('div');dock.id='gastosBottomDock';suite.appendChild(dock)}
  if(balance.parentElement!==dock)dock.appendChild(balance);
  if(fab.parentElement!==dock)dock.appendChild(fab);
  balance.hidden=false;balance.style.removeProperty('display');balance.setAttribute('aria-hidden','false');
}
function install(){
  if(document.documentElement.dataset.expensesUiPolish==='1')return;
  const suite=$g('#gastosSuite'),scroll=$g('#gastosSuite .gastos-scroll'),list=$g('#expenseListMock'),balance=$g('#gastosSuite .money-balance'),month=$g('#expenseMonthMock'),fab=$g('#gastosSuite .gastos-fab');
  if(!suite||!scroll||!list||!balance||!month||!fab)return setTimeout(install,80);
  document.documentElement.dataset.expensesUiPolish='1';

  const sub=$g('.balance-sub',balance);if(sub)sub.remove();
  ensureBottomDock();

  const monthBox=month.closest('.expense-month');
  if(monthBox){
    const title=monthBox.querySelector('strong');if(title)title.remove();
    monthBox.classList.add('expense-month-nav');
    if(!$g('#expensePrevMonth')){
      const prev=document.createElement('button');prev.id='expensePrevMonth';prev.type='button';prev.className='expense-month-arrow';prev.setAttribute('aria-label','Mes anterior');prev.textContent='‹';
      const next=document.createElement('button');next.id='expenseNextMonth';next.type='button';next.className='expense-month-arrow';next.setAttribute('aria-label','Mes siguiente');next.textContent='›';
      month.insertAdjacentElement('beforebegin',prev);month.insertAdjacentElement('afterend',next);
      const go=delta=>{const value=monthShift(month.value,delta);ensureMonthOption(month,value);month.value=value;month.dispatchEvent(new Event('change',{bubbles:true}))};
      prev.addEventListener('click',e=>{e.preventDefault();go(-1)});
      next.addEventListener('click',e=>{e.preventDefault();go(1)});
    }
  }

  const style=document.createElement('style');style.id='expensesUiPolishStyle';style.textContent=`
    #gastosSuite .gastos-scroll{padding-bottom:230px!important}
    #gastosBottomDock{
      position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:59!important;
      display:grid!important;grid-template-columns:minmax(0,1fr) 74px!important;align-items:center!important;gap:16px!important;
      padding:74px 18px calc(max(18px,env(safe-area-inset-bottom)) + 8px)!important;
      pointer-events:none!important;
      background:linear-gradient(180deg,rgba(248,249,252,0) 0%,rgba(248,249,252,.18) 10%,rgba(248,249,252,.52) 24%,rgba(248,249,252,.82) 42%,rgba(248,249,252,.96) 62%,rgba(248,249,252,.995) 78%,#f8f9fc 100%)!important;
    }
    #gastosBottomDock>*{pointer-events:auto!important}
    #gastosSuite .money-balance{
      display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;z-index:1!important;
      width:100%!important;max-width:none!important;box-sizing:border-box!important;flex:none!important;margin:0!important;padding:12px 14px!important;border-radius:18px!important;
      box-shadow:0 8px 28px rgba(31,41,55,.14)!important;background:rgba(255,255,255,.92)!important;backdrop-filter:blur(10px)!important;
    }
    #gastosSuite .money-balance .balance-main{display:block!important;visibility:visible!important;opacity:1!important;font-size:19px!important;line-height:1.15!important;margin-top:2px!important}
    #gastosSuite .money-balance .eyebrow{display:block!important;margin-bottom:2px!important;font-size:9px!important}
    #gastosSuite .settle-btn{margin-top:9px!important;width:100%!important}
    #gastosSuite .gastos-fab{
      position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;z-index:2!important;
      width:74px!important;height:74px!important;margin:0!important;align-self:center!important;justify-self:end!important;
    }
    #gastosSuite .gastos-fab:active{transform:scale(.95)!important}
    #gastosSuite .expense-toolbar{align-items:stretch!important;gap:12px!important}
    #gastosSuite .expense-month-nav{
      display:grid!important;grid-template-columns:38px minmax(0,1fr) 38px!important;grid-template-rows:1fr!important;align-items:center!important;column-gap:4px!important;
      min-height:64px!important;height:64px!important;padding:0 8px!important;box-sizing:border-box!important;
    }
    #gastosSuite .expense-month-nav select{grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;height:100%!important;text-align:center!important;text-align-last:center!important;background:transparent!important;border:0!important;box-shadow:none!important;font-weight:850!important}
    #gastosSuite .expense-month-arrow{grid-row:1!important;width:36px!important;height:36px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:#697282!important;font-size:27px!important;line-height:1!important;display:grid!important;place-items:center!important;padding:0!important}
    #gastosSuite .expense-month-arrow:active{background:#e7eaf0!important;transform:scale(.94)}
    #expensePrevMonth{grid-column:1!important}#expenseNextMonth{grid-column:3!important}
    #gastosSuite .expense-toolbar>*{min-height:64px!important;box-sizing:border-box!important}
    @media(max-width:370px){
      #gastosBottomDock{grid-template-columns:minmax(0,1fr) 68px!important;gap:12px!important;padding-left:14px!important;padding-right:14px!important}
      #gastosSuite .gastos-fab{width:68px!important;height:68px!important}
      #gastosSuite .money-balance{padding:11px 12px!important}
    }
  `;document.head.appendChild(style);

  const listObserver=new MutationObserver(()=>{ensureBottomDock();syncSettleVisibility()});
  listObserver.observe(list,{childList:true,subtree:true});
  syncSettleVisibility();
  new MutationObserver(syncSettleVisibility).observe($g('.balance-main',balance),{childList:true,subtree:true,characterData:true});
}
install();
