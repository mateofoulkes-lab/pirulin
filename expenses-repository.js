import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const round2=n=>Math.round(Number(n||0)*100)/100;
const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);

function state(){
  const s=window.PirulinFirebase;
  if(!s?.db||!s?.user||!s?.person)throw new Error('Pirulín todavía no terminó de autenticar.');
  return s;
}
function items(){const {db}=state();return collection(db,'shared','expenses','items')}
function roleForPerson(person){return person==='Mateo'?'A':'B'}
function personForRole(role){return role==='A'?'Mateo':'Dani'}
function parseLocalDate(value){
  if(value instanceof Date)return value;
  const s=String(value||'');
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  const d=new Date(value);return Number.isNaN(d.getTime())?new Date():d;
}
function toDate(value){
  if(value instanceof Date)return value;
  if(typeof value?.toDate==='function')return value.toDate();
  return parseLocalDate(value);
}
function timestamp(value){return Timestamp.fromDate(parseLocalDate(value))}

function computeSplit(amount,{type='even',percentA=50,percentB=50,amountA=null,amountB=null}={}){
  const total=round2(amount);
  if(!(total>0))throw new Error('Ingresá un monto válido.');
  if(type==='percent'){
    const pA=Number(percentA),pB=Number(percentB);
    if(!Number.isFinite(pA)||!Number.isFinite(pB)||Math.abs(pA+pB-100)>0.01)throw new Error('Los porcentajes deben sumar 100%.');
    const oweA=round2(total*(pA/100)),oweB=round2(total-oweA);
    return{oweA,oweB,splitType:'percent',splitPercentA:round2(pA),splitPercentB:round2(pB),splitAmountA:null,splitAmountB:null};
  }
  if(type==='amount'){
    const aA=Number(amountA),aB=Number(amountB);
    if(!Number.isFinite(aA)||!Number.isFinite(aB))throw new Error('Completá los montos.');
    if(Math.abs(round2(aA+aB)-total)>0.02)throw new Error('Los montos deben sumar el total.');
    return{oweA:round2(aA),oweB:round2(aB),splitType:'amount',splitPercentA:null,splitPercentB:null,splitAmountA:round2(aA),splitAmountB:round2(aB)};
  }
  const oweA=round2(total/2),oweB=round2(total-oweA);
  return{oweA,oweB,splitType:'even',splitPercentA:50,splitPercentB:50,splitAmountA:null,splitAmountB:null};
}

function normalizeExpense(input={}){
  const s=state(),pending=input.amountPending===true;
  const amount=pending?null:round2(input.amount);
  let split;
  if(!pending)split=computeSplit(amount,{
    type:input.splitType||'even',percentA:input.splitPercentA,percentB:input.splitPercentB,
    amountA:input.splitAmountA,amountB:input.splitAmountB
  });
  return{
    id:String(input.id||`expense-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),
    settlement:false,
    date:input.date,
    desc:String(input.desc||'').trim(),
    payer:input.payer==='B'?'B':'A',
    cat:String(input.cat||'').trim()||null,
    amountPending:pending,
    amount,
    oweA:pending?null:split.oweA,
    oweB:pending?null:split.oweB,
    splitType:pending?(input.splitType||'even'):split.splitType,
    splitPercentA:pending?(input.splitPercentA??50):split.splitPercentA,
    splitPercentB:pending?(input.splitPercentB??50):split.splitPercentB,
    splitAmountA:pending?(input.splitAmountA??null):split.splitAmountA,
    splitAmountB:pending?(input.splitAmountB??null):split.splitAmountB,
    createdBy:input.createdBy||s.user.uid,
    updatedBy:s.user.uid,
    updatedAtClient:Date.now()
  };
}
function normalizeSettlement(input={}){
  const s=state(),from=input.from==='B'?'B':'A',to=from==='A'?'B':'A',amount=round2(input.amount);
  if(!(amount>0))throw new Error('Ingresá un monto válido.');
  return{
    id:String(input.id||`settlement-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),
    settlement:true,from,to,amount,date:input.date,
    note:String(input.note||'').trim()||null,
    createdBy:input.createdBy||s.user.uid,
    updatedBy:s.user.uid,
    updatedAtClient:Date.now()
  };
}
function notifyNewExpense(expense){
  if(!window.PirulinNotifications?.notifyOther)return;
  const who=window.PirulinFirebase?.person||'Alguien';
  const amount=expense.amountPending===true?'monto pendiente':`$${Math.round(Number(expense.amount||0)).toLocaleString('es-AR')}`;
  const label=expense.desc||expense.cat||'gasto';
  window.PirulinNotifications.notifyOther({
    kind:'expenses',
    title:'Pirulín! · Gastos',
    body:`${who} agregó ${label} · ${amount}`,
    url:'#gastos'
  }).catch?.(()=>{});
}
async function saveExpense(input){
  const isNew=!input?.id;
  const n=normalizeExpense(input),ref=doc(items(),n.id);
  await setDoc(ref,{...n,date:timestamp(n.date),updatedAt:serverTimestamp(),createdAt:input.createdAt||serverTimestamp()},{merge:true});
  if(isNew)notifyNewExpense(n);
  return n;
}
async function saveSettlement(input){
  const n=normalizeSettlement(input),ref=doc(items(),n.id);
  await setDoc(ref,{...n,date:timestamp(n.date),updatedAt:serverTimestamp(),createdAt:input.createdAt||serverTimestamp()},{merge:true});
  return n;
}
async function deleteItem(id){await deleteDoc(doc(items(),String(id)))}
function subscribe({onChange,onError}={}){
  return onSnapshot(items(),snap=>{
    const out=[];snap.forEach(d=>{const x=d.data();out.push({...x,id:d.id,date:toDate(x.date)})});
    out.sort((a,b)=>b.date-a.date||(Number(b.updatedAtClient)||0)-(Number(a.updatedAtClient)||0));
    onChange?.(out);
  },e=>onError?.(e));
}
function computeBalances(expenses=[],settlements=[]){
  const totals=expenses.reduce((acc,it)=>{
    if(it.amountPending===true)return acc;
    const amount=round2(it.amount),oweA=round2(it.oweA??amount/2),oweB=round2(it.oweB??amount/2);
    acc.total+=amount;if(it.payer==='A')acc.paidA+=amount;else acc.paidB+=amount;
    acc.oweA+=oweA;acc.oweB+=oweB;return acc;
  },{paidA:0,paidB:0,oweA:0,oweB:0,total:0});
  const sA2B=settlements.filter(x=>x.from==='A'&&x.to==='B').reduce((a,b)=>a+round2(b.amount),0);
  const sB2A=settlements.filter(x=>x.from==='B'&&x.to==='A').reduce((a,b)=>a+round2(b.amount),0);
  const balanceA=round2(totals.paidA-totals.oweA+sA2B-sB2A);
  return{...totals,balanceA,balanceB:round2(-balanceA)};
}
function monthKey(date){const d=toDate(date);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}

window.PirulinExpenses={round2,clamp,roleForPerson,personForRole,parseLocalDate,toDate,computeSplit,normalizeExpense,normalizeSettlement,saveExpense,saveSettlement,deleteItem,subscribe,computeBalances,monthKey};
export{round2,clamp,roleForPerson,personForRole,parseLocalDate,toDate,computeSplit,normalizeExpense,normalizeSettlement,saveExpense,saveSettlement,deleteItem,subscribe,computeBalances,monthKey};
