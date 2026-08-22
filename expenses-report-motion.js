const style=document.createElement('style');
style.id='expensesReportMotionStyle';
style.textContent=`
  @keyframes rpModalIn{0%{opacity:0}100%{opacity:1}}
  @keyframes rpModalOut{0%{opacity:1}100%{opacity:0}}
  @keyframes rpCardIn{0%{opacity:0;transform:translateY(16px) scale(.975)}60%{opacity:1;transform:translateY(-2px) scale(1.004)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes rpCardOut{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(12px) scale(.982)}}
  @keyframes rpContentIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
  @keyframes rpDonutIn{0%{opacity:0;transform:rotate(-105deg) scale(.72)}65%{opacity:1;transform:rotate(8deg) scale(1.035)}100%{opacity:1;transform:rotate(0) scale(1)}}
  @keyframes rpLegendIn{0%{opacity:0;transform:translateX(10px)}100%{opacity:1;transform:translateX(0)}}
  @keyframes rpStatIn{0%{opacity:0;transform:translateY(7px) scale(.985)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes rpKickerIn{0%{opacity:0;transform:translateX(-9px)}100%{opacity:1;transform:translateX(0)}}
  @keyframes rpPulse{0%,100%{opacity:.38;transform:scale(.97)}50%{opacity:.72;transform:scale(1)}}

  #expenseReportModal.show{animation:rpModalIn .22s ease-out both}
  #expenseReportModal.show .rp-card{animation:rpCardIn .42s cubic-bezier(.2,.9,.25,1.08) both;transform-origin:50% 45%}
  #expenseReportModal.rp-closing{animation:rpModalOut .24s ease-in both!important}
  #expenseReportModal.rp-closing .rp-card{animation:rpCardOut .22s ease-in both!important}

  /* Reserva la altura final desde el primer frame: no hay salto al terminar de cargar. */
  #expenseReportModal .rp-card{height:min(92vh,900px)!important;max-height:min(92vh,900px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
  #expenseReportBody{flex:1 1 auto!important;min-height:0!important;overflow:auto!important;padding-bottom:4px}
  #expenseReportBody>.rp-loading{min-height:100%!important;display:grid!important;place-items:center!important;padding:0!important;font-size:0!important;position:relative}
  #expenseReportBody>.rp-loading:before{content:'';width:min(54vw,210px);aspect-ratio:1;border-radius:50%;background:conic-gradient(#edf0f5 0 22%,#f5f6f9 22% 48%,#eceff4 48% 72%,#f6f7fa 72% 100%);-webkit-mask:radial-gradient(circle at center,transparent 0 55%,#000 56%);mask:radial-gradient(circle at center,transparent 0 55%,#000 56%);animation:rpPulse 1.05s ease-in-out infinite}
  #expenseReportBody>.rp-loading:after{content:'Armando reporte…';position:absolute;font-size:11px;font-weight:800;color:#99a1ad;letter-spacing:.01em}

  #expenseReportBody>.rp-chart-wrap,
  #expenseReportBody>.rp-empty{animation:rpContentIn .30s ease-out both}
  #expenseReportBody .rp-donut{animation:rpDonutIn .72s cubic-bezier(.18,.85,.24,1.08) both;transform-origin:center}
  #expenseReportBody .rp-kicker{animation:rpKickerIn .28s ease-out both}
  #expenseReportBody .rp-back{animation:rpContentIn .24s ease-out both}
  #expenseReportBody .rp-legend-row{opacity:0;animation:rpLegendIn .30s ease-out forwards}
  #expenseReportBody .rp-legend-row:nth-child(1){animation-delay:.08s}
  #expenseReportBody .rp-legend-row:nth-child(2){animation-delay:.11s}
  #expenseReportBody .rp-legend-row:nth-child(3){animation-delay:.14s}
  #expenseReportBody .rp-legend-row:nth-child(4){animation-delay:.17s}
  #expenseReportBody .rp-legend-row:nth-child(5){animation-delay:.20s}
  #expenseReportBody .rp-legend-row:nth-child(6){animation-delay:.23s}
  #expenseReportBody .rp-legend-row:nth-child(7){animation-delay:.26s}
  #expenseReportBody .rp-legend-row:nth-child(8){animation-delay:.29s}
  #expenseReportBody .rp-legend-row:nth-child(9){animation-delay:.32s}
  #expenseReportBody .rp-legend-row:nth-child(10){animation-delay:.35s}
  #expenseReportBody .rp-stats>div{opacity:0;animation:rpStatIn .30s ease-out forwards}
  #expenseReportBody .rp-stats>div:nth-child(1){animation-delay:.18s}
  #expenseReportBody .rp-stats>div:nth-child(2){animation-delay:.22s}
  #expenseReportBody .rp-stats>div:nth-child(3){animation-delay:.26s}
  #expenseReportBody .rp-stats>div:nth-child(4){animation-delay:.30s}
  #expenseReportBody .rp-tip{animation:rpContentIn .32s .28s ease-out both}

  /* Header: cerrar · título · menú */
  #expenseReportModal .rp-head{grid-template-columns:38px 1fr 38px!important;overflow:visible!important}
  #expenseReportModal .rp-close{grid-column:1;grid-row:1}
  #expenseReportModal .rp-head h3{grid-column:2;grid-row:1}
  #expenseReportMore{grid-column:3;grid-row:1;width:36px;height:36px;border:0;border-radius:12px;background:#f1f3f7;color:#515a68;font:900 17px/1 system-ui,sans-serif;display:grid;place-items:center;padding:0;letter-spacing:1px}
  #expenseReportMore:active{transform:scale(.94);background:#e8ebf1}
  #expenseReportMenu{position:absolute;right:0;top:48px;z-index:30;display:none;min-width:188px;padding:6px;background:#fff;border:1px solid #e7eaf0;border-radius:14px;box-shadow:0 16px 38px rgba(26,33,48,.16)}
  #expenseReportMenu.show{display:block;animation:rpContentIn .16s ease-out both}
  #expenseReportMenu button{width:100%;border:0;background:transparent;border-radius:10px;padding:10px 12px;text-align:left;font:800 12px/1.2 system-ui,sans-serif;color:#343b47}
  #expenseReportMenu button:active{background:#f1f3f7}

  #expenseReportModes button,
  #expenseReportPrev,#expenseReportNext,
  #expenseReportClose,#expenseReportMore,
  #expenseReportBody .rp-legend-row,
  #expenseReportBody .rp-back{transition:transform .16s ease,background-color .16s ease,box-shadow .16s ease,opacity .16s ease}
  #expenseReportModes button:active,#expenseReportPrev:active,#expenseReportNext:active,#expenseReportBody .rp-legend-row:active{transform:scale(.96)}
  #expenseReportBody .rp-donut{transition:filter .18s ease,transform .18s ease}
  @media(hover:hover) and (pointer:fine){#expenseReportBody .rp-donut:hover{filter:saturate(1.06) brightness(1.015)}}

  @media(max-width:560px){#expenseReportModal .rp-card{height:94vh!important;max-height:94vh!important}}
  @media(prefers-reduced-motion:reduce){
    #expenseReportModal.show,#expenseReportModal.show .rp-card,#expenseReportModal.rp-closing,#expenseReportModal.rp-closing .rp-card,
    #expenseReportBody *,#expenseReportBody .rp-legend-row,#expenseReportBody .rp-stats>div{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}
  }
`;
document.head.appendChild(style);

