let stopNotes=null,stopCategories=null;
let latestNotes=new Map(),latestCategories=new Map(),syncingCategories=false,examplesSeedAttempted=false;
let lastViewData=[];
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
function safeEval(code,fallback=null){try{return window.eval(code)}catch(e){console.warn('Pirulín notes eval',e);return fallback}}
function say(msg){try{window.eval(`if(typeof say==='function')say(${JSON.stringify(msg)})`)}catch{console.log(msg)}}
function json(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function other(){return window.PirulinFirebase?.person==='Mateo'?'Dani':'Mateo'}
function emitRendered(){window.dispatchEvent(new CustomEvent('pirulin-notes-rendered'))}
function emitOpened(){window.dispatchEvent(new CustomEvent('pirulin-note-editor-opened'))}

const SHARED_ICON=`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.25" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="12" r="2.25" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="19" r="2.25" stroke="currentColor" stroke-width="1.8"/><path d="M8 11l7.8-4.7M8 13l7.8 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
function patchCardShare(id,shared){
  const card=q(`#notesGrid .note-card[data-note-id="${CSS.escape(String(id))}"]`);
  if(!card)return;
  const tags=q('.note-tags',card);if(tags)tags.style.display='none';
  const chip=q('.note-chip',card);if(!chip)return;
  if(shared){
    chip.style.display='inline-grid';
    chip.classList.add('shared');
    chip.innerHTML=SHARED_ICON;
    chip.title='Compartida';
    chip.setAttribute('aria-label','Nota compartida');
  }else{
    chip.style.display='none';
    chip.classList.remove('shared');
    chip.textContent='';
    chip.removeAttribute('title');
    chip.removeAttribute('aria-label');
  }
}
function relabel(){
  qa('#notesGrid .note-card').forEach(card=>{
    const note=latestNotes.get(String(card.dataset.noteId));
    patchCardShare(card.dataset.noteId,!!note?.shared);
  });
  const label=q('#noteShareInput')?.closest('.note-pref')?.querySelector('span');
  if(label)label.textContent=`Compartir con ${other()}`;
}
function sameCardContent(a,b){
  if(a.length!==b.length)return false;
  return a.every((x,i)=>{
    const y=b[i];
    return !!y&&x.id===y.id&&x.title===y.title&&x.body===y.body&&x.drawing===y.drawing&&
      x.pinned===y.pinned&&x.createdByUid===y.createdByUid&&
      JSON.stringify(x.tags||[])===JSON.stringify(y.tags||[]);
  });
}
function setMockNotes(notes){
  const data=notes.map(n=>({id:n.id,title:n.title||'Sin título',body:n.body||'',tags:Array.isArray(n.tags)?n.tags:[],shared:!!n.shared,pinned:!!n.pinned,drawing:n.drawing||'',createdBy:n.createdBy||null,createdByUid:n.createdByUid||null}));
  const canPatchInPlace=lastViewData.length>0&&sameCardContent(lastViewData,data);
  safeEval(`notesData=${json(data)};${canPatchInPlace?'':'if(typeof renderNotes===\'function\')renderNotes();'}`);
  lastViewData=data.map(n=>({...n,tags:[...n.tags]}));
  relabel();
  emitRendered();
}
function setMockCategories(cats){const data=cats.map(c=>({id:String(c.id),name:String(c.name),parent:c.parent||null}));safeEval(`(()=>{const data=${json(data)};noteCategories.splice(0,noteCategories.length,...data);if(typeof selectedNoteFilters!=='undefined'){const valid=new Set(data.map(c=>c.id));[...selectedNoteFilters].forEach(id=>{if(!valid.has(id))selectedNoteFilters.delete(id)})}if(typeof renderNoteFilters==='function')renderNoteFilters();if(typeof renderNotes==='function')renderNotes();})()`);relabel();emitRendered()}
function setLexicalShare(id,shared){safeEval(`(()=>{const n=notesData.find(x=>String(x.id)===${JSON.stringify(String(id))});if(n)n.shared=${shared?'true':'false'};})()`)}
function openEditor(id=null){const ok=id?!!safeEval(`typeof openNoteEditor==='function'?(openNoteEditor(${JSON.stringify(String(id))}),true):false`,false):!!safeEval(`typeof openNoteEditor==='function'?(openNoteEditor(),true):false`,false);const modal=q('#noteModal');if(!ok||!modal){say('No pude abrir la nota');return false}modal.classList.remove('note-closing');modal.style.opacity='1';modal.classList.add('show');emitOpened();setTimeout(relabel,0);return true}
function readPayload(){window.PirulinNotesUI?.syncToTextarea?.();const title=q('#noteTitleInput')?.value?.trim()||'',body=q('#noteBodyInput')?.value?.trim()||'',drawing=safeEval('editingDrawing','')||'';if(!title&&!body&&!drawing)return null;const id=safeEval('editingNoteId',null),tags=safeEval('[...editingNoteTags]',[])||[],old=id?latestNotes.get(String(id)):null;return{id:String(id||`n${Date.now()}-${Math.random().toString(36).slice(2,6)}`),title:title||'Sin título',body,drawing,tags,shared:!!q('#noteShareInput')?.checked,pinned:!!q('#notePinInput')?.checked,createdBy:old?.createdBy||window.PirulinFirebase?.person||null,createdByUid:old?.createdByUid||window.PirulinFirebase?.user?.uid||null,previousShared:old?.shared??false}}
async function saveEditor(){const payload=readPayload();if(!payload){say('Escribí algo');return}try{const {previousShared,...note}=payload;await window.PirulinNotes.saveNote(note,{previousShared});window.PirulinNotesUI?.closeEditor?.();safeEval('editingNoteId=null;editingNoteTags=new Set();editingDrawing=""');say(note.shared?`Nota guardada y compartida con ${other()}`:'Nota guardada')}catch(e){console.error(e);say(e?.message||'No pude guardar la nota')}}
function menuButton(label,action,danger=false){return `<button data-note-action="${action}" style="width:100%;border:0;background:transparent;text-align:left;padding:10px 11px;border-radius:10px;font:800 13px Nunito,system-ui;color:${danger?'#d95762':'#343842'}">${label}</button>`}
function noteMenu(){let m=q('#pirulinNoteMenu');if(m)return m;m=document.createElement('div');m.id='pirulinNoteMenu';m.style.cssText='position:fixed;z-index:120;display:none;width:190px;padding:7px;background:#fff;border:1px solid #e8eaf0;border-radius:16px;box-shadow:0 16px 42px rgba(25,30,40,.18)';document.body.appendChild(m);return m}
function openMenu(card,button){const id=String(card?.dataset?.noteId||''),note=latestNotes.get(id);if(!note)return;const m=noteMenu();m.dataset.noteId=id;m.innerHTML=menuButton('Editar','edit')+menuButton(note.pinned?'Desfijar':'Fijar arriba','pin')+menuButton(note.shared?'Descompartir':`Compartir con ${other()}`,'share')+menuButton('Eliminar','delete',true);const r=button.getBoundingClientRect();m.style.left=`${Math.max(8,Math.min(innerWidth-198,r.right-190))}px`;m.style.top=`${Math.min(innerHeight-210,r.bottom+5)}px`;m.style.display='block'}
async function act(action,id){
  const key=String(id),note=latestNotes.get(key);if(!note)return;
  q('#pirulinNoteMenu').style.display='none';
  if(action==='edit'){openEditor(id);return}
  if(action==='delete'){if(!confirm(`¿Eliminar “${note.title}”?`))return;await window.PirulinNotes.deleteNote(note);return}
  if(action==='pin'){await window.PirulinNotes.saveNote({...note,pinned:!note.pinned,updatedAtClient:Date.now()},{previousShared:note.shared});return}
  if(action==='share'){
    const own=note.createdByUid===window.PirulinFirebase?.user?.uid;
    if(note.shared&&!own){say('Solo quien creó la nota puede descompartirla');return}
    const next={...note,shared:!note.shared};
    latestNotes.set(key,next);
    setLexicalShare(key,next.shared);
    patchCardShare(key,next.shared);
    try{
      await window.PirulinNotes.saveNote(next,{previousShared:note.shared});
      say(next.shared?`Compartida con ${other()}`:'Nota descompartida');
    }catch(e){
      latestNotes.set(key,note);setLexicalShare(key,note.shared);patchCardShare(key,note.shared);
      console.error(e);say(e?.message||'No pude cambiar el estado compartido');
    }
  }
}
function headerMenu(){let m=q('#pirulinNotesHeaderMenu');if(m)return m;m=document.createElement('div');m.id='pirulinNotesHeaderMenu';m.style.cssText='position:fixed;z-index:120;display:none;width:190px;padding:7px;background:#fff;border:1px solid #e8eaf0;border-radius:16px;box-shadow:0 16px 42px rgba(25,30,40,.18)';m.innerHTML=menuButton('Categorías','categories')+menuButton('Exportar notas','export');document.body.appendChild(m);return m}
function exportNotes(){const payload={exportedAt:new Date().toISOString(),user:window.PirulinFirebase?.person||null,categories:[...latestCategories.values()],notes:[...latestNotes.values()]},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pirulin-notas-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function mockCats(){return safeEval('noteCategories.map(c=>({id:c.id,name:c.name,parent:c.parent||null}))',[])||[]}
async function syncCats(){if(syncingCategories)return;syncingCategories=true;try{const cur=new Map(mockCats().map(c=>[String(c.id),c])),ops=[];cur.forEach((c,id)=>{const old=latestCategories.get(id);if(!old||old.name!==c.name||(old.parent||null)!==(c.parent||null))ops.push(window.PirulinNotes.saveCategory(c))});latestCategories.forEach((_,id)=>{if(!cur.has(id))ops.push(window.PirulinNotes.deleteCategory(id))});await Promise.all(ops)}finally{syncingCategories=false}}
function hooks(){if(document.documentElement.dataset.notesLiveV3)return;document.documentElement.dataset.notesLiveV3='1';noteMenu();headerMenu();document.addEventListener('click',e=>{const add=e.target.closest?.('#addNoteBtn');if(add){e.preventDefault();e.stopImmediatePropagation();openEditor();return}const more=e.target.closest?.('.note-more');if(more){e.preventDefault();e.stopImmediatePropagation();openMenu(more.closest('.note-card'),more);return}const card=e.target.closest?.('#notesGrid .note-card');if(card&&!e.target.closest?.('button,a,input')){e.preventDefault();e.stopImmediatePropagation();openEditor(card.dataset.noteId);return}if(e.target.closest?.('#saveNoteBtn')){e.preventDefault();e.stopImmediatePropagation();saveEditor();return}const action=e.target.closest?.('#pirulinNoteMenu [data-note-action]');if(action){e.preventDefault();e.stopImmediatePropagation();act(action.dataset.noteAction,q('#pirulinNoteMenu').dataset.noteId).catch(console.error);return}const head=e.target.closest?.('#notesMore');if(head){e.preventDefault();e.stopImmediatePropagation();const m=headerMenu(),r=head.getBoundingClientRect();m.style.left=`${Math.max(8,r.right-190)}px`;m.style.top=`${r.bottom+6}px`;m.style.display=m.style.display==='block'?'none':'block';return}const ha=e.target.closest?.('#pirulinNotesHeaderMenu [data-note-action]');if(ha){e.preventDefault();e.stopImmediatePropagation();q('#pirulinNotesHeaderMenu').style.display='none';if(ha.dataset.noteAction==='categories')safeEval('openCategoryEditor()');else exportNotes();return}if(e.target.closest?.('#categoryEditorModal,#createCategoryFromNote,#openCategoryEditor'))setTimeout(syncCats,100)},true)}
async function seedExamples(){if(examplesSeedAttempted||!window.PirulinNotes?.seedExampleNotesOnce)return;examplesSeedAttempted=true;try{await window.PirulinNotes.seedExampleNotesOnce()}catch(e){console.warn('Pirulín examples',e)}}
function start(){if(!window.PirulinNotes||!window.PirulinFirebase?.user||!q('#notesGrid'))return false;stopNotes?.();stopCategories?.();stopNotes=window.PirulinNotes.subscribeNotes({onChange:notes=>{latestNotes=new Map(notes.map(n=>[String(n.id),n]));setMockNotes(notes)},onError:e=>console.error(e)});stopCategories=window.PirulinNotes.subscribeCategories({onChange:cats=>{latestCategories=new Map(cats.map(c=>[String(c.id),c]));setMockCategories(cats)},onError:e=>console.error(e)});hooks();seedExamples();return true}
function boot(){if(start())return;setTimeout(boot,100)}
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(boot,0);else{stopNotes?.();stopCategories?.();stopNotes=stopCategories=null;latestNotes.clear();latestCategories.clear();lastViewData=[];examplesSeedAttempted=false}});if(window.PirulinFirebase?.user)boot();else setTimeout(boot,100);window.PirulinNotesLive={start,get notes(){return [...latestNotes.values()]},get categories(){return [...latestCategories.values()]}};
