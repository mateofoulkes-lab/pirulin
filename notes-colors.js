const NOTE_COLOR_PALETTES={
  yellow:{label:'Amarillo',bg:'#fff8c9',head:'#f4e9a7'},
  rose:{label:'Rosa',bg:'#f9e5ea',head:'#efd1da'},
  green:{label:'Verde',bg:'#e8f5df',head:'#d5e9c9'},
  blue:{label:'Celeste',bg:'#e6f0fb',head:'#d3e3f4'},
  lilac:{label:'Lila',bg:'#eee7fa',head:'#ddd2f1'},
  peach:{label:'Durazno',bg:'#fdebd8',head:'#f4dac0'}
};
const NOTE_COLOR_KEYS=Object.keys(NOTE_COLOR_PALETTES);
const migratedColors=new Set();
let currentNewColor=null;

function noteHash(v=''){
  let h=2166136261;
  for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function fallbackColor(note){
  if(note?.id==='example-rich-note')return 'blue';
  if(note?.id==='example-todo-note')return 'green';
  return NOTE_COLOR_KEYS[noteHash(String(note?.id||''))%NOTE_COLOR_KEYS.length];
}
function validColor(value){return NOTE_COLOR_KEYS.includes(String(value||''))?String(value):null}
function notes(){return window.PirulinNotesLive?.notes||[]}
function noteById(id){return notes().find(n=>String(n.id)===String(id))||null}
function editingId(){try{return window.eval("typeof editingNoteId!=='undefined'?editingNoteId:null")}catch{return null}}
function randomColor(){return NOTE_COLOR_KEYS[Math.floor(Math.random()*NOTE_COLOR_KEYS.length)]}

function ensureSelector(){
  const modal=document.querySelector('#noteModal');
  if(!modal)return null;
  let select=document.querySelector('#noteColorInput');
  if(select)return select;
  const anchor=document.querySelector('#notePinInput')?.closest('.note-pref')||document.querySelector('#noteShareInput')?.closest('.note-pref');
  if(!anchor)return null;
  const row=document.createElement('label');
  row.className='note-pref note-color-pref';
  row.innerHTML=`<span>Color</span><select id="noteColorInput" aria-label="Color de la nota">${NOTE_COLOR_KEYS.map(k=>`<option value="${k}">${NOTE_COLOR_PALETTES[k].label}</option>`).join('')}</select>`;
  anchor.insertAdjacentElement('afterend',row);
  select=row.querySelector('select');
  select.addEventListener('change',()=>{currentNewColor=select.value;paintSelector(select.value)});
  return select;
}
function paintSelector(key){
  const select=document.querySelector('#noteColorInput');
  const p=NOTE_COLOR_PALETTES[validColor(key)||'yellow'];
  if(select){select.style.background=p.bg;select.style.borderColor=p.head;}
}
function prepareEditorColor(){
  const select=ensureSelector();if(!select)return;
  const id=editingId(),note=id?noteById(id):null;
  const key=validColor(note?.color)||(note?fallbackColor(note):(currentNewColor=randomColor()));
  select.value=key;paintSelector(key);
}
function paintCards(){
  const map=new Map(notes().map(n=>[String(n.id),n]));
  document.querySelectorAll('#notesGrid .note-card').forEach(card=>{
    const note=map.get(String(card.dataset.noteId));
    if(!note)return;
    const key=validColor(note.color)||fallbackColor(note),p=NOTE_COLOR_PALETTES[key];
    card.style.setProperty('--note-bg',p.bg);
    card.style.setProperty('--note-head',p.head);
    card.dataset.noteColor=key;
  });
}
async function migrateMissingColors(){
  const api=window.PirulinNotes;if(!api?.setNoteColor)return;
  for(const note of notes()){
    if(validColor(note.color)||migratedColors.has(String(note.id)))continue;
    migratedColors.add(String(note.id));
    try{await api.setNoteColor(note,fallbackColor(note))}catch(e){console.warn('Pirulín note color migration',e);migratedColors.delete(String(note.id))}
  }
}
function patchSave(){
  const api=window.PirulinNotes;if(!api?.saveNote||api.saveNote.__colorPatched)return false;
  const original=api.saveNote.bind(api);
  const wrapped=async(note,options)=>{
    let color=validColor(note?.color);
    if(!color){
      const modalOpen=document.querySelector('#noteModal')?.classList.contains('show');
      color=modalOpen?validColor(document.querySelector('#noteColorInput')?.value):null;
      if(!color)color=fallbackColor(note);
    }
    return original({...note,color},options);
  };
  wrapped.__colorPatched=true;
  api.saveNote=wrapped;
  return true;
}
function installStyles(){
  if(document.querySelector('#noteColorStyles'))return;
  const style=document.createElement('style');style.id='noteColorStyles';style.textContent=`
    #noteModal .note-color-pref{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}
    #noteModal .note-color-pref select{min-width:132px;border:1px solid #e1e5ec;border-radius:12px;padding:8px 34px 8px 11px;color:#434a56;font:800 12px Nunito,system-ui,sans-serif;outline:none;transition:background-color .16s ease,border-color .16s ease}
  `;document.head.appendChild(style);
}
function install(){
  if(document.documentElement.dataset.notesColors==='1')return true;
  if(!document.querySelector('#noteModal')||!document.querySelector('#notesGrid')||!window.PirulinNotes)return false;
  document.documentElement.dataset.notesColors='1';installStyles();ensureSelector();patchSave();
  const grid=document.querySelector('#notesGrid');new MutationObserver(()=>paintCards()).observe(grid,{childList:true,subtree:true});
  window.addEventListener('pirulin-notes-rendered',()=>{paintCards();migrateMissingColors()});
  window.addEventListener('pirulin-note-editor-opened',()=>setTimeout(prepareEditorColor,0));
  paintCards();migrateMissingColors();return true;
}
function boot(){if(install())return;setTimeout(boot,80)}
boot();
