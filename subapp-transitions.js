const ROUTES={
  openTasksApp:'tasksSuite',openGastosApp:'gastosSuite',openComidasApp:'comidasSuite',openNotasApp:'notesSuite',
  backToLauncher:'launcher',backFromGastos:'launcher',backFromComidas:'launcher',backFromNotes:'launcher'
};
let bypassRouteAnimation=false;
function visibleSurface(){return ['launcher','tasksSuite','gastosSuite','comidasSuite','notesSuite'].map(id=>document.getElementById(id)).find(el=>el?.classList.contains('show'))||null}
function installStyles(){if(document.querySelector('#subappTransitionStyles'))return;const s=document.createElement('style');s.id='subappTransitionStyles';s.textContent=`
@keyframes pirulinSurfaceIn{from{opacity:.15;transform:translateY(5px) scale(.994)}to{opacity:1;transform:none}}
@keyframes pirulinSurfaceOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-3px) scale(.997)}}
#launcher.pirulin-surface-enter,#tasksSuite.pirulin-surface-enter,#gastosSuite.pirulin-surface-enter,#comidasSuite.pirulin-surface-enter,#notesSuite.pirulin-surface-enter{animation:pirulinSurfaceIn .14s cubic-bezier(.2,.8,.2,1) both}
#launcher.pirulin-surface-leave,#tasksSuite.pirulin-surface-leave,#gastosSuite.pirulin-surface-leave,#comidasSuite.pirulin-surface-leave,#notesSuite.pirulin-surface-leave{animation:pirulinSurfaceOut .085s ease-in both;pointer-events:none}
@media(prefers-reduced-motion:reduce){#launcher.pirulin-surface-enter,#tasksSuite.pirulin-surface-enter,#gastosSuite.pirulin-surface-enter,#comidasSuite.pirulin-surface-enter,#notesSuite.pirulin-surface-enter,#launcher.pirulin-surface-leave,#tasksSuite.pirulin-surface-leave,#gastosSuite.pirulin-surface-leave,#comidasSuite.pirulin-surface-leave,#notesSuite.pirulin-surface-leave{animation:none!important}}
`;document.head.appendChild(s)}
function animateRoute(button,targetId){
  const current=visibleSurface(),original=button.onclick;
  if(typeof original!=='function'){return false}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish=()=>{
    current?.classList.remove('pirulin-surface-leave');
    bypassRouteAnimation=true;try{original.call(button,new MouseEvent('click',{bubbles:false,cancelable:true}))}finally{bypassRouteAnimation=false}
    const target=document.getElementById(targetId);if(target&&!reduced){target.classList.remove('pirulin-surface-enter');void target.offsetWidth;target.classList.add('pirulin-surface-enter');setTimeout(()=>target.classList.remove('pirulin-surface-enter'),155)}
  };
  if(!current||reduced){finish();return true}
  current.classList.remove('pirulin-surface-enter');current.classList.add('pirulin-surface-leave');setTimeout(finish,88);return true;
}
function install(){
  if(document.documentElement.dataset.subappTransitions==='1')return;
  if(!document.getElementById('launcher'))return setTimeout(install,80);
  document.documentElement.dataset.subappTransitions='1';installStyles();
  document.addEventListener('click',e=>{
    if(bypassRouteAnimation)return;
    const button=e.target.closest?.('button[id]');if(!button)return;
    const target=ROUTES[button.id];if(!target)return;
    e.preventDefault();e.stopImmediatePropagation();animateRoute(button,target);
  },true);
}
install();
