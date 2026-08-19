import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const DEFAULT_CATEGORIES = [
  ["Casa", "#ff8f70"],
  ["Trabajo", "#5f8df7"],
  ["Mascota", "#b274e8"],
  ["Auto", "#6d7c92"],
  ["Salud", "#35bfa3"],
  ["Personal", "#e86f9d"],
  ["Compras", "#e2a33b"]
];

function state(){
  const fb=window.PirulinFirebase;
  if(!fb?.db||!fb?.user) throw new Error("Pirulín todavía no terminó de autenticar.");
  return fb;
}
function categoriesCollection(){
  const {db,user}=state();
  return collection(db,"users",user.uid,"taskCategories");
}
function settingsRef(){
  const {db,user}=state();
  return doc(db,"users",user.uid,"settings","main");
}
function categoryId(name){
  return String(name||"").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || `cat-${Date.now()}`;
}
async function saveCategory(category){
  const name=String(category?.name||"").trim();
  if(!name) throw new Error("La categoría necesita nombre.");
  const id=category?.id||categoryId(name);
  await setDoc(doc(categoriesCollection(),id),{
    id,name,
    color:category?.color||"#8b93a6",
    order:Number.isFinite(Number(category?.order))?Number(category.order):0,
    updatedAt:serverTimestamp()
  },{merge:true});
  return {id,name,color:category?.color||"#8b93a6",order:Number(category?.order)||0};
}
async function deleteCategory(category){
  await deleteDoc(doc(categoriesCollection(),category.id));
}
async function renameCategory(category,nextName){
  const name=String(nextName||"").trim();
  if(!name) return category;
  // Mantener el mismo id evita romper tareas existentes; el vínculo funcional es por nombre visible.
  return saveCategory({...category,name});
}
async function ensureDefaultCategories(){
  const current=window.PirulinTaskPreferences?.categories||[];
  if(current.length) return;
  await Promise.all(DEFAULT_CATEGORIES.map(([name,color],order)=>saveCategory({id:categoryId(name),name,color,order})));
}
function subscribeCategories(onChange,onError){
  return onSnapshot(categoriesCollection(),snap=>{
    const items=[];
    snap.forEach(x=>items.push({...x.data(),id:x.id}));
    items.sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||String(a.name).localeCompare(String(b.name),"es"));
    onChange?.(items);
  },onError);
}
async function saveSettings(patch){
  await setDoc(settingsRef(),{...patch,updatedAt:serverTimestamp()},{merge:true});
}
function subscribeSettings(onChange,onError){
  return onSnapshot(settingsRef(),snap=>onChange?.(snap.exists()?snap.data():{}),onError);
}

window.PirulinTaskPreferences={
  categories:[],settings:{defaultReminderMinutes:15},
  saveCategory,deleteCategory,renameCategory,ensureDefaultCategories,subscribeCategories,saveSettings,subscribeSettings
};
