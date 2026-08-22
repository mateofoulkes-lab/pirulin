const $hx=(s,r=document)=>r.querySelector(s);

function csvCell(value){
  const s=String(value??'');
  return /[;"\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}

function downloadCsv(items){
  const expenses=[...items].filter(it=>!it.settlement);
  const rows=[['id','descripcion','categoria_actual']];
  expenses.forEach(it=>rows.push([it.id||'',it.desc||'',it.cat||'']));
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`gastos_nombres_historicos_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  return expenses.length;
}

async function getAllItemsOnce(){
  if(!window.PirulinExpenses?.subscribe)throw new Error('Gastos todavía no terminó de cargar.');
  return await new Promise((resolve,reject)=>{
    let settled=false,stop=null;
    try{
      stop=window.PirulinExpenses.subscribe(items=>{
        if(settled)return;
        settled=true;
        try{stop?.()}catch{}
        resolve(items||[]);
      },err=>{
        if(settled)return;
        settled=true;
        try{stop?.()}catch{}
        reject(err||new Error('No pude leer el historial.'));
      });
    }catch(err){
      settled=true;
      try{stop?.()}catch{}
      reject(err);
    }
  });
}

async function exportHistory(button){
  const old=button.textContent;
  button.disabled=true;
  button.textContent='Leyendo nombres…';
  try{
    const items=await getAllItemsOnce();
    const count=downloadCsv(items);
    button.textContent=`Exportados ${count} gastos ✓`;
    setTimeout(()=>{button.textContent=old;button.disabled=false},1800);
  }catch(err){
    console.error(err);
    button.textContent='Reintentar exportación';
    button.disabled=false;
    alert(err?.message||'No pude exportar los nombres del historial.');
  }
}

function installHistoryExport(){
  const menu=$hx('#gastosTopMenuMock');
  if(!menu)return setTimeout(installHistoryExport,100);
  if($hx('#exportAllHistoryBtn'))return;
  const btn=document.createElement('button');
  btn.id='exportAllHistoryBtn';
  btn.type='button';
  btn.textContent='Exportar nombres históricos';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();exportHistory(btn)});
  menu.appendChild(btn);
}
installHistoryExport();
