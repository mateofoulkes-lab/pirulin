import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, writeBatch, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const OLD_CONFIG={
  apiKey:"AIzaSyAuOadZ5DaVZFkKnKiufvX0dmJUL5kMDTg",
  authDomain:"pingue-split.firebaseapp.com",
  projectId:"pingue-split",
  storageBucket:"pingue-split.firebasestorage.app",
  messagingSenderId:"507240653837",
  appId:"1:507240653837:web:09d1f3b29cc1d2ef99a144"
};
const OLD_GROUP='gastos-compartidos';
const ALLOWED=new Set(['mateofoulkes@gmail.com','danifernandez.sn@gmail.com']);
const $m=(s,r=document)=>r.querySelector(s);
const money=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2});
const fmt=n=>money.format(Math.round(Number(n||0)*100)/100);

function currentState(){return window.PirulinFirebase}
function currentEmail(){return String(currentState()?.user?.email||'').toLowerCase()}
function currentPerson(){return currentState()?.person||'Mateo'}
function sourceApp(){return getApps().find(a=>a.name==='pingueMigration')||initializeApp(OLD_CONFIG,'pingueMigration')}
function targetItems(){return collection(currentState().db,'shared','expenses','items')}
function markerRef(){return doc(currentState().db,'shared','expensesMeta','pingueMigration')}

function patchBalancePerspective(){
  const live=window.PirulinExpensesLive,api=window.PirulinExpenses,main=$m('#gastosSuite .money-balance .balance-main');
  if(!live||!api||!main)return;
  const items=live.items||[],ex=items.filter(x=>!x.settlement),sets=items.filter(x=>x.settlement),b=api.computeBalances(ex,sets).balanceA;
  const person=currentPerson();
  let desired='Están a mano 😊';
  if(Math.abs(b)>0.01){
    if(person==='Mateo')desired=b>0?`Dani te debe ${fmt(b)}`:`Le debés ${fmt(Math.abs(b))} a Dani`;
    else desired=b>0?`Le debés ${fmt(b)} a Mateo`:`Mateo te debe ${fmt(Math.abs(b))}`;
  }
  if(main.textContent!==desired)main.textContent=desired;
  const btn=$m('#openSettleMock');if(btn)btn.style.display=Math.abs(b)<=0.01?'none':'';
}

function installBalanceObserver(){
  const wait=()=>{
    const main=$m('#gastosSuite .money-balance .balance-main');
    if(!main||!window.PirulinExpensesLive)return setTimeout(wait,100);
    patchBalancePerspective();
    new MutationObserver(()=>queueMicrotask(patchBalancePerspective)).observe(main,{childList:true,subtree:true,characterData:true});
  };wait();
}

