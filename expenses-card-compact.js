const $ec=(s,r=document)=>r.querySelector(s);

function compactExpenseCards(){
  document.querySelectorAll('#expenseListMock .expense-card:not(.settlement-card)').forEach(card=>{
    const title=card.querySelector('.expense-title');
    const meta=card.querySelector('.expense-meta');
    const chip=title?.querySelector('.task-category-chip');
    if(chip&&meta){
      chip.classList.add('expense-category-inline');
      const payer=meta.querySelector('.payer-pill');
      if(payer)meta.insertBefore(chip,payer);
      else meta.appendChild(chip);
    }
  });
}

function installCompactCards(){
  const list=$ec('#expenseListMock');
  if(!list)return setTimeout(installCompactCards,80);
  if(document.documentElement.dataset.expensesCardCompact==='1')return;
  document.documentElement.dataset.expensesCardCompact='1';

  const style=document.createElement('style');
  style.id='expensesCardCompactStyle';
  style.textContent=`
    #gastosSuite .expense-card:not(.settlement-card) .expense-title{gap:0!important}
    #gastosSuite .expense-card .expense-title strong{font-size:15.5px!important;line-height:1.25!important}
    #gastosSuite .expense-card .expense-amount{font-size:16.5px!important;line-height:1.2!important}
    #gastosSuite .expense-card:not(.settlement-card) .expense-meta{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;margin-top:6px!important;width:100%!important;font-size:11.5px!important;line-height:1.3!important}
    #gastosSuite .expense-card .expense-split{font-size:11.5px!important;line-height:1.3!important}
    #gastosSuite .expense-card .expense-category-inline{font-size:9.5px!important;line-height:1.15!important;padding:4px 9px!important;margin:0!important;white-space:nowrap!important;flex:0 0 auto!important}
    #gastosSuite .expense-card .expense-meta .payer-pill{margin:0 0 0 auto!important;white-space:nowrap!important;flex:0 0 auto!important;font-size:10px!important}
    #gastosSuite .expense-card:not(.settlement-card) .expense-top{margin-bottom:0!important}
    #gastosSuite .expense-card.settlement-card .expense-meta{font-size:11.5px!important;line-height:1.3!important}
    @media(max-width:380px){
      #gastosSuite .expense-card:not(.settlement-card) .expense-meta{gap:6px!important;font-size:11px!important}
      #gastosSuite .expense-card .expense-title strong{font-size:15px!important}
      #gastosSuite .expense-card .expense-amount{font-size:16px!important}
      #gastosSuite .expense-card .expense-category-inline{padding:3px 7px!important;font-size:9px!important}
    }
  `;
  document.head.appendChild(style);

  const observer=new MutationObserver(()=>compactExpenseCards());
  observer.observe(list,{childList:true,subtree:true});
  compactExpenseCards();
}

installCompactCards();
