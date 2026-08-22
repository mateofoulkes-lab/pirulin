function round2Settle(n){return Math.round((Number(n)||0)*100)/100}

function currentBalance(){
  const api=window.PirulinExpenses;
  const items=window.PirulinExpensesLive?.items||[];
  if(!api?.computeBalances||!Array.isArray(items))return null;
  const expenses=items.filter(x=>!x.settlement),settlements=items.filter(x=>x.settlement);
  return api.computeBalances(expenses,settlements).balanceA;
}

function launchSameCelebration(){
  try{navigator.vibrate?.([35,25,55])}catch{}
  try{
    window.eval("if(typeof launchCompletionCelebration==='function')launchCompletionCelebration()");
  }catch(e){console.warn('Pirulín settle celebration',e)}
}

window.addEventListener('pirulin-expense-saved',event=>{
  if(!event.detail?.settlement)return;
  const before=currentBalance();
  const dir=document.querySelector('#settleDirectionLive')?.value;
  const amount=Number(document.querySelector('#settleAmountLive')?.value);
  if(!Number.isFinite(before)||!(amount>0)||!dir)return;
  const projected=dir==='A2B'?round2Settle(before+amount):round2Settle(before-amount);
  if(Math.abs(projected)<=0.01)setTimeout(launchSameCelebration,90);
});
