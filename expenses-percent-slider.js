const $p=(s,r=document)=>r.querySelector(s);
const SNAP_VALUES=[0,25,33.33,50,66.66,100];

function nearestSnapIndex(value){
  const n=Number(value);
  if(!Number.isFinite(n))return 3;
  let best=0,bestDist=Infinity;
  SNAP_VALUES.forEach((v,i)=>{const d=Math.abs(v-n);if(d<bestDist){best=i;bestDist=d}});
  return best;
}
function formatPct(v){
  return Number.isInteger(v)?String(v):Number(v).toFixed(2).replace('.',',');
}
function syncSliderFromFields(){
  const slider=$p('#splitPercentSliderLive'),a=$p('#splitPercentALive');
  if(!slider||!a)return;
  slider.value=String(nearestSnapIndex(a.value));
}
function applySnap(index){
  const a=$p('#splitPercentALive'),b=$p('#splitPercentBLive');
  if(!a||!b)return;
  const value=SNAP_VALUES[Math.max(0,Math.min(SNAP_VALUES.length-1,Number(index)||0))];
  const complement=Math.round((100-value)*100)/100;
  a.value=value.toFixed(value%1?2:0);
  b.value=complement.toFixed(complement%1?2:0);
  a.dispatchEvent(new Event('change',{bubbles:true}));
  b.dispatchEvent(new Event('change',{bubbles:true}));
}
function enhancePercentEditor(){
  const box=$p('#expenseSplitDetails');
  const a=$p('#splitPercentALive'),b=$p('#splitPercentBLive');
  if(!box||!a||!b||$p('#splitPercentSliderLive'))return;

  const currentA=a.value||'50',currentB=b.value||'50';
  box.innerHTML=`
    <div class="percent-split-layout">
      <div class="percent-slider-pane">
        <input id="splitPercentSliderLive" class="percent-snap-slider" type="range" min="0" max="5" step="1" value="${nearestSnapIndex(currentA)}" aria-label="Porcentaje de Mateo">
        <div class="percent-snap-labels" aria-hidden="true">
          ${SNAP_VALUES.map(v=>`<span>${formatPct(v)}%</span>`).join('')}
        </div>
      </div>
      <div class="percent-fields-stack">
        <label><span>Mateo</span><div><input id="splitPercentALive" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${currentA}"><b>%</b></div></label>
        <label><span>Dani</span><div><input id="splitPercentBLive" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${currentB}"><b>%</b></div></label>
      </div>
    </div>`;

  const slider=$p('#splitPercentSliderLive');
  slider?.addEventListener('input',e=>applySnap(e.target.value));
}
function install(){
  if(document.documentElement.dataset.expensesPercentSlider==='1')return;
  document.documentElement.dataset.expensesPercentSlider='1';

  const style=document.createElement('style');
  style.id='expensesPercentSliderStyle';
  style.textContent=`
    #expenseSplitDetails .percent-split-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(92px,1fr);gap:13px;align-items:center;margin-top:9px}
    #expenseSplitDetails .percent-slider-pane{min-width:0;padding:8px 2px 2px}
    #expenseSplitDetails .percent-snap-slider{width:100%;height:32px;margin:0;accent-color:#4f96dc;cursor:pointer}
    #expenseSplitDetails .percent-snap-labels{display:grid;grid-template-columns:repeat(6,1fr);margin-top:-2px;color:#939ba8;font-size:7.5px;font-weight:800;line-height:1;user-select:none}
    #expenseSplitDetails .percent-snap-labels span{text-align:center;transform:translateX(-50%)}
    #expenseSplitDetails .percent-snap-labels span:first-child{text-align:left;transform:none}
    #expenseSplitDetails .percent-snap-labels span:last-child{text-align:right;transform:none}
    #expenseSplitDetails .percent-fields-stack{display:grid;gap:6px}
    #expenseSplitDetails .percent-fields-stack label>span{display:block;margin:0 0 3px 2px;color:#7d8797;font-size:9px;font-weight:900}
    #expenseSplitDetails .percent-fields-stack label>div{display:flex;align-items:center;background:#f5f6f8;border:1px solid #e5e7eb;border-radius:11px;padding-right:7px}
    #expenseSplitDetails .percent-fields-stack input{min-width:0;width:100%;height:34px;border:0!important;background:transparent!important;padding:7px 3px 7px 8px!important;font-size:13px!important;font-weight:800;outline:none}
    #expenseSplitDetails .percent-fields-stack b{font-size:10px;color:#8d95a2}
    @media(max-width:380px){
      #expenseSplitDetails .percent-split-layout{grid-template-columns:minmax(0,1.8fr) minmax(86px,1fr);gap:9px}
      #expenseSplitDetails .percent-snap-labels{font-size:6.8px}
    }
  `;
  document.head.appendChild(style);

  const details=$p('#expenseSplitDetails');
  if(details){
    const observer=new MutationObserver(()=>{
      if($p('#splitPercentALive',details)&&!$p('#splitPercentSliderLive',details))enhancePercentEditor();
    });
    observer.observe(details,{childList:true,subtree:true});
    enhancePercentEditor();
  }

  document.addEventListener('input',e=>{
    if(e.target?.id==='splitPercentALive'||e.target?.id==='splitPercentBLive'){
      queueMicrotask(syncSliderFromFields);
    }
  },true);
}
function boot(){
  if(!$p('#expenseSplitDetails'))return setTimeout(boot,80);
  install();
}
boot();
