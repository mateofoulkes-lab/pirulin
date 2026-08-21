const $f=(s,r=document)=>r.querySelector(s);

function syncBack(){
  try{window.PirulinNotesUI?.syncToTextarea?.()}catch{}
  setTimeout(refreshBoldState,0);
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

function replaceWithStrong(el){
  const strong=document.createElement('strong');
  while(el.firstChild)strong.appendChild(el.firstChild);
  el.replaceWith(strong);return strong;
}
function normalizeBoldMarkup(){
  const editor=$f('#noteRichEditor');if(!editor)return;
  [...editor.querySelectorAll('b')].forEach(replaceWithStrong);
  [...editor.querySelectorAll('span[style]')].forEach(span=>{
    const weight=(span.style.fontWeight||'').toLowerCase();
    if(weight==='bold'||weight==='bolder'||Number(weight)>=700)replaceWithStrong(span);
  });
}
function boldAncestor(node){
  const editor=$f('#noteRichEditor');
  if(!node||!editor)return null;
  if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;
  const bold=node?.closest?.('strong,b');
  return bold&&editor.contains(bold)?bold:null;
}
function selectionIsActuallyBold(){
  const editor=$f('#noteRichEditor'),sel=window.getSelection();
  if(!editor||!sel||!sel.rangeCount)return false;
  const range=sel.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return false;
  if(range.collapsed)return !!boldAncestor(sel.anchorNode);
  return !!boldAncestor(range.startContainer)&&!!boldAncestor(range.endContainer);
}
function refreshBoldState(){
  const button=$f('#noteModal .note-editor-toolbar [data-note-format="bold"]');
  if(button)button.classList.toggle('is-active',selectionIsActuallyBold());
}
function unwrapElement(el){
  const parent=el.parentNode;if(!parent)return;
  while(el.firstChild)parent.insertBefore(el.firstChild,el);
  el.remove();parent.normalize();
}
function removeBoldFromSelection(){
  const editor=$f('#noteRichEditor'),sel=window.getSelection();
  if(!editor||!sel||!sel.rangeCount)return;
  const range=sel.getRangeAt(0);
  const startBold=boldAncestor(range.startContainer),endBold=boldAncestor(range.endContainer);
  if(startBold&&startBold===endBold){
    const markerStart=document.createElement('span'),markerEnd=document.createElement('span');
    markerStart.dataset.boldMarker='start';markerEnd.dataset.boldMarker='end';
    const endRange=range.cloneRange();endRange.collapse(false);endRange.insertNode(markerEnd);
    const startRange=range.cloneRange();startRange.collapse(true);startRange.insertNode(markerStart);
    const before=startBold.cloneNode(false),after=startBold.cloneNode(false);
    while(startBold.firstChild&&startBold.firstChild!==markerStart)before.appendChild(startBold.firstChild);
    markerStart.remove();
    const middle=document.createDocumentFragment();
    while(startBold.firstChild&&startBold.firstChild!==markerEnd)middle.appendChild(startBold.firstChild);
    markerEnd.remove();
    while(startBold.firstChild)after.appendChild(startBold.firstChild);
    const parent=startBold.parentNode;
    if(before.childNodes.length)parent.insertBefore(before,startBold);
    parent.insertBefore(middle,startBold);
    if(after.childNodes.length)parent.insertBefore(after,startBold);
    startBold.remove();parent.normalize();
    return;
  }
  if(startBold)unwrapElement(startBold);
  if(endBold&&endBold!==startBold)unwrapElement(endBold);
}
function applyStrongToSelection(){
  const editor=$f('#noteRichEditor'),sel=window.getSelection();
  if(!editor||!sel||!sel.rangeCount)return;
  const range=sel.getRangeAt(0);
  if(range.collapsed){
    try{document.execCommand('bold',false,null)}catch{}
    normalizeBoldMarkup();return;
  }
  const strong=document.createElement('strong');
  try{range.surroundContents(strong)}catch{
    const frag=range.extractContents();strong.appendChild(frag);range.insertNode(strong);
  }
  sel.removeAllRanges();const next=document.createRange();next.selectNodeContents(strong);sel.addRange(next);
}
function toggleRealBold(){
  const editor=$f('#noteRichEditor');if(!editor)return;
  editor.focus();
  if(selectionIsActuallyBold())removeBoldFromSelection();else applyStrongToSelection();
  normalizeBoldMarkup();syncBack();refreshBoldState();
}

function install(){
  if(document.documentElement.dataset.notesEditorFixesV3==='1')return;
  document.documentElement.dataset.notesEditorFixesV3='1';
  const style=document.createElement('style');
  style.textContent=`
    #noteRichEditor strong,#noteRichEditor b,
    .note-rich-preview strong,.note-rich-preview b,
    #notesGrid .note-preview strong,#notesGrid .note-preview b{font-weight:900!important;font-synthesis:weight}
    #noteRichEditor span[style*="font-weight"]{font-weight:900!important}
  `;
  document.head.appendChild(style);
  const toolbar=$f('#noteModal .note-editor-toolbar');
  const bold=toolbar?.querySelector('[data-note-format="bold"]');
  const todo=toolbar?.querySelector('[data-note-format="todo"]');
  const link=toolbar?.querySelector('[data-note-format="link"]');
  if(link){link.textContent='🔗';link.title='Agregar enlace'}
  if(bold)bold.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();toggleRealBold()};
  if(todo)todo.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();toggleTodoList()};
  const editor=$f('#noteRichEditor');
  editor?.addEventListener('keydown',handleTodoEnter,true);
  editor?.addEventListener('input',()=>{setTimeout(normalizeBoldMarkup,0);setTimeout(refreshBoldState,0)});
  editor?.addEventListener('keyup',refreshBoldState);
  editor?.addEventListener('mouseup',refreshBoldState);
  editor?.addEventListener('touchend',()=>setTimeout(refreshBoldState,0));
  editor?.addEventListener('change',e=>{if(e.target.matches('.note-todo input[type="checkbox"]'))syncBack()},true);
  document.addEventListener('selectionchange',()=>{
    if($f('#noteModal')?.classList.contains('show'))setTimeout(refreshBoldState,0);
  });
  window.addEventListener('pirulin-note-editor-opened',()=>setTimeout(refreshBoldState,20));
  normalizeBoldMarkup();refreshBoldState();
}
function boot(){if(!$f('#noteRichEditor'))return setTimeout(boot,80);install()}
boot();
