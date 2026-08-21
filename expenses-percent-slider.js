const $u=(s,r=document)=>r.querySelector(s);
const SNAP_VALUES=[0,25,33.33,50,66.66,100];
let rebuilding=false;

const round2=n=>Math.round(Number(n||0)*100)/100;
const clamp=(n,min,max)=>Math.min(Math.max(Number(n)||0,min),max);
function nearestSnapIndex(value){
  const n=Number(value);if(!Number.isFinite(n))return 3;
  let best=0,dist=Infinity;SNAP_VALUES.forEach((v,i)=>{const d=Math.abs(v-n);if(d<dist){dist=d;best=i}});return best;
}
function fmtPct(v){const n=round2(v);return Number.isInteger(n)?String(n):n.toFixed(2)}
function fmtAmt(v){return Number.isFinite(Number(v))?round2(v).toFixed(2):''}
function totalAmount(){const n=Number($u('#expenseAmountMock')?.value);return Number.isFinite(n)&&n>0?n:0}
function deriveFromPercent(pA){
  const total=totalAmount(),a=clamp(pA,0,100),b=round2(100-a);
  return{pA:a,pB:b,aA:total?round2(total*a/100):null,aB:total?round2(total-round2(total*a/100)):null};
}
function deriveFromAmount(aA){
  const total=totalAmount();if(!total)return{pA:50,pB:50,aA:null,aB:null};
  const aa=clamp(aA,0,total),ab=round2(total-aa),pA=round2(aa/total*100),pB=round2(100-pA);
  return{pA,pB,aA:round2(aa),aB:ab};
}
function currentValuesFromLegacy(){
  const total=totalAmount();
  const pA=$u('#splitPercentALive'),pB=$u('#splitPercentBLive'),aA=$u('#splitAmountALive'),aB=$u('#splitAmountBLive');
  if(pA){const pa=Number(pA.value);return deriveFromPercent(Number.isFinite(pa)?pa:50)}
  if(aA){const aa=Number(aA.value);if(Number.isFinite(aa))return deriveFromAmount(aa)}
  return deriveFromPercent(50);
}
function setFields(v,{slider=true}={}){
  const pA=$u('#splitPercentALive'),pB=$u('#splitPercentBLive'),aA=$u('#splitAmountALive'),aB=$u('#splitAmountBLive'),range=$u('#splitUnifiedSlider');
  if(pA)pA.value=fmtPct(v.pA);if(pB)pB.value=fmtPct(v.pB);
  if(aA)aA.value=v.aA==null?'':fmtAmt(v.aA);if(aB)aB.value=v.aB==null?'':fmtAmt(v.aB);
  if(slider&&range)range.value=String(nearestSnapIndex(v.pA));
}
function mountUnified(values=null){
  const box=$u('#expenseSplitDetails'),choice=$u('#splitChoiceMock');if(!box||!choice||rebuilding)return;
  const v=values||currentValuesFromLegacy();
  const amountBtn=$u('#splitChoiceMock button[data-split="Por monto"]');
  if(amountBtn&&!amountBtn.classList.contains('active')){
    rebuilding=true;amountBtn.click();rebuilding=false;
  }
  choice.style.display='none';
  box.innerHTML=`
    <div class="unified-split-layout">
      <div class="unified-slider-pane">
        <input id="splitUnifiedSlider" class="unified-split-slider" type="range" min="0" max="5" step="1" value="${nearestSnapIndex(v.pA)}" aria-label="Reparto entre Mateo y Dani">
        <div class="unified-snap-labels" aria-hidden="true">${SNAP_VALUES.map(x=>`<span>${String(x).replace('.',',')}%</span>`).join('')}</div>
      </div>
      <div class="unified-stack unified-percent-stack">
        <label><span>Mateo %</span><input id="splitPercentALive" type="number" min="0" max="100" step="0.01" inputmode="decimal"></label>
        <label><span>Dani %</span><input id="splitPercentBLive" type="number" min="0" max="100" step="0.01" inputmode="decimal"></label>
      </div>
      <div class="unified-stack unified-amount-stack">
        <label><span>Mateo $</span><input id="splitAmountALive" type="number" min="0" step="0.01" inputmode="decimal"></label>
        <label><span>Dani $</span><input id="splitAmountBLive" type="number" min="0" step="0.01" inputmode="decimal"></label>
      </div>
    </div>`;
  setFields(v);
}
function install(){
  if(document.documentElement.dataset.expensesUnifiedSplit==='1')return;
  document.documentElement.dataset.expensesUnifiedSplit='1';
  const style=document.createElement('style');style.id='expensesUnifiedSplitStyle';style.textContent=`
    #splitChoiceMock{display:none!important}
    #expenseSplitDetails{margin-top:8px!important}
    #expenseSplitDetails .unified-split-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(76px,.72fr) minmax(88px,.82fr);gap:9px;align-items:center}
    #expenseSplitDetails .unified-slider-pane{min-width:0;padding:8px 0 0}
    #expenseSplitDetails .unified-split-slider{width:100%;height:34px;margin:0;accent-color:#4f96dc}
    #expenseSplitDetails .unified-snap-labels{display:grid;grid-template-columns:repeat(6,1fr);margin-top:-2px;color:#969eaa;font-size:6.7px;font-weight:850;line-height:1;user-select:none}
    #expenseSplitDetails .unified-snap-labels span{text-align:center;white-space:nowrap}
    #expenseSplitDetails .unified-snap-labels span:first-child{text-align:left}
    #expenseSplitDetails .unified-snap-labels span:last-child{text-align:right}
    #expenseSplitDetails .unified-stack{display:grid;gap:6px;min-width:0}
    #expenseSplitDetails .unified-stack label span{display:block;margin:0 0 3px 2px;color:#7d8797;font-size:8.5px;font-weight:900;white-space:nowrap}
    #expenseSplitDetails .unified-stack input{width:100%;min-width:0;height:34px;border:1px solid #e5e7eb!important;border-radius:10px!important;background:#f5f6f8!important;padding:6px 7px!important;font-size:11.5px!important;font-weight:800;outline:none}
    #expenseSplitDetails .unified-stack input:focus{background:#fff!important;border-color:#cfd8e5!important;box-shadow:0 0 0 2px rgba(79,150,220,.08)}
    @media(max-width:390px){#expenseSplitDetails .unified-split-layout{grid-template-columns:minmax(0,1.45fr) minmax(70px,.7fr) minmax(82px,.8fr);gap:7px}#expenseSplitDetails .unified-snap-labels{font-size:6px}}
  `;document.head.appendChild(style);

  const details=$u('#expenseSplitDetails');
  if(details){
    new MutationObserver(()=>{
      if(rebuilding)return;
      if(!$u('#splitUnifiedSlider',details))queueMicrotask(()=>mountUnified());
    }).observe(details,{childList:true,subtree:false});
  }

  document.addEventListener('input',e=>{
    const id=e.target?.id;
    if(id==='splitUnifiedSlider'){
      const snap=SNAP_VALUES[Number(e.target.value)]??50;setFields(deriveFromPercent(snap));return;
    }
    if(id==='splitPercentALive'){
      const n=Number(e.target.value);if(Number.isFinite(n))setFields(deriveFromPercent(n),{slider:true});return;
    }
    if(id==='splitPercentBLive'){
      const n=Number(e.target.value);if(Number.isFinite(n))setFields(deriveFromPercent(100-n),{slider:true});return;
    }
    if(id==='splitAmountALive'){
      const n=Number(e.target.value);if(Number.isFinite(n))setFields(deriveFromAmount(n),{slider:true});return;
    }
    if(id==='splitAmountBLive'){
      const total=totalAmount(),n=Number(e.target.value);if(total&&Number.isFinite(n))setFields(deriveFromAmount(total-n),{slider:true});return;
    }
    if(id==='expenseAmountMock'){
      const pa=Number($u('#splitPercentALive')?.value);setFields(deriveFromPercent(Number.isFinite(pa)?pa:50),{slider:false});
    }
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#addExpenseMock'))setTimeout(()=>mountUnified(deriveFromPercent(50)),0);
    if(e.target.closest?.('#expenseListMock .expense-more'))setTimeout(()=>{},0);
    if(e.target.closest?.('#expenseItemMenuMock [data-act="edit"]'))setTimeout(()=>mountUnified(),0);
  },true);

  const modal=$u('#expenseModalMock');
  if(modal)new MutationObserver(()=>{if(modal.classList.contains('show'))setTimeout(()=>mountUnified(),0)}).observe(modal,{attributes:true,attributeFilter:['class']});
  mountUnified(deriveFromPercent(50));
}
function boot(){if(!$u('#expenseSplitDetails'))return setTimeout(boot,80);install()}
boot();
