let detailPointerStart=null;
let suppressTaskDetailClickUntil=0;

function q(sel,root=document){return root.querySelector(sel)}
function qa(sel,root=document){return [...root.querySelectorAll(sel)]}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function taskTitle(card){
  const text=q('.task-text',card);
  if(!text)return 'Tarea';
  const first=[...text.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
  return (first?.textContent||text.textContent||'Tarea').trim();
}
function rootCardFor(card){
  if(!card?.classList?.contains('nested-task'))return card;
  const id=card.dataset.treeRoot||'';
  return q(`.task[data-firebase-id="${CSS.escape(id)}"],.task[data-id="${CSS.escape(id)}"]`);
}
function liveTaskFor(card){
  const root=rootCardFor(card);
  const id=root?.dataset?.firebaseId||root?.dataset?.id;
  return id?window.PirulinTaskLive?.tasks?.find?.(t=>String(t.id)===String(id))||null:null;
}
function lexicalDetailTask(){try{return window.eval('typeof detailTask!=="undefined"?detailTask:null')}catch{return null}}
function parseSubs(card){try{return JSON.parse(card?.dataset?.subtasks||'[]')}catch{return []}}
function humanDate(iso){
  if(!iso)return 'Sin fecha';
  const [y,m,d]=iso.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'});
}
function repeatLabel(repeat){
  const type=repeat?.type||'none';
  if(type==='weekly')return 'Semanal';
  if(type==='monthly')return 'Mensual';
  if(type==='yearly')return 'Anual';
  return '';
}
function renderSubtaskRows(items,level=0){
  return (items||[]).map(item=>{
    const children=Array.isArray(item.subtasks)?item.subtasks:[];
    return `<div style="margin-left:${Math.min(level,4)*14}px;padding:9px 10px;border-bottom:1px solid #eef0f4;display:flex;align-items:flex-start;gap:8px">
      <span style="margin-top:2px;color:${item.done?'#2ac79f':'#8b93a2'}">${item.done?'✓':'○'}</span>
      <div style="min-width:0;flex:1">
        <div style="font-weight:800;color:#343842;${item.done?'text-decoration:line-through;color:#8b93a2':''}">${esc(item.title||'Sin título')}</div>
        ${item.notes?`<div style="font-size:11px;color:#858c98;margin-top:3px">${esc(item.notes)}</div>`:''}
      </div>
    </div>${children.length?renderSubtaskRows(children,level+1):''}`;
  }).join('');
}

window.renderTaskDetail=function renderTaskDetail(){
  const card=window.detailTask||lexicalDetailTask();
  const modal=q('#taskDetailModal');
  if(!modal||!card)throw new Error('Detalle de tarea sin contexto');
  try{
    const live=liveTaskFor(card);
    const nested=card.classList.contains('nested-task');
    const title=nested?taskTitle(card):(live?.title||taskTitle(card));
    const notes=nested?(card.dataset.notes||''):(live?.notes||card.dataset.notes||'');
    const link=nested?(card.dataset.link||''):(live?.link||card.dataset.link||'');
    const subs=nested?parseSubs(card):(Array.isArray(live?.subtasks)?live.subtasks:parseSubs(card));
    const category=nested?(card.dataset.category||''):(live?.categoryName||live?.categoryId||card.dataset.category||'');
    const meta=[];
    if(!nested){
      meta.push(humanDate(live?.date||card.dataset.date||null));
      if(live?.time||card.dataset.time)meta.push(live?.time||card.dataset.time);
      const rep=repeatLabel(live?.repeat);if(rep)meta.push(rep);
      if(live?.persistent)meta.push('Persistente');
      if(live?.shared)meta.push('Compartida');
    }
    if(category)meta.push(category);
    q('#taskDetailTitle').textContent=title;
    q('#taskDetailMeta').textContent=meta.filter(Boolean).join(' · ');
    q('#taskDetailNotes').innerHTML=notes?`<div style="margin:10px 0;padding:11px 12px;background:#f7f8fa;border-radius:12px;color:#5f6672;white-space:pre-wrap">${esc(notes)}</div>`:'';
    q('#taskDetailLink').innerHTML=link?`<a href="${esc(link)}" target="_blank" rel="noopener" style="display:inline-block;margin:3px 0 8px;color:#6550b8;font-weight:800;overflow-wrap:anywhere">${esc(link)}</a>`:'';
    const list=q('#subtaskDetailList');
    list.innerHTML=subs.length?renderSubtaskRows(subs):'<div style="padding:12px;color:#969da8;font-size:12px">Sin subtareas.</div>';
  }catch(error){
    modal.classList.remove('show');
    console.error('Pirulín task detail',error);
    throw error;
  }
};

function safeOpenDetail(card){
  const modal=q('#taskDetailModal');
  try{
    window.activeTask=card;
    window.detailTask=card;
    if(typeof window.openTaskDetail==='function')window.openTaskDetail(card);
    else{window.renderTaskDetail();modal?.classList.add('show')}
  }catch(error){
    modal?.classList.remove('show');
    console.error('Pirulín open task detail',error);
    try{window.eval("if(typeof say==='function')say('No pude abrir el detalle')")}catch{}
  }
}
async function persistDetailSubtasks(card){
  const root=rootCardFor(card);
  const live=liveTaskFor(root);
  if(!root||!live||!window.PirulinTasks)return;
  try{await window.PirulinTasks.saveTask({...live,subtasks:parseSubs(root)})}
  catch(error){console.error('Pirulín detail subtask persistence',error)}
}
function closeStrayDetailOnError(){
  const modal=q('#taskDetailModal');
  if(!modal)return;
  window.addEventListener('error',event=>{
    const msg=String(event?.error?.message||event?.message||'');
    if(modal.classList.contains('show')&&/task|detail|subtask/i.test(msg))modal.classList.remove('show');
  });
  window.addEventListener('unhandledrejection',event=>{
    const msg=String(event?.reason?.message||event?.reason||'');
    if(modal.classList.contains('show')&&/task|detail|subtask/i.test(msg))modal.classList.remove('show');
  });
}
function install(){
  if(document.documentElement.dataset.taskDetailFix==='1')return;
  document.documentElement.dataset.taskDetailFix='1';
  closeStrayDetailOnError();

  document.addEventListener('pointerdown',e=>{
    const card=e.target.closest?.('#tasksSuite .task[data-firebase-id]');
    if(card)detailPointerStart={x:e.clientX,y:e.clientY,card};
  },true);
  document.addEventListener('pointermove',e=>{
    if(!detailPointerStart)return;
    if(Math.hypot(e.clientX-detailPointerStart.x,e.clientY-detailPointerStart.y)>12)suppressTaskDetailClickUntil=Date.now()+450;
  },true);
  document.addEventListener('pointerup',()=>{detailPointerStart=null},true);

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('#tasksSuite .task[data-firebase-id]');
    if(card&&!e.target.closest?.('button,a,input,textarea,select,.more,.check,.subtasks-indicator')){
      if(Date.now()<suppressTaskDetailClickUntil)return;
      e.preventDefault();e.stopPropagation();safeOpenDetail(card);return;
    }
    if(e.target.closest?.('#addSubtaskBtn')){
      const active=window.detailTask||lexicalDetailTask()||window.activeTask;
      setTimeout(()=>persistDetailSubtasks(active),80);
    }
  },true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
