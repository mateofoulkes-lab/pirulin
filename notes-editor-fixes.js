const $f=(s,r=document)=>r.querySelector(s);

function syncBack(){
  try{window.PirulinNotesUI?.syncToTextarea?.()}catch{}
  try{window.PirulinNotesUI?.updateToolbarState?.()}catch{}
}
function selectionNode(){
  const editor=$f('#noteRichEditor'),sel=window.getSelection();
  if(!editor||!sel||!sel.rangeCount)return null;
  let node=sel.anchorNode;
  if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
  return node&&editor.contains(node)?node:null;
}
function closestEditableBlock(node){
  if(!node)return null;
  return node.closest('.note-todo,li,div,p')||node;
}
function placeCaret(node,start=false){
  const sel=window.getSelection();
  if(!sel)return;
  const range=document.createRange();
  range.selectNodeContents(node);
  range.collapse(!!start);
  sel.removeAllRanges();sel.addRange(range);
  node.focus?.();
}
function makeTodoFromBlock(block){
  const todo=document.createElement('div');todo.className='note-todo';
  const check=document.createElement('input');check.type='checkbox';
  const span=document.createElement('span');span.contentEditable='true';span.innerHTML=block.innerHTML||'<br>';
  todo.append(check,span);block.replaceWith(todo);placeCaret(span,false);
}
function removeTodo(todo){
  const div=document.createElement('div'),span=todo.querySelector(':scope > span');
  div.innerHTML=span?.innerHTML||'<br>';todo.replaceWith(div);placeCaret(div,false);
}
function toggleTodoList(){
  const node=selectionNode();if(!node)return;
  const existing=node.closest('.note-todo');
  if(existing){removeTodo(existing);syncBack();return}
  const block=closestEditableBlock(node);
  if(block&&block.id!=='noteRichEditor')makeTodoFromBlock(block);
  syncBack();
}
function handleTodoEnter(e){
  if(e.key!=='Enter'||e.shiftKey)return;
  const span=e.target.closest?.('.note-todo > span');if(!span)return;
  const todo=span.parentElement;e.preventDefault();
  if(!span.textContent.trim()){
    const div=document.createElement('div');div.innerHTML='<br>';todo.replaceWith(div);placeCaret(div,true);syncBack();return;
  }
  const next=document.createElement('div');next.className='note-todo';next.innerHTML='<input type="checkbox"><span contenteditable="true"><br></span>';
  todo.insertAdjacentElement('afterend',next);placeCaret(next.querySelector('span'),true);syncBack();
}

function install(){
  if(document.documentElement.dataset.notesEditorFixesV5==='1')return;
  document.documentElement.dataset.notesEditorFixesV5='1';

  const style=document.createElement('style');
  style.textContent=`
    #noteRichEditor strong,#noteRichEditor b,
    .note-rich-preview strong,.note-rich-preview b,
    #notesGrid .note-preview strong,#notesGrid .note-preview b{
      font-weight:900!important;
      font-synthesis:weight style!important;
    }
    #noteRichEditor em,#noteRichEditor i,
    .note-rich-preview em,.note-rich-preview i,
    #notesGrid .note-preview em,#notesGrid .note-preview i{
      font-style:italic!important;
      font-synthesis:weight style!important;
    }
    #noteRichEditor strong em,#noteRichEditor em strong,
    #noteRichEditor b i,#noteRichEditor i b,
    #noteRichEditor strong i,#noteRichEditor i strong,
    #noteRichEditor b em,#noteRichEditor em b,
    .note-rich-preview strong em,.note-rich-preview em strong,
    .note-rich-preview b i,.note-rich-preview i b,
    .note-rich-preview strong i,.note-rich-preview i strong,
    .note-rich-preview b em,.note-rich-preview em b,
    #notesGrid .note-preview strong em,#notesGrid .note-preview em strong,
    #notesGrid .note-preview b i,#notesGrid .note-preview i b{
      font-weight:900!important;
      font-style:oblique 14deg!important;
      font-synthesis:weight style!important;
    }
  `;
  document.head.appendChild(style);

  const toolbar=$f('#noteModal .note-editor-toolbar');
  const todo=toolbar?.querySelector('[data-note-format="todo"]');
  const link=toolbar?.querySelector('[data-note-format="link"]');
  if(link){link.textContent='🔗';link.title='Agregar enlace'}
  if(todo)todo.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();toggleTodoList()};

  const editor=$f('#noteRichEditor');
  editor?.addEventListener('keydown',handleTodoEnter,true);
  editor?.addEventListener('change',e=>{
    if(e.target.matches('.note-todo input[type="checkbox"]'))syncBack();
  },true);
}
function boot(){if(!$f('#noteRichEditor'))return setTimeout(boot,80);install()}
boot();
