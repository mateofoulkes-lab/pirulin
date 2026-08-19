const ROOT_LISTS = ["todayPending","todayDone","allList","sharedList"];
let stopTasksSubscription = null;
let latestTasks = new Map();
let booted = false;

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
      const completed=card.classList.contains("done");
      try { await window.PirulinTasks.saveTask({...current,completed}); }
      catch(err){ console.error(err); notify("No pude guardar el cambio"); }
    },0);
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
  try { if (typeof window.applyAllFilters === "function") window.applyAllFilters(); } catch {}
  try { if (typeof window.refreshCalendars === "function") window.refreshCalendars(); } catch {}
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
function parseSubtasks(card){
  try { return JSON.parse(card?.dataset?.subtasks||"[]"); } catch { return []; }
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
    if (mode==="edit" && activeBefore?.dataset?.firebaseId) {
      const id=activeBefore.dataset.firebaseId;
      const old=latestTasks.get(id);
      if (!old) return;
      if (!!old.shared !== !!draft.shared) {
        await window.PirulinTasks.moveTaskBetweenScopes(old,draft.shared);
      }
      await window.PirulinTasks.saveTask({...old,...draft,id,shared:draft.shared});
      return;
    }
    if (mode==="add-subtask") {
      const root=currentRootTask(activeBefore);
      const id=root?.dataset?.firebaseId;
      const old=id?latestTasks.get(id):null;
      if (!old) return;
      await window.PirulinTasks.saveTask({...old,subtasks:parseSubtasks(root)});
    }
  } catch(err){
    console.error("Pirulín task save",err);
    notify("No pude guardar la tarea");
  }
}
function installTaskHooks(){
  if (document.documentElement.dataset.pirulinTaskHooks==="1") return;
  document.documentElement.dataset.pirulinTaskHooks="1";

  document.addEventListener("click",event=>{
    const save=event.target.closest?.("#saveModal");
    if (save) {
      const mode=safeEval("modalMode","new");
      const active=window.activeTask||safeEval("modalTargetTask",null);
      const draft=formDraft();
      setTimeout(()=>saveFromModal(mode,active,draft),0);
      return;
    }

    const menuDelete=event.target.closest?.('#taskMenu [data-act="delete"]');
    if (menuDelete) {
      const active=window.activeTask;
      const id=active?.dataset?.firebaseId;
      const task=id?latestTasks.get(id):null;
      if (!task) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      q("#taskMenu")?.classList.remove("show");
      if (!window.confirm("¿Eliminar esta tarea?")) return;
      window.PirulinTasks.deleteTask(task).catch(err=>{console.error(err);notify("No pude eliminar la tarea")});
    }
  },true);
}
function startLiveTasks(){
  if (!window.PirulinTasks || !window.PirulinFirebase?.user || !rootListsReady()) return false;
  if (stopTasksSubscription) stopTasksSubscription();
  clearLiveLists();
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
  if (event.detail?.signedIn) tryBoot();
  else if (stopTasksSubscription){stopTasksSubscription();stopTasksSubscription=null;booted=false;}
});
if (window.PirulinFirebase?.user) tryBoot(); else setTimeout(tryBoot,200);

window.PirulinTaskLive = { renderTasks, startLiveTasks };
