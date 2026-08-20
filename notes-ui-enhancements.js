const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const NOTE_PALETTES = [
  ['#fff8c9','#f8edaa'],
  ['#f9e5ea','#f1d2db'],
  ['#e8f5df','#d7ebcb'],
  ['#e6f0fb','#d4e4f5'],
  ['#eee7fa','#ded3f2'],
  ['#fdebd8','#f6dcc1']
];

function hashString(value=''){
  let h=2166136261;
  for(let i=0;i<value.length;i++){
    h^=value.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function injectStyles(){
  if($('#pirulinNotesUiEnhancements')) return;
  const style=document.createElement('style');
  style.id='pirulinNotesUiEnhancements';
  style.textContent=`
    #notesSuite, #notesSuite *{-webkit-tap-highlight-color:transparent}
    #notesSuite .notes-top-title{font-size:25px!important}
    #notesSuite .notes-filterbar,#notesSuite .notes-tab{font-size:13px!important}
    #notesSuite .notes-grid{gap:10px!important}
    #notesSuite .note-card{
      border-radius:0!important;
      min-height:158px!important;
      padding:0 14px 13px!important;
      gap:9px!important;
      background:var(--note-bg,#fff8c9)!important;
      border:1px solid rgba(66,60,45,.10)!important;
      box-shadow:0 5px 14px rgba(28,39,73,.055)!important;
      overflow:hidden;
      transition:transform .14s ease,box-shadow .14s ease!important;
      user-select:none;
    }
    #notesSuite .note-card:active{transform:scale(.985);background:var(--note-bg,#fff8c9)!important}
    #notesSuite .note-card .note-title{
      margin:0 -14px 2px!important;
      padding:12px 14px 11px!important;
      background:var(--note-head,#f8edaa)!important;
      font-size:18px!important;
      line-height:1.12!important;
      font-weight:900!important;
      color:#29303a!important;
      letter-spacing:-.18px!important;
    }
    #notesSuite .note-preview{font-size:14px!important;line-height:1.42!important;color:#505968!important;-webkit-line-clamp:4!important}
    #notesSuite .note-tag{font-size:10.5px!important}
    #notesSuite .note-chip{font-size:10.5px!important}
    #notesSuite .note-more{font-size:21px!important}

    #noteModal{opacity:0}
    #noteModal.show{opacity:1;animation:noteBackdropIn .18s ease-out both}
    #noteModal.show .notes-sheet{animation:noteSheetOpen .24s cubic-bezier(.2,.9,.2,1) both}
    #noteModal.closing{display:flex!important;animation:noteBackdropOut .18s ease-in both;pointer-events:none}
    #noteModal.closing .notes-sheet{animation:noteSheetClose .18s ease-in both}
    @keyframes noteBackdropIn{from{opacity:0}to{opacity:1}}
    @keyframes noteBackdropOut{from{opacity:1}to{opacity:0}}
    @keyframes noteSheetOpen{from{opacity:.35;transform:translateY(28px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes noteSheetClose{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:.25;transform:translateY(24px) scale(.988)}}

    #noteModal .notes-sheet{font-size:16px!important}
    #noteModal #noteModalTitle{font-size:26px!important}
    #noteModal #noteTitleInput{font-size:18px!important;font-weight:800!important}
    #noteModal .note-editor-toolbar{position:relative;z-index:3;margin:11px 0 0!important;padding-bottom:5px!important}
    #noteModal .note-editor-tool{min-width:40px!important;height:38px!important;font-size:14px!important}
    #noteBodyInput{display:none!important}
    #noteRichEditor{
      min-height:220px;
      max-height:330px;
      overflow:auto;
      border:1px solid #e1e5ec;
      background:#fffdf5;
      color:#30353e;
      font:600 17px/1.5 Nunito,system-ui,sans-serif;
      padding:54px 14px 16px;
      outline:none;
      white-space:normal;
      overflow-wrap:anywhere;
      -webkit-user-select:text;
      user-select:text;
    }
    #noteRichEditor:empty:before{content:'Escribí lo que quieras…';color:#9aa1ad;font-weight:600}
    #noteRichEditor h3{font-size:21px;line-height:1.2;margin:8px 0;font-weight:900}
    #noteRichEditor ul{margin:7px 0;padding-left:25px}
    #noteRichEditor a{color:#6950bd;text-decoration:underline}
    #noteRichEditor .note-todo{display:flex;align-items:flex-start;gap:9px;margin:7px 0;min-height:26px}
    #noteRichEditor .note-todo input{width:20px;height:20px;margin:2px 0 0;accent-color:#8660de;flex:none}
    #noteRichEditor .note-todo span{display:block;min-width:40px;flex:1;outline:none}
    #noteRichEditor .note-todo input:checked + span{text-decoration:line-through;color:#8b929c}
    .note-rich-preview .note-todo{display:flex;gap:6px;align-items:flex-start;margin:2px 0}
    .note-rich-preview .note-todo input{width:14px;height:14px;margin:2px 0 0;pointer-events:none;accent-color:#7d62c8;flex:none}
    .note-rich-preview .note-todo input:checked + span{text-decoration:line-through;opacity:.65}
  `;
  document.head.appendChild(style);
}

function escapeHtml(text=''){
  return String(text).replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[ch]));
}

