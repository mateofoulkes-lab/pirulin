function todayISO(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function taskForCard(card){
  const id=card?.dataset?.firebaseId;
  return id?window.PirulinTaskLive?.tasks?.find?.(t=>String(t.id)===String(id))||null:null;
}
function isAllTaskNotToday(card){
  if(!card||!card.closest('#allList')||card.classList.contains('nested-task'))return false;
  const task=taskForCard(card);
  return !!task&&task.date!==todayISO();
}
async function assignToday(card){
  const task=taskForCard(card);
  if(!task||task.date===todayISO())return false;
  try{
    await window.PirulinTasks.saveTask({...task,date:todayISO()});
    try{window.eval(`if(typeof say==='function')say('Tarea asignada a hoy')`)}catch{}
  }catch(e){
    console.error('Pirulín assign today',e);
    try{window.eval(`if(typeof say==='function')say('No pude asignarla a hoy')`)}catch{}
  }
  return true;
}
function ensureMenuButton(){
  const menu=document.querySelector('#taskMenu');
  if(!menu)return null;
  let btn=menu.querySelector('[data-act="assign-today"]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.dataset.act='assign-today';
    btn.textContent='Asignar a hoy';
    const edit=menu.querySelector('[data-act="edit"]');
    if(edit?.nextSibling)menu.insertBefore(btn,edit.nextSibling);else menu.prepend(btn);
  }
  return btn;
}
function syncMenu(){
  const btn=ensureMenuButton();if(!btn)return;
  const card=window.activeTask?.classList?.contains('nested-task')?null:window.activeTask;
  btn.style.display=isAllTaskNotToday(card)?'':'none';
}
function install(){
  if(document.documentElement.dataset.tasksAssignToday==='1')return true;
  if(!window.PirulinTasks||!window.PirulinTaskLive||!document.querySelector('#taskMenu'))return false;
  document.documentElement.dataset.tasksAssignToday='1';
  ensureMenuButton();

  document.addEventListener('click',e=>{
    const more=e.target.closest?.('#allList .task .more');
    if(more)setTimeout(syncMenu,0);
    const assign=e.target.closest?.('#taskMenu [data-act="assign-today"]');
    if(assign){
      e.preventDefault();e.stopImmediatePropagation();
      document.querySelector('#taskMenu')?.classList.remove('show');
      const card=window.activeTask;
      if(isAllTaskNotToday(card))assignToday(card);
    }
  },true);
  return true;
}
function boot(){if(install())return;setTimeout(boot,80)}
boot();
