const BOOT_TOTAL_MS=500;
let bootFinished=false;
let overlay=null;
let backdrop=null;
let flyingLogo=null;
let finishTimer=null;

function qs(s,r=document){return r.querySelector(s)}
function visible(el){
  if(!el)return false;
  const r=el.getBoundingClientRect();
  const cs=getComputedStyle(el);
  return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden';
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

function addBootStyles(){
  if(qs('#pirulinBootMotionStyle'))return;
  const style=document.createElement('style');
  style.id='pirulinBootMotionStyle';
  style.textContent=`
    html,body{background:#fff!important;color-scheme:light!important}
    #pirulinBootBackdrop{position:fixed;inset:0;z-index:999997;background:#fff;pointer-events:auto;opacity:1}
    #pirulinBootLogo{position:fixed;z-index:999999;display:block;width:min(270px,76vw);height:auto;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(38,40,48,.08));will-change:transform;pointer-events:none}
    html.pirulin-starting #launcherWrap .launcher-logo{visibility:hidden!important}
    html.pirulin-starting #launcherWrap .launcher-grid{opacity:0!important;transform:translateY(10px);animation:none!important}
    #launcherWrap .launcher-grid{transition:opacity .28s ease,transform .32s cubic-bezier(.22,.8,.2,1)}
    html.pirulin-launch-ready #launcherWrap .launcher-grid{opacity:1!important;transform:none!important}
    @media (prefers-reduced-motion:reduce){#launcherWrap .launcher-grid{transition:none!important}}
  `;
  document.head.appendChild(style);
}

async function makeOverlay(){
  if(overlay||bootFinished)return !!overlay;
  addBootStyles();
  document.documentElement.classList.add('pirulin-starting');
  const target=qs('#launcherWrap .launcher-logo');
  if(!target)return false;
  const src=target.currentSrc||target.src;
  if(!src)return false;

  backdrop=document.createElement('div');
  backdrop.id='pirulinBootBackdrop';
  flyingLogo=document.createElement('img');
  flyingLogo.id='pirulinBootLogo';
  flyingLogo.alt='Pirulín!';
  flyingLogo.src=src;
  overlay=document.createDocumentFragment();
  overlay.append(backdrop,flyingLogo);
  document.body.appendChild(overlay);
  overlay=true;

  try{if(flyingLogo.decode)await flyingLogo.decode()}catch{}
  flyingLogo.style.left='50%';
  flyingLogo.style.top='50%';
  flyingLogo.style.transform='translate(-50%,-50%)';
  return true;
}

function cleanup(showLauncher=true){
  if(bootFinished)return;
  bootFinished=true;
  clearTimeout(finishTimer);
  if(showLauncher)document.documentElement.classList.add('pirulin-launch-ready');
  document.documentElement.classList.remove('pirulin-starting');
  requestAnimationFrame(()=>{
    flyingLogo?.remove();backdrop?.remove();
    document.documentElement.classList.remove('pirulin-launch-ready');
  });
}

async function animateIntoLauncher(){
  if(bootFinished)return;
  if(!(await makeOverlay()))return;
  const target=qs('#launcherWrap .launcher-logo');
  const grid=qs('#launcherWrap .launcher-grid');
  if(!visible(target)||!visible(qs('#launcherWrap'))){return false}

  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const from=flyingLogo.getBoundingClientRect();
  const to=target.getBoundingClientRect();
  if(!from.width||!to.width)return false;

  flyingLogo.style.left=`${from.left}px`;
  flyingLogo.style.top=`${from.top}px`;
  flyingLogo.style.width=`${from.width}px`;
  flyingLogo.style.height=`${from.height}px`;
  flyingLogo.style.transform='none';
  flyingLogo.style.transformOrigin='0 0';

  const dx=to.left-from.left,dy=to.top-from.top,scale=to.width/from.width;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){cleanup(true);return true}

  document.documentElement.classList.add('pirulin-launch-ready');
  const logoAnim=flyingLogo.animate([
    {transform:'translate3d(0,0,0) scale(1)'},
    {transform:`translate3d(${dx}px,${dy}px,0) scale(${scale})`}
  ],{duration:420,easing:'cubic-bezier(.22,.82,.2,1)',fill:'forwards'});
  backdrop.animate([
    {opacity:1,offset:0},
    {opacity:1,offset:.28},
    {opacity:0,offset:1}
  ],{duration:BOOT_TOTAL_MS,easing:'ease-out',fill:'forwards'});
  if(grid){
    grid.animate([
      {opacity:0,transform:'translateY(10px)',offset:0},
      {opacity:0,transform:'translateY(10px)',offset:.22},
      {opacity:1,transform:'translateY(0)',offset:1}
    ],{duration:BOOT_TOTAL_MS,easing:'cubic-bezier(.22,.8,.2,1)',fill:'forwards'});
  }
  finishTimer=setTimeout(()=>cleanup(true),BOOT_TOTAL_MS+20);
  try{await logoAnim.finished}catch{}
  return true;
}

async function tryStart(){
  if(bootFinished)return;
  await makeOverlay();
  const app=qs('#app'),launcher=qs('#launcherWrap'),target=qs('#launcherWrap .launcher-logo');
  if(visible(app)&&visible(launcher)&&visible(target)){
    const ok=await animateIntoLauncher();
    if(ok)return;
  }
  setTimeout(tryStart,45);
}

window.addEventListener('pirulin-auth-changed',e=>{
  if(bootFinished)return;
  if(e.detail?.signedIn){setTimeout(tryStart,0);return}
  // If authentication resolves signed-out, don't block the login screen.
  backdrop?.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});
  flyingLogo?.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'});
  setTimeout(()=>cleanup(false),170);
});

// Start as early as the injected application DOM allows.
setTimeout(tryStart,0);
// Safety valve: never let a startup animation block the UI indefinitely.
setTimeout(()=>{if(!bootFinished)cleanup(visible(qs('#launcherWrap')))},3000);
