import {doc, serverTimestamp, writeBatch} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

let pendingImport=null;
let lastClipboardText='';
let patched=false;

const q=(s,r=document)=>r.querySelector(s);
const cleanText=v=>String(v??'').trim();

function notify(message){
  try{window.eval(`if(typeof say==='function')say(${JSON.stringify(message)})`)}catch{console.log(message)}
}

function validIsoDate(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanText(value));
  if(!m)return false;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const check=new Date(Date.UTC(y,mo-1,d));
  return check.getUTCFullYear()===y&&check.getUTCMonth()===mo-1&&check.getUTCDate()===d;
}

function dateFromIso(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return new Date(y,m-1,d,12,0,0,0);
}

function humanDate(iso,{year=false}={}){
  return dateFromIso(iso).toLocaleDateString('es-AR',{day:'numeric',month:'long',...(year?{year:'numeric'}:{})});
}

function joinEs(parts){
  if(parts.length<=1)return parts[0]||'';
  if(parts.length===2)return `${parts[0]} y ${parts[1]}`;
  return `${parts.slice(0,-1).join(', ')} y ${parts.at(-1)}`;
}

function compactDateList(dates){
  const unique=[...new Set(dates)].sort();
  if(!unique.length)return '';
  const parsed=unique.map(iso=>({iso,date:dateFromIso(iso)}));
  const years=new Set(parsed.map(x=>x.date.getFullYear()));
  const months=new Set(parsed.map(x=>`${x.date.getFullYear()}-${x.date.getMonth()}`));
  const showYear=years.size>1||parsed[0].date.getFullYear()!==new Date().getFullYear();
  if(months.size===1){
    const month=parsed[0].date.toLocaleDateString('es-AR',{month:'long'});
    const days=joinEs(parsed.map(x=>String(x.date.getDate())));
    return `${days} de ${month}${showYear?` de ${parsed[0].date.getFullYear()}`:''}`;
  }
  return joinEs(parsed.map(x=>humanDate(x.iso,{year:showYear})));
}

function rangeText(dates){
  const sorted=[...new Set(dates)].sort();
  const first=sorted[0],last=sorted.at(-1);
  const a=dateFromIso(first),b=dateFromIso(last);
  const sameMonth=a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();
  const showYear=a.getFullYear()!==b.getFullYear()||a.getFullYear()!==new Date().getFullYear();
  if(sameMonth){
    const month=a.toLocaleDateString('es-AR',{month:'long'});
    return `del ${a.getDate()} al ${b.getDate()} de ${month}${showYear?` de ${a.getFullYear()}`:''}`;
  }
  return `del ${humanDate(first,{year:showYear})} al ${humanDate(last,{year:showYear})}`;
}

function validatePayload(parsed){
  const rawDays=Array.isArray(parsed)?parsed:[parsed];
  if(!rawDays.length)throw new Error('EMPTY_ARRAY');
  if(rawDays.length>450)throw new Error('TOO_MANY_DAYS');
  rawDays.forEach((day,index)=>{
    if(!day||typeof day!=='object'||Array.isArray(day))throw new Error(`INVALID_DAY:${index}`);
    if(!validIsoDate(day.date))throw new Error(`INVALID_DATE:${index}:${cleanText(day.date)}`);
    for(const key of ['foods','supplements','exercise']){
      if(day[key]!=null&&!Array.isArray(day[key]))throw new Error(`INVALID_LIST:${index}:${key}`);
    }
  });
  return rawDays;
}

function parsePayload(text){
  let parsed;
  try{parsed=JSON.parse(text)}catch{const e=new Error('MALFORMED_JSON');e.code='MALFORMED_JSON';throw e}
  try{return validatePayload(parsed)}catch(error){error.code=error.message.split(':')[0]||'INVALID_PAYLOAD';throw error}
}

function analyzeClipboardText(text){
  if(!cleanText(text))return {kind:'empty',text:''};
  try{return {kind:'valid',text:String(text),rawDays:parsePayload(String(text))}}
  catch(error){return {kind:'invalid',text:String(text),error}}
}

async function readClipboardPayload(readText){
  if(typeof readText!=='function')return {kind:'unavailable'};
  try{return analyzeClipboardText(await readText())}
  catch(error){return {kind:'denied',error}}
}

function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.keys(value).sort().reduce((out,key)=>{out[key]=stableValue(value[key]);return out},{});
  return value;
}

function sigText(v){return cleanText(v).toLocaleLowerCase('es-AR')}
function itemSignature(item,type){
  if(type==='foods')return JSON.stringify([sigText(item.name),Number(item.kcal||0),Number(item.protein||0),sigText(item.amount)]);
  if(type==='supplements')return JSON.stringify([sigText(item.name),sigText(item.amount)]);
  return JSON.stringify([sigText(item.type),sigText(item.name),Number(item.durationMin||0),sigText(item.routine),stableValue(item.details??null)]);
}

