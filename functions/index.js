const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');

initializeApp();
const db=getFirestore();

async function registrationsExcept(uid){
  const snap=await db.collection('shared').doc('pushRegistrations').collection('items').get();
  return snap.docs.map(d=>d.data()).filter(x=>x?.fid&&x.uid&&x.uid!==uid);
}

async function personForUid(uid){
  if(!uid)return 'Alguien';
  const snap=await db.collection('shared').doc('pushRegistrations').collection('items').where('uid','==',uid).limit(1).get();
  return snap.empty?'Alguien':(snap.docs[0].data().person||'Alguien');
}

async function sendToOther({actorUid,title,body,kind,url}){
  const regs=await registrationsExcept(actorUid);
  if(!regs.length)return;
  const messages=regs.map(r=>({
    token:r.fid,
    data:{title,body,kind,url,tag:`pirulin-${kind}`},
    webpush:{
      headers:{Urgency:'normal',Topic:`pirulin-${kind}`},
      fcmOptions:{link:`https://mateofoulkes-lab.github.io/pirulin/${url||''}`}
    }
  }));
  const result=await getMessaging().sendEach(messages);
  const bad=[];
  result.responses.forEach((res,i)=>{if(!res.success){const code=res.error?.code||'';if(code.includes('registration-token-not-registered')||code.includes('invalid-argument'))bad.push(regs[i].fid)}});
  if(bad.length){
    const batch=db.batch();
    const col=db.collection('shared').doc('pushRegistrations').collection('items');
    for(const fid of bad)batch.delete(col.doc(encodeURIComponent(fid)));
    await batch.commit();
  }
}

exports.notifyNewExpense=onDocumentCreated('shared/expenses/items/{itemId}',async event=>{
  const x=event.data?.data();if(!x||x.settlement===true)return;
  const actorUid=x.createdBy||x.updatedBy||null;
  const person=await personForUid(actorUid);
  const amount=x.amountPending===true?'monto pendiente':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(x.amount||0));
  await sendToOther({actorUid,title:'Nuevo gasto en Pirulín',body:`${person} registró ${x.desc||'un gasto'} · ${amount}`,kind:'gastos',url:'#gastos'});
});

exports.notifySharedTask=onDocumentCreated('shared/tasks/items/{taskId}',async event=>{
  const x=event.data?.data();if(!x)return;
  const actorUid=x.createdByUid||null;
  const person=x.createdBy||await personForUid(actorUid);
  await sendToOther({actorUid,title:'Nueva tarea compartida',body:`${person} compartió “${x.title||'una tarea'}”`,kind:'tareas',url:'#tareas'});
});

exports.notifyFoodPlan=onDocumentCreated('shared/foodPlan/items/{itemId}',async event=>{
  const x=event.data?.data();if(!x)return;
  const actorUid=x.createdByUid||null;
  const person=x.createdBy||await personForUid(actorUid);
  await sendToOther({actorUid,title:'Nueva comida en el plan',body:`${person} agregó “${x.text||'una comida'}” al plan`,kind:'comidas',url:'#comidas'});
});
