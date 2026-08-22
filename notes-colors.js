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
  let input=document.querySelector('#noteColorInput');
  if(input)return input;
  const anchor=document.querySelector('#notePinInput')?.closest('.note-pref')||document.querySelector('#noteShareInput')?.closest('.note-pref');
  if(!anchor)return null;
  const row=document.createElement('div');
  row.className='note-pref note-color-pref';
  row.innerHTML=`<span>Color</span><div class="note-color-swatches" role="radiogroup" aria-label="Color de la nota">${NOTE_COLOR_KEYS.map(k=>`<button type="button" class="note-color-swatch" data-note-color="${k}" aria-label="${NOTE_COLOR_PALETTES[k].label}" role="radio" aria-checked="false" style="--swatch-bg:${NOTE_COLOR_PALETTES[k].bg};--swatch-head:${NOTE_COLOR_PALETTES[k].head}"></button>`).join('')}</div><input id="noteColorInput" type="hidden">`;
  anchor.insertAdjacentElement('afterend',row);
  input=row.querySelector('#noteColorInput');
  row.querySelectorAll('.note-color-swatch').forEach(btn=>btn.addEventListener('click',()=>{
    input.value=btn.dataset.noteColor;
    currentNewColor=input.value;
    paintSelector(input.value);
  }));
  return input;
}
function paintSelector(key){
  const active=validColor(key)||'yellow';
  document.querySelectorAll('#noteModal .note-color-swatch').forEach(btn=>{
    const on=btn.dataset.noteColor===active;
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-checked',on?'true':'false');
  });
}
function prepareEditorColor(){
  const input=ensureSelector();if(!input)return;
  const id=editingId(),note=id?noteById(id):null;
  const key=validColor(note?.color)||(note?fallbackColor(note):(currentNewColor=randomColor()));
  input.value=key;paintSelector(key);
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
    #noteModal .note-color-pref{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;min-width:0!important}
    #noteModal .note-color-swatches{display:flex;align-items:center;justify-content:flex-end;gap:7px;min-width:0;flex-wrap:nowrap}
    #noteModal .note-color-swatch{width:27px;height:27px;flex:0 0 27px;border-radius:50%;border:2px solid rgba(72,78,90,.10);background:linear-gradient(180deg,var(--swatch-head) 0 42%,var(--swatch-bg) 42% 100%);padding:0;box-shadow:0 1px 3px rgba(30,38,54,.06);position:relative;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
    #noteModal .note-color-swatch.active{transform:scale(1.08);border-color:#626b7b;box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(98,107,123,.20)}
    #noteModal .note-color-swatch:active{transform:scale(.94)}
    @media(max-width:370px){#noteModal .note-color-swatches{gap:5px}#noteModal .note-color-swatch{width:24px;height:24px;flex-basis:24px}}
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
