import {doc,getDoc} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const $d=(s,r=document)=>r.querySelector(s);
let pendingDate='';
let deleting=false;

const isoToday=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function notify(message){
  try{window.eval(`if(typeof say==='function')say(${JSON.stringify(message)})`)}catch{console.log(message)}
}

function dateFromIso(iso){
  const [y,m,d]=String(iso||'').split('-').map(Number);
  return new Date(y,m-1,d,12,0,0,0);
}

function humanDate(iso){
  const d=dateFromIso(iso),today=new Date();
  const options={day:'numeric',month:'long'};
  if(d.getFullYear()!==today.getFullYear())options.year='numeric';
  return d.toLocaleDateString('es-AR',options);
}

function currentDate(){
  return $d('#foodDate')?.value||isoToday();
}

function liveHasDate(date){
  return (window.PirulinComidasLive?.days||[]).some(day=>day?.date===date);
}

async function firestoreHasDate(date){
  const state=window.PirulinFirebase;
  if(!state?.db||!state?.user)return false;
  const snap=await getDoc(doc(state.db,'users',state.user.uid,'foodDays',date));
  return snap.exists();
}

function ensureStyles(){
  if($d('#comidasDeleteDayStyle'))return;
  const style=document.createElement('style');
  style.id='comidasDeleteDayStyle';
  style.textContent=`
    #comidasMenu .food-delete-day{color:#d44750!important;border-top:1px solid #f0e3e5!important;margin-top:5px!important;padding-top:11px!important}
    #foodDeleteDayModal .delete-day-sheet{padding-top:20px}
    #foodDeleteDayModal .delete-day-warning{font-size:13px;line-height:1.5;color:#626a76;margin:2px 0 0}
    #foodDeleteDayModal .delete-day-warning strong{display:block;color:#343a45;margin-bottom:6px;font-size:14px}
    #foodDeleteDayModal .delete-day-warning em{display:block;font-style:normal;color:#b33f48;font-weight:900;margin-top:8px}
    #foodDeleteDayModal .delete-day-confirm{background:linear-gradient(145deg,#e65c64,#d44750)!important;color:#fff!important;box-shadow:0 8px 20px rgba(212,71,80,.18)}
    #foodDeleteDayModal .delete-day-confirm:disabled{opacity:.55;box-shadow:none}
  `;
  document.head.appendChild(style);
}

function ensureUi(){
  const menu=$d('#comidasMenu'),suite=$d('#comidasSuite');
  if(!menu||!suite)return false;
  ensureStyles();

  if(!$d('#comidasDeleteDayAction')){
    const action=document.createElement('button');
    action.id='comidasDeleteDayAction';
    action.type='button';
    action.className='food-delete-day';
    action.textContent='Eliminar día';
    action.addEventListener('click',openDeleteDay);
    menu.appendChild(action);
  }

  if(!$d('#foodDeleteDayModal')){
    suite.insertAdjacentHTML('beforeend',`
      <div id="foodDeleteDayModal" class="comidas-modal" role="dialog" aria-modal="true" aria-labelledby="foodDeleteDayTitle">
        <div class="comidas-sheet delete-day-sheet">
          <h2 id="foodDeleteDayTitle">Eliminar día</h2>
          <p class="delete-day-warning">
            <strong id="foodDeleteDayDate"></strong>
            Esto eliminará todas las comidas, suplementos, ejercicios y demás datos guardados para este día.
            <em>Esta acción no se puede deshacer.</em>
          </p>
          <div class="comidas-actions">
            <button id="foodDeleteDayCancel" type="button">Cancelar</button>
            <button id="foodDeleteDayConfirm" class="delete-day-confirm" type="button">Eliminar día</button>
          </div>
        </div>
      </div>`);
    $d('#foodDeleteDayCancel').addEventListener('click',closeDeleteDay);
    $d('#foodDeleteDayConfirm').addEventListener('click',confirmDeleteDay);
    $d('#foodDeleteDayModal').addEventListener('click',event=>{
      if(event.target.id==='foodDeleteDayModal')closeDeleteDay();
    });
  }
  return true;
}

function closeMenu(){
  $d('#comidasMenu')?.classList.remove('show');
}

function closeDeleteDay(){
  if(deleting)return;
  pendingDate='';
  $d('#foodDeleteDayModal')?.classList.remove('show');
}

async function openDeleteDay(){
  closeMenu();
  const date=currentDate();
  if(!liveHasDate(date)){
    notify('No se encontró ningún registro para esa fecha.');
    return;
  }
  try{
    if(!(await firestoreHasDate(date))){
      notify('No se encontró ningún registro para esa fecha.');
      return;
    }
  }catch(error){
    console.error('Pirulín Comidas: no pude verificar el día',error);
    notify('No pude verificar ese día. Probá de nuevo.');
    return;
  }
  pendingDate=date;
  $d('#foodDeleteDayTitle').textContent=`Eliminar ${humanDate(date)}`;
  $d('#foodDeleteDayDate').textContent=`Registro del ${humanDate(date)}`;
  $d('#foodDeleteDayModal').classList.add('show');
}

function goToToday(){
  const input=$d('#foodDate');
  if(!input)return;
  input.value=isoToday();
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

async function confirmDeleteDay(){
  if(deleting||!pendingDate)return;
  const date=pendingDate;
  const button=$d('#foodDeleteDayConfirm');
  deleting=true;
  button.disabled=true;
  button.textContent='Eliminando…';
  try{
    if(!(await firestoreHasDate(date))){
      $d('#foodDeleteDayModal').classList.remove('show');
      pendingDate='';
      notify('No se encontró ningún registro para esa fecha.');
      return;
    }
    await window.PirulinComidas.deleteDay(date);
    $d('#foodDeleteDayModal').classList.remove('show');
    pendingDate='';
    goToToday();
    notify('Día eliminado');
  }catch(error){
    console.error('Pirulín Comidas: error eliminando día',error);
    notify('No pude eliminar el día. Probá de nuevo.');
  }finally{
    deleting=false;
    button.disabled=false;
    button.textContent='Eliminar día';
  }
}

function boot(){
  if(ensureUi())return;
  setTimeout(boot,120);
}

window.addEventListener('pirulin-auth-changed',event=>{
  if(event.detail?.signedIn)setTimeout(boot,80);
  else{pendingDate='';$d('#foodDeleteDayModal')?.classList.remove('show')}
});

setTimeout(boot,180);
window.PirulinComidasDeleteDay={open:openDeleteDay,confirm:confirmDeleteDay};
