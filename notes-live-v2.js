let stopNotes=null, stopCategories=null;
let latestNotes=new Map(), latestCategories=new Map();
let syncingCategories=false;

function q(sel,root=document){return root.querySelector(sel)}
function qa(sel,root=document){return [...root.querySelectorAll(sel)]}
function safeEval(code,fallback=null){try{return window.eval(code)}catch(e){console.warn('Pirulín notes eval',e);return fallback}}
function say(msg){try{window.eval(`if(typeof say==='function')say(${JSON.stringify(msg)})`)}catch{console.log(msg)}}
function jsonForEval(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function otherPerson(){return window.PirulinFirebase?.person==='Mateo'?'Dani':'Mateo'}

function emitRendered(){window.dispatchEvent(new CustomEvent('pirulin-notes-rendered'))}
function emitEditorOpened(){window.dispatchEvent(new CustomEvent('pirulin-note-editor-opened'))}

function setMockNotes(notes){
  const data=notes.map(n=>({
    id:n.id,title:n.title||'Sin título',body:n.body||'',tags:Array.isArray(n.tags)?n.tags:[],
    shared:!!n.shared,pinned:!!n.pinned,drawing:n.drawing||'',createdBy:n.createdBy||null,createdByUid:n.createdByUid||null
  }));
  try{window.eval(`notesData=${jsonForEval(data)};if(typeof renderNotes==='function')renderNotes();`)}catch(e){console.error('Pirulín render notes',e)}
  relabelSharedUI();
  emitRendered();
}
function setMockCategories(categories){
  const data=categories.map(c=>({id:String(c.id),name:String(c.name),parent:c.parent||null}));
  try{
    window.eval(`(()=>{const data=${jsonForEval(data)};noteCategories.splice(0,noteCategories.length,...data);if(typeof selectedNoteFilters!=='undefined'){const valid=new Set(data.map(c=>c.id));[...selectedNoteFilters].forEach(id=>{if(!valid.has(id))selectedNoteFilters.delete(id)})}if(typeof renderNoteFilters==='function')renderNoteFilters();if(typeof renderNotes==='function')renderNotes();if(typeof renderCategoryEditor==='function'&&document.getElementById('categoryEditorModal')?.classList.contains('show'))renderCategoryEditor();})()`)
  }catch(e){console.error('Pirulín render note categories',e)}
  relabelSharedUI();
  emitRendered();
}
function relabelSharedUI(){
  const other=otherPerson();
  qa('#notesGrid .note-card').forEach(card=>{
    const note=latestNotes.get(String(card.dataset.noteId));
    const chip=q('.note-chip',card);
    if(note?.shared&&chip&&chip.textContent!==`Con ${other}`) chip.textContent=`Con ${other}`;
  });
  const label=q('#noteShareInput')?.closest('.note-pref')?.querySelector('span');
  if(label&&label.textContent!==`Compartir con ${other}`) label.textContent=`Compartir con ${other}`;
}

function readEditingPayload(){
  const title=q('#noteTitleInput')?.value?.trim()||'';
  const body=q('#noteBodyInput')?.value?.trim()||'';
  const drawing=safeEval('editingDrawing','')||'';
  if(!title&&!body&&!drawing)return null;
  const editingId=safeEval('editingNoteId',null);
  const tags=safeEval('[...editingNoteTags]',[])||[];
  const old=editingId?latestNotes.get(String(editingId)):null;
  return {
    id:String(editingId||`n${Date.now()}-${Math.random().toString(36).slice(2,6)}`),
    title:title||'Sin título',body,drawing,tags,
    shared:!!q('#noteShareInput')?.checked,
    pinned:!!q('#notePinInput')?.checked,
    createdBy:old?.createdBy||window.PirulinFirebase?.person||null,
    createdByUid:old?.createdByUid||window.PirulinFirebase?.user?.uid||null,
    previousShared:old?.shared??false
  };
}
async function saveEditingNote(){
  const payload=readEditingPayload();
  if(!payload){say('Escribí algo');return}
  try{
    const {previousShared,...note}=payload;
    await window.PirulinNotes.saveNote(note,{previousShared});
    q('#noteModal')?.classList.remove('show');
    safeEval('editingNoteId=null;editingNoteTags=new Set();editingDrawing=""');
    say(note.shared?`Nota guardada y compartida con ${otherPerson()}`:'Nota guardada');
    window.dispatchEvent(new CustomEvent('pirulin-note-saved',{detail:{id:note.id,shared:note.shared}}));
  }catch(e){console.error('Pirulín save note',e);say('No pude guardar la nota')}
}

function menuButton(label,action,danger=false){return `<button data-note-action="${action}" style="width:100%;border:0;background:transparent;text-align:left;padding:10px 11px;border-radius:10px;font:inherit;color:${danger?'#d95762':'#343842'}">${label}</button>`}
function ensureNoteMenu(){let m=q('#pirulinNoteMenu');if(m)return m;m=document.createElement('div');m.id='pirulinNoteMenu';m.style.cssText='position:fixed;z-index:120;display:none;width:190px;padding:7px;background:rgba(255,255,255,.98);border:1px solid #e8eaf0;border-radius:16px;box-shadow:0 16px 42px rgba(25,30,40,.18);font:800 13px Nunito,system-ui,sans-serif';document.body.appendChild(m);return m}
function closeNoteMenu(){const m=q('#pirulinNoteMenu');if(m)m.style.display='none'}
function openNoteMenu(card,button){
  const id=card?.dataset?.noteId,note=id?latestNotes.get(String(id)):null;if(!note)return;
  const m=ensureNoteMenu();m.dataset.noteId=String(id);
  m.innerHTML=menuButton('Editar','edit')+menuButton(note.pinned?'Desfijar':'Fijar arriba','pin')+menuButton(note.shared?'Descompartir':`Compartir con ${otherPerson()}`,'share')+menuButton('Eliminar','delete',true);
  const r=button.getBoundingClientRect();m.style.left=`${Math.max(8,Math.min(window.innerWidth-198,r.right-190))}px`;m.style.top=`${Math.min(window.innerHeight-210,r.bottom+5)}px`;m.style.display='block';
}
async function actOnNote(action,id){
  const note=latestNotes.get(String(id));if(!note)return;closeNoteMenu();
  if(action==='edit'){safeEval(`openNoteEditor(${JSON.stringify(String(id))})`);emitEditorOpened();return}
  if(action==='delete'){if(!confirm(`¿Eliminar “${note.title}”?`))return;try{await window.PirulinNotes.deleteNote(note);say('Nota eliminada')}catch(e){console.error(e);say('No pude eliminar la nota')}return}
  if(action==='pin'){try{await window.PirulinNotes.saveNote({...note,pinned:!note.pinned},{previousShared:note.shared})}catch(e){console.error(e);say('No pude cambiar el pin')}return}
  if(action==='share'){try{await window.PirulinNotes.saveNote({...note,shared:!note.shared},{previousShared:note.shared});say(note.shared?'Nota descompartida':`Compartida con ${otherPerson()}`)}catch(e){console.error(e);say('No pude cambiar el estado compartido')}}
}

function mockCategories(){return safeEval('noteCategories.map(c=>({id:c.id,name:c.name,parent:c.parent||null}))',[])||[]}
async function syncCategoriesFromMock(){
  if(syncingCategories||!window.PirulinNotes)return;
  syncingCategories=true;
  try{
    const current=mockCategories(),cur=new Map(current.map(c=>[String(c.id),c])),writes=[];
    cur.forEach((c,id)=>{const old=latestCategories.get(id);if(!old||old.name!==c.name||(old.parent||null)!==(c.parent||null))writes.push(window.PirulinNotes.saveCategory(c))});
    latestCategories.forEach((c,id)=>{if(!cur.has(id))writes.push(window.PirulinNotes.deleteCategory(id))});
    await Promise.all(writes);
  }catch(e){console.error('Pirulín sync note categories',e);say('No pude guardar las categorías')}
  finally{syncingCategories=false}
}

function ensureHeaderMenu(){let m=q('#pirulinNotesHeaderMenu');if(m)return m;m=document.createElement('div');m.id='pirulinNotesHeaderMenu';m.style.cssText='position:fixed;z-index:120;display:none;width:190px;padding:7px;background:#fff;border:1px solid #e8eaf0;border-radius:16px;box-shadow:0 16px 42px rgba(25,30,40,.18);font:800 13px Nunito,system-ui,sans-serif';m.innerHTML=menuButton('Categorías','categories')+menuButton('Exportar notas','export');document.body.appendChild(m);return m}
function exportNotes(){const payload={exportedAt:new Date().toISOString(),user:window.PirulinFirebase?.person||null,categories:[...latestCategories.values()],notes:[...latestNotes.values()]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pirulin-notas-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function actHeader(action){const m=q('#pirulinNotesHeaderMenu');if(m)m.style.display='none';if(action==='categories')safeEval('openCategoryEditor()');if(action==='export')exportNotes()}

function installHooks(){
  if(document.documentElement.dataset.pirulinNotesHooksV2==='1')return;
  document.documentElement.dataset.pirulinNotesHooksV2='1';ensureNoteMenu();ensureHeaderMenu();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#saveNoteBtn')){e.preventDefault();e.stopImmediatePropagation();saveEditingNote();return}
    const hm=e.target.closest?.('#pirulinNotesHeaderMenu [data-note-action]');if(hm){e.preventDefault();e.stopImmediatePropagation();actHeader(hm.dataset.noteAction);return}
    const more=e.target.closest?.('.note-more');if(more){e.preventDefault();e.stopPropagation();openNoteMenu(more.closest('.note-card'),more);return}
    const action=e.target.closest?.('#pirulinNoteMenu [data-note-action]');if(action){e.preventDefault();e.stopPropagation();actOnNote(action.dataset.noteAction,q('#pirulinNoteMenu')?.dataset.noteId);return}
    const header=e.target.closest?.('#notesMore');if(header){e.preventDefault();e.stopImmediatePropagation();const m=ensureHeaderMenu(),r=header.getBoundingClientRect();m.style.left=`${Math.max(8,r.right-190)}px`;m.style.top=`${r.bottom+6}px`;m.style.display=m.style.display==='block'?'none':'block';return}
    if(!e.target.closest?.('#pirulinNoteMenu'))closeNoteMenu();
    if(!e.target.closest?.('#pirulinNotesHeaderMenu')&&!e.target.closest?.('#notesMore')){const m=q('#pirulinNotesHeaderMenu');if(m)m.style.display='none'}
    if(e.target.closest?.('#categoryEditorModal,#createCategoryFromNote,#openCategoryEditor'))setTimeout(syncCategoriesFromMock,100);
    if(e.target.closest?.('#addNoteBtn,.note-card'))setTimeout(()=>{relabelSharedUI();emitEditorOpened()},20);
  },true);
}

function start(){
  if(!window.PirulinNotes||!window.PirulinFirebase?.user||!q('#notesGrid'))return false;
  stopNotes?.();stopCategories?.();
  stopNotes=window.PirulinNotes.subscribeNotes({onChange:notes=>{latestNotes=new Map(notes.map(n=>[String(n.id),n]));setMockNotes(notes)},onError:e=>{console.error('Pirulín notes sync',e);say('Error sincronizando notas')}});
  stopCategories=window.PirulinNotes.subscribeCategories({onChange:cats=>{latestCategories=new Map(cats.map(c=>[String(c.id),c]));setMockCategories(cats)},onError:e=>{console.error('Pirulín note categories sync',e);say('Error sincronizando categorías de notas')}});
  installHooks();relabelSharedUI();return true;
}
function boot(){if(start())return;setTimeout(boot,120)}
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(boot,0);else{stopNotes?.();stopCategories?.();stopNotes=stopCategories=null;latestNotes.clear();latestCategories.clear()}});
if(window.PirulinFirebase?.user)setTimeout(boot,0);else setTimeout(boot,120);
window.PirulinNotesLive={start,get notes(){return [...latestNotes.values()]},get categories(){return [...latestCategories.values()]}};
