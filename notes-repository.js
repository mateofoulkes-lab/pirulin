import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const DEFAULT_CATEGORIES = [
  {id:"ideas",name:"Ideas",parent:null},
  {id:"business",name:"Negocios",parent:"ideas"},
  {id:"business-names",name:"Nombres de negocio",parent:"business"},
  {id:"games",name:"Juegos",parent:"ideas"},
  {id:"personal",name:"Personal",parent:null},
  {id:"travel",name:"Viajes",parent:"personal"},
  {id:"home",name:"Casa",parent:"personal"},
  {id:"work",name:"Trabajo",parent:null},
  {id:"humor",name:"Humor",parent:null}
];

const EXAMPLE_NOTES = [
  {
    id:"example-rich-note",
    title:"Ideas para una tarde libre",
    body:"<div>Una nota puede mezclar <strong>negrita</strong>, <em>cursiva</em> y listas sin mostrar códigos.</div><h3>Posibilidades</h3><ul><li>Salir a caminar</li><li>Probar una receta</li><li>Avanzar un proyecto</li></ul>",
    tags:["ideas","personal"],
    pinned:false,
    shared:false,
    drawing:""
  },
  {
    id:"example-todo-note",
    title:"Checklist de ejemplo",
    body:"<div>También podés usar una nota como lista rápida:</div><div class=\"note-todo\"><input type=\"checkbox\"><span contenteditable=\"true\">Comprar café</span></div><div class=\"note-todo\"><input type=\"checkbox\"><span contenteditable=\"true\">Responder mensajes</span></div><div class=\"note-todo\"><input type=\"checkbox\" checked><span contenteditable=\"true\">Abrir Pirulín 😄</span></div>",
    tags:["personal"],
    pinned:false,
    shared:false,
    drawing:""
  }
];

function requireFirebase(){
  const state=window.PirulinFirebase;
  if(!state?.db||!state?.user||!state?.person) throw new Error("Pirulín todavía no terminó de autenticar.");
  return state;
}
function privateNotes(){const {db,user}=requireFirebase();return collection(db,"users",user.uid,"notes")}
function noteMeta(){const {db,user}=requireFirebase();return collection(db,"users",user.uid,"noteMeta")}
function noteCategories(){const {db,user}=requireFirebase();return collection(db,"users",user.uid,"noteCategories")}
function sharedNotes(){const {db}=requireFirebase();return collection(db,"shared","notes","items")}
function examplesMarker(){const {db,user}=requireFirebase();return doc(db,"users",user.uid,"settings","notesExamples")}

function normalizeNote(input={}){
  const state=window.PirulinFirebase;
  const now=Date.now();
  return {
    id:String(input.id||`note-${now}-${Math.random().toString(36).slice(2,7)}`),
    title:String(input.title||"Sin título").trim()||"Sin título",
    body:String(input.body||""),
    drawing:String(input.drawing||""),
    shared:!!input.shared,
    pinned:!!input.pinned,
    tags:Array.isArray(input.tags)?[...new Set(input.tags.map(String))]:[],
    createdBy:input.createdBy||state?.person||null,
    createdByUid:input.createdByUid||state?.user?.uid||null,
    updatedBy:state?.person||input.updatedBy||null,
    updatedByUid:state?.user?.uid||input.updatedByUid||null,
    updatedAtClient:now
  };
}

async function saveMeta(note){
  const n=normalizeNote(note);
  await setDoc(doc(noteMeta(),n.id),{
    tags:n.tags,
    pinned:n.pinned,
    updatedAtClient:Date.now(),
    updatedAt:serverTimestamp()
  },{merge:true});
}