function markdownToHtml(text=''){
  if(!text) return '';
  if(/<\/?(?:strong|em|h3|ul|li|a|div|span|input|br)\b/i.test(text)) return sanitizeRichHtml(text);
  const inline=(s)=>escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank">$1</a>');
  const lines=String(text).split(/\r?\n/);
  let html='',inList=false;
  const closeList=()=>{if(inList){html+='</ul>';inList=false}};
  for(const line of lines){
    const todo=line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
    if(todo){closeList();html+=`<div class="note-todo"><input type="checkbox" ${todo[1].toLowerCase()==='x'?'checked':''}><span contenteditable="true">${inline(todo[2])}</span></div>`;continue}
    const bullet=line.match(/^\s*-\s+(.+)$/);
    if(bullet){if(!inList){html+='<ul>';inList=true}html+=`<li>${inline(bullet[1])}</li>`;continue}
    closeList();
    const h=line.match(/^###\s+(.+)$/);
    if(h){html+=`<h3>${inline(h[1])}</h3>`;continue}
    html+=line?`<div>${inline(line)}</div>`:'<div><br></div>';
  }
  closeList();
  return html;
}

function sanitizeRichHtml(html=''){
  const tpl=document.createElement('template');
  tpl.innerHTML=String(html);
  const allowed=new Set(['DIV','SPAN','STRONG','B','EM','I','H3','UL','OL','LI','A','BR','INPUT']);
  const walk=(node)=>{
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.ELEMENT_NODE){
        if(!allowed.has(child.tagName)){
          child.replaceWith(...child.childNodes);
          return;
        }
        [...child.attributes].forEach(attr=>{
          const keep=(child.tagName==='A'&&['href','target','rel'].includes(attr.name)) ||
            (child.tagName==='INPUT'&&['type','checked'].includes(attr.name)) ||
            (['DIV','SPAN'].includes(child.tagName)&&['class','contenteditable'].includes(attr.name));
          if(!keep) child.removeAttribute(attr.name);
        });
        if(child.tagName==='A'){
          const href=child.getAttribute('href')||'';
          if(!/^https?:\/\//i.test(href)) child.removeAttribute('href');
          child.setAttribute('target','_blank');child.setAttribute('rel','noopener');
        }
        if(child.tagName==='INPUT'){
          child.setAttribute('type','checkbox');
          if(!child.closest('.note-todo')) child.remove();
        }
        walk(child);
      }
    });
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

function ensureRichEditor(){
  const ta=$('#noteBodyInput');
  if(!ta) return null;
  let editor=$('#noteRichEditor');
  if(editor) return editor;
  editor=document.createElement('div');
  editor.id='noteRichEditor';
  editor.contentEditable='true';
  editor.setAttribute('role','textbox');
  editor.setAttribute('aria-multiline','true');
  editor.setAttribute('spellcheck','true');
  ta.insertAdjacentElement('afterend',editor);
  const sync=()=>{ta.value=sanitizeRichHtml(editor.innerHTML).trim()};
  editor.addEventListener('input',sync);
  editor.addEventListener('change',sync);
  editor.addEventListener('click',e=>{if(e.target.matches('input[type="checkbox"]')) setTimeout(sync,0)});
  return editor;
}

function syncEditorFromTextarea(){
  const ta=$('#noteBodyInput'),editor=ensureRichEditor();
  if(!ta||!editor) return;
  editor.innerHTML=markdownToHtml(ta.value||'');
}

function syncTextareaFromEditor(){
  const ta=$('#noteBodyInput'),editor=$('#noteRichEditor');
  if(ta&&editor) ta.value=sanitizeRichHtml(editor.innerHTML).trim();
}

let savedRange=null;
function rememberSelection(){
  const editor=$('#noteRichEditor');
  const sel=window.getSelection();
  if(!editor||!sel||!sel.rangeCount) return;
  const range=sel.getRangeAt(0);
  if(editor.contains(range.commonAncestorContainer)) savedRange=range.cloneRange();
}
function restoreSelection(){
  const editor=$('#noteRichEditor'),sel=window.getSelection();
  if(!editor||!sel) return;
  editor.focus();
  if(savedRange){sel.removeAllRanges();sel.addRange(savedRange)}
}
function command(cmd,value=null){
  restoreSelection();
  document.execCommand(cmd,false,value);
  rememberSelection();syncTextareaFromEditor();
}
function insertTodo(){
  restoreSelection();
  document.execCommand('insertHTML',false,'<div class="note-todo"><input type="checkbox"><span contenteditable="true">Tarea</span></div><div><br></div>');
  syncTextareaFromEditor();
}

function setupToolbar(){
  const toolbar=$('#noteModal .note-editor-toolbar');
  if(!toolbar||toolbar.dataset.wysiwyg==='1') return;
  toolbar.dataset.wysiwyg='1';
  const bold=$('.note-editor-tool[data-wrap="**"]',toolbar);
  const italic=$('.note-editor-tool[data-wrap="*"]',toolbar);
  const heading=$('.note-editor-tool[data-prefix="### "]',toolbar);
  const list=$('.note-editor-tool[data-prefix="- "]',toolbar);
  if(bold) bold.onclick=e=>{e.preventDefault();command('bold')};
  if(italic) italic.onclick=e=>{e.preventDefault();command('italic')};
  if(heading) heading.onclick=e=>{e.preventDefault();command('formatBlock','h3')};
  if(list) list.onclick=e=>{e.preventDefault();command('insertUnorderedList')};
  const todo=document.createElement('button');
  todo.className='note-editor-tool';todo.type='button';todo.title='Lista para hacer';todo.textContent='☑ To do';
  const link=$('[data-link-tool]',toolbar);
  toolbar.insertBefore(todo,link||null);
  todo.onclick=e=>{e.preventDefault();insertTodo()};
  const editor=ensureRichEditor();
  editor?.addEventListener('keyup',rememberSelection);
  editor?.addEventListener('mouseup',rememberSelection);
  editor?.addEventListener('touchend',()=>setTimeout(rememberSelection,0));
  if(link){
    link.onclick=e=>{
      e.preventDefault();rememberSelection();
      const selected=window.getSelection()?.toString()||'';
      const label=$('#noteLinkLabel'),url=$('#noteLinkUrl'),panel=$('#noteLinkEditor');
      if(label) label.value=selected;if(url) url.value='';panel?.classList.add('show');
    };
  }
  const apply=$('#applyNoteLink');
  if(apply) apply.onclick=e=>{
    e.preventDefault();
    const raw=$('#noteLinkUrl')?.value.trim()||'';
    if(!raw){try{window.eval("say('Pegá una dirección')")}catch{}return}
    const url=/^[a-z]+:\/\//i.test(raw)?raw:'https://'+raw;
    const label=$('#noteLinkLabel')?.value.trim()||url;
    restoreSelection();
    const sel=window.getSelection();
    if(sel&&sel.rangeCount&&sel.toString()) document.execCommand('createLink',false,url);
    else document.execCommand('insertHTML',false,`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
    $('#noteLinkEditor')?.classList.remove('show');syncTextareaFromEditor();
  };
}

function paintCards(){
  $$('#notesGrid .note-card').forEach(card=>{
    const id=card.dataset.noteId||'';
    const pair=NOTE_PALETTES[hashString(id)%NOTE_PALETTES.length];
    card.style.setProperty('--note-bg',pair[0]);
    card.style.setProperty('--note-head',pair[1]);
    const note=window.PirulinNotesLive?.notes?.find?.(n=>String(n.id)===String(id));
    const preview=$('.note-preview',card);
    if(note&&preview) preview.innerHTML=markdownToHtml(note.body||'');
  });
}

function setupModalAnimation(){
  const modal=$('#noteModal');
  if(!modal||modal.dataset.animHook==='1') return;
  modal.dataset.animHook='1';
  let wasOpen=modal.classList.contains('show');
  new MutationObserver(()=>{
    const isOpen=modal.classList.contains('show');
    if(!isOpen&&wasOpen&&!modal.classList.contains('closing')){
      modal.classList.add('closing');
      setTimeout(()=>modal.classList.remove('closing'),190);
    }
    if(isOpen){modal.classList.remove('closing');setTimeout(syncEditorFromTextarea,0)}
    wasOpen=isOpen;
  }).observe(modal,{attributes:true,attributeFilter:['class']});
}

function install(){
  injectStyles();
  ensureRichEditor();
  setupToolbar();
  setupModalAnimation();
  const grid=$('#notesGrid');
  if(grid&&!grid.dataset.uiObserver){
    grid.dataset.uiObserver='1';
    new MutationObserver(paintCards).observe(grid,{childList:true,subtree:true});
  }
  paintCards();
  document.addEventListener('click',e=>{
    if(e.target.closest('#saveNoteBtn')) syncTextareaFromEditor();
    if(e.target.closest('#addNoteBtn,.note-card')) setTimeout(syncEditorFromTextarea,0);
  },true);
}

function boot(){
  if(!$('#noteModal')||!$('#notesGrid')){setTimeout(boot,120);return}
  install();
}
boot();
