let DEFAULT_REMINDER_MINUTES = 15;
let pendingSaveExtras = null;
let rolloverRunning = false;
let lastModalMode = null;
let stopCategories = null;
let stopSettings = null;
let categoryBooted = false;

function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
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
function dateFromISO(iso){
  if(!iso) return new Date();
  const [y,m,d]=iso.split('-').map(Number);
  return new Date(y,m-1,d);
}
function nextRepeatDate(task){
  const repeat=task?.repeat||{type:'none',days:[]};
  const base=task?.date||localISO();
  if(repeat.type==='weekly'){
    const selected=(Array.isArray(repeat.days)?repeat.days:[]).map(Number).filter(Number.isFinite);
    const date=dateFromISO(base);
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
  const root=active?.classList?.contains('nested-task') ? document.querySelector(`.task[data-firebase-id="${CSS.escape(active.dataset.treeRoot||'')}"]`) : active;
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
        <option value="15">15 min antes</option>
        <option value="30">30 min antes</option>
        <option value="60">1 h antes</option>
      </select>
    </label>`;
  anchor.parentNode.insertBefore(wrap,anchor);

  const remember=document.createElement('label');
  remember.id='pirulinRememberReminderRow';
  remember.style.cssText='display:flex;align-items:center;gap:9px;margin:3px 2px 10px;color:#747b88;font-size:12px;font-weight:800';
  remember.innerHTML='<input id="pirulinRememberReminder" type="checkbox" style="width:17px;height:17px;accent-color:#ff645c"> Usar este aviso como predeterminado';
  wrap.insertAdjacentElement('afterend',remember);
}
function syncOriginalModalFields(task){
  if(!task) return;
  const hasDate=!!task.date;
  try{
    window.eval(`taskHasDate=${hasDate}; repeatType=${JSON.stringify(task.repeat?.type||'none')}; selectedTaskDate=new Date(${JSON.stringify(task.date||localISO())}+'T12:00:00'); miniCursor=new Date(selectedTaskDate.getFullYear(),selectedTaskDate.getMonth(),1); if(typeof renderMiniCalendar==='function')renderMiniCalendar(); if(typeof updateChosenDateLabel==='function')updateChosenDateLabel();`);
  }catch{}
  q('#withDateBtn')?.classList.toggle('active',hasDate);
  q('#noDateBtn')?.classList.toggle('active',!hasDate);
  if(q('#noDateInline')) q('#noDateInline').checked=!hasDate;
  if(q('#datePickerWrap')) q('#datePickerWrap').style.display=hasDate?'block':'none';
  if(q('#noDateNote')) q('#noDateNote').style.display=hasDate?'none':'block';
  qa('.repeat-type').forEach(b=>b.classList.toggle('active',b.dataset.repeat===(task.repeat?.type||'none')));
  if(q('#weeklyPanel')) q('#weeklyPanel').classList.toggle('show',task.repeat?.type==='weekly');
  const days=new Set((task.repeat?.days||[]).map(Number));
  qa('.weekday').forEach(b=>b.classList.toggle('active',days.has(Number(b.dataset.day))));
  if(q('#persistentInput')) q('#persistentInput').checked=!!task.persistent;
}
function populateAdvancedFields(){
  ensureAdvancedFields();
  const mode=safeEval('modalMode','new');
  if(mode===lastModalMode && mode!=='edit') return;
  lastModalMode=mode;
  const time=q('#pirulinTimeInput');
  const reminder=q('#pirulinReminderInput');
  const remember=q('#pirulinRememberReminder');
  if(!time||!reminder) return;
  if(remember) remember.checked=false;
  if(mode==='edit'){
    const task=currentTaskFromActive();
    time.value=task?.time||'';
    reminder.value=String(Number.isFinite(Number(task?.reminderMinutes)) ? Number(task.reminderMinutes) : DEFAULT_REMINDER_MINUTES);
    syncOriginalModalFields(task);
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
    for(const task of pending) await window.PirulinTasks.saveTask({...task,date:today});
  }catch(err){ console.error('Pirulín persistent rollover',err); }
  finally{ rolloverRunning=false; }
}
function decorateTaskCards(){
  const tasks=window.PirulinTaskLive?.tasks;
  if(!Array.isArray(tasks)) return;
  qa('.task[data-firebase-id]').forEach(card=>{
    const task=tasks.find(t=>t.id===card.dataset.firebaseId);
    if(!task) return;
    const text=q('.task-text',card);
    if(!text) return;
    let meta=q('.pirulin-task-meta',text);
    const bits=[];
    if(task.time) bits.push(`⏱ ${task.time}`);
    if(task.repeat?.type && task.repeat.type!=='none') bits.push({weekly:'Semanal',monthly:'Mensual',yearly:'Anual'}[task.repeat.type]||'Repite');
    if(task.persistent && !task.completed) bits.push('Persistente');
    if(!bits.length){ meta?.remove(); return; }
    if(!meta){
      meta=document.createElement('span');
      meta.className='pirulin-task-meta';
      meta.style.cssText='display:block;margin-top:4px;font-family:Nunito,system-ui,sans-serif;font-size:10.5px;font-weight:800;color:#9299a8;letter-spacing:0;text-decoration:none';
      text.appendChild(meta);
    }
    meta.textContent=bits.join(' · ');
  });
}

function syncCategoriesToV51(items){
  const categories=items.map(x=>x.name);
  const colors=Object.fromEntries(items.map(x=>[x.name,x.color||'#8b93a6']));
  try{
    window.eval(`(()=>{categories=${JSON.stringify(categories)};categoryColors=${JSON.stringify(colors)};if(typeof renderCategoryFilters==='function')renderCategoryFilters();if(typeof renderCategorySelect==='function')renderCategorySelect(document.querySelector('#taskCategorySelect')?.value);if(typeof applyAllFilters==='function')applyAllFilters();})()`);
  }catch(err){ console.warn('Pirulín category UI sync',err); }
  renderRealCategoriesList(items);
}
function renderRealCategoriesList(items=window.PirulinTaskPreferences?.categories||[]){
  const list=q('#categoriesList');
  if(!list) return;
  if(!items.length){ list.innerHTML='<div class="empty-small">No hay categorías.</div>'; return; }
  list.innerHTML=items.map((cat,index)=>`
    <div class="category-row" data-pirulin-category-id="${String(cat.id).replace(/"/g,'&quot;')}">
      <span class="category-color" style="background:${cat.color||'#8b93a6'}"></span>
      <span class="category-name">${String(cat.name).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>
      <button type="button" data-pirulin-cat-act="rename" data-index="${index}">Editar</button>
      <button type="button" data-pirulin-cat-act="delete" data-index="${index}" class="danger">Eliminar</button>
    </div>`).join('');
  const p=q('#categoriesPanel .category-card p');
  if(p) p.textContent='Tus categorías son privadas y se sincronizan solamente con tu cuenta.';
}
async function remapPrivateTasks(oldName,newName){
  const tasks=window.PirulinTaskLive?.tasks||[];
  const affected=tasks.filter(t=>!t.shared && t.categoryName===oldName);
  await Promise.all(affected.map(t=>window.PirulinTasks.saveTask({...t,categoryName:newName,categoryId:null})));
}
async function addCategoryFromUI(){
  const input=q('#newCategoryInput');
  const name=input?.value?.trim();
  const pref=window.PirulinTaskPreferences;
  if(!name||!pref) return;
  if(pref.categories.some(c=>c.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))) return;
  const palette=['#ff8f70','#5f8df7','#b274e8','#6d7c92','#35bfa3','#e86f9d','#e2a33b','#56a8a1','#9a87dc'];
  await pref.saveCategory({name,color:palette[pref.categories.length%palette.length],order:pref.categories.length});
  if(input) input.value='';
}
async function renameCategoryFromUI(index){
  const pref=window.PirulinTaskPreferences;
  const cat=pref?.categories?.[index];
  if(!cat) return;
  const next=window.prompt('Nombre de la categoría',cat.name)?.trim();
  if(!next||next===cat.name) return;
  if(pref.categories.some(c=>c.id!==cat.id&&c.name.toLocaleLowerCase('es')===next.toLocaleLowerCase('es'))) return;
  await pref.renameCategory(cat,next);
  await remapPrivateTasks(cat.name,next);
}
async function deleteCategoryFromUI(index){
  const pref=window.PirulinTaskPreferences;
  const cat=pref?.categories?.[index];
  if(!cat||!window.confirm(`¿Eliminar "${cat.name}"?`)) return;
  const remaining=pref.categories.filter(c=>c.id!==cat.id);
  const fallback=(remaining.find(c=>c.name==='Personal')||remaining[0])?.name||null;
  await pref.deleteCategory(cat);
  await remapPrivateTasks(cat.name,fallback);
}
function startPreferences(){
  const pref=window.PirulinTaskPreferences;
  if(!pref||!window.PirulinFirebase?.user) return false;
  stopCategories?.(); stopSettings?.();
  stopCategories=pref.subscribeCategories(async items=>{
    pref.categories=items;
    syncCategoriesToV51(items);
    if(!categoryBooted && !items.length){
      categoryBooted=true;
      try{ await pref.ensureDefaultCategories(); }catch(err){console.error('default categories',err);}
    }else categoryBooted=true;
  },err=>console.error('Pirulín categories',err));
  stopSettings=pref.subscribeSettings(settings=>{
    pref.settings={defaultReminderMinutes:15,...settings};
    const n=Number(pref.settings.defaultReminderMinutes);
    if(Number.isFinite(n)) DEFAULT_REMINDER_MINUTES=n;
  },err=>console.error('Pirulín settings',err));
  return true;
}
function installHooks(){
  ensureAdvancedFields();
  lockRealIdentity();
  installRepositoryWrapper();

  document.addEventListener('click',event=>{
    const addCat=event.target.closest?.('#addCategoryBtn');
    if(addCat){
      event.preventDefault(); event.stopImmediatePropagation();
      addCategoryFromUI().catch(console.error); return;
    }
    const catAction=event.target.closest?.('[data-pirulin-cat-act]');
    if(catAction){
      event.preventDefault(); event.stopImmediatePropagation();
      const index=Number(catAction.dataset.index);
      const fn=catAction.dataset.pirulinCatAct==='rename'?renameCategoryFromUI:deleteCategoryFromUI;
      fn(index).catch(console.error); return;
    }

    if(event.target.closest?.('#saveModal')){
      ensureAdvancedFields();
      const time=q('#pirulinTimeInput')?.value||null;
      const reminderRaw=Number(q('#pirulinReminderInput')?.value ?? DEFAULT_REMINDER_MINUTES);
      pendingSaveExtras={time:time||null,reminderMinutes:time && Number.isFinite(reminderRaw) && reminderRaw>=0 ? reminderRaw : null};
      if(q('#pirulinRememberReminder')?.checked && window.PirulinTaskPreferences){
        const value=Number.isFinite(reminderRaw)?reminderRaw:15;
        window.PirulinTaskPreferences.saveSettings({defaultReminderMinutes:value}).catch(console.error);
      }
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

    if(event.target.closest?.('.more,[data-act="edit"],#fab,.fab')) setTimeout(()=>{ lastModalMode=null; populateAdvancedFields(); },20);
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
    if(!stopCategories) startPreferences();
    rolloverPersistentTasks();
    decorateTaskCards();
  },1000);
}
function boot(){
  if(!q('#taskModal') || !window.PirulinFirebase) return setTimeout(boot,120);
  installHooks();
  startPreferences();
}
window.addEventListener('pirulin-auth-changed',event=>{
  if(event.detail?.signedIn) setTimeout(()=>{lockRealIdentity();startPreferences();rolloverPersistentTasks();},100);
  else { stopCategories?.(); stopSettings?.(); stopCategories=null; stopSettings=null; categoryBooted=false; }
});
boot();
window.PirulinTaskAdvanced={nextRepeatDate,rolloverPersistentTasks,get defaultReminderMinutes(){return DEFAULT_REMINDER_MINUTES;}};