async function saveNote(input,{previousShared=null}={}){
  const n=normalizeNote(input);
  const wasShared=previousShared===null?n.shared:!!previousShared;
  const oldRef=doc(wasShared?sharedNotes():privateNotes(),n.id);
  const newRef=doc(n.shared?sharedNotes():privateNotes(),n.id);

  if(n.shared){
    await setDoc(newRef,{
      id:n.id,title:n.title,body:n.body,drawing:n.drawing,shared:true,
      createdBy:n.createdBy,createdByUid:n.createdByUid,
      updatedBy:n.updatedBy,updatedByUid:n.updatedByUid,
      updatedAtClient:n.updatedAtClient,updatedAt:serverTimestamp()
    },{merge:true});
    await saveMeta(n);
  }else{
    await setDoc(newRef,{...n,shared:false,updatedAt:serverTimestamp()},{merge:true});
    try{await deleteDoc(doc(noteMeta(),n.id))}catch{}
  }
  if(oldRef.path!==newRef.path) await deleteDoc(oldRef);
  return n;
}

async function deleteNote(note){
  const n=normalizeNote(note);
  await deleteDoc(doc(n.shared?sharedNotes():privateNotes(),n.id));
  try{await deleteDoc(doc(noteMeta(),n.id))}catch{}
}

async function seedExampleNotesOnce(){
  const marker=examplesMarker();
  const existing=await getDoc(marker);
  if(existing.exists())return false;
  for(const sample of EXAMPLE_NOTES) await saveNote(sample,{previousShared:false});
  await setDoc(marker,{seeded:true,seededAt:serverTimestamp(),version:1},{merge:true});
  return true;
}

function subscribeNotes({onChange,onError}={}){
  const priv=new Map(), shared=new Map(), meta=new Map();
  let a=false,b=false,c=false;
  const emit=()=>{
    if(!a||!b||!c)return;
    const out=[];
    priv.forEach((v,id)=>out.push({...v,id,shared:false,tags:Array.isArray(v.tags)?v.tags:[],pinned:!!v.pinned}));
    shared.forEach((v,id)=>{
      const m=meta.get(id)||{};
      out.push({...v,id,shared:true,tags:Array.isArray(m.tags)?m.tags:[],pinned:!!m.pinned});
    });
    out.sort((x,y)=>Number(y.pinned)-Number(x.pinned)||(Number(y.updatedAtClient)||0)-(Number(x.updatedAtClient)||0));
    onChange?.(out);
  };
  const ua=onSnapshot(privateNotes(),s=>{priv.clear();s.forEach(x=>priv.set(x.id,x.data()));a=true;emit()},e=>onError?.(e));
  const ub=onSnapshot(sharedNotes(),s=>{shared.clear();s.forEach(x=>shared.set(x.id,x.data()));b=true;emit()},e=>onError?.(e));
  const uc=onSnapshot(noteMeta(),s=>{meta.clear();s.forEach(x=>meta.set(x.id,x.data()));c=true;emit()},e=>onError?.(e));
  return ()=>{ua();ub();uc()};
}

async function saveCategory(category){
  const id=String(category?.id||"").trim();
  const name=String(category?.name||"").trim();
  if(!id||!name)throw new Error("Categoría inválida");
  await setDoc(doc(noteCategories(),id),{id,name,parent:category.parent||null,updatedAt:serverTimestamp()},{merge:true});
}
async function deleteCategory(id){await deleteDoc(doc(noteCategories(),String(id)))}
async function seedCategories(){await Promise.all(DEFAULT_CATEGORIES.map(saveCategory))}
function subscribeCategories({onChange,onError}={}){
  let seeded=false;
  return onSnapshot(noteCategories(),async s=>{
    const items=[];s.forEach(x=>items.push({...x.data(),id:x.id}));
    if(!items.length&&!seeded){seeded=true;try{await seedCategories()}catch(e){onError?.(e)};return}
    onChange?.(items);
  },e=>onError?.(e));
}

window.PirulinNotes={normalizeNote,saveNote,deleteNote,seedExampleNotesOnce,subscribeNotes,saveCategory,deleteCategory,subscribeCategories,seedCategories,DEFAULT_CATEGORIES};
export {normalizeNote,saveNote,deleteNote,seedExampleNotesOnce,subscribeNotes,saveCategory,deleteCategory,subscribeCategories,seedCategories,DEFAULT_CATEGORIES};
