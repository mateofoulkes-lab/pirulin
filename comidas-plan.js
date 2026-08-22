let stopMealPlan=null;
let mealPlanItems=[],mealPlanDate='';
const qp=(s,r=document)=>r.querySelector(s),qpa=(s,r=document)=>[...r.querySelectorAll(s)];
const isoP=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const escP=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function dateObjP(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)}
function shiftP(s,n){const d=dateObjP(s);d.setDate(d.getDate()+n);return isoP(d)}
function labelP(s){const today=isoP(),d=dateObjP(s);if(s===today)return 'Hoy';if(s===shiftP(today,1))return 'Mañana';return d.toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}).replace('.','')}
function sayP(m){try{window.eval(`if(typeof say==='function')say(${JSON.stringify(m)})`)}catch{console.log(m)}}
function otherP(){return window.PirulinFirebase?.person==='Mateo'?'Dani':'Mateo'}

function installPlanUI(){
  const app=qp('#comidasApp');if(!app||app.dataset.planUi==='1')return !!app;
  app.dataset.planUi='1';
  const head=qp('.comidas-head',app),datebar=qp('.comidas-datebar',app),scroll=qp('.comidas-scroll',app),fab=qp('#foodPasteFab',app);
  if(!head||!datebar||!scroll||!fab)return false;
  const tabs=document.createElement('div');tabs.className='food-mode-tabs';tabs.innerHTML='<button class="active" data-food-mode="plan">Plan</button><button data-food-mode="register">Registro</button>';head.insertAdjacentElement('afterend',tabs);
  const reg=document.createElement('div');reg.id='foodRegisterPane';reg.className='food-pane';datebar.parentNode.insertBefore(reg,datebar);reg.append(datebar,scroll,fab);
  const plan=document.createElement('div');plan.id='foodPlanPane';plan.className='food-pane active';plan.innerHTML=`<div class="plan-datebar"><button id="planPrev">‹</button><label><strong id="planDayLabel">Hoy</strong><input id="planDate" type="date"></label><button id="planNext">›</button></div><div id="planScroll" class="plan-scroll"><div id="planBody"></div></div><button id="planAdd" class="plan-fab" type="button">+ Agregar comida</button>`;reg.insertAdjacentElement('beforebegin',plan);
  reg.classList.remove('active');
  const modal=document.createElement('div');modal.id='planModal';modal.className='comidas-modal';modal.innerHTML=`<div class="comidas-sheet"><h2 id="planModalTitle">Agregar al plan</h2><div class="cm-grid"><div class="cm-field"><label>Hora (opcional)</label><input id="planTime" type="time"></div><div class="cm-field full"><label>Qué van a comer</label><input id="planText" placeholder="Ej. Pollo con ensalada"></div></div><div class="comidas-actions"><button data-close="planModal">Cancelar</button><button class="primary" id="planSave">Guardar</button></div></div>`;app.parentNode.appendChild(modal);
  const style=document.createElement('style');style.id='comidasPlanStyle';style.textContent=`
    #comidasSuite .food-mode-tabs{display:grid;grid-template-columns:1fr 1fr;background:#eef1f5;border-radius:16px;padding:3px;margin:0 0 10px}
    #comidasSuite .food-mode-tabs button{border:0;background:transparent;border-radius:13px;padding:9px;font-size:12px;font-weight:900;color:#858c98;transition:.16s}
    #comidasSuite .food-mode-tabs button.active{background:#fff;color:#363d48;box-shadow:0 4px 12px rgba(28,39,73,.08)}
    #comidasSuite .food-pane{display:none;min-height:0;flex:1;position:relative}
    #comidasSuite .food-pane.active{display:flex;flex-direction:column}
    #comidasSuite .plan-datebar{height:48px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;background:#fff;border:1px solid #eceff4;border-radius:18px;box-shadow:0 7px 20px rgba(29,42,77,.045);margin-bottom:10px}
    #comidasSuite .plan-datebar button{border:0;background:transparent;font-size:25px;color:#687185}.plan-datebar label{text-align:center;position:relative}.plan-datebar strong{font-size:14px}.plan-datebar input{position:absolute;inset:0;opacity:0;width:100%}
    #comidasSuite .plan-scroll{flex:1;overflow:auto;padding-bottom:100px;scrollbar-width:none}.plan-scroll::-webkit-scrollbar{display:none}
    #comidasSuite .plan-empty{background:#fff;border:1px dashed #dfe3ea;border-radius:20px;padding:28px 20px;text-align:center;color:#9097a3;margin-top:5px}.plan-empty b{display:block;color:#525b69;margin-bottom:5px}
    #comidasSuite .plan-item{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;background:#fff;border:1px solid #eceff4;border-radius:18px;padding:12px 11px;margin:8px 0;box-shadow:0 6px 18px rgba(29,42,77,.035)}
    #comidasSuite .plan-time{font-size:11px;font-weight:900;color:#858d99;text-align:center}.plan-time.no-time{color:#c2c6cd}
    #comidasSuite .plan-copy b{display:block;font-size:13px;color:#343b46;line-height:1.25}.plan-copy small{display:block;margin-top:3px;font-size:9.5px;color:#969da8}.plan-more{border:0;background:transparent;width:32px;height:32px;color:#707987;font-weight:900}
    #comidasSuite .plan-fab{position:absolute;right:0;bottom:20px;z-index:25;border:0;border-radius:17px;padding:13px 16px;background:linear-gradient(145deg,#ff7b62,#ff5e5b);color:#fff;font-size:12px;font-weight:900;box-shadow:0 14px 28px rgba(255,94,91,.24)}
    #comidasSuite .plan-person-mateo{color:#4e86d8}.plan-person-dani{color:#d26d9d}
    #comidasSuite .plan-past-note{font-size:10px;color:#a08758;background:#fff8e8;border-radius:12px;padding:8px 10px;margin:3px 0 8px}
  `;document.head.appendChild(style);
  wirePlan();return true;
}
function dayItems(){return mealPlanItems.filter(x=>x.date===mealPlanDate)}
function renderPlan(){const body=qp('#planBody');if(!body)return;qp('#planDate').value=mealPlanDate;qp('#planDayLabel').textContent=labelP(mealPlanDate);const items=dayItems(),past=mealPlanDate<isoP();body.innerHTML=`${past?'<div class="plan-past-note">Este es un día pasado del plan. El registro real de lo que comiste está en Registro.</div>':''}${items.length?items.map(x=>`<div class="plan-item" data-plan-id="${escP(x.id)}"><div class="plan-time ${x.time?'':'no-time'}">${x.time||'—'}</div><div class="plan-copy"><b>${escP(x.text)}</b><small class="plan-person-${String(x.createdBy||'').toLowerCase()}">${escP(x.createdBy||'')} ${x.updatedBy&&x.updatedBy!==x.createdBy?'· editó '+escP(x.updatedBy):''}</small></div><button class="plan-more" type="button">•••</button></div>`).join(''):`<div class="plan-empty"><b>Nada planeado todavía</b>Agregá una comida para ${labelP(mealPlanDate).toLowerCase()}.</div>`}`;const add=qp('#planAdd');if(add)add.style.display=past?'none':''}
function openPlanModal(item=null){const m=qp('#planModal');m.dataset.id=item?.id||'';qp('#planModalTitle').textContent=item?'Editar comida planeada':'Agregar al plan';qp('#planTime').value=item?.time||'';qp('#planText').value=item?.text||'';m.classList.add('show');setTimeout(()=>qp('#planText')?.focus(),30)}
async function savePlanModal(){const id=qp('#planModal').dataset.id,item=id?mealPlanItems.find(x=>x.id===id):null,text=qp('#planText').value.trim();if(!text)return sayP('Escribí qué van a comer');await window.PirulinComidas.savePlanItem({...item,id:id||undefined,date:item?.date||mealPlanDate,time:qp('#planTime').value,text});qp('#planModal').classList.remove('show');sayP(id?'Plan actualizado':`Agregado al plan compartido con ${otherP()}`)}
async function deletePlan(id){const item=mealPlanItems.find(x=>x.id===id);if(!item||!confirm(`¿Eliminar “${item.text}” del plan?`))return;await window.PirulinComidas.deletePlanItem(id);sayP('Eliminado del plan')}
function planMenu(card,btn){let m=qp('#planItemMenu');if(!m){m=document.createElement('div');m.id='planItemMenu';m.className='comidas-pop';m.innerHTML='<button data-plan-act="edit">Editar</button><button data-plan-act="delete" style="color:#d95762">Eliminar</button>';document.body.appendChild(m)}m.dataset.id=card.dataset.planId;const r=btn.getBoundingClientRect();m.style.left=`${Math.max(8,r.right-170)}px`;m.style.top=`${r.bottom+4}px`;m.style.width='170px';m.classList.add('show')}
function switchMode(mode){qpa('[data-food-mode]').forEach(b=>b.classList.toggle('active',b.dataset.foodMode===mode));qp('#foodPlanPane').classList.toggle('active',mode==='plan');qp('#foodRegisterPane').classList.toggle('active',mode==='register');if(mode==='plan')renderPlan()}
function wirePlan(){mealPlanDate=mealPlanDate||isoP();qpa('[data-food-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.foodMode));qp('#planPrev').onclick=()=>{mealPlanDate=shiftP(mealPlanDate,-1);renderPlan()};qp('#planNext').onclick=()=>{mealPlanDate=shiftP(mealPlanDate,1);renderPlan()};qp('#planDate').onchange=e=>{mealPlanDate=e.target.value||isoP();renderPlan()};qp('#planAdd').onclick=()=>openPlanModal();qp('#planSave').onclick=()=>savePlanModal().catch(e=>{console.error(e);sayP(e.message||'No pude guardar')});document.addEventListener('click',e=>{const more=e.target.closest?.('#foodPlanPane .plan-more');if(more){e.preventDefault();e.stopImmediatePropagation();planMenu(more.closest('.plan-item'),more);return}const act=e.target.closest?.('#planItemMenu [data-plan-act]');if(act){const id=qp('#planItemMenu').dataset.id,item=mealPlanItems.find(x=>x.id===id);qp('#planItemMenu').classList.remove('show');if(act.dataset.planAct==='edit')openPlanModal(item);else deletePlan(id).catch(console.error)}},true);document.addEventListener('pointerdown',e=>{if(!e.target.closest('#planItemMenu,.plan-more'))qp('#planItemMenu')?.classList.remove('show')},true);renderPlan()}
function startPlan(){if(!window.PirulinComidas?.subscribePlan||!window.PirulinFirebase?.user||!installPlanUI())return false;stopMealPlan?.();stopMealPlan=window.PirulinComidas.subscribePlan({onChange:items=>{mealPlanItems=items;renderPlan()},onError:e=>console.error('Pirulín plan',e)});return true}
function bootPlan(){if(startPlan())return;setTimeout(bootPlan,100)}
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(bootPlan,0);else{stopMealPlan?.();stopMealPlan=null;mealPlanItems=[]}});if(window.PirulinFirebase?.user)bootPlan();else setTimeout(bootPlan,120);
window.PirulinMealPlan={get items(){return [...mealPlanItems]},render:renderPlan};
