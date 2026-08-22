const style=document.createElement('style');
style.id='expensesReportMotionStyle';
style.textContent=`
  @keyframes rpModalIn{0%{opacity:0}100%{opacity:1}}
  @keyframes rpCardIn{0%{opacity:0;transform:translateY(16px) scale(.975)}60%{opacity:1;transform:translateY(-2px) scale(1.004)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes rpContentIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
  @keyframes rpDonutIn{0%{opacity:0;transform:rotate(-105deg) scale(.72)}65%{opacity:1;transform:rotate(8deg) scale(1.035)}100%{opacity:1;transform:rotate(0) scale(1)}}
  @keyframes rpLegendIn{0%{opacity:0;transform:translateX(10px)}100%{opacity:1;transform:translateX(0)}}
  @keyframes rpStatIn{0%{opacity:0;transform:translateY(7px) scale(.985)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes rpKickerIn{0%{opacity:0;transform:translateX(-9px)}100%{opacity:1;transform:translateX(0)}}

  #expenseReportModal.show{animation:rpModalIn .22s ease-out both}
  #expenseReportModal.show .rp-card{animation:rpCardIn .42s cubic-bezier(.2,.9,.25,1.08) both;transform-origin:50% 45%}
  #expenseReportBody>.rp-chart-wrap,
  #expenseReportBody>.rp-empty,
  #expenseReportBody>.rp-loading{animation:rpContentIn .28s ease-out both}
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

  #expenseReportModes button,
  #expenseReportPrev,#expenseReportNext,
  #expenseReportClose,
  #expenseReportBody .rp-legend-row,
  #expenseReportBody .rp-back{transition:transform .16s ease,background-color .16s ease,box-shadow .16s ease,opacity .16s ease}
  #expenseReportModes button:active,#expenseReportPrev:active,#expenseReportNext:active,#expenseReportBody .rp-legend-row:active{transform:scale(.96)}
  #expenseReportBody .rp-donut{transition:filter .18s ease,transform .18s ease}
  @media(hover:hover) and (pointer:fine){#expenseReportBody .rp-donut:hover{filter:saturate(1.06) brightness(1.015)}}

  @media(prefers-reduced-motion:reduce){
    #expenseReportModal.show,#expenseReportModal.show .rp-card,
    #expenseReportBody *,#expenseReportBody .rp-legend-row,#expenseReportBody .rp-stats>div{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}
  }
`;
document.head.appendChild(style);