function mergeList(existing,incoming,type){
  const out=[...(Array.isArray(existing)?existing:[])];
  const ids=new Set(out.map(x=>cleanText(x?.id)).filter(Boolean));
  const signatures=new Set(out.map(x=>itemSignature(x||{},type)));
  for(const item of Array.isArray(incoming)?incoming:[]){
    const id=cleanText(item?.id),signature=itemSignature(item||{},type);
    if((id&&ids.has(id))||signatures.has(signature))continue;
    out.push(item);
    if(id)ids.add(id);
    signatures.add(signature);
  }
  return out;
}

function mergeDay(base,incoming){
  if(!base)return incoming;
  return {
    ...base,
    date:incoming.date,
    foods:mergeList(base.foods,incoming.foods,'foods'),
    supplements:mergeList(base.supplements,incoming.supplements,'supplements'),
    exercise:mergeList(base.exercise,incoming.exercise,'exercise'),
    weightKg:incoming.weightKg??base.weightKg??null,
    targets:incoming.targets??base.targets??null
  };
}

function prepareImport(rawDays){
  const api=window.PirulinComidas;
  if(!api?.normalizeDay)throw new Error('COMIDAS_NOT_READY');
  const existingDays=window.PirulinComidasLive?.days||[];
  const byDate=new Map(existingDays.map(day=>[day.date,day]));
  const existingDates=new Set(existingDays.map(day=>day.date));
  const importedDates=[];
  for(const raw of rawDays){
    const incoming=api.normalizeDay(raw);
    const base=byDate.get(incoming.date)||null;
    byDate.set(incoming.date,mergeDay(base,incoming));
    importedDates.push(incoming.date);
  }
  const dates=[...new Set(importedDates)].sort();
  const days=dates.map(date=>api.normalizeDay(byDate.get(date)));
  return {dates,days,existingDates:dates.filter(date=>existingDates.has(date))};
}

function ensureConfirmModal(){
  if(q('#foodImportConfirmModal'))return;
  const host=q('#comidasSuite');
  if(!host)return;
  host.insertAdjacentHTML('beforeend',`<div id="foodImportConfirmModal" class="comidas-modal"><div class="comidas-sheet"><h2 id="foodImportTitle">Importar registro</h2><p id="foodImportMessage" style="font-size:14px;line-height:1.45;color:#596170"></p><div class="comidas-actions"><button id="foodImportCancel" type="button">Cancelar</button><button id="foodImportPrimary" class="primary" type="button">Importar</button></div></div></div>`);
  q('#foodImportCancel').onclick=closeConfirm;
}

function closeConfirm(){
  q('#foodImportConfirmModal')?.classList.remove('show');
  pendingImport=null;
}

function openConfirm(message,{primary='Importar',onPrimary,primaryStyle=true,title='Importar registro'}={}){
  ensureConfirmModal();
  q('#foodImportTitle').textContent=title;
  q('#foodImportMessage').textContent=message;
  const button=q('#foodImportPrimary');
  button.textContent=primary;
  button.classList.toggle('primary',primaryStyle);
  button.disabled=false;
  button.onclick=onPrimary||closeConfirm;
  q('#foodImportConfirmModal').classList.add('show');
}

function importPrompt(prepared){
  const {dates,existingDates}=prepared;
  let message;
  if(dates.length===1)message=`Encontré un registro del ${humanDate(dates[0])}. ¿Querés importarlo a Pirulín!?`;
  else if(dates.length<=5)message=`Encontré registros del ${compactDateList(dates)}. ¿Querés importarlos a Pirulín!?`;
  else message=`Encontré ${dates.length} registros, ${rangeText(dates)}. ¿Querés importarlos?`;
  if(existingDates.length===1)message+=` El ${humanDate(existingDates[0])} ya tiene información y se combinará con el registro existente.`;
  else if(existingDates.length>1)message+=` ${compactDateList(existingDates)} ya tienen información y se combinarán con los registros existentes.`;
  return message;
}

async function commitPrepared(prepared){
  const state=window.PirulinFirebase;
  if(!state?.db||!state?.user)throw new Error('FIREBASE_NOT_READY');
  const batch=writeBatch(state.db);
  for(const day of prepared.days){
    batch.set(doc(state.db,'users',state.user.uid,'foodDays',day.date),{...day,updatedAt:serverTimestamp()},{merge:false});
  }
  await batch.commit();
}

