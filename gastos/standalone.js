const mobileQuery=matchMedia('(max-width: 699px)');
function applyDeviceMode(){
  const mobile=mobileQuery.matches || (matchMedia('(pointer: coarse)').matches && innerWidth<900);
  document.body.classList.toggle('device-mobile',mobile);
  document.body.classList.toggle('device-desktop',!mobile);
  const badge=document.getElementById('deviceModeBadge');
  if(badge) badge.textContent=mobile?'CELULAR':'ESCRITORIO';
}
applyDeviceMode();
mobileQuery.addEventListener?.('change',applyDeviceMode);
addEventListener('resize',applyDeviceMode,{passive:true});
if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error),{once:true});
window.addEventListener('pirulin-auth-changed',event=>{
  document.getElementById('login')?.classList.toggle('hidden',!!event.detail?.signedIn);
});