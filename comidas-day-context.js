const migratedTargetDays=new Set();
let decorating=false;

function currentDate(){return document.querySelector('#foodDate')?.value||''}
function days(){return window.PirulinComidasLive?.days||[]}
function profile(){return window.PirulinComidasLive?.profile||window.PirulinComidas?.DEFAULT_PROFILE||null}
function dayFor(date=currentDate()){return days().find(d=>String(d.date)===String(date))||null}
function fmt(n){return new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(Number(n||0))}
function targetsFor(day){return window.PirulinComidas?.cleanTargets?.(day?.targets)||null}
function profileTargetsFor(day=null){
  const p=profile();if(!p||!window.PirulinComidas?.targetsFromProfile)return null;
  return window.PirulinComidas.targetsFromProfile(day?.weightKg?{...p,weightKg:day.weightKg}:p);
}
function snapshotForSave(input={}){
  const existing=dayFor(input.date);
  return targetsFor(input)||targetsFor(existing)||profileTargetsFor(input);
}
function patchSave(){
  const api=window.PirulinComidas;if(!api?.saveDay||api.saveDay.__targetsPatched)return false;
  const original=api.saveDay.bind(api);
  const wrapped=async input=>original({...input,targets:snapshotForSave(input)});
  wrapped.__targetsPatched=true;
  wrapped.__original=original;
  api.saveDay=wrapped;
  return true;
}
function markerPct(value,bounds){const [a,b,c,d]=bounds;let pct;if(value<=a)pct=20*(value/Math.max(a,1));else if(value<=b)pct=20+20*(value-a)/Math.max(b-a,1);else if(value<=c)pct=40+20*(value-b)/Math.max(c-b,1);else if(value<=d)pct=60+20*(value-c)/Math.max(d-c,1);else pct=80+20*Math.min(1,(value-d)/Math.max(d*.35,1));return Math.max(1,Math.min(99,pct))}
function calorieStatus(k,t){if(k<t.calorieLow*.72)return 'Muy bajo';if(k<t.calorieLow)return 'Bajo';if(k<=t.calorieHigh)return 'Objetivo';if(k<=t.maintenance*1.05)return 'Mantenimiento';return 'Alto'}
function proteinStatus(v,t){if(v<t.proteinLow*.65)return 'Baja';if(v<t.proteinLow)return 'Mejorable';if(v<t.proteinHigh*.92)return 'Buena';if(v<=t.proteinHigh*1.08)return 'Óptima';return 'Alta'}
function recommendation(day,t,tot){
  if(tot.kcal<t.calorieLow*.72)return 'Aumentar ligeramente la ingesta.';
  if(tot.protein<t.proteinLow)return 'Consumir más proteína.';
  if(tot.kcal>t.maintenance*1.05)return 'Reducir calorías.';
  if(tot.kcal>=t.calorieLow&&tot.kcal<=t.calorieHigh&&tot.protein>=t.proteinLow)return '¡Excelente día!';
  return 'Seguir registrando: la tendencia importa más que un día.';
}
function activityIcon(day){
  const list=Array.isArray(day?.exercise)?day.exercise:[];
  if(!list.length)return '';
  if(list.some(x=>x.type==='gym'))return '🏋️';
  if(list.some(x=>x.type==='walking'))return '🚶';
  return '⚡';
}
function decorateSummary(day,tot){
  const stats=[...document.querySelectorAll('#foodRegisterPane .food-summary .food-stat')];if(stats.length<3)return;
  const third=stats[2],icon=activityIcon(day),weight=day?.weightKg;
  third.classList.add('food-weight-activity-stat');
  const html=`<div class="food-weight-line"><b>${weight?fmt(weight)+' kg':'—'}</b>${icon?`<span class="food-activity-badge" title="Actividad registrada">${icon}</span>`:''}</div><span>${weight?'peso':'sin peso'}${icon?` · ${tot.exerciseMin?tot.exerciseMin+' min':'actividad'}`:''}</span>`;
  if(third.innerHTML!==html)third.innerHTML=html;
}
function decorateScales(day,t,tot){
  const cards=[...document.querySelectorAll('#foodRegisterPane .food-scale-card')];if(cards.length<2)return;
  const values=[
    {value:tot.kcal,unit:'kcal',status:calorieStatus(tot.kcal,t),pct:markerPct(tot.kcal,[t.calorieLow*.72,t.calorieLow,t.calorieHigh,t.maintenance*1.05]),range:`objetivo ${fmt(t.calorieLow)}–${fmt(t.calorieHigh)}`},
    {value:tot.protein,unit:'g',status:proteinStatus(tot.protein,t),pct:markerPct(tot.protein,[t.proteinLow*.65,t.proteinLow,t.proteinHigh*.92,t.proteinHigh*1.08]),range:`objetivo ${fmt(t.proteinLow)}–${fmt(t.proteinHigh)}`}
  ];
  cards.slice(0,2).forEach((card,i)=>{
    const v=values[i],head=card.querySelector('.food-scale-head span'),marker=card.querySelector('.food-marker');
    const html=`${fmt(v.value)} ${v.unit} · ${v.status}<small class="food-saved-target">${v.range}</small>`;
    if(head&&head.innerHTML!==html)head.innerHTML=html;
    if(marker)marker.style.left=`${v.pct}%`;
  });
  const reco=document.querySelector('#foodRegisterPane .food-reco'),text=recommendation(day,t,tot);
  if(reco&&reco.textContent!==text)reco.textContent=text;
}
function decorate(){
  if(decorating)return;decorating=true;
  try{
    const day=dayFor();if(!day||!document.querySelector('#foodRegisterPane'))return;
    const t=targetsFor(day)||profileTargetsFor(day),tot=window.PirulinComidas?.totals?.(day);if(!t||!tot)return;
    decorateSummary(day,tot);decorateScales(day,t,tot);
  }finally{decorating=false}
}
async function backfillMissingTargets(){
  const api=window.PirulinComidas,p=profile();if(!api?.saveDay||!api?.targetsFromProfile||!p)return;
  for(const day of days()){
    const id=String(day.date);if(targetsFor(day)||migratedTargetDays.has(id))continue;
    migratedTargetDays.add(id);
    try{
      const targets=api.targetsFromProfile(day.weightKg?{...p,weightKg:day.weightKg}:p);
      await api.saveDay({...day,targets});
    }catch(e){console.warn('Pirulín food target backfill',e);migratedTargetDays.delete(id)}
  }
}
function styles(){
  if(document.querySelector('#comidasDayContextStyle'))return;
  const s=document.createElement('style');s.id='comidasDayContextStyle';s.textContent=`
    #foodRegisterPane .food-weight-line{display:flex;align-items:center;justify-content:center;gap:6px;min-height:25px}
    #foodRegisterPane .food-weight-line b{font-size:17px!important;white-space:nowrap}
    #foodRegisterPane .food-activity-badge{width:25px;height:25px;border-radius:9px;background:#eaf6f1;display:grid;place-items:center;font-size:14px;box-shadow:inset 0 0 0 1px rgba(44,139,105,.08)}
    #foodRegisterPane .food-saved-target{display:block;margin-top:2px;color:#a0a6b0;font-size:8.5px;font-weight:800}
  `;document.head.appendChild(s);
}
function install(){
  if(!window.PirulinComidas||!window.PirulinComidasLive)return false;
  patchSave();styles();
  const root=document.querySelector('#comidasBody');
  if(root&&!root.dataset.contextObserved){
    root.dataset.contextObserved='1';
    new MutationObserver(()=>queueMicrotask(decorate)).observe(root,{childList:true});
  }
  decorate();backfillMissingTargets();return true;
}
function boot(){if(install())return;setTimeout(boot,100)}
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(boot,0);else migratedTargetDays.clear()});
setInterval(()=>{if(window.PirulinFirebase?.user){patchSave();decorate();backfillMissingTargets()}},1200);
boot();
