const DEFAULT_REMINDER_MINUTES = 15;
let pendingSaveExtras = null;
let rolloverRunning = false;
let lastModalMode = null;

function q(sel, root=document){ return root.querySelector(sel); }
function localISO(d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function safeEval(code, fallback=null){
  try { return window.eval(code); } catch { return fallback; }
}
function addDaysISO(iso, days){
  const [y,m,d]=String(iso||localISO()).split('-').map(Number);
  const date=new Date(y,m-1,d);
  date.setDate(date.getDate()+days);
  return localISO(date);
}
function nextRepeatDate(task){
  const repeat=task?.repeat||{type:'none',days:[]};
  const base=task?.date||localISO();
  if(repeat.type==='weekly'){
    const selected=(Array.isArray(repeat.days)?repeat.days:[]).map(Number).filter(Number.isFinite);
    const [y,m,d]=base.split('-').map(Number);
    const date=new Date(y,m-1,d);
    for(let i=1;i<=14;i++){
      const probe=new Date(date); probe.setDate(date.getDate()+i);
      if(!selected.length || selected.includes(probe.getDay())) return localISO(probe);
    }
    return addDaysISO(base,7);
  }
  if(repeat.type==='monthly'){
    const [y,m,d]=base.split('-').map(Number);
    const target=new Date(y,m,1);
    const last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
    target.setDate(Math.min(d,last));
    return localISO(target);
  }
  if(repeat.type==='yearly'){
    const [y,m,d]=base.split('-').map(Number);
    const target=new Date(y+1,m-1,1);
    const last=new Date(y+1,m,0).getDate();
    target.setDate(Math.min(d,last));
    return localISO(target);
  }
  return null;
}
function currentTaskFromActive(){
  const active=window.activeTask;
  const root=active?.classList?.contains('nested-task') ? active.closest('.task') : active;
  const id=root?.dataset?.firebaseId;
  return id ? window.PirulinTaskLive?.tasks?.find?.(t=>t.id===id) || null : null;
}
function ensureAdvancedFields(){
  if(q('#pirulinTimeInput')) return;
  const anchor=q('#persistentInput')?.closest('.toggle-line') || q('#shareInput')?.closest('.checkline');
  if(!anchor) return;

  const wrap=document.createElement('div');
  wrap.id='pirulinAdvancedTimeFields';
  wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 6px';
  wrap.innerHTML=`
    <label style="display:grid;gap:7px;font-size:13px;color:#747b88;font-weight:800">Hora
      <input id="pirulinTimeInput" type="time" style="width:100%;border:1px solid #e2e7f0;border-radius:16px;padding:12px 13px;outline:none;color:#343842;background:#fbfcff;font-weight:700">
    </label>
    <label style="display:grid;gap:7px;font-size:13px;color:#747b88;font-weight:800">Recordatorio
      <select id="pirulinReminderInput" style="width:100%;border:1px solid #e2e7f0;border-radius:16px;padding:12px 10px;outline:none;color:#343842;background:#fbfcff;font-weight:700">
        <option value="-1">Sin aviso</option>
        <option value="0">A la hora</option>
        <option value="5">5 min antes</option>
        <option value="15" selected>15 min antes</option>
        <option value="30">30 min antes</option>
        <option value="60">1 h antes</option>
      </select>
    </label>`;
  anchor.parentNode.insertBefore(wrap,anchor);
}
function populateAdvancedFields(){
  ensureAdvancedFields();
  const mode=safeEval('modalMode','new');
  if(mode===lastModalMode && mode!=='edit') return;
  lastModalMode=mode;
  const time=q('#pirulinTimeInput');
  const reminder=q('#pirulinReminderInput');
  if(!time||!reminder) return;
  if(mode==='edit'){
    const task=currentTaskFromActive();
    time.value=task?.time||'';
    reminder.value=String(Number.isFinite(Number(task?.reminderMinutes)) ? Number(task.reminderMinutes) : DEFAULT_REMINDER_MINUTES);
  }else{
    time.value='';
    reminder.value=String(DEFAULT_REMINDER_MINUTES);
  }
}
function lockRealIdentity(){
  const person=window.PirulinFirebase?.person;
  if(!person) return;
  try { window.eval(`currentUser=${JSON.stringify(person)}; if(typeof updateUserUI==='function') updateUserUI();`); } catch {}
  const switcher=q('#switchUser');
  if(switcher){ switcher.style.display='none'; switcher.disabled=true; }
  const label=q('#shareLabel');
  if(label) label.textContent=`Compartir con ${person==='Mateo'?'Dani':'Mateo'}`;
}
function installRepositoryWrapper(){
  if(!window.PirulinTasks || window.PirulinTasks.__advancedWrapped) return false;
  const originalSave=window.PirulinTasks.saveTask.bind(window.PirulinTasks);
  window.PirulinTasks.__originalSaveTask=originalSave;
  window.PirulinTasks.saveTask=async task=>{
    let next={...task};
    if(pendingSaveExtras){
      next={...next,...pendingSaveExtras};
      pendingSaveExtras=null;
    }
    return originalSave(next);
  };
  window.PirulinTasks.__advancedWrapped=true;
  return true;
}
async function renewRecurringTask(task){
  const nextDate=nextRepeatDate(task);
  if(!nextDate) return;
  const save=window.PirulinTasks?.__originalSaveTask || window.PirulinTasks?.saveTask;
  if(!save) return;
  // Deja que la celebración de completado sea visible antes de renovar el mismo objeto.
  setTimeout(()=>save({...task,date:nextDate,completed:false}).catch(console.error),700);
}
async function rolloverPersistentTasks(){
  if(rolloverRunning) return;
  const tasks=window.PirulinTaskLive?.tasks;
  if(!Array.isArray(tasks)) return;
  rolloverRunning=true;
  const today=localISO();
  try{
    const pending=tasks.filter(t=>t.persistent && !t.completed && t.date && t.date<today);
    for(const task of pending){
      await window.PirulinTasks.saveTask({...task,date:today});
    }
  }catch(err){ console.error('Pirulín persistent rollover',err); }
  finally{ rolloverRunning=false; }
}
function installHooks(){
  ensureAdvancedFields();
  lockRealIdentity();
  installRepositoryWrapper();

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#saveModal')){
      ensureAdvancedFields();
      const time=q('#pirulinTimeInput')?.value||null;
      const reminderRaw=Number(q('#pirulinReminderInput')?.value ?? DEFAULT_REMINDER_MINUTES);
      pendingSaveExtras={
        time:time||null,
        reminderMinutes:time && Number.isFinite(reminderRaw) && reminderRaw>=0 ? reminderRaw : null
      };
      return;
    }

    const rootCheck=event.target.closest?.('.task:not(.nested-task) > .check');
    if(rootCheck){
      const card=rootCheck.closest('.task');
      const id=card?.dataset?.firebaseId;
      const task=id ? window.PirulinTaskLive?.tasks?.find?.(t=>t.id===id) : null;
      if(task && task.repeat?.type && task.repeat.type!=='none'){
        setTimeout(()=>{
          const becameDone=card.classList.contains('done') || rootCheck.classList.contains('done');
          if(becameDone) renewRecurringTask({...task,completed:true});
        },80);
      }
    }

    if(event.target.closest?.('.more,[data-act="edit"],#fab,.fab')){
      setTimeout(()=>{ lastModalMode=null; populateAdvancedFields(); },20);
    }
  },true);

  const modal=q('#taskModal');
  if(modal){
    new MutationObserver(()=>{
      if(modal.classList.contains('show')){ lastModalMode=null; setTimeout(populateAdvancedFields,0); }
    }).observe(modal,{attributes:true,attributeFilter:['class']});
  }

  setInterval(()=>{
    lockRealIdentity();
    if(!window.PirulinTasks?.__advancedWrapped) installRepositoryWrapper();
    rolloverPersistentTasks();
  },1500);
}

function boot(){
  if(!q('#taskModal') || !window.PirulinFirebase) return setTimeout(boot,120);
  installHooks();
}

window.addEventListener('pirulin-auth-changed',event=>{
  if(event.detail?.signedIn) setTimeout(()=>{lockRealIdentity();rolloverPersistentTasks();},100);
});
boot();

window.PirulinTaskAdvanced={nextRepeatDate,rolloverPersistentTasks};
