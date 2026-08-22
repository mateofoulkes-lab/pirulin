function fixExpenseSaveToast(event){
  if(event?.detail?.settlement)return;
  const title=document.querySelector('#expenseModalMockTitle')?.textContent||'';
  if(!/editar gasto/i.test(title))return;
  const toast=document.querySelector('.toast');
  if(toast&&/gasto agregado/i.test(toast.textContent||''))toast.textContent='Gasto actualizado';
}
window.addEventListener('pirulin-expense-saved',fixExpenseSaveToast);
