const BOOT_TOTAL_MS=500;
let bootFinished=false;
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

function addBootStyles(){
  if(qs('#pirulinBootMotionStyle'))return;
  const style=document.createElement('style');
  style.id='pirulinBootMotionStyle';
  style.textContent=`
    html,body{background:#fff!important;color-scheme:light!important}
    #pirulinBootBackdrop{position:fixed;inset:0;z-index:999997;background:#fff!important;pointer-events:auto;opacity:1}
    #pirulinBootLogo{position:fixed;z-index:999999;display:block;width:min(188px,58vw);height:auto;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(38,40,48,.07));will-change:transform;pointer-events:none}
    html.pirulin-starting #launcher .pirulin-launcher-brand{visibility:hidden!important}
    html.pirulin-starting #launcher .app-grid{opacity:0!important;transform:translateY(8px)!important;animation:none!important}
    html.pirulin-launch-ready #launcher .app-grid{opacity:1!important;transform:none!important}
    @media (prefers-reduced-motion:reduce){#launcher .app-grid{transition:none!important}}
  `;
  document.head.appendChild(style);
}

async function makeOverlay(){
  if(backdrop||bootFinished)return !!backdrop;
  addBootStyles();
  document.documentElement.classList.add('pirulin-starting');
  const target=qs('#launcher .pirulin-launcher-brand');
  if(!target)return false;
  const src=target.currentSrc||target.src;
  if(!src)return false;

  backdrop=document.createElement('div');
  backdrop.id='pirulinBootBackdrop';
  flyingLogo=document.createElement('img');
  flyingLogo.id='pirulinBootLogo';
  flyingLogo.alt='Pirulín!';
  flyingLogo.src=src;
  document.body.append(backdrop,flyingLogo);
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
    flyingLogo?.remove();
    backdrop?.remove();
    document.documentElement.classList.remove('pirulin-launch-ready');
  });
}

async function animateIntoLauncher(){
  if(bootFinished)return false;
  if(!(await makeOverlay()))return false;
  const target=qs('#launcher .pirulin-launcher-brand');
  const grid=qs('#launcher .app-grid');
  const launcher=qs('#launcher');
  if(!visible(target)||!visible(launcher))return false;

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

  const dx=to.left-from.left;
  const dy=to.top-from.top;
  const scale=to.width/from.width;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){cleanup(true);return true}

  const logoAnim=flyingLogo.animate([
    {transform:'translate3d(0,0,0) scale(1)'},
    {transform:`translate3d(${dx}px,${dy}px,0) scale(${scale})`}
  ],{duration:440,easing:'cubic-bezier(.22,.82,.2,1)',fill:'forwards'});

  backdrop.animate([
    {opacity:1,offset:0},
    {opacity:1,offset:.34},
    {opacity:0,offset:1}
  ],{duration:BOOT_TOTAL_MS,easing:'ease-out',fill:'forwards'});

  if(grid){
    grid.animate([
      {opacity:0,transform:'translateY(8px)',offset:0},
      {opacity:0,transform:'translateY(8px)',offset:.30},
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
  const launcher=qs('#launcher');
  const target=qs('#launcher .pirulin-launcher-brand');
  if(visible(launcher)&&visible(target)){
    const ok=await animateIntoLauncher();
    if(ok)return;
  }
  setTimeout(tryStart,35);
}

window.addEventListener('pirulin-auth-changed',e=>{
  if(bootFinished)return;
  if(e.detail?.signedIn){setTimeout(tryStart,0);return}
  backdrop?.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});
  flyingLogo?.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'});
  setTimeout(()=>cleanup(false),170);
});

setTimeout(tryStart,0);
setTimeout(()=>{if(!bootFinished)cleanup(visible(qs('#launcher')))},3000);
