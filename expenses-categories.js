import { collection, doc, getDoc, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const CATEGORIES=[
  'Alimentos','Comidas afuera','Casa','Servicios e impuestos','Salud','Angu',
  'Transporte / Auto','Viajes y ocio','Limpieza','Otros / regalos'
];
const CATEGORY_SET=new Set(CATEGORIES);
const MARKER_PATH=['shared','expenses','meta','categoriesV1'];
const $c=(s,r=document)=>r.querySelector(s);

function norm(s=''){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function has(text,...terms){return terms.some(t=>text.includes(t))}
function classifyExpense(it={}){
  if(it.settlement)return null;
  const rawCat=String(it.cat||'').trim();
  if(CATEGORY_SET.has(rawCat))return rawCat;
  const d=norm(it.desc),c=norm(rawCat);

  if(c==='angu'||c==='veterinaria'||has(d,'angu','bravecto','veterinaria','vacunas angu','pelu angu'))return 'Angu';
  if(c==='limpieza'||c==='lim'||has(d,'limpieza valeria')||d==='valeria')return 'Limpieza';
  if(c==='cem'||c==='farmacia'||has(d,'cem','farmacia','bronax','refrianex','atomo','cpap','loperamida','diclofenac','remedio','medicamento'))return 'Salud';
  if(c==='impuestos'||c==='internet'||c==='luz'||has(d,'impuestos','internet','telered','luz y gas'))return 'Servicios e impuestos';
  if(c==='auto'||c==='nafta'||c==='uber'||(c==='mateo'&&has(d,'repuesto auto'))||has(d,'nafta','uber','remis','repuesto auto','repuestos gandalf','peaje','estacionamiento'))return 'Transporte / Auto';
  if(c==='casa'||c==='ferreteria'||c==='cosas'||has(d,'ferreteria','repuesto canilla','camara y portero','arreglo inodoro','filamento ventanas','pintura ventanas','detector monoxido','toner'))return 'Casa';
  if(c==='regalo'||has(d,'regalo '))return 'Otros / regalos';
  if(['postre','merienda','hamburguesa','bar seddon','comi','comida navidad','gastos ano nuevo','hielo','snacks'].includes(c)||
     has(d,'pizza','helado','pancho','hamburgues','empanad','merienda','desayuno','almuerzo','cena','guerrin','mostaza','rapanui','flan','fabiano','rotiser','vianda','sanguchito','sanguchitos','manush','tutifruti','cosas dulces','chizitos','gaseosa'))return 'Comidas afuera';
  if(['comida','feria','supermercado','carne','polleria','marina','lo marina','com','apidelta','pescado','panaderia'].includes(c)||
     has(d,'carrefour','supermercado','feria','traslasierra','polleria','lo marina','pan marina','pan y queso','apidelta','las rias','huevos','panaderia','queso','mermeladas'))return 'Alimentos';
  if(['viajecito','vacaciones','escapadita'].includes(c)||
     has(d,'hotel','hospedaje','reserva depto','reserva hotel','pasajes','teleferico','puerto blest','entrada ','escape','sinapsis','zanjon','tuneles','bellas artes','refugio','colonia suiza'))return 'Viajes y ocio';
  return 'Otros / regalos';
}

function installCategorySelect(){
  const input=$c('#expenseCategoryMock');
  if(!input)return setTimeout(installCategorySelect,100);
  if(input.tagName==='SELECT')return;
  const select=document.createElement('select');
  select.id=input.id;
  select.className=input.className;
  select.setAttribute('aria-label','Categoría');
  select.innerHTML=CATEGORIES.map(x=>`<option value="${x}">${x}</option>`).join('');
  input.replaceWith(select);

  const modal=$c('#expenseModalMock');
  if(modal){
    new MutationObserver(()=>{
      if(!modal.classList.contains('show'))return;
      const s=$c('#expenseCategoryMock');if(!s)return;
      if(CATEGORY_SET.has(s.value))return;
      const desc=$c('#expenseDescMock')?.value||'';
      s.value=classifyExpense({desc,cat:s.value})||'Otros / regalos';
    }).observe(modal,{attributes:true,attributeFilter:['class']});
  }
}

async function backfillCategories(){
  const fb=window.PirulinFirebase;
  if(!fb?.db||!fb?.user)return setTimeout(backfillCategories,250);
  const marker=doc(fb.db,...MARKER_PATH);
  try{
    if((await getDoc(marker)).exists())return;
    const snap=await getDocs(collection(fb.db,'shared','expenses','items'));
    const changes=[];
    snap.forEach(ds=>{
      const data=ds.data();
      if(data.settlement)return;
      const cat=classifyExpense(data);
      if(cat&&data.cat!==cat)changes.push({ref:ds.ref,cat});
    });
    for(let i=0;i<changes.length;i+=400){
      const batch=writeBatch(fb.db);
      changes.slice(i,i+400).forEach(x=>batch.update(x.ref,{cat:x.cat}));
      await batch.commit();
    }
    const finalBatch=writeBatch(fb.db);
    finalBatch.set(marker,{version:1,updatedCount:changes.length,completedAt:serverTimestamp(),completedBy:fb.user.uid});
    await finalBatch.commit();
    console.info(`[Pirulín] Categorías históricas normalizadas: ${changes.length}`);
  }catch(error){
    console.error('[Pirulín] No pude normalizar categorías históricas',error);
  }
}

window.PirulinExpenseCategories={list:[...CATEGORIES],classify:classifyExpense};
installCategorySelect();
backfillCategories();
