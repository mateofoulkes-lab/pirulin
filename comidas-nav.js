function installComidasBack(){
  const b=document.querySelector('#backFromComidas');
  if(!b)return setTimeout(installComidasBack,80);
  if(b.dataset.comidasBack==='1')return;
  b.dataset.comidasBack='1';
  b.onclick=()=>{try{window.eval("if(typeof openLauncher==='function')openLauncher()") }catch(e){console.error(e)}};
}
installComidasBack();
