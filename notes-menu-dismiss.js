const $d=(s,r=document)=>r.querySelector(s);

function hide(el){
  if(!el)return;
  if(el.id==='pirulinNoteMenu'||el.id==='pirulinNotesHeaderMenu')el.style.display='none';
  else el.classList.remove('show');
}

function install(){
  if(document.documentElement.dataset.notesMenuDismiss==='1')return;
  document.documentElement.dataset.notesMenuDismiss='1';

  document.addEventListener('pointerdown',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;

    const noteMenu=$d('#pirulinNoteMenu');
    if(noteMenu?.style.display==='block' && !target.closest('#pirulinNoteMenu') && !target.closest('.note-more')){
      hide(noteMenu);
    }

    const headerMenu=$d('#pirulinNotesHeaderMenu');
    if(headerMenu?.style.display==='block' && !target.closest('#pirulinNotesHeaderMenu') && !target.closest('#notesMore')){
      hide(headerMenu);
    }

    const tagPicker=$d('#noteTagPicker');
    if(tagPicker?.classList.contains('show') && !target.closest('#noteTagPicker') && !target.closest('#toggleNoteTagPicker')){
      hide(tagPicker);
    }

    const linkEditor=$d('#noteLinkEditor');
    if(linkEditor?.classList.contains('show') && !target.closest('#noteLinkEditor') && !target.closest('[data-note-format="link"]') && !target.closest('[data-link-tool]')){
      hide(linkEditor);
    }
  },true);

  window.addEventListener('pirulin-note-editor-opened',()=>{
    hide($d('#pirulinNoteMenu'));
    hide($d('#pirulinNotesHeaderMenu'));
  });
}

function boot(){
  if(!$d('#notesSuite'))return setTimeout(boot,80);
  install();
}
boot();
