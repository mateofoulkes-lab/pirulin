let stopExpenses=null;
let allItems=[],currentMonth='',currentFilter='ALL',editingId=null,selectedSplit='even',lastAmountEdited='A';
const $e=(s,r=document)=>r.querySelector(s),$$e=(s,r=document)=>[...r.querySelectorAll(s)];
const money=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2});
const round2=n=>window.PirulinExpenses?.round2?.(n)??Math.round(Number(n||0)*100)/100;
const fmt=n=>money.format(round2(n));
const roleName=r=>r==='A'?'Mateo':'Dani';
const personRole=()=>window.PirulinFirebase?.person==='Dani'?'B':'A';
const say=msg=>{try{window.eval(`if(typeof say==='function')say(${JSON.stringify(msg)})`)}catch{console.log(msg)}};
const monthKey=d=>window.PirulinExpenses.monthKey(d);
const iso=d=>{const x=window.PirulinExpenses.toDate(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const monthLabel=key=>{const [y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-AR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())};
const shortDate=d=>window.PirulinExpenses.toDate(d).toLocaleDateString('es-AR',{day:'numeric',month:'short'}).replace('.','');
function qid(id){return $e(`#${id}`)}
function setShow(el,on){if(el)el.style.display=on?'':'none'}
function closeMenus(){const a=qid('expenseItemMenuMock'),b=qid('gastosTopMenuMock');if(a)a.classList.remove('show');if(b)b.classList.remove('show')}

function enhanceUI(){
  if(document.documentElement.dataset.expensesLiveUi==='1')return;
  document.documentElement.dataset.expensesLiveUi='1';
  const adv=qid('expenseAdvancedMock');
  const dateInput=$e('input[type="date"]',adv);if(dateInput)dateInput.id='expenseDateMock';
  const splitChoice=qid('splitChoiceMock');
  if(splitChoice&&!qid('expenseSplitDetails')){
    splitChoice.insertAdjacentHTML('afterend',`<div id="expenseSplitDetails" style="margin-top:9px"></div>`);
  }
  const settle=qid('settleModalMock');
  if(settle){
    const fields=$$e('.gastos-field',settle);
    const dir=fields[0]?.querySelector('select'),amt=fields[1]?.querySelector('input'),note=fields[2]?.querySelector('input');
    if(dir)dir.id='settleDirectionLive';if(amt)amt.id='settleAmountLive';if(note)note.id='settleNoteLive';
    if(!qid('settleDateLive')&&fields[0])fields[0].insertAdjacentHTML('beforebegin','<div class="gastos-field"><label>Fecha</label><input id="settleDateLive" type="date"/></div>');
    if(dir)dir.innerHTML='<option value="B2A">Dani → Mateo</option><option value="A2B">Mateo → Dani</option>';
  }
  const style=document.createElement('style');style.id='expensesLiveStyle';style.textContent=`
    #gastosSuite .expense-card.pending{opacity:.9;border:1px dashed #e6c779!important;background:#fffdf6!important}
    #gastosSuite .expense-card.settlement-card{background:#f4fbf8!important;border:1px solid #dcefe6!important}
    #gastosSuite .expense-card{position:relative}
    #gastosSuite .expense-split{font-size:10.5px;color:#7d8796;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
    #gastosSuite .expense-empty{padding:28px 12px;text-align:center;color:#969daa;font-size:13px}
    #gastosSuite .pending-pill{font-size:9px;font-weight:900;padding:3px 7px;border-radius:999px;background:#fff2cb;color:#936a14}
    #gastosSuite .settlement-pill{font-size:9px;font-weight:900;padding:3px 7px;border-radius:999px;background:#dff4e9;color:#34705a}
    #expenseSplitDetails .gastos-quick-grid{margin-top:7px}
    #expenseSplitDetails .split-hint{font-size:10px;color:#8b94a2;margin:4px 2px 0}
    #expenseItemMenuMock.show,#gastosTopMenuMock.show{display:block!important}
  `;document.head.appendChild(style);
}
function renderSplitFields(){
  const box=qid('expenseSplitDetails');if(!box)return;
  if(selectedSplit==='percent')box.innerHTML=`<div class="gastos-quick-grid"><div class="gastos-field"><label>Mateo (%)</label><input id="splitPercentALive" type="number" min="0" max="100" step="0.01" value="50"></div><div class="gastos-field"><label>Dani (%)</label><input id="splitPercentBLive" type="number" min="0" max="100" step="0.01" value="50"></div></div>`;
  else if(selectedSplit==='amount')box.innerHTML=`<div class="gastos-quick-grid"><div class="gastos-field"><label>Mateo ($)</label><input id="splitAmountALive" type="number" min="0" step="0.01"></div><div class="gastos-field"><label>Dani ($)</label><input id="splitAmountBLive" type="number" min="0" step="0.01"></div></div><div class="split-hint">Al cambiar uno, el otro se completa con el resto.</div>`;
  else box.innerHTML='';
}
function setSplit(type){
  selectedSplit=type;
  const map={'Mitad y mitad':'even','Por porcentaje':'percent','Por monto':'amount'};
  $$e('#splitChoiceMock button').forEach(b=>b.classList.toggle('active',map[b.dataset.split]===type));
  renderSplitFields();
}
function amountComplement(preferred=lastAmountEdited){
  const total=Number(qid('expenseAmountMock')?.value);if(!(total>0)||selectedSplit!=='amount')return;
  const a=qid('splitAmountALive'),b=qid('splitAmountBLive');if(!a||!b)return;
  const primary=preferred==='B'?b:a,secondary=preferred==='B'?a:b,val=Number(primary.value);
  if(Number.isFinite(val))secondary.value=Math.max(0,round2(total-Math.min(Math.max(val,0),total))).toFixed(2);
  else if(!a.value&&!b.value){const half=round2(total/2);a.value=half.toFixed(2);b.value=round2(total-half).toFixed(2)}
}
function setPending(on){
  const amount=qid('expenseAmountMock');if(amount){amount.disabled=on;if(on)amount.value='';}
  const split=qid('splitChoiceMock');if(split)split.style.opacity=on?'.45':'1';
  const details=qid('expenseSplitDetails');if(details)details.style.opacity=on?'.45':'1';
}
function openExpense(item=null){
  editingId=item?.id||null;
  qid('expenseModalMockTitle').textContent=item?'Editar gasto':'Nuevo gasto';
  qid('expenseDescMock').value=item?.desc||'';
  qid('expenseAmountMock').value=item&&!item.amountPending&&item.amount!=null?round2(item.amount).toFixed(2):'';
  qid('expensePayerMock').value=roleName(item?.payer||personRole());
  qid('expenseCategoryMock').value=item?.cat||'';
  qid('expensePendingMock').checked=!!item?.amountPending;
  qid('expenseDateMock').value=item?iso(item.date):iso(new Date());
  const t=item?.splitType||'even';setSplit(t);setPending(!!item?.amountPending);
  if(t==='percent'){qid('splitPercentALive').value=item?.splitPercentA??50;qid('splitPercentBLive').value=item?.splitPercentB??50}
  if(t==='amount'){qid('splitAmountALive').value=item?.splitAmountA??item?.oweA??'';qid('splitAmountBLive').value=item?.splitAmountB??item?.oweB??''}
  qid('expenseAdvancedMock').classList.toggle('show',!!item);
  qid('expenseMoreMock').textContent=item?'Menos':'Más';
  qid('expenseModalMock').classList.add('show');
  setTimeout(()=>qid('expenseDescMock')?.focus(),40);
}
function closeExpense(){qid('expenseModalMock')?.classList.remove('show');editingId=null}
function readExpense(){
  const pending=!!qid('expensePendingMock')?.checked,desc=qid('expenseDescMock')?.value.trim(),amount=pending?null:Number(qid('expenseAmountMock')?.value);
  if(!desc||(!pending&&!(amount>0)))throw new Error('Completá los datos del gasto.');
  const payload={id:editingId||undefined,date:qid('expenseDateMock')?.value||iso(new Date()),desc,amountPending:pending,amount,payer:qid('expensePayerMock')?.value==='Dani'?'B':'A',cat:qid('expenseCategoryMock')?.value.trim()||null,splitType:selectedSplit};
  if(selectedSplit==='percent'){payload.splitPercentA=Number(qid('splitPercentALive')?.value);payload.splitPercentB=Number(qid('splitPercentBLive')?.value)}
  if(selectedSplit==='amount'){payload.splitAmountA=Number(qid('splitAmountALive')?.value);payload.splitAmountB=Number(qid('splitAmountBLive')?.value)}
  return payload;
}
async function saveExpense(){try{const n=await window.PirulinExpenses.saveExpense(readExpense());closeExpense();say(editingId?'Gasto actualizado':'Gasto agregado');window.dispatchEvent(new CustomEvent('pirulin-expense-saved',{detail:{id:n.id,settlement:false}}))}catch(e){console.error(e);say(e.message||'No pude guardar el gasto')}}

function monthOptions(){
  const select=qid('expenseMonthMock');if(!select)return;
  const keys=new Set(allItems.map(x=>monthKey(x.date)));keys.add(monthKey(new Date()));
  const sorted=[...keys].sort().reverse();if(!currentMonth||!keys.has(currentMonth))currentMonth=monthKey(new Date());
  select.innerHTML=sorted.map(k=>`<option value="${k}">${monthLabel(k)}</option>`).join('');select.value=currentMonth;
}
function filteredMonth(){
  let items=allItems.filter(x=>monthKey(x.date)===currentMonth);
  if(currentFilter==='A')items=items.filter(x=>x.settlement?x.from==='A':x.payer==='A');
  if(currentFilter==='B')items=items.filter(x=>x.settlement?x.from==='B':x.payer==='B');
  if(currentFilter==='SETTLEMENT')items=items.filter(x=>x.settlement);
  return items;
}
function splitLabel(it){
  if(it.amountPending)return 'Monto pendiente de definir';
  if(it.splitType==='percent')return 'Por porcentaje';if(it.splitType==='amount')return 'Por monto';return 'Mitad y mitad';
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function renderList(){
  const list=qid('expenseListMock');if(!list)return;const items=filteredMonth();list.innerHTML='';
  if(!items.length){list.innerHTML='<div class="expense-empty">Sin movimientos en este período.</div>';return}
  for(const it of items){
    const card=document.createElement('div');card.className='expense-card'+(it.settlement?' settlement-card':'')+(it.amountPending?' pending':'');card.dataset.expenseId=it.id;
    if(it.settlement){
      card.dataset.payer='Settlement';card.innerHTML=`<div class="expense-top"><div class="expense-title"><strong>Pago ${roleName(it.from)} → ${roleName(it.to)}</strong><span class="settlement-pill">Quedar a mano</span></div><div class="expense-amount">${fmt(it.amount)}</div><button class="expense-more">⋮</button></div><div class="expense-meta"><span>${shortDate(it.date)}</span><span>${esc(it.note||'Ajuste de balance')}</span></div>`;
    }else{
      card.dataset.payer=roleName(it.payer);const amount=it.amountPending?'A definir':fmt(it.amount),share=it.amountPending?'':`Mateo ${fmt(it.oweA??it.amount/2)} · Dani ${fmt(it.oweB??it.amount/2)}`;
      card.innerHTML=`<div class="expense-top"><div class="expense-title"><strong>${esc(it.desc)}</strong>${it.cat?`<span class="task-category-chip" style="--cat-color:#57C7C2">${esc(it.cat)}</span>`:''}</div><div class="expense-amount"${it.amountPending?' style="color:#b17c17"':''}>${amount}</div><button class="expense-more">⋮</button></div><div class="expense-meta"><span>${shortDate(it.date)}</span><span class="payer-pill ${it.payer==='A'?'mateo':'dani'}">Pagó ${roleName(it.payer)}</span>${it.amountPending?'<span class="pending-pill">Monto pendiente</span>':''}</div>${!it.amountPending?`<div class="expense-split"><span>${splitLabel(it)}</span><span>${share}</span></div>`:''}`;
    }
    list.appendChild(card);
  }
}
function renderBalance(){
  const ex=allItems.filter(x=>!x.settlement),sets=allItems.filter(x=>x.settlement),b=window.PirulinExpenses.computeBalances(ex,sets).balanceA,main=$e('.money-balance .balance-main'),sub=$e('.money-balance .balance-sub');
  if(main)main.textContent=b>0.01?`Dani te debe ${fmt(b)}`:b<-0.01?`Le debés ${fmt(Math.abs(b))} a Dani`:'Están a mano 😊';
  if(sub)sub.textContent='Incluye todos los gastos y pagos registrados.';
  qid('openSettleMock').disabled=Math.abs(b)<=0.01;
}
function render(){monthOptions();renderBalance();renderList()}

function openItemMenu(card,button){
  closeMenus();const id=card.dataset.expenseId,item=allItems.find(x=>x.id===id),m=qid('expenseItemMenuMock');if(!item||!m)return;m.dataset.expenseId=id;
  const edit=$e('[data-act="edit"]',m);if(edit)edit.style.display=item.settlement?'none':'';
  const r=button.getBoundingClientRect();m.style.position='fixed';m.style.left=`${Math.max(8,Math.min(innerWidth-150,r.right-145))}px`;m.style.top=`${Math.min(innerHeight-120,r.bottom+5)}px`;m.classList.add('show');
}
function openTopMenu(button){closeMenus();const m=qid('gastosTopMenuMock'),r=button.getBoundingClientRect();m.style.position='fixed';m.style.left=`${Math.max(8,r.right-185)}px`;m.style.top=`${r.bottom+5}px`;m.classList.add('show')}
async function deleteCurrent(){const m=qid('expenseItemMenuMock'),id=m?.dataset.expenseId;if(!id||!confirm('¿Eliminar ítem?'))return;closeMenus();try{await window.PirulinExpenses.deleteItem(id);say('Ítem eliminado')}catch(e){say(e.message||'No pude eliminarlo')}}
function editCurrent(){const id=qid('expenseItemMenuMock')?.dataset.expenseId,item=allItems.find(x=>x.id===id);closeMenus();if(item&&!item.settlement)openExpense(item)}

function openSettlement(){
  const ex=allItems.filter(x=>!x.settlement),sets=allItems.filter(x=>x.settlement),b=window.PirulinExpenses.computeBalances(ex,sets).balanceA;
  qid('settleDateLive').value=iso(new Date());qid('settleDirectionLive').value=b>0?'B2A':'A2B';qid('settleAmountLive').value=Math.abs(b)>0.01?Math.abs(round2(b)).toFixed(2):'';qid('settleNoteLive').value='';qid('settleModalMock').classList.add('show');
}
function celebrateZero(){try{navigator.vibrate?.([35,25,55])}catch{};try{const a=new Audio('./Pirulin.mp3');a.volume=.7;a.play().catch(()=>{})}catch{}}
async function saveSettlement(){
  try{
    const before=window.PirulinExpenses.computeBalances(allItems.filter(x=>!x.settlement),allItems.filter(x=>x.settlement)).balanceA,dir=qid('settleDirectionLive').value;
    const n=await window.PirulinExpenses.saveSettlement({date:qid('settleDateLive').value,from:dir==='A2B'?'A':'B',amount:Number(qid('settleAmountLive').value),note:qid('settleNoteLive').value});
    qid('settleModalMock').classList.remove('show');say('Pago registrado');window.dispatchEvent(new CustomEvent('pirulin-expense-saved',{detail:{id:n.id,settlement:true}}));
    const projected=dir==='A2B'?round2(before+Number(n.amount)):round2(before-Number(n.amount));if(Math.abs(projected)<=0.01)celebrateZero();
  }catch(e){console.error(e);say(e.message||'No pude registrar el pago')}
}
function exportCSV(){
  const rows=[["Fecha","Descripción","Monto","Pagó","Categoría","Tipo","Mateo","Dani"]];
  filteredMonth().forEach(x=>{const desc=x.settlement?(x.note||`Pago ${roleName(x.from)}→${roleName(x.to)}`):x.desc,payer=x.settlement?`${roleName(x.from)}→${roleName(x.to)}`:roleName(x.payer),pending=x.amountPending===true;rows.push([iso(x.date),desc,x.settlement?round2(x.amount):pending?'PENDIENTE':round2(x.amount),payer,x.cat||'',x.settlement?'settlement':'gasto',(x.settlement||pending)?'':round2(x.oweA??x.amount/2),(x.settlement||pending)?'':round2(x.oweB??x.amount/2)])});
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`gastos_${currentMonth}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)
}
function setFilter(v){currentFilter=v;closeMenus();renderList()}

function hooks(){
  if(document.documentElement.dataset.expensesLiveHooks==='1')return;document.documentElement.dataset.expensesLiveHooks='1';
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#expenseItemMenuMock,#gastosTopMenuMock,.expense-more,#gastosMore'))closeMenus()},true);
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('#addExpenseMock');if(add){e.preventDefault();e.stopImmediatePropagation();openExpense();return}
    const more=e.target.closest?.('#expenseListMock .expense-more');if(more){e.preventDefault();e.stopImmediatePropagation();openItemMenu(more.closest('.expense-card'),more);return}
    const top=e.target.closest?.('#gastosMore');if(top){e.preventDefault();e.stopImmediatePropagation();openTopMenu(top);return}
    if(e.target.closest?.('#expenseSaveMock')){e.preventDefault();e.stopImmediatePropagation();saveExpense();return}
    if(e.target.closest?.('#expenseCancelMock')){e.preventDefault();e.stopImmediatePropagation();closeExpense();return}
    if(e.target.id==='expenseModalMock'){e.preventDefault();e.stopImmediatePropagation();closeExpense();return}
    if(e.target.closest?.('#expenseMoreMock')){e.preventDefault();e.stopImmediatePropagation();const a=qid('expenseAdvancedMock'),show=!a.classList.contains('show');a.classList.toggle('show',show);qid('expenseMoreMock').textContent=show?'Menos':'Más';return}
    const split=e.target.closest?.('#splitChoiceMock button');if(split){e.preventDefault();e.stopImmediatePropagation();setSplit({'Mitad y mitad':'even','Por porcentaje':'percent','Por monto':'amount'}[split.dataset.split]);return}
    if(e.target.closest?.('#openSettleMock')){e.preventDefault();e.stopImmediatePropagation();openSettlement();return}
    if(e.target.closest?.('#settleCancelMock')){e.preventDefault();e.stopImmediatePropagation();qid('settleModalMock').classList.remove('show');return}
    if(e.target.closest?.('#settleSaveMock')){e.preventDefault();e.stopImmediatePropagation();saveSettlement();return}
    if(e.target.id==='settleModalMock'){e.preventDefault();e.stopImmediatePropagation();qid('settleModalMock').classList.remove('show');return}
    const action=e.target.closest?.('#expenseItemMenuMock [data-act]');if(action){e.preventDefault();e.stopImmediatePropagation();action.dataset.act==='edit'?editCurrent():deleteCurrent();return}
    if(e.target.closest?.('#exportExpensesMock')){e.preventDefault();e.stopImmediatePropagation();exportCSV();closeMenus();return}
    if(e.target.closest?.('#filterAllMock')){e.preventDefault();e.stopImmediatePropagation();setFilter('ALL');return}
    if(e.target.closest?.('#filterMateoMock')){e.preventDefault();e.stopImmediatePropagation();setFilter('A');return}
    if(e.target.closest?.('#filterDaniMock')){e.preventDefault();e.stopImmediatePropagation();setFilter('B');return}
    if(e.target.closest?.('#filterSettleMock')){e.preventDefault();e.stopImmediatePropagation();setFilter('SETTLEMENT');return}
  },true);
  qid('expenseMonthMock')?.addEventListener('change',e=>{currentMonth=e.target.value;renderList()});
  qid('expensePendingMock')?.addEventListener('change',e=>setPending(e.target.checked));
  qid('expenseAmountMock')?.addEventListener('input',()=>amountComplement());
  document.addEventListener('input',e=>{if(e.target.id==='splitPercentALive'){const v=Number(e.target.value);if(Number.isFinite(v))qid('splitPercentBLive').value=Math.max(0,round2(100-v))}if(e.target.id==='splitPercentBLive'){const v=Number(e.target.value);if(Number.isFinite(v))qid('splitPercentALive').value=Math.max(0,round2(100-v))}if(e.target.id==='splitAmountALive'){lastAmountEdited='A';amountComplement('A')}if(e.target.id==='splitAmountBLive'){lastAmountEdited='B';amountComplement('B')}});
}
function start(){
  if(!window.PirulinExpenses||!window.PirulinFirebase?.user||!qid('gastosSuite'))return false;
  enhanceUI();hooks();if(!currentMonth)currentMonth=monthKey(new Date());stopExpenses?.();stopExpenses=window.PirulinExpenses.subscribe({onChange:items=>{allItems=items;render()},onError:e=>{console.error(e);say('No pude sincronizar los gastos')}});return true;
}
function boot(){if(start())return;setTimeout(boot,100)}
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(boot,0);else{stopExpenses?.();stopExpenses=null;allItems=[]}});
if(window.PirulinFirebase?.user)boot();else setTimeout(boot,100);
window.PirulinExpensesLive={start,get items(){return [...allItems]},render};
