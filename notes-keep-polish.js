const $k=(s,r=document)=>r.querySelector(s);
function installKeepPolish(){
  if(document.documentElement.dataset.notesKeepPolish==='2')return;
  document.documentElement.dataset.notesKeepPolish='2';
  const style=document.createElement('style');
  style.id='notesKeepPolishStyles';
  style.textContent=`
  /* Pirulín Notes — Keep-inspired visual pass */
  #notesSuite{background:#fbfcff!important}
  #notesSuite .header{background:rgba(255,255,255,.94)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(34,42,58,.055)!important}
  #notesSuite .header h1{font-size:25px!important;letter-spacing:-.45px!important;color:#303640!important}
  #notesSuite .notes-scroll{padding-top:8px!important}
  #notesSuite .notes-search{height:48px!important;margin:2px 8px 10px!important;border:1px solid #e3e7ed!important;border-radius:16px!important;background:#fff!important;box-shadow:0 2px 7px rgba(30,42,64,.055)!important;padding:0 14px!important;gap:9px!important}
  #notesSuite .notes-search span{font-size:19px!important;color:#737b88!important;transform:translateY(-1px)}
  #notesSuite .notes-search input{font-size:16px!important;font-weight:500!important;color:#303640!important;background:transparent!important}
  #notesSuite .notes-search input::placeholder{color:#9299a5!important}
  #notesSuite .notes-filterbar{display:flex!important;gap:7px!important;overflow-x:auto!important;scrollbar-width:none;padding:0 8px 11px!important;margin:0!important;white-space:nowrap!important}
  #notesSuite .notes-filterbar::-webkit-scrollbar{display:none}
  #notesSuite .notes-filter-chip,#notesSuite .notes-tree-btn{height:32px!important;min-width:auto!important;border-radius:16px!important;padding:0 12px!important;background:#fff!important;border:1px solid #dde2e9!important;color:#5f6877!important;font-size:12px!important;font-weight:750!important;box-shadow:none!important;flex:0 0 auto!important}
  #notesSuite .notes-filter-chip.active{background:#eee9fb!important;border-color:#d8ccf3!important;color:#6547aa!important}
  #notesSuite .notes-tree-btn{width:32px!important;padding:0!important;font-size:15px!important}

  /* Keep-style masonry: independent vertical flow per column. */
  #notesSuite .notes-grid{
    display:block!important;
    column-count:2!important;
    column-gap:12px!important;
    padding:0 8px 105px!important;
  }
  #notesSuite .note-card{
    display:inline-block!important;
    width:100%!important;
    box-sizing:border-box!important;
    margin:0 0 12px!important;
    break-inside:avoid!important;
    -webkit-column-break-inside:avoid!important;
    page-break-inside:avoid!important;
    vertical-align:top!important;
    border-radius:14px!important;
    min-height:0!important;
    height:auto!important;
    padding:0 14px 12px!important;
    border:1px solid rgba(55,61,72,.12)!important;
    box-shadow:none!important;
    transition:box-shadow .16s ease,transform .16s ease,border-color .16s ease!important;
    position:relative!important;
  }
  #notesSuite .note-card:active{transform:scale(.986)!important;box-shadow:0 4px 14px rgba(31,39,55,.08)!important}
  #notesSuite .note-card.pinned:after{content:'📌';position:absolute;right:10px;top:10px;font-size:13px;opacity:.66;pointer-events:none}
  #notesSuite .note-card.pinned .note-title{padding-right:34px!important}
  #notesSuite .note-title{margin:0 -14px 2px!important;padding:11px 14px 10px!important;border-radius:13px 13px 0 0!important;background:color-mix(in srgb,var(--note-head,#f4e9a7) 78%,var(--note-bg,#fff8c9))!important;font-size:17px!important;line-height:1.18!important;letter-spacing:-.2px!important}
  #notesSuite .note-preview{font-size:14.5px!important;line-height:1.45!important;color:#3f4652!important;padding-top:4px!important;display:block!important;overflow:hidden!important;max-height:15.95em!important}
  #notesSuite .note-preview ul{margin:4px 0 0!important;padding-left:19px!important}
  #notesSuite .note-preview li{margin:1px 0!important}
  #notesSuite .note-bottom{min-height:25px!important;margin-top:6px!important;padding-top:4px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important}
  #notesSuite .note-chip.shared{width:28px!important;height:28px!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(70,78,92,.07)!important;color:#626c7b!important;place-items:center!important}
  #notesSuite .note-more{width:30px!important;height:30px!important;border-radius:50%!important;display:grid!important;place-items:center!important;color:#636b77!important;opacity:.58!important;font-size:20px!important;background:transparent!important;transition:background .14s ease,opacity .14s ease!important}
  #notesSuite .note-more:active{background:rgba(55,63,76,.09)!important;opacity:1!important}
  #notesSuite .notes-fab{width:56px!important;height:56px!important;right:18px!important;bottom:max(20px,env(safe-area-inset-bottom))!important;border-radius:18px!important;background:#fff!important;color:#5d4aa0!important;border:1px solid #e0e3e9!important;box-shadow:0 5px 18px rgba(40,49,68,.18)!important;font-size:30px!important;font-weight:400!important;transition:transform .15s ease,box-shadow .15s ease!important}
  #notesSuite .notes-fab:active{transform:scale(.95)!important;box-shadow:0 3px 10px rgba(40,49,68,.15)!important}

  /* Editor: quieter, document-first */
  #noteModal{background:rgba(27,31,38,.28)!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  #noteModal .notes-sheet{border-radius:22px!important;background:#fff!important;box-shadow:0 20px 60px rgba(24,31,43,.22)!important;padding:18px!important;max-height:min(90vh,760px)!important}
  #noteModal #noteModalTitle{font-size:13px!important;letter-spacing:.2px!important;text-transform:uppercase!important;color:#8a929e!important;font-weight:800!important;margin-bottom:7px!important}
  #noteModal #noteTitleInput{border:0!important;border-bottom:1px solid #eceff3!important;border-radius:0!important;padding:8px 2px 11px!important;background:transparent!important;font-size:21px!important;font-weight:800!important;color:#2f3540!important;outline:none!important}
  #noteModal #noteTitleInput::placeholder{color:#a0a6b0!important}
  #noteModal .note-editor-toolbar{background:#f7f8fa!important;border:1px solid #e8ebef!important;border-radius:14px!important;padding:5px!important;margin:10px 0 6px!important;gap:4px!important}
  #noteModal .note-editor-tool{height:36px!important;border-radius:10px!important;background:transparent!important;border:0!important;color:#606977!important;font-size:16px!important}
  #noteModal .note-editor-tool.is-active{background:#e8e0f8!important;color:#5f43a6!important;box-shadow:none!important}
  #noteRichEditor{min-height:240px!important;max-height:38vh!important;border:0!important;border-radius:0!important;background:#fff!important;padding:42px 3px 14px!important;color:#323944!important;font-size:17px!important;line-height:1.56!important;box-shadow:none!important}
  #noteRichEditor:focus{outline:none!important}
  #noteModal .note-tags-editor{border-top:1px solid #edf0f3!important;padding-top:12px!important;margin-top:5px!important}
  #noteModal .note-pref-row{border-top:1px solid #edf0f3!important;margin-top:10px!important;padding-top:10px!important}
  #noteModal .actions{margin-top:12px!important}
  #noteModal .actions .btn{border-radius:14px!important;min-height:42px!important}

  @media (min-width:700px){
    #notesSuite .notes-grid{column-count:3!important}
    #noteModal .notes-sheet{width:min(620px,92vw)!important}
  }
  @media (min-width:1100px){#notesSuite .notes-grid{column-count:4!important}}
  `;
  document.head.appendChild(style);
  const search=$k('#notesSearch');
  if(search)search.placeholder='Buscar en tus notas';
  const tree=$k('#openCategoryEditor');
  if(tree){tree.textContent='☷';tree.title='Categorías'}
}
function boot(){
  if(!$k('#notesSuite')||!$k('#noteModal'))return setTimeout(boot,80);
  installKeepPolish();
}
boot();