function ensureMigrationUI(){
  if($m('#pingueMigrationModal'))return;
  const modal=document.createElement('div');modal.id='pingueMigrationModal';modal.className='gastos-modal';modal.innerHTML=`
    <div class="gastos-sheet" style="max-height:88vh;overflow:auto">
      <h2 style="margin:0 0 8px">Traer datos de Pingüé Split</h2>
      <p id="pingueMigrationText" style="margin:0 0 14px;color:#7d8797;font-size:12px;line-height:1.45">Vamos a comparar el historial viejo con Pirulín. No se borra ni modifica nada en Pingüé Split.</p>
      <div id="pingueMigrationReport" style="display:none;background:#f5f7fa;border-radius:14px;padding:12px;margin-bottom:12px;font-size:12px;line-height:1.55"></div>
      <div class="actions">
        <button class="btn secondary" id="pingueMigrationCancel">Cerrar</button>
        <button class="btn primary" id="pingueMigrationAction">Continuar con Google</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const style=document.createElement('style');style.textContent=`
    #pingueMigrationModal.show{display:flex!important}
    #gastosTopMenuMock #migratePingueBtn{font-weight:850}
  `;document.head.appendChild(style);
  $m('#pingueMigrationCancel').onclick=()=>modal.classList.remove('show');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
}

function ensureMenuEntry(){
  const menu=$m('#gastosTopMenuMock');if(!menu||$m('#migratePingueBtn'))return;
  const b=document.createElement('button');b.id='migratePingueBtn';b.textContent='Traer datos de Pingüé Split';
  menu.appendChild(b);
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMigration()});
}

async function authenticateOld(){
  const app=sourceApp(),auth=getAuth(app),wanted=currentEmail();
  if(auth.currentUser&&String(auth.currentUser.email||'').toLowerCase()===wanted)return auth.currentUser;
  if(auth.currentUser)await signOut(auth);
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  const cred=await signInWithPopup(auth,provider),email=String(cred.user?.email||'').toLowerCase();
  if(!ALLOWED.has(email))throw new Error('Esa cuenta no está autorizada en Pingüé Split.');
  if(email!==wanted){await signOut(auth);throw new Error(`Usá la misma cuenta que tenés abierta en Pirulín (${wanted}).`)}
  return cred.user;
}

async function dryRun(){
  await authenticateOld();
  const oldDb=getFirestore(sourceApp());
  const [sourceSnap,targetSnap]=await Promise.all([
    getDocs(collection(oldDb,'groups',OLD_GROUP,'expenses')),
    getDocs(targetItems())
  ]);
  const source=sourceSnap.docs.map(d=>({id:d.id,data:d.data()}));
  const targetIds=new Set(targetSnap.docs.map(d=>d.id));
  const missing=source.filter(x=>!targetIds.has(x.id));
  return{source,targetCount:targetSnap.size,missing,already:source.length-missing.length};
}

async function copyMissing(report,onProgress){
  const db=currentState().db,missing=report.missing;
  let copied=0;
  for(let i=0;i<missing.length;i+=400){
    const chunk=missing.slice(i,i+400),batch=writeBatch(db);
    chunk.forEach(x=>batch.set(doc(db,'shared','expenses','items',x.id),x.data));
    await batch.commit();copied+=chunk.length;onProgress?.(copied,missing.length);
  }
  const verify=await getDocs(targetItems()),ids=new Set(verify.docs.map(d=>d.id));
  const absent=report.source.filter(x=>!ids.has(x.id));
  if(absent.length)throw new Error(`La verificación encontró ${absent.length} movimientos faltantes.`);
  await setDoc(markerRef(),{
    sourceProject:'pingue-split',sourceGroup:OLD_GROUP,sourceCount:report.source.length,
    copiedCount:missing.length,verifiedCount:report.source.length,completedBy:currentEmail(),completedAt:serverTimestamp()
  },{merge:true});
  return{copied,targetCount:verify.size};
}

async function openMigration(){
  ensureMigrationUI();
  const modal=$m('#pingueMigrationModal'),text=$m('#pingueMigrationText'),box=$m('#pingueMigrationReport'),action=$m('#pingueMigrationAction');
  modal.classList.add('show');box.style.display='none';action.disabled=false;action.textContent='Continuar con Google';
  text.textContent='Primero hacemos una comparación. Pingüé Split queda completamente intacto.';
  action.onclick=async()=>{
    action.disabled=true;action.textContent='Comparando…';
    try{
      const report=await dryRun();
      box.style.display='block';box.innerHTML=`<b>Comparación lista</b><br>Pingüé Split: ${report.source.length} movimientos<br>Ya presentes en Pirulín: ${report.already}<br><b>Faltan copiar: ${report.missing.length}</b>`;
      if(!report.missing.length){
        action.textContent='Todo migrado ✓';
        await setDoc(markerRef(),{sourceProject:'pingue-split',sourceGroup:OLD_GROUP,sourceCount:report.source.length,copiedCount:0,verifiedCount:report.source.length,completedBy:currentEmail(),completedAt:serverTimestamp()},{merge:true});
        setTimeout(hideMigrationMenuIfDone,50);return;
      }
      action.disabled=false;action.textContent=`Copiar ${report.missing.length} movimientos`;
      action.onclick=async()=>{
        action.disabled=true;action.textContent='Copiando…';
        try{
          const result=await copyMissing(report,(done,total)=>{action.textContent=`Copiando ${done}/${total}…`});
          box.innerHTML=`<b>Migración verificada ✓</b><br>${result.copied} movimientos copiados.<br>Los ${report.source.length} IDs originales están presentes en Pirulín.`;
          action.textContent='Listo ✓';setTimeout(hideMigrationMenuIfDone,50);
        }catch(err){console.error(err);box.innerHTML=`<b>No se completó la copia.</b><br>${String(err.message||err)}`;action.disabled=false;action.textContent='Reintentar'}
      };
    }catch(err){console.error(err);box.style.display='block';box.innerHTML=`<b>No pude leer Pingüé Split.</b><br>${String(err.message||err)}`;action.disabled=false;action.textContent='Reintentar'}
  };
}

async function hideMigrationMenuIfDone(){
  const btn=$m('#migratePingueBtn');if(!btn||!currentState()?.db)return;
  try{const markerSnap=await getDoc(markerRef());btn.style.display=markerSnap.exists()?'none':''}catch{btn.style.display=''}
}

function installIconOverride(){
  const apply=()=>document.querySelectorAll('img[data-asset="gastos"],img.gastos-logo').forEach(img=>{
    if(img.dataset.pingueIconTried)return;img.dataset.pingueIconTried='1';const fallback=img.src;
    img.onerror=()=>{img.onerror=null;if(fallback)img.src=fallback};img.src='./pingue-icon.svg';
  });
  setTimeout(apply,250);window.addEventListener('pirulin-auth-changed',()=>setTimeout(apply,250));
}

function boot(){
  if(!currentState()?.user||!$m('#gastosSuite'))return setTimeout(boot,100);
  ensureMigrationUI();ensureMenuEntry();hideMigrationMenuIfDone();patchBalancePerspective();
}
installBalanceObserver();installIconOverride();boot();
window.addEventListener('pirulin-auth-changed',e=>{if(e.detail?.signedIn)setTimeout(boot,0)});
window.PirulinExpenseMigration={open:openMigration,dryRun};
