const $hx=(s,r=document)=>r.querySelector(s);
const roleNameHx=r=>r==='A'?'Mateo':r==='B'?'Dani':r||'';
const roundHx=n=>Math.round(Number(n||0)*100)/100;

function csvCell(value){
  const s=String(value??'');
  return /[;"\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}
function dateIso(value){
  try{
    const d=window.PirulinExpenses?.toDate?.(value) || (value instanceof Date?value:new Date(value));
    if(!(d instanceof Date)||Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }catch{return ''}
}
function timestampIso(value){
  try{
    const d=window.PirulinExpenses?.toDate?.(value) || (value instanceof Date?value:new Date(value));
    return d instanceof Date&&!Number.isNaN(d.getTime())?d.toISOString():'';
  }catch{return ''}
}
function downloadCsv(items){
  const rows=[[
    'id','tipo','fecha','descripcion','categoria','pagador','monto','monto_pendiente',
    'debe_mateo','debe_dani','tipo_reparto','porcentaje_mateo','porcentaje_dani',
    'monto_mateo','monto_dani','desde','hacia','nota','creado_por','actualizado_por',
    'creado_el','actualizado_el'
  ]];
  [...items]
    .sort((a,b)=>{const da=window.PirulinExpenses?.toDate?.(a.date)?.getTime?.()||0,db=window.PirulinExpenses?.toDate?.(b.date)?.getTime?.()||0;return da-db})
    .forEach(it=>{
      const settlement=!!it.settlement;
      rows.push([
        it.id||'',settlement?'ajuste':'gasto',dateIso(it.date),settlement?'':it.desc||'',settlement?'':it.cat||'',
        settlement?'':roleNameHx(it.payer),settlement?roundHx(it.amount):it.amountPending?'':roundHx(it.amount),
        settlement?'':it.amountPending?'sí':'no',settlement?'':roundHx(it.oweA),settlement?'':roundHx(it.oweB),
        settlement?'':it.splitType||'',settlement?'':it.splitPercentA??'',settlement?'':it.splitPercentB??'',
        settlement?'':it.splitAmountA??'',settlement?'':it.splitAmountB??'',
        settlement?roleNameHx(it.from):'',settlement?roleNameHx(it.to):'',settlement?it.note||'':'',
        it.createdBy||'',it.updatedBy||'',timestampIso(it.createdAt),timestampIso(it.updatedAt)
      ]);
    });
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`gastos_historial_completo_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function getAllItemsOnce(){
  if(!window.PirulinExpenses?.subscribe)throw new Error('Gastos todavía no terminó de cargar.');
  return await new Promise((resolve,reject)=>{
    let settled=false,stop=null;
    const timer=setTimeout(()=>{if(settled)return;settled=true;try{stop?.()}catch{};reject(new Error('La lectura del historial tardó demasiado.'));},15000);
    try{
      stop=window.PirulinExpenses.subscribe(items=>{
        if(settled)return;settled=true;clearTimeout(timer);try{stop?.()}catch{};resolve(items||[]);
      },err=>{
        if(settled)return;settled=true;clearTimeout(timer);try{stop?.()}catch{};reject(err||new Error('No pude leer el historial.'));
      });
    }catch(err){settled=true;clearTimeout(timer);reject(err)}
  });
}
async function exportHistory(button){
  const old=button.textContent;button.disabled=true;button.textContent='Preparando historial…';
  try{
    const items=await getAllItemsOnce();
    downloadCsv(items);
    button.textContent=`Exportados ${items.length} movimientos ✓`;
    setTimeout(()=>{button.textContent=old;button.disabled=false},1800);
  }catch(err){console.error(err);button.textContent='Reintentar exportación';button.disabled=false;alert(err?.message||'No pude exportar el historial.')}
}
function installHistoryExport(){
  const menu=$hx('#gastosTopMenuMock');
  if(!menu)return setTimeout(installHistoryExport,100);
  if($hx('#exportAllHistoryBtn'))return;
  const btn=document.createElement('button');
  btn.id='exportAllHistoryBtn';btn.type='button';btn.textContent='Exportar historial completo';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();exportHistory(btn)});
  menu.appendChild(btn);
}
installHistoryExport();