async function confirmImport(){
  if(!pendingImport)return;
  const button=q('#foodImportPrimary');
  button.disabled=true;
  button.textContent='Importando…';
  try{
    const prepared=pendingImport;
    await commitPrepared(prepared);
    const count=prepared.dates.length;
    const detail=count<=5?compactDateList(prepared.dates):rangeText(prepared.dates);
    q('#foodImportTitle').textContent='¡Listo!';
    q('#foodImportMessage').textContent=count===1?`Se importó 1 registro. ${detail}.`:`Se importaron ${count} registros. ${detail}.`;
    q('#foodImportCancel').style.display='none';
    button.style.display='none';
    const last=prepared.dates.at(-1);
    const input=q('#foodDate');
    if(input){input.value=last;input.dispatchEvent(new Event('change',{bubbles:true}))}
    window.PirulinComidasLive?.start?.();
    q('#foodPasteModal')?.classList.remove('show');
    if(q('#foodPasteText'))q('#foodPasteText').value='';
    pendingImport=null;
    setTimeout(()=>{
      q('#foodImportConfirmModal')?.classList.remove('show');
      q('#foodImportCancel').style.display='';
      button.style.display='';
      button.disabled=false;
      button.textContent='Importar';
    },1000);
  }catch(error){
    console.error(error);
    button.disabled=false;
    button.textContent='Importar';
    q('#foodImportMessage').textContent='No pude completar la importación. No se guardó ningún registro. Probá de nuevo.';
  }
}

function showPrepared(rawDays){
  try{
    pendingImport=prepareImport(rawDays);
    openConfirm(importPrompt(pendingImport),{onPrimary:confirmImport});
  }catch(error){
    console.error(error);
    showFallback('Hay algo en el portapapeles, pero no parece ser un registro válido de Pirulín!');
  }
}

function showFallback(message,clipboardText=''){
  pendingImport=null;
  lastClipboardText=clipboardText;
  openConfirm(message,{primary:'Pegar manualmente',primaryStyle:false,onPrimary:openManual});
}

function openManual(){
  q('#foodImportConfirmModal')?.classList.remove('show');
  const modal=q('#foodPasteModal'),textarea=q('#foodPasteText');
  if(!modal||!textarea)return;
  const title=modal.querySelector('h2');if(title)title.textContent='Pegar registro manualmente';
  const p=modal.querySelector('p');if(p)p.textContent='Pegá un registro de Pirulín! o un array con varios días.';
  textarea.placeholder='[{"date":"2026-09-21","foods":[]}, {"date":"2026-09-22","foods":[]}]';
  if(lastClipboardText)textarea.value=lastClipboardText;
  clearManualError();
  modal.classList.add('show');
  setTimeout(()=>textarea.focus(),30);
}

function clearManualError(){q('#foodPasteError')?.remove()}
function manualError(message){
  clearManualError();
  const textarea=q('#foodPasteText');
  if(!textarea)return notify(message);
  textarea.insertAdjacentHTML('afterend',`<p id="foodPasteError" style="color:#d34b52;font-size:11px;font-weight:800">${message}</p>`);
}

function manualImport(){
  const text=q('#foodPasteText')?.value||'';
  if(!text.trim())return manualError('Pegá un registro antes de importar.');
  try{
    const rawDays=parsePayload(text);
    const prepared=prepareImport(rawDays);
    pendingImport=prepared;
    q('#foodPasteModal')?.classList.remove('show');
    openConfirm(importPrompt(prepared),{onPrimary:confirmImport});
  }catch(error){
    console.error(error);
    manualError(error.code==='MALFORMED_JSON'?'El JSON está malformado. Revisalo y volvé a intentar.':'No parece ser un registro válido de Pirulín!.');
  }
}

async function importFromClipboard(){
  lastClipboardText='';
  clearManualError();
  const reader=navigator.clipboard?.readText?.bind(navigator.clipboard);
  const result=await readClipboardPayload(reader);
  if(result.kind==='unavailable'){
    showFallback('No pude leer el portapapeles desde este navegador. Podés pegar el registro manualmente.');
    return;
  }
  if(result.kind==='denied'){
    console.warn('Clipboard no disponible:',result.error);
    showFallback('No pude leer el portapapeles. Podés pegar el registro manualmente.');
    return;
  }
  lastClipboardText=result.text||'';
  if(result.kind==='empty'){
    showFallback('No encontré ningún registro en el portapapeles.');
    return;
  }
  if(result.kind==='invalid'){
    console.error(result.error);
    showFallback('Hay algo en el portapapeles, pero no parece ser un registro válido de Pirulín!',result.text);
    return;
  }
  showPrepared(result.rawDays);
}

function patchUi(){
  const fab=q('#foodPasteFab'),save=q('#foodPasteSave'),menu=q('#comidasMenu [data-cm="paste"],#comidasMenu [data-cm="import"]');
  if(!fab||!save||!menu)return false;
  ensureConfirmModal();
  fab.textContent='Importar registro';
  fab.onclick=importFromClipboard;
  menu.textContent='Importar registro';
  menu.dataset.cm='import';
  save.onclick=manualImport;
  if(!patched){
    patched=true;
    document.addEventListener('click',event=>{
      const item=event.target.closest?.('#comidasMenu [data-cm="import"]');
      if(item)importFromClipboard();
    },true);
  }
  return true;
}

function boot(){
  if(patchUi())return;
  setTimeout(boot,120);
}

window.addEventListener('pirulin-auth-changed',event=>{if(event.detail?.signedIn)setTimeout(boot,0)});
boot();

export {analyzeClipboardText,readClipboardPayload,parsePayload,prepareImport,mergeDay,compactDateList,rangeText,validIsoDate};
