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
function makeTodoFromBlock(block){
  const todo=document.createElement('div');
  todo.className='note-todo';
  const check=document.createElement('input');
  check.type='checkbox';
  const span=document.createElement('span');
  span.contentEditable='true';
  span.innerHTML=block.innerHTML||'<br>';
  todo.append(check,span);
  block.replaceWith(todo);
  placeCaret(span,false);
}
function removeTodo(todo){
  const div=document.createElement('div');
  const span=todo.querySelector(':scope > span');
  div.innerHTML=span?.innerHTML||'<br>';
  todo.replaceWith(div);
  placeCaret(div,false);
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
function toggleTodoList(){
  const node=selectionNode();
  if(!node)return;
  const existing=node.closest('.note-todo');
  if(existing){removeTodo(existing);syncBack();return}
  const block=closestEditableBlock(node);
  if(block&&block.id!=='noteRichEditor')makeTodoFromBlock(block);
  syncBack();
}
function handleTodoEnter(e){
  if(e.key!=='Enter'||e.shiftKey)return;
  const span=e.target.closest?.('.note-todo > span');
  if(!span)return;
  const todo=span.parentElement;
  e.preventDefault();
  const empty=!span.textContent.trim()&&!span.querySelector('br ~ *');
  if(empty){
    const div=document.createElement('div');div.innerHTML='<br>';
    todo.replaceWith(div);placeCaret(div,true);syncBack();return;
  }
  const next=document.createElement('div');next.className='note-todo';
  next.innerHTML='<input type="checkbox"><span contenteditable="true"><br></span>';
  todo.insertAdjacentElement('afterend',next);
  placeCaret(next.querySelector('span'),true);syncBack();
}
function install(){
  if(document.documentElement.dataset.notesEditorFixes==='1')return;
  document.documentElement.dataset.notesEditorFixes='1';
  const style=document.createElement('style');
  style.textContent=`
    #noteRichEditor strong,#noteRichEditor b,.note-rich-preview strong,.note-rich-preview b{font-weight:900!important}
  `;
  document.head.appendChild(style);
  const toolbar=$f('#noteModal .note-editor-toolbar');
  const todo=toolbar?.querySelector('[data-note-format="todo"]');
  const link=toolbar?.querySelector('[data-note-format="link"]');
  if(link){link.textContent='🔗';link.title='Agregar enlace'}
  if(todo){
    todo.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();toggleTodoList()};
  }
  const editor=$f('#noteRichEditor');
  editor?.addEventListener('keydown',handleTodoEnter,true);
  editor?.addEventListener('change',e=>{if(e.target.matches('.note-todo input[type="checkbox"]'))syncBack()},true);
}
function boot(){if(!$f('#noteRichEditor'))return setTimeout(boot,80);install()}
boot();
