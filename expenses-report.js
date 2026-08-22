const $rp=(s,r=document)=>r.querySelector(s);
const $$rp=(s,r=document)=>[...r.querySelectorAll(s)];
const REPORT_COLORS=['#5A78F0','#E879A9','#55BFA6','#F2A65A','#8C78D6','#5BA8D9','#D77A61','#8BB174','#C78BC8','#7A91A8'];
const moneyRp=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
let reportItems=[];
let reportMode='month';
let reportCursor=new Date();
let reportCategory=null;

function normRp(s=''){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function hasRp(text,...terms){return terms.some(t=>text.includes(t))}

function broadCategory(it){
  const d=normRp(it.desc),c=normRp(it.cat);
  if(it.settlement||it.amountPending||!(Number(it.amount)>0))return null;
  if(c==='angu'||c==='veterinaria'||hasRp(d,'angu','bravecto','veterinaria','vacunas angu','pelu angu'))return 'Angu';
  if(c==='limpieza'||c==='lim'||hasRp(d,'limpieza valeria')||d==='valeria')return 'Limpieza';
  if(c==='cem'||c==='farmacia'||hasRp(d,'cem','farmacia','bronax','refrianex','atomo','cpap','loperamida','diclofenac','remedio','medicamento'))return 'Salud';
  if(c==='impuestos'||c==='internet'||c==='luz'||hasRp(d,'impuestos','internet','telered','luz y gas'))return 'Servicios e impuestos';
  if(c==='auto'||c==='nafta'||c==='uber'||c==='mateo'&&hasRp(d,'repuesto auto')||hasRp(d,'nafta','uber','remis','repuesto auto','repuestos gandalf','peaje','estacionamiento'))return 'Transporte / Auto';
  if(c==='casa'||c==='ferreteria'||c==='cosas'||hasRp(d,'ferreteria','repuesto canilla','camara y portero','arreglo inodoro','filamento ventanas','pintura ventanas','detector monoxido','toner'))return 'Casa';
  if(c==='regalo'||hasRp(d,'regalo '))return 'Otros / regalos';
  if(['postre','merienda','hamburguesa','bar seddon','comi','comida navidad','gastos ano nuevo','hielo','snacks'].includes(c)||
     hasRp(d,'pizza','helado','pancho','hamburgues','empanad','merienda','desayuno','almuerzo','cena','guerrin','mostaza','rapanui','flan','fabiano','rotiser','vianda','sanguchito','sanguchitos','manush','tutifruti','cosas dulces','chizitos','gaseosa'))return 'Comidas afuera';
  if(['comida','feria','supermercado','carne','polleria','marina','lo marina','com','apidelta','pescado','panaderia'].includes(c)||
     hasRp(d,'carrefour','supermercado','feria','traslasierra','polleria','lo marina','pan marina','pan y queso','apidelta','las rias','huevos','panaderia','queso','mermeladas'))return 'Alimentos';
  if(['viajecito','vacaciones','escapadita'].includes(c)||
     hasRp(d,'hotel','hospedaje','reserva depto','reserva hotel','pasajes','teleferico','puerto blest','entrada ','escape','sinapsis','zanjon','tuneles','bellas artes','refugio','colonia suiza'))return 'Viajes y ocio';
  return 'Otros / regalos';
}

function canonicalMerchant(desc){
  const d=normRp(desc);
  const rules=[
    [/\b(lo )?marina\b/,'Lo Marina'],[/\bferia\b/,'Feria'],[/\bcarrefour\b/,'Carrefour'],[/\b(supermercado|super)\b/,'Supermercado'],
    [/\btraslasierra\b/,'Traslasierra'],[/\bapidelta\b/,'Apidelta'],[/\bfabiano\b/,'Fabiano'],[/\bpolleria\b/,'Pollería'],[/\blas rias\b/,'Las Rías'],
    [/\bcem\b/,'CEM'],[/\bvaleria\b/,'Valeria'],[/\btelered|internet\b/,'Internet / Telered'],[/\bimpuestos?\b/,'Impuestos'],
    [/\buber\b/,'Uber'],[/\bremis\b/,'Remis'],[/\bnafta\b/,'Nafta'],[/\bveterinaria|vacunas angu|estudios angu|analisis caca angu\b/,'Veterinaria Angu'],
    [/\bpelu angu\b/,'Peluquería Angu'],[/\b(alimento|comida) angu\b/,'Alimento Angu'],[/\bbravecto|remedio angu|medicamento\b/,'Medicamentos Angu'],
    [/\bhelado|rapanui|mamushka|maxims\b/,'Helado / postre'],[/\bpizza\b/,'Pizza'],[/\bpancho\b/,'Panchos'],[/\bhamburgues\b/,'Hamburguesas'],
    [/\bmerienda\b/,'Merienda'],[/\bempanad\b/,'Empanadas'],[/\bsanguch\b/,'Sándwiches'],[/\bferreteria\b/,'Ferretería'],[/\bfarmacia\b/,'Farmacia']
  ];
  for(const [rx,label] of rules)if(rx.test(d))return label;
  let cleaned=d.replace(/\b(comida|cosas|gasto|gastos|pago|compra|compras|mateo|dani|ultimo|ultima|muchos|muchas|reserva)\b/g,' ').replace(/\s+/g,' ').trim();
  if(!cleaned)return 'Otros';
  return cleaned.split(' ').slice(0,4).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
}

function periodLabel(){
  if(reportMode==='all')return 'Todo el historial';
  if(reportMode==='year')return String(reportCursor.getFullYear());
  return reportCursor.toLocaleDateString('es-AR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
}
function inPeriod(it){
  const d=toDateRp(it.date);if(!d)return false;
  if(reportMode==='all')return true;
  if(reportMode==='year')return d.getFullYear()===reportCursor.getFullYear();
  return d.getFullYear()===reportCursor.getFullYear()&&d.getMonth()===reportCursor.getMonth();
}
function toDateRp(v){
  if(v instanceof Date)return v;
  if(typeof v?.toDate==='function')return v.toDate();
  if(typeof v==='string'){const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
  return null;
}
function grouped(items,keyFn){
  const map=new Map();
  for(const it of items){
    const key=keyFn(it);if(!key)continue;
    const row=map.get(key)||{label:key,amount:0,count:0,mateo:0,dani:0};
    const amount=Number(it.amount)||0;
    row.amount+=amount;row.count++;
    row.mateo+=Number.isFinite(Number(it.oweA))?Number(it.oweA):amount/2;
    row.dani+=Number.isFinite(Number(it.oweB))?Number(it.oweB):amount/2;
    map.set(key,row);
  }
  return [...map.values()].sort((a,b)=>b.amount-a.amount);
}
function aggregateSmall(rows,max=7){
  if(rows.length<=max)return rows;
  const keep=rows.slice(0,max-1),rest=rows.slice(max-1).reduce((a,r)=>({label:'Otros',amount:a.amount+r.amount,count:a.count+r.count,mateo:a.mateo+r.mateo,dani:a.dani+r.dani}),{amount:0,count:0,mateo:0,dani:0});
  return [...keep,rest];
}
function conic(rows,total){
  let acc=0;return rows.map((r,i)=>{const from=acc,to=acc+(total?100*r.amount/total:0);acc=to;return `${REPORT_COLORS[i%REPORT_COLORS.length]} ${from}% ${to}%`}).join(',');
}
function escRp(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

function renderReport(){
  const modal=$rp('#expenseReportModal');if(!modal)return;
  const eligible=reportItems.filter(it=>!it.settlement&&!it.amountPending&&Number(it.amount)>0&&inPeriod(it));
  const total=eligible.reduce((a,b)=>a+Number(b.amount||0),0);
  const title=$rp('#expenseReportPeriod');if(title)title.textContent=periodLabel();
  $$rp('#expenseReportModes button').forEach(b=>b.classList.toggle('active',b.dataset.mode===reportMode));
  const prev=$rp('#expenseReportPrev'),next=$rp('#expenseReportNext');if(prev)prev.style.visibility=reportMode==='all'?'hidden':'visible';if(next)next.style.visibility=reportMode==='all'?'hidden':'visible';
  const body=$rp('#expenseReportBody');if(!body)return;
  if(!eligible.length){body.innerHTML='<div class="rp-empty">No hay gastos con monto en este período.</div>';return}

  if(reportCategory){
    const catItems=eligible.filter(it=>broadCategory(it)===reportCategory);
    let rows=aggregateSmall(grouped(catItems,it=>canonicalMerchant(it.desc)),7);const catTotal=catItems.reduce((a,b)=>a+Number(b.amount||0),0);
    body.innerHTML=`<button class="rp-back" id="expenseReportBack">‹ Todas las categorías</button><div class="rp-kicker">${escRp(reportCategory)}</div>${reportChartHtml(rows,catTotal,false)}<div class="rp-stats"><div><small>Total</small><strong>${moneyRp.format(catTotal)}</strong></div><div><small>Movimientos</small><strong>${catItems.length}</strong></div><div><small>Promedio</small><strong>${moneyRp.format(catTotal/catItems.length)}</strong></div></div>`;
    $rp('#expenseReportBack')?.addEventListener('click',()=>{reportCategory=null;renderReport()});
  }else{
    let rows=aggregateSmall(grouped(eligible,broadCategory),10);const top=rows[0];
    body.innerHTML=`${reportChartHtml(rows,total,true)}<div class="rp-stats"><div><small>Total</small><strong>${moneyRp.format(total)}</strong></div><div><small>Movimientos</small><strong>${eligible.length}</strong></div><div><small>Ticket promedio</small><strong>${moneyRp.format(total/eligible.length)}</strong></div><div><small>Mayor categoría</small><strong>${escRp(top?.label||'—')}</strong></div></div><div class="rp-tip">Tocá una categoría para ver en qué lugares o conceptos se fue.</div>`;
    $$rp('.rp-legend-row[data-category]').forEach(el=>el.addEventListener('click',()=>{reportCategory=el.dataset.category;renderReport()}));
    $rp('.rp-donut')?.addEventListener('click',e=>{const x=e.clientX-e.currentTarget.getBoundingClientRect().left,y=e.clientY-e.currentTarget.getBoundingClientRect().top;const rect=e.currentTarget.getBoundingClientRect(),ang=(Math.atan2(y-rect.height/2,x-rect.width/2)*180/Math.PI+450)%360;let acc=0;for(const r of rows){acc+=360*r.amount/total;if(ang<=acc){if(r.label!=='Otros'){reportCategory=r.label;renderReport()}break}}});
  }
}
function reportChartHtml(rows,total,clickable){
  const legend=rows.map((r,i)=>{
    const totalPct=total?Math.round(r.amount/total*100):0;
    const splitTotal=(r.mateo||0)+(r.dani||0);
    const mateoPct=splitTotal?Math.round((r.mateo||0)/splitTotal*100):50;
    const daniPct=100-mateoPct;
    return `<button class="rp-legend-row" ${clickable&&r.label!=='Otros'?`data-category="${escRp(r.label)}"`:''}><span class="rp-dot" style="background:${REPORT_COLORS[i%REPORT_COLORS.length]}"></span><span class="rp-name">${escRp(r.label)}</span><span class="rp-value"><b>${moneyRp.format(r.amount)}</b><small>${totalPct}% del total · ${r.count} mov.</small><em>Mateo: ${mateoPct}% · Dani: ${daniPct}%</em></span></button>`;
  }).join('');
  return `<div class="rp-chart-wrap"><div class="rp-donut" style="background:conic-gradient(${conic(rows,total)})"><div><strong>${moneyRp.format(total)}</strong><small>Total</small></div></div><div class="rp-legend">${legend}</div></div>`;
}

async function readReportItems(){
  const user=window.PirulinFirebase?.user;if(!user)throw new Error('Pirulín todavía no terminó de autenticar.');
  const token=await user.getIdToken();
  const project='pirulin-app';let pageToken='';const out=[];
  do{
    const params=new URLSearchParams({pageSize:'300','mask.fieldPaths':'desc'});
    ['cat','amount','oweA','oweB','amountPending','settlement','date'].forEach(f=>params.append('mask.fieldPaths',f));
    if(pageToken)params.set('pageToken',pageToken);
    const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/shared/expenses/items?${params}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    if(!res.ok){let detail='';try{detail=(await res.json())?.error?.message||''}catch{}throw new Error(`No pude leer Gastos${detail?`: ${detail}`:''}`)}
    const body=await res.json();
    for(const doc of body.documents||[]){const f=doc.fields||{},name=doc.name.split('/').pop();out.push({id:name,desc:f.desc?.stringValue||'',cat:f.cat?.stringValue||'',amount:Number(f.amount?.doubleValue??f.amount?.integerValue??0),oweA:Number(f.oweA?.doubleValue??f.oweA?.integerValue??NaN),oweB:Number(f.oweB?.doubleValue??f.oweB?.integerValue??NaN),amountPending:!!f.amountPending?.booleanValue,settlement:!!f.settlement?.booleanValue,date:f.date?.timestampValue||null})}
    pageToken=body.nextPageToken||'';
  }while(pageToken);
  return out;
}

async function openReport(){
  const modal=$rp('#expenseReportModal');modal?.classList.add('show');reportCategory=null;
  const body=$rp('#expenseReportBody');if(body)body.innerHTML='<div class="rp-loading">Armando reporte…</div>';
  try{reportItems=await readReportItems();renderReport()}catch(err){console.error(err);if(body)body.innerHTML=`<div class="rp-empty">${escRp(err.message||'No pude cargar el reporte.')}</div>`}
}
function shiftPeriod(delta){
  if(reportMode==='year')reportCursor=new Date(reportCursor.getFullYear()+delta,0,1);else reportCursor=new Date(reportCursor.getFullYear(),reportCursor.getMonth()+delta,1);reportCategory=null;renderReport();
}
function installReport(){
  const menu=$rp('#gastosTopMenuMock'),suite=$rp('#gastosSuite');if(!menu||!suite)return setTimeout(installReport,100);
  if($rp('#openExpenseReport'))return;
  const btn=document.createElement('button');btn.id='openExpenseReport';btn.type='button';btn.textContent='Reporte';menu.prepend(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.classList.remove('show');openReport()});
  suite.insertAdjacentHTML('beforeend',`<div class="gastos-modal" id="expenseReportModal"><div class="gastos-modal-card rp-card"><div class="rp-head"><button class="rp-head-spacer" tabindex="-1" aria-hidden="true"></button><h3>Reporte</h3><button class="rp-close" id="expenseReportClose" aria-label="Cerrar reporte">×</button></div><div class="rp-controls"><div class="rp-modes" id="expenseReportModes"><button data-mode="month" class="active">Mes</button><button data-mode="year">Año</button><button data-mode="all">Todo</button></div><div class="rp-period-nav"><button id="expenseReportPrev">‹</button><strong id="expenseReportPeriod"></strong><button id="expenseReportNext">›</button></div></div><div id="expenseReportBody"><div class="rp-loading">Armando reporte…</div></div></div></div>`);
  const style=document.createElement('style');style.textContent=`
  #expenseReportModal{z-index:120!important;background:rgba(12,18,28,.24)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:12px!important}
  #expenseReportModal .rp-card{width:min(720px,calc(100vw - 24px))!important;max-height:min(92vh,900px)!important;overflow:auto!important;padding:12px 16px 22px!important;background:#fff!important;color:#252b35!important;border:1px solid rgba(20,28,40,.06)!important;border-radius:26px!important;box-shadow:0 24px 70px rgba(15,23,42,.20)!important}
  .rp-head{display:grid;grid-template-columns:38px 1fr 38px;align-items:center;min-height:40px;margin-bottom:8px;position:sticky;top:-12px;z-index:5;background:#fff;padding:8px 0 5px}
  .rp-head h3{margin:0;text-align:center;font-size:17px;line-height:1;font-weight:900;letter-spacing:-.02em;color:#252b35}
  .rp-head-spacer{visibility:hidden;width:38px;height:38px;border:0;padding:0}
  .rp-close{width:36px;height:36px;border:0;border-radius:12px;background:#f1f3f7;color:#515a68;font-size:23px;line-height:1;display:grid;place-items:center;padding:0;font-family:system-ui,sans-serif;font-weight:500;box-shadow:none}
  .rp-close:active{transform:scale(.94);background:#e8ebf1}
  .rp-controls{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:4px 0 16px}.rp-modes{display:flex;background:#eef1f6;padding:3px;border-radius:12px}.rp-modes button{border:0;background:transparent;padding:8px 13px;border-radius:9px;font-weight:800;color:#7b8492}.rp-modes button.active{background:#fff;color:#262b34;box-shadow:0 2px 9px rgba(38,43,52,.09)}.rp-period-nav{display:flex;align-items:center;gap:8px}.rp-period-nav button{border:0;background:#eef1f6;width:34px;height:34px;border-radius:10px;font-size:23px;color:#697282}.rp-period-nav strong{min-width:128px;text-align:center;font-size:13px;color:#303642}.rp-chart-wrap{display:grid;grid-template-columns:minmax(190px,260px) 1fr;gap:24px;align-items:center}.rp-donut{width:min(58vw,240px);aspect-ratio:1;border-radius:50%;margin:auto;position:relative;display:grid;place-items:center;cursor:pointer}.rp-donut:after{content:'';position:absolute;width:58%;height:58%;background:#fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.025)}.rp-donut>div{position:relative;z-index:2;text-align:center;max-width:55%}.rp-donut strong{display:block;font-size:17px;line-height:1.05;color:#252b35}.rp-donut small{font-size:10px;color:#8a93a0}.rp-legend{display:flex;flex-direction:column;gap:3px}.rp-legend-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;gap:9px;border:0;background:transparent;padding:8px 6px;border-radius:10px;text-align:left;color:#303642;width:100%}.rp-legend-row[data-category]{cursor:pointer}.rp-legend-row[data-category]:active{background:#f1f3f7}.rp-dot{width:10px;height:10px;border-radius:50%}.rp-name{font-size:12px;font-weight:800;color:#303642}.rp-value{text-align:right}.rp-value b{display:block;font-size:11px;color:#303642}.rp-value small{display:block;font-size:9px;color:#8c95a3;white-space:nowrap}.rp-value em{display:block;margin-top:2px;font-size:9px;font-style:normal;font-weight:700;color:#667181;white-space:nowrap}.rp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}.rp-stats>div{background:#f6f7fa;border-radius:14px;padding:12px}.rp-stats small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#939ba7;font-weight:800}.rp-stats strong{display:block;margin-top:4px;font-size:13px;color:#303642}.rp-tip{text-align:center;color:#929aa6;font-size:10px;margin-top:14px}.rp-back{border:0;background:transparent;color:#6376c9;font-weight:800;padding:0 0 6px}.rp-kicker{font-size:19px;font-weight:900;margin:4px 0 12px;color:#252b35}.rp-loading,.rp-empty{text-align:center;padding:45px 15px;color:#8b94a0;font-size:13px}
  @media(max-width:560px){#expenseReportModal{padding:8px!important}#expenseReportModal .rp-card{max-height:94vh!important;width:calc(100vw - 16px)!important;padding:10px 12px 18px!important;border-radius:22px!important}.rp-head{top:-10px}.rp-chart-wrap{grid-template-columns:1fr;gap:15px}.rp-donut{width:min(54vw,215px)}.rp-stats{grid-template-columns:1fr 1fr}.rp-controls{justify-content:center}.rp-period-nav{width:100%;justify-content:center}.rp-legend-row{padding:7px 2px;grid-template-columns:12px minmax(0,1fr) auto}.rp-value small,.rp-value em{font-size:8.5px}}
  `;document.head.appendChild(style);
  $rp('#expenseReportClose')?.addEventListener('click',()=> $rp('#expenseReportModal')?.classList.remove('show'));
  $rp('#expenseReportModal')?.addEventListener('click',e=>{if(e.target.id==='expenseReportModal')e.currentTarget.classList.remove('show')});
  $rp('#expenseReportPrev')?.addEventListener('click',()=>shiftPeriod(-1));$rp('#expenseReportNext')?.addEventListener('click',()=>shiftPeriod(1));
  $$rp('#expenseReportModes button').forEach(b=>b.addEventListener('click',()=>{reportMode=b.dataset.mode;reportCategory=null;if(reportMode==='year')reportCursor=new Date(reportCursor.getFullYear(),0,1);renderReport()}));
}
installReport();