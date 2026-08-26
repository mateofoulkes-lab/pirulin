import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const DEFAULT_PROFILE={
  weightKg:135,heightCm:185,age:43,sex:'',activity:'light',goal:'lose',
  calorieTargetLow:1900,calorieTargetHigh:2300,proteinTargetLow:130,proteinTargetHigh:160,
  autoCalories:false,updatedAtClient:Date.now()
};

function state(){
  const s=window.PirulinFirebase;
  if(!s?.db||!s?.user)throw new Error('Pirulín todavía no terminó de autenticar.');
  return s;
}
function daysCol(){const {db,user}=state();return collection(db,'users',user.uid,'foodDays')}
function profileRef(){const {db,user}=state();return doc(db,'users',user.uid,'foodSettings','profile')}
function planCol(){const {db}=state();return collection(db,'shared','foodPlan','items')}
const str=v=>String(v??'').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function cleanFoods(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`f-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,name:str(x.name)||'Alimento',kcal:Math.max(0,num(x.kcal)||0),protein:Math.max(0,num(x.protein)||0),amount:str(x.amount||x.portion||'')}))}
function cleanSupplements(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`s-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,name:str(x.name)||'Suplemento',amount:str(x.amount||'')}))}
function cleanExercise(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`e-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,type:str(x.type)||'other',name:str(x.name)||'Actividad',durationMin:Math.max(0,num(x.durationMin)||0),routine:str(x.routine||x.routineName||''),details:x.details??null}))}
function cleanTargets(input){
  const t=input||{};
  const calorieLow=num(t.calorieLow??t.calorieTargetLow??t.expectedCalories?.low);
  const calorieHigh=num(t.calorieHigh??t.calorieTargetHigh??t.expectedCalories?.high);
  const maintenance=num(t.maintenance??t.expectedCalories?.maintenance);
  const proteinLow=num(t.proteinLow??t.proteinTargetLow??t.expectedProtein?.low);
  const proteinHigh=num(t.proteinHigh??t.proteinTargetHigh??t.expectedProtein?.high);
  if([calorieLow,calorieHigh,proteinLow,proteinHigh].some(v=>v==null))return null;
  return {calorieLow,calorieHigh,maintenance,proteinLow,proteinHigh,profileWeightKg:num(t.profileWeightKg)};
}
function normalizeDay(input={}){
  const date=str(input.date)||new Date().toISOString().slice(0,10);
  return {date,foods:cleanFoods(input.foods),supplements:cleanSupplements(input.supplements),exercise:cleanExercise(input.exercise),weightKg:num(input.weightKg??input.weight),targets:cleanTargets(input.targets||input),updatedAtClient:Date.now()};
}
function totals(day={}){const foods=cleanFoods(day.foods);return {kcal:Math.round(foods.reduce((s,x)=>s+x.kcal,0)),protein:Math.round(foods.reduce((s,x)=>s+x.protein,0)*10)/10,exerciseMin:cleanExercise(day.exercise).reduce((s,x)=>s+x.durationMin,0)}}
async function saveDay(input){const d=normalizeDay(input);await setDoc(doc(daysCol(),d.date),{...d,updatedAt:serverTimestamp()},{merge:false});return d}
async function deleteDay(date){await deleteDoc(doc(daysCol(),str(date)))}
function subscribeDays({onChange,onError}={}){return onSnapshot(daysCol(),snap=>{const out=[];snap.forEach(x=>out.push({...x.data(),date:x.id}));out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));onChange?.(out)},onError)}

function normalizePlanItem(input={}){
  const s=state(),now=Date.now();
  return {
    id:str(input.id)||`plan-${now}-${Math.random().toString(36).slice(2,6)}`,
    date:str(input.date)||new Date().toISOString().slice(0,10),
    time:str(input.time||''),
    text:str(input.text),
    createdBy:input.createdBy||s.person||null,
    createdByUid:input.createdByUid||s.user.uid,
    updatedBy:s.person||input.updatedBy||null,
    updatedByUid:s.user.uid,
    updatedAtClient:now
  };
}
function notifyPlanItem(item){
  if(!window.PirulinNotifications?.notifyOther)return;
  const who=window.PirulinFirebase?.person||'Alguien';
  window.PirulinNotifications.notifyOther({
    kind:'food-plan',
    title:'Pirulín! · Comidas',
    body:`${who} agregó al plan: ${item.text}`,
    url:'#comidas'
  }).catch?.(()=>{});
}
async function savePlanItem(input){
  const isNew=!input?.id;
  const p=normalizePlanItem(input);
  if(!p.text)throw new Error('Escribí qué van a comer.');
  await setDoc(doc(planCol(),p.id),{...p,updatedAt:serverTimestamp()},{merge:true});
  if(isNew)notifyPlanItem(p);
  return p
}
async function deletePlanItem(id){await deleteDoc(doc(planCol(),str(id)))}
function subscribePlan({onChange,onError}={}){return onSnapshot(planCol(),snap=>{const out=[];snap.forEach(x=>out.push({...x.data(),id:x.id}));out.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||'').localeCompare(String(b.time||''))||Number(a.updatedAtClient||0)-Number(b.updatedAtClient||0));onChange?.(out)},onError)}

function normalizeProfile(p={}){return {...DEFAULT_PROFILE,...p,weightKg:num(p.weightKg)??DEFAULT_PROFILE.weightKg,heightCm:num(p.heightCm)??DEFAULT_PROFILE.heightCm,age:num(p.age)??DEFAULT_PROFILE.age,calorieTargetLow:num(p.calorieTargetLow)??DEFAULT_PROFILE.calorieTargetLow,calorieTargetHigh:num(p.calorieTargetHigh)??DEFAULT_PROFILE.calorieTargetHigh,proteinTargetLow:num(p.proteinTargetLow)??DEFAULT_PROFILE.proteinTargetLow,proteinTargetHigh:num(p.proteinTargetHigh)??DEFAULT_PROFILE.proteinTargetHigh,updatedAtClient:Date.now()}}
async function saveProfile(input){const p=normalizeProfile(input);await setDoc(profileRef(),{...p,updatedAt:serverTimestamp()},{merge:true});return p}
function subscribeProfile({onChange,onError}={}){let seeded=false;return onSnapshot(profileRef(),async snap=>{if(!snap.exists()&&!seeded){seeded=true;try{await saveProfile(DEFAULT_PROFILE)}catch(e){onError?.(e)};return}onChange?.(normalizeProfile(snap.data()||{}))},onError)}
function maintenance(profile){const p=normalizeProfile(profile);if(!p.sex)return null;const base=10*p.weightKg+6.25*p.heightCm-5*p.age+(p.sex==='male'?5:-161);const mult={sedentary:1.2,light:1.375,moderate:1.55,high:1.725}[p.activity]||1.375;return Math.round(base*mult)}
function suggestedCalories(profile){const p=normalizeProfile(profile),m=maintenance(p);if(!m)return {low:p.calorieTargetLow,high:p.calorieTargetHigh,maintenance:null};const factor=p.goal==='lose'?.82:p.goal==='gain'?1.10:1;const center=Math.round(m*factor);return {low:Math.round(center*.92/50)*50,high:Math.round(center*1.08/50)*50,maintenance:m}}
function targetsFromProfile(profile){const p=normalizeProfile(profile),s=suggestedCalories(p);return {calorieLow:p.autoCalories?s.low:p.calorieTargetLow,calorieHigh:p.autoCalories?s.high:p.calorieTargetHigh,maintenance:s.maintenance||Math.round(p.calorieTargetHigh*1.22),proteinLow:p.proteinTargetLow,proteinHigh:p.proteinTargetHigh,profileWeightKg:p.weightKg}}
window.PirulinComidas={DEFAULT_PROFILE,normalizeDay,normalizeProfile,cleanTargets,targetsFromProfile,saveDay,deleteDay,subscribeDays,normalizePlanItem,savePlanItem,deletePlanItem,subscribePlan,saveProfile,subscribeProfile,totals,maintenance,suggestedCalories};
export {DEFAULT_PROFILE,normalizeDay,normalizeProfile,cleanTargets,targetsFromProfile,saveDay,deleteDay,subscribeDays,normalizePlanItem,savePlanItem,deletePlanItem,subscribePlan,saveProfile,subscribeProfile,totals,maintenance,suggestedCalories};
