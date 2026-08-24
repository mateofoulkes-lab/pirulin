const ROUTES={
  openTasksApp:'tasksSuite',openGastosApp:'gastosSuite',openComidasApp:'comidasSuite',openNotasApp:'notesSuite',
  backToLauncher:'launcher',backFromGastos:'launcher',backFromComidas:'launcher',backFromNotes:'launcher'
};
const SURFACES=['launcher','tasksSuite','gastosSuite','comidasSuite','notesSuite'];
let bypassRouteAnimation=false;
let handlingPopState=false;

function visibleSurface(){return SURFACES.map(id=>document.getElementById(id)).find(el=>el?.classList.contains('show'))||null}
function visibleSurfaceId(){return visibleSurface()?.id||'launcher'}
function installStyles(){if(document.querySelector('#subappTransitionStyles'))return;const s=document.createElement('style');s.id='subappTransitionStyles';s.textContent=`
@keyframes pirulinSurfaceIn{from{opacity:.15;transform:translateY(5px) scale(.994)}to{opacity:1;transform:none}}
@keyframes pirulinSurfaceOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-3px) scale(.997)}}
#launcher.pirulin-surface-enter,#tasksSuite.pirulin-surface-enter,#gastosSuite.pirulin-surface-enter,#comidasSuite.pirulin-surface-enter,#notesSuite.pirulin-surface-enter{animation:pirulinSurfaceIn .14s cubic-bezier(.2,.8,.2,1) both}
#launcher.pirulin-surface-leave,#tasksSuite.pirulin-surface-leave,#gastosSuite.pirulin-surface-leave,#comidasSuite.pirulin-surface-leave,#notesSuite.pirulin-surface-leave{animation:pirulinSurfaceOut .085s ease-in both;pointer-events:none}
@media(prefers-reduced-motion:reduce){#launcher.pirulin-surface-enter,#tasksSuite.pirulin-surface-enter,#gastosSuite.pirulin-surface-enter,#comidasSuite.pirulin-surface-enter,#notesSuite.pirulin-surface-enter,#launcher.pirulin-surface-leave,#tasksSuite.pirulin-surface-leave,#gastosSuite.pirulin-surface-leave,#comidasSuite.pirulin-surface-leave,#notesSuite.pirulin-surface-leave{animation:none!important}}
`;document.head.appendChild(s)}

function fallbackRoute(targetId){
  try{
    if(targetId==='launcher')return window.eval("typeof openLauncher==='function'?(openLauncher(),true):false");
    if(targetId==='tasksSuite')return window.eval("typeof openTasksApp==='function'?(openTasksApp(),true):false");
    if(targetId==='gastosSuite')return window.eval("typeof openGastosApp==='function'?(openGastosApp(),true):false");
    if(targetId==='comidasSuite')return window.eval("typeof openComidasApp==='function'?(openComidasApp(),true):false");
    if(targetId==='notesSuite')return window.eval("typeof openNotesApp==='function'?(openNotesApp(),true):false");
  }catch(e){console.error('Pirulín route fallback',e)}
  return false;
}

function syncHistoryAfterRoute(targetId,{fromPop=false}={}){
  if(fromPop)return;
  const state={...(history.state||{}),pirulinSurface:targetId};
  if(targetId==='launcher'){
    history.replaceState(state,'',location.href);
    return;
  }
  if(history.state?.pirulinSurface===targetId)return;
  history.pushState(state,'',location.href);
}

function animateRoute(button,targetId,{fromPop=false}={}){
  const current=visibleSurface(),original=button?.onclick;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish=()=>{
    current?.classList.remove('pirulin-surface-leave');
    bypassRouteAnimation=true;
    try{
      if(typeof original==='function')original.call(button,new MouseEvent('click',{bubbles:false,cancelable:true}));
      else fallbackRoute(targetId);
    }finally{bypassRouteAnimation=false}
    syncHistoryAfterRoute(targetId,{fromPop});
    const target=document.getElementById(targetId);
    if(target&&!reduced){target.classList.remove('pirulin-surface-enter');void target.offsetWidth;target.classList.add('pirulin-surface-enter');setTimeout(()=>target.classList.remove('pirulin-surface-enter'),155)}
  };
  if(!current||reduced){finish();return true}
  current.classList.remove('pirulin-surface-enter');current.classList.add('pirulin-surface-leave');setTimeout(finish,88);return true;
}

function routeFromHistory(targetId){
  const target=SURFACES.includes(targetId)?targetId:'launcher';
  const current=visibleSurfaceId();
  if(current===target)return;
  animateRoute(null,target,{fromPop:true});
}

function install(){
  if(document.documentElement.dataset.subappTransitions==='1')return;
  if(!document.getElementById('launcher'))return setTimeout(install,80);
  document.documentElement.dataset.subappTransitions='1';installStyles();

  history.replaceState({...(history.state||{}),pirulinSurface:'launcher'},'',location.href);

  document.addEventListener('click',e=>{
    if(bypassRouteAnimation)return;
    const button=e.target.closest?.('button[id]');if(!button)return;
    const target=ROUTES[button.id];if(!target)return;
    e.preventDefault();e.stopImmediatePropagation();

    const current=visibleSurfaceId();
    if(target==='launcher'&&current!=='launcher'&&history.state?.pirulinSurface===current){
      history.back();
      return;
    }
    animateRoute(button,target);
  },true);

  window.addEventListener('popstate',e=>{
    if(handlingPopState)return;
    handlingPopState=true;
    try{routeFromHistory(e.state?.pirulinSurface||'launcher')}
    finally{setTimeout(()=>{handlingPopState=false},120)}
  });
}
install();
