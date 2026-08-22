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
function ensureBalancePosition(){
  const list=$g('#expenseListMock'),balance=$g('#gastosSuite .money-balance');
  if(!list||!balance)return;
  if(list.nextElementSibling!==balance)list.insertAdjacentElement('afterend',balance);
  balance.style.removeProperty('display');
  balance.hidden=false;
  balance.setAttribute('aria-hidden','false');
}
function syncSettleVisibility(){
  const main=$g('#gastosSuite .money-balance .balance-main'),button=$g('#openSettleMock');
  if(!main||!button)return;
  const atZero=/están a mano/i.test(main.textContent||'');
  button.style.display=atZero?'none':'';
}
function install(){
  if(document.documentElement.dataset.expensesUiPolish==='1')return;
  const suite=$g('#gastosSuite'),scroll=$g('#gastosSuite .gastos-scroll'),list=$g('#expenseListMock'),balance=$g('#gastosSuite .money-balance'),month=$g('#expenseMonthMock');
  if(!suite||!scroll||!list||!balance||!month)return setTimeout(install,80);
  document.documentElement.dataset.expensesUiPolish='1';

  const sub=$g('.balance-sub',balance);if(sub)sub.remove();
  ensureBalancePosition();

  const monthBox=month.closest('.expense-month');
  if(monthBox&&!$g('#expensePrevMonth')){
    monthBox.classList.add('expense-month-nav');
    const prev=document.createElement('button');prev.id='expensePrevMonth';prev.type='button';prev.className='expense-month-arrow';prev.setAttribute('aria-label','Mes anterior');prev.textContent='‹';
    const next=document.createElement('button');next.id='expenseNextMonth';next.type='button';next.className='expense-month-arrow';next.setAttribute('aria-label','Mes siguiente');next.textContent='›';
    month.insertAdjacentElement('beforebegin',prev);month.insertAdjacentElement('afterend',next);
    const go=delta=>{const value=monthShift(month.value,delta);ensureMonthOption(month,value);month.value=value;month.dispatchEvent(new Event('change',{bubbles:true}))};
    prev.addEventListener('click',e=>{e.preventDefault();go(-1)});
    next.addEventListener('click',e=>{e.preventDefault();go(1)});
  }

  const style=document.createElement('style');style.id='expensesUiPolishStyle';style.textContent=`
    #gastosSuite .gastos-scroll{padding-bottom:150px!important}
    #gastosSuite .money-balance{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:1!important;width:auto!important;flex:none!important;margin:20px 0 8px!important;padding:15px 16px!important;border-radius:18px!important}
    #gastosSuite .money-balance .balance-main{display:block!important;visibility:visible!important;opacity:1!important;font-size:22px!important;margin-top:2px!important}
    #gastosSuite .money-balance .eyebrow{display:block!important;margin-bottom:2px!important}
    #gastosSuite .settle-btn{margin-top:11px!important}
    #gastosSuite .gastos-fab{left:auto!important;right:18px!important;bottom:max(18px,env(safe-area-inset-bottom))!important;transform:none!important}
    #gastosSuite .gastos-fab:active{transform:scale(.95)!important}
    #gastosSuite .expense-toolbar{align-items:stretch!important}
    #gastosSuite .expense-month-nav{display:grid!important;grid-template-columns:38px minmax(0,1fr) 38px!important;grid-template-rows:auto auto!important;align-items:center!important;column-gap:4px!important;padding:6px!important}
    #gastosSuite .expense-month-nav strong{grid-column:1/-1!important;margin:0 4px 2px!important}
    #gastosSuite .expense-month-nav select{grid-column:2!important;grid-row:2!important;width:100%!important;min-width:0!important;text-align:center!important;text-align-last:center!important;background:transparent!important;border:0!important;box-shadow:none!important;font-weight:850!important}
    #gastosSuite .expense-month-arrow{grid-row:2!important;width:36px!important;height:36px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:#697282!important;font-size:27px!important;line-height:1!important;display:grid!important;place-items:center!important;padding:0!important}
    #gastosSuite .expense-month-arrow:active{background:#e7eaf0!important;transform:scale(.94)}
    #expensePrevMonth{grid-column:1!important}#expenseNextMonth{grid-column:3!important}
  `;document.head.appendChild(style);

  const listObserver=new MutationObserver(()=>{
    ensureBalancePosition();
    syncSettleVisibility();
  });
  listObserver.observe(list,{childList:true});

  syncSettleVisibility();
  new MutationObserver(syncSettleVisibility).observe($g('.balance-main',balance),{childList:true,subtree:true,characterData:true});
}
install();
