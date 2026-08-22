const $hx=(s,r=document)=>r.querySelector(s);
const PROJECT_ID='pirulin-app';

function csvCell(value){
  const s=String(value??'');
  return /[;"\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}

function fieldValue(field){
  if(!field)return '';
  if('stringValue' in field)return field.stringValue;
  if('booleanValue' in field)return field.booleanValue;
  if('integerValue' in field)return Number(field.integerValue);
  if('doubleValue' in field)return Number(field.doubleValue);
  if('nullValue' in field)return null;
  return '';
}

function decodeDoc(document){
  const name=String(document?.name||'');
  const fields=document?.fields||{};
  return{
    id:name.split('/').pop()||'',
    desc:fieldValue(fields.desc)||'',
    cat:fieldValue(fields.cat)||'',
    settlement:fieldValue(fields.settlement)===true
  };
}

function downloadCsv(items){
  const expenses=[...items].filter(it=>!it.settlement&&it.desc);
  const rows=[['id','descripcion','categoria_actual']];
  expenses.forEach(it=>rows.push([it.id||'',it.desc||'',it.cat||'']));
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`gastos_nombres_historicos_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  return expenses.length;
}

async function getToken(){
  const user=window.PirulinFirebase?.user;
  if(!user?.getIdToken)throw new Error('La sesión de Pirulín todavía no está lista.');
  return await user.getIdToken();
}

async function getHistoricalNames(onProgress){
  const token=await getToken();
  const base=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shared/expenses/items`;
  const items=[];
  let pageToken='';
  do{
    const params=new URLSearchParams();
    params.set('pageSize','300');
    params.append('mask.fieldPaths','desc');
    params.append('mask.fieldPaths','cat');
    params.append('mask.fieldPaths','settlement');
    if(pageToken)params.set('pageToken',pageToken);
    const response=await fetch(`${base}?${params.toString()}`,{
      method:'GET',
      headers:{Authorization:`Bearer ${token}`},
      cache:'no-store'
    });
    if(!response.ok){
      let detail='';
      try{detail=(await response.json())?.error?.message||''}catch{}
      throw new Error(`Firestore respondió HTTP ${response.status}${detail?`: ${detail}`:''}`);
    }
    const data=await response.json();
    const docs=Array.isArray(data.documents)?data.documents:[];
    items.push(...docs.map(decodeDoc));
    pageToken=data.nextPageToken||'';
    onProgress?.(items.length);
  }while(pageToken);
  return items;
}

async function exportHistory(button){
  const old=button.textContent;
  button.disabled=true;
  button.textContent='Leyendo nombres…';
  try{
    const items=await getHistoricalNames(count=>{button.textContent=`Leyendo ${count} nombres…`});
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
