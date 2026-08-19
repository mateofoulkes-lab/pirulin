const ROOT_LISTS = ["todayPending","todayDone","allList","sharedList"];
let stopTasksSubscription = null;
let latestTasks = new Map();
let booted = false;
let firstSnapshotReceived = false;
let reorderContext = null;

function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function localISO(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function safeEval(code, fallback=null){
  try { return window.eval(code); } catch { return fallback; }
}
function notify(message){
  try { if (typeof window.say === "function") window.say(message); else console.log(message); }
  catch { console.log(message); }
}
function createSharedMark(by){
  if (typeof window.createSharedMark === "function") return window.createSharedMark(by || "Mateo");
  const span=document.createElement("span");
  span.className="shared-mark "+((by||"").toLowerCase()==="dani"?"dani":"mateo");
  span.textContent="↔";
  span.title=`Compartida · creada por ${by||"otro usuario"}`;
  return span;
}
function rootListsReady(){ return ROOT_LISTS.every(id=>document.getElementById(id)); }
function clearLiveLists(){
  ROOT_LISTS.forEach(id=>{
    const el=document.getElementById(id);
    if (!el) return;
    qa(".task",el).forEach(task=>task.remove());
  });
}
function setVisualCategory(card, name){
  card.dataset.category=name||"";
  if (name && typeof window.setTaskCategory === "function") {
    try { window.setTaskCategory(card,name); } catch {}
  }
}
function currentRootTask(el){
  if (!el) return null;
  if (!el.classList.contains("nested-task")) return el;
  if (typeof window.rootTaskFor === "function") {
    try { return window.rootTaskFor(el); } catch {}
  }
  const id=el.dataset.treeRoot;
  return id?document.querySelector(`.task[data-id="${CSS.escape(id)}"]`):null;
}
function taskFromElement(el){
  const root = currentRootTask(el);
  const id = root?.dataset?.firebaseId;
  return id ? latestTasks.get(id) || null : null;
}
function parseSubtasks(card){
  try { return JSON.parse(card?.dataset?.subtasks||"[]"); } catch { return []; }
}
async function persistTreeFromElement(el){
  const root=currentRootTask(el);
  const id=root?.dataset?.firebaseId;
  const old=id?latestTasks.get(id):null;
  if (!root || !old) return;
  const completed=root.classList.contains("done");
  try {
    await window.PirulinTasks.saveTask({...old,completed,subtasks:parseSubtasks(root)});
  } catch(err){
    console.error("Pirulín subtask sync",err);
    notify("No pude guardar las subtareas");
  }
}
function syncCalendarSource(tasks){
  const grouped={};
  tasks.forEach(task=>{
    if (!task.date) return;
    if (!grouped[task.date]) grouped[task.date]=[];
    grouped[task.date].push({
      id:task.id,
      text:task.title,
      shared:!!task.shared,
      by:task.createdBy||null,
      category:task.categoryName||task.categoryId||"Personal",
      completed:!!task.completed
    });
  });
  try {
    const json=JSON.stringify(grouped).replace(/</g,"\\u003c");
    window.eval(`(()=>{const data=${json};Object.keys(mockCalendarTasks).forEach(k=>delete mockCalendarTasks[k]);Object.assign(mockCalendarTasks,data);if(typeof renderCalendar==='function')renderCalendar();if(typeof calendarDetailOpen!=='undefined'&&calendarDetailOpen&&typeof renderCalendarDay==='function')renderCalendarDay();})()`);
  } catch(err){
    console.warn("Pirulín calendar sync",err);
  }
}
function makeCard(task){
  const card=document.createElement("div");
  card.className="task"+(task.completed?" done":"");
  card.draggable=!task.completed;
  card.dataset.firebaseId=task.id;
  card.dataset.id=task.id;
  card.dataset.shared=task.shared?"true":"false";
  card.dataset.date=task.date||"";
  card.dataset.time=task.time||"";
  card.dataset.link=task.link||"";
  card.dataset.notes=task.notes||"";
  card.dataset.subtasks=JSON.stringify(Array.isArray(task.subtasks)?task.subtasks:[]);
  card.dataset.persistent=task.persistent?"true":"false";
  card.dataset.repeat=JSON.stringify(task.repeat||{type:"none",days:[]});

  const check=document.createElement("button");
  check.className="check"+(task.completed?" done":"");
  check.setAttribute("aria-label",task.completed?"Marcar pendiente":"Completar");
  if (task.completed && typeof window.checkSvg === "function") check.innerHTML=window.checkSvg();

  const text=document.createElement("div");
  text.className="task-text";
  text.textContent=task.title;

  const more=document.createElement("button");
  more.className="more";
  more.setAttribute("aria-label","Opciones");
  more.textContent="⋮";

  card.append(check,text);
  if (task.shared) card.appendChild(createSharedMark(task.createdBy));
  card.appendChild(more);
  setVisualCategory(card,task.categoryName||task.categoryId||"");

  if (typeof window.ensureTaskSubtasksUI === "function") {
    try { window.ensureTaskSubtasksUI(card); } catch {}
  }
  if (typeof window.wireTask === "function") {
    try { window.wireTask(card); } catch (err) { console.warn("wireTask",err); }
  }

  check.addEventListener("click",()=>{
    setTimeout(async()=>{
      const current=latestTasks.get(task.id);
      if (!current) return;
      const completed=card.classList.contains("done") || check.classList.contains("done");
      try { await window.PirulinTasks.saveTask({...current,completed,subtasks:parseSubtasks(card)}); }
      catch(err){ console.error(err); notify("No pude guardar el cambio"); }
    },30);
  });
  return card;
}
function appendCard(listId, task){
  const list=document.getElementById(listId);
  if (!list) return;
  list.appendChild(makeCard(task));
}
function renderTasks(tasks){
  latestTasks=new Map(tasks.map(t=>[t.id,t]));
  clearLiveLists();
  const today=localISO();
  tasks.forEach(task=>{
    appendCard("allList",task);
    if (task.shared) appendCard("sharedList",task);
    if (task.date===today) appendCard(task.completed?"todayDone":"todayPending",task);
  });
  firstSnapshotReceived=true;
  syncCalendarSource(tasks);
  try { if (typeof window.applyAllFilters === "function") window.applyAllFilters(); } catch {}
}
function formDraft(){
  const title=q("#taskInput")?.value?.trim()||"";
  const categoryName=q("#taskCategorySelect")?.value||null;
  const shared=!!q("#shareInput")?.checked;
  const hasDate=!!safeEval("taskHasDate",true);
  const date=hasDate?safeEval("isoLocal(selectedTaskDate)",null):null;
  const repeatType=safeEval("repeatType","none")||"none";
  const days=qa(".weekday.active").map(el=>Number(el.dataset.day)).filter(Number.isFinite);
  const persistent=!!q("#persistentInput")?.checked;
  const notes=q("#taskNotesInput")?.value?.trim()||null;
  const link=q("#taskLinkInput")?.value?.trim()||null;
  const subtaskTitles=(q("#taskSubtasksInput")?.value||"").split(",").map(x=>x.trim()).filter(Boolean);
  return {title,categoryName,shared,date,time:null,repeat:{type:repeatType,days},persistent,notes,link,subtasks:subtaskTitles.map(title=>({title,done:false,link:"",notes:"",subtasks:[]}))};
}
async function saveFromModal(mode, activeBefore, draft){
  try {
    if (mode==="new") {
      if (!draft.title) return;
      const order=latestTasks.size?Math.max(...[...latestTasks.values()].map(t=>Number(t.order)||0))+1:0;
      await window.PirulinTasks.saveTask({...draft,order,completed:false});
      return;
    }
    if (mode==="edit" && activeBefore?.classList?.contains("nested-task")) {
      setTimeout(()=>persistTreeFromElement(activeBefore),30);
      return;
    }
    if (mode==="edit" && activeBefore?.dataset?.firebaseId) {
      const id=activeBefore.dataset.firebaseId;
      const old=latestTasks.get(id);
      if (!old) return;
      if (!!old.shared !== !!draft.shared) {
        const moved=await window.PirulinTasks.moveTaskBetweenScopes(old,draft.shared);
        await window.PirulinTasks.saveTask({...moved,...draft,id,shared:draft.shared});
      } else {
        await window.PirulinTasks.saveTask({...old,...draft,id});
      }
      return;
    }
    if (mode==="add-subtask") {
      setTimeout(()=>persistTreeFromElement(activeBefore),30);
    }
  } catch(err){
    console.error("Pirulín task save",err);
    notify("No pude guardar la tarea");
  }
}
async function toggleShareFromMenu(active){
  const task=taskFromElement(active);
  if (!task) return false;
  const nextShared=!task.shared;
  try {
    await window.PirulinTasks.moveTaskBetweenScopes(task,nextShared);
    notify(nextShared ? `Compartida con ${window.PirulinFirebase?.person==="Mateo"?"Dani":"Mateo"} 🔔` : "Tarea descompartida");
  } catch(err){
    console.error("Pirulín share",err);
    notify("No pude cambiar el estado compartido");
  }
  return true;
}
function syncShareMenuLabel(active){
  const button=q('#taskMenu [data-act="share"]');
  if (!button) return;
  const task=taskFromElement(active);
  const nested=!!active?.classList?.contains("nested-task");
  button.textContent=task?.shared && !nested ? "Descompartir" : "Compartir";
}
async function swipeDeleteTask(taskEl){
  const task=taskFromElement(taskEl);
  if (!task || taskEl?.classList?.contains("nested-task")) return false;
  if (!window.confirm("¿Eliminar esta tarea?")) return true;
  try {
    await window.PirulinTasks.deleteTask(task);
  } catch(err){
    console.error("Pirulín swipe delete",err);
    notify("No pude eliminar la tarea");
  }
  return true;
}
async function swipePostponeTask(taskEl){
  const task=taskFromElement(taskEl);
  if (!task || taskEl?.classList?.contains("nested-task")) return false;
  if (!window.confirm("¿Posponer esta tarea para Después?")) return true;
  try {
    await window.PirulinTasks.saveTask({...task,date:null,time:null});
    notify("La tarea pasó a Después");
  } catch(err){
    console.error("Pirulín swipe postpone",err);
    notify("No pude posponer la tarea");
  }
  return true;
}
window.PirulinTaskSwipeDelete=swipeDeleteTask;
window.PirulinTaskSwipePostpone=swipePostponeTask;

function rememberReorderStart(event){
  const more=event.target.closest?.(".more");
  if (!more) return;
  const card=more.closest(".task");
  if (!card || card.classList.contains("nested-task") || !card.dataset.firebaseId) return;
  const list=card.closest(".task-list");
  if (!list) return;
  reorderContext={list,id:card.dataset.firebaseId};
}
async function persistOrderFromList(list){
  if (!list) return;
  const visibleIds=qa(":scope > .task[data-firebase-id]",list).map(el=>el.dataset.firebaseId).filter(id=>latestTasks.has(id));
  if (visibleIds.length<2) return;
  const visibleSet=new Set(visibleIds);
  const base=[...latestTasks.values()].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
  const slots=[];
  base.forEach((task,index)=>{ if(visibleSet.has(task.id)) slots.push(index); });
  if (slots.length!==visibleIds.length) return;
  const reordered=[...base];
  slots.forEach((slot,index)=>{ reordered[slot]=latestTasks.get(visibleIds[index]); });
  const changed=reordered.filter((task,index)=>(Number(task.order)||0)!==index);
  if (!changed.length) return;
  try {
    await Promise.all(changed.map((task,index)=>window.PirulinTasks.saveTask({...task,order:reordered.indexOf(task)})));
  } catch(err){
    console.error("Pirulín reorder",err);
    notify("No pude guardar el orden");
  }
}
function finishReorder(){
  const ctx=reorderContext;
  reorderContext=null;
  if (!ctx) return;
  setTimeout(()=>persistOrderFromList(ctx.list),40);
}
function installTaskHooks(){
  if (document.documentElement.dataset.pirulinTaskHooks==="1") return;
  document.documentElement.dataset.pirulinTaskHooks="1";

  document.addEventListener("mousedown",rememberReorderStart,true);
  document.addEventListener("touchstart",rememberReorderStart,{capture:true,passive:true});
  document.addEventListener("mouseup",finishReorder);
  document.addEventListener("touchend",finishReorder);

  document.addEventListener("click",event=>{
    const more=event.target.closest?.(".task .more");
    if (more) {
      const active=more.closest(".task");
      setTimeout(()=>syncShareMenuLabel(active),0);
    }

    const nestedCheck=event.target.closest?.(".nested-task .check");
    if (nestedCheck) {
      const nested=nestedCheck.closest(".nested-task");
      setTimeout(()=>persistTreeFromElement(nested),35);
      return;
    }

    const save=event.target.closest?.("#saveModal");
    if (save) {
      const mode=safeEval("modalMode","new");
      const active=window.activeTask||safeEval("modalTargetTask",null);
      const draft=formDraft();
      setTimeout(()=>saveFromModal(mode,active,draft),0);
      return;
    }

    const menuButton=event.target.closest?.("#taskMenu button[data-act]");
    if (!menuButton) return;
    const action=menuButton.dataset.act;
    const active=window.activeTask;
    const task=taskFromElement(active);
    const isNested=!!active?.classList?.contains("nested-task");

    if (action==="delete" && task && !isNested) {
      event.preventDefault();
      event.stopImmediatePropagation();
      q("#taskMenu")?.classList.remove("show");
      if (!window.confirm("¿Eliminar esta tarea?")) return;
      window.PirulinTasks.deleteTask(task).catch(err=>{console.error(err);notify("No pude eliminar la tarea")});
      return;
    }

    if (action==="delete" && task && isNested) {
      setTimeout(()=>persistTreeFromElement(active),35);
      return;
    }

    if (action==="complete-all" && task) {
      setTimeout(()=>persistTreeFromElement(active),35);
      return;
    }

    if (action==="share" && task && !isNested) {
      event.preventDefault();
      event.stopImmediatePropagation();
      q("#taskMenu")?.classList.remove("show");
      toggleShareFromMenu(active);
    }
  },true);
}
function startLiveTasks(){
  if (!window.PirulinTasks || !window.PirulinFirebase?.user || !rootListsReady()) return false;
  if (stopTasksSubscription) stopTasksSubscription();
  firstSnapshotReceived=false;
  stopTasksSubscription=window.PirulinTasks.subscribeTasks({
    onChange:renderTasks,
    onError:error=>{console.error("Pirulín task sync",error);notify("Error sincronizando tareas")}
  });
  installTaskHooks();
  booted=true;
  return true;
}
function tryBoot(){
  if (startLiveTasks()) return;
  setTimeout(tryBoot,120);
}
window.addEventListener("pirulin-auth-changed",event=>{
  if (event.detail?.signedIn) setTimeout(tryBoot,0);
  else if (stopTasksSubscription){stopTasksSubscription();stopTasksSubscription=null;booted=false;firstSnapshotReceived=false;}
});
if (window.PirulinFirebase?.user) setTimeout(tryBoot,0);

window.PirulinTaskLive = { renderTasks, startLiveTasks, get tasks(){ return [...latestTasks.values()]; } };
