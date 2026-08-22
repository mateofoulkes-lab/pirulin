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
const str=v=>String(v??'').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function cleanFoods(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`f-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,name:str(x.name)||'Alimento',kcal:Math.max(0,num(x.kcal)||0),protein:Math.max(0,num(x.protein)||0),amount:str(x.amount||x.portion||'')}))}
function cleanSupplements(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`s-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,name:str(x.name)||'Suplemento',amount:str(x.amount||'')}))}
function cleanExercise(list){return (Array.isArray(list)?list:[]).map((x,i)=>({id:str(x.id)||`e-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,type:str(x.type)||'other',name:str(x.name)||'Actividad',durationMin:Math.max(0,num(x.durationMin)||0),routine:str(x.routine||x.routineName||''),details:x.details??null}))}
function normalizeDay(input={}){
  const date=str(input.date)||new Date().toISOString().slice(0,10);
  return {date,foods:cleanFoods(input.foods),supplements:cleanSupplements(input.supplements),exercise:cleanExercise(input.exercise),weightKg:num(input.weightKg??input.weight),updatedAtClient:Date.now()};
}
function totals(day={}){const foods=cleanFoods(day.foods);return {kcal:Math.round(foods.reduce((s,x)=>s+x.kcal,0)),protein:Math.round(foods.reduce((s,x)=>s+x.protein,0)*10)/10,exerciseMin:cleanExercise(day.exercise).reduce((s,x)=>s+x.durationMin,0)}}
async function saveDay(input){const d=normalizeDay(input);await setDoc(doc(daysCol(),d.date),{...d,updatedAt:serverTimestamp()},{merge:false});return d}
async function deleteDay(date){await deleteDoc(doc(daysCol(),str(date)))}
function subscribeDays({onChange,onError}={}){return onSnapshot(daysCol(),snap=>{const out=[];snap.forEach(x=>out.push({...x.data(),date:x.id}));out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));onChange?.(out)},onError)}
function normalizeProfile(p={}){return {...DEFAULT_PROFILE,...p,weightKg:num(p.weightKg)??DEFAULT_PROFILE.weightKg,heightCm:num(p.heightCm)??DEFAULT_PROFILE.heightCm,age:num(p.age)??DEFAULT_PROFILE.age,calorieTargetLow:num(p.calorieTargetLow)??DEFAULT_PROFILE.calorieTargetLow,calorieTargetHigh:num(p.calorieTargetHigh)??DEFAULT_PROFILE.calorieTargetHigh,proteinTargetLow:num(p.proteinTargetLow)??DEFAULT_PROFILE.proteinTargetLow,proteinTargetHigh:num(p.proteinTargetHigh)??DEFAULT_PROFILE.proteinTargetHigh,updatedAtClient:Date.now()}}
async function saveProfile(input){const p=normalizeProfile(input);await setDoc(profileRef(),{...p,updatedAt:serverTimestamp()},{merge:true});return p}
function subscribeProfile({onChange,onError}={}){let seeded=false;return onSnapshot(profileRef(),async snap=>{if(!snap.exists()&&!seeded){seeded=true;try{await saveProfile(DEFAULT_PROFILE)}catch(e){onError?.(e)};return}onChange?.(normalizeProfile(snap.data()||{}))},onError)}
function maintenance(profile){const p=normalizeProfile(profile);if(!p.sex)return null;const base=10*p.weightKg+6.25*p.heightCm-5*p.age+(p.sex==='male'?5:-161);const mult={sedentary:1.2,light:1.375,moderate:1.55,high:1.725}[p.activity]||1.375;return Math.round(base*mult)}
function suggestedCalories(profile){const p=normalizeProfile(profile),m=maintenance(p);if(!m)return {low:p.calorieTargetLow,high:p.calorieTargetHigh,maintenance:null};const factor=p.goal==='lose'?.82:p.goal==='gain'?1.10:1;const center=Math.round(m*factor);return {low:Math.round(center*.92/50)*50,high:Math.round(center*1.08/50)*50,maintenance:m}}
window.PirulinComidas={DEFAULT_PROFILE,normalizeDay,normalizeProfile,saveDay,deleteDay,subscribeDays,saveProfile,subscribeProfile,totals,maintenance,suggestedCalories};
export {DEFAULT_PROFILE,normalizeDay,normalizeProfile,saveDay,deleteDay,subscribeDays,saveProfile,subscribeProfile,totals,maintenance,suggestedCalories};