const waitForReport=()=>{
  const modal=document.querySelector('#expenseReportModal');
  const head=modal?.querySelector('.rp-head');
  const close=modal?.querySelector('#expenseReportClose');
  if(!modal||!head||!close)return setTimeout(waitForReport,80);
  if(document.documentElement.dataset.expensesReportMotion==='1')return;
  document.documentElement.dataset.expensesReportMotion='1';

  head.querySelector('.rp-head-spacer')?.remove();
  head.insertBefore(close,head.querySelector('h3'));

  const more=document.createElement('button');
  more.id='expenseReportMore';more.type='button';more.setAttribute('aria-label','Opciones del reporte');more.textContent='•••';
  const menu=document.createElement('div');menu.id='expenseReportMenu';
  menu.innerHTML='<button type="button" id="expenseReportExport">Exportar reporte CSV</button>';
  head.append(more,menu);

  const closeMenu=()=>menu.classList.remove('show');
  more.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.classList.toggle('show')});
  document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&e.target!==more)closeMenu()});

  const csvCell=v=>{const s=String(v??'');return /[;"\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s};
  const parseAmount=text=>{
    const s=String(text||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:'';
  };
  const exportVisible=()=>{
    const period=modal.querySelector('#expenseReportPeriod')?.textContent?.trim()||'';
    const category=modal.querySelector('.rp-kicker')?.textContent?.trim()||'';
    const level=category?'subcategoria':'categoria';
    const rows=[['periodo','nivel','categoria','concepto','monto','participacion','movimientos','mateo','dani']];
    modal.querySelectorAll('.rp-legend-row').forEach(row=>{
      const name=row.querySelector('.rp-name')?.textContent?.trim()||'';
      const amount=parseAmount(row.querySelector('.rp-value b')?.textContent||'');
      const small=row.querySelector('.rp-value small')?.textContent||'';
      const split=row.querySelector('.rp-value em')?.textContent||'';
      const pct=(small.match(/([\d.,]+)%/)||[])[1]||'';
      const mov=(small.match(/([\d.,]+)\s*mov/)||[])[1]||'';
      const mateo=(split.match(/Mateo:\s*([\d.,]+)%/)||[])[1]||'';
      const dani=(split.match(/Dani:\s*([\d.,]+)%/)||[])[1]||'';
      rows.push([period,level,category||name,category?name:'',amount,pct,mov,mateo,dani]);
    });
    if(rows.length===1)return;
    const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    const safe=(category||period||'reporte').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    a.href=url;a.download=`gastos_reporte_${safe||'actual'}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);closeMenu();
  };
  menu.querySelector('#expenseReportExport')?.addEventListener('click',exportVisible);

  const finishClose=()=>{modal.classList.remove('show','rp-closing');closeMenu()};
  const animatedClose=()=>{
    if(!modal.classList.contains('show')||modal.classList.contains('rp-closing'))return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finishClose();return}
    modal.classList.add('rp-closing');setTimeout(finishClose,245);
  };

  /* Captura antes que el listener original quite .show para poder animar la salida. */
  close.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();animatedClose()},true);
  modal.addEventListener('click',e=>{if(e.target===modal){e.preventDefault();e.stopImmediatePropagation();animatedClose()}},true);
};
waitForReport();
