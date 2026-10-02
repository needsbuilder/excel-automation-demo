'use strict';
let latestInventory = null;
const el = id => document.getElementById(id);
function inventoryTable(target, rows) {
  el(target).replaceChildren();
  rows.forEach(row => {const tr=document.createElement('tr'); row.forEach(value => {const td=document.createElement('td'); td.textContent=value; tr.append(td);}); el(target).append(tr);});
}
function clearInventory(message) {
  latestInventory=null; el('download').disabled=true;
  for (const id of ['normal','review','units']) el(id).textContent='—';
  inventoryTable('results',[]);el('message').textContent=message;el('state').textContent='입력 확인';
}
function runInventory() {
  try {
    const text=el('stock').value.trim();
    if (!/^[0-9]+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('S002 재고는 0 이상의 정수로 입력하세요. 쉼표·소수는 사용하지 않습니다.');
    const rows=InventorySample.map((r,i)=>({...r,stock:i===1?Number(text):r.stock}));
    const result=InventoryDemo.inspect(rows);
    const display=[...result.accepted.map(r=>({row:r.source_row,cells:[r.sku,r.available,r.shortage,'정상',r.source_row]})),...result.review.map(r=>({row:r.source_row,cells:[r.sku,'—','—',r.reasons.join(' · '),r.source_row]}))].sort((a,b)=>a.row-b.row);
    inventoryTable('results',display.map(r=>r.cells));
    el('normal').textContent=result.accepted.length;el('review').textContent=result.review.length;el('units').textContent=result.candidate_units.toLocaleString('ko-KR');
    el('message').textContent=result.input_rows+'행을 확인했습니다. 부족 '+result.candidate_skus+'품목 / '+result.candidate_units+'개이며, 확인할 행은 부족 수량 합계에서 제외합니다.';
    el('state').textContent='계산 완료';el('download').disabled=false;latestInventory=result;
  } catch(e) {clearInventory(e.message);}
}
inventoryTable('inputs',InventorySample.map((r,i)=>[r.sku,r.stock,r.reserved,r.target,i+1]));
el('run').addEventListener('click',runInventory);
el('stock').addEventListener('input',()=>{clearInventory('재고를 변경했습니다. 다시 실행하세요.');inventoryTable('inputs',InventorySample.map((r,i)=>[r.sku,i===1?el('stock').value:r.stock,r.reserved,r.target,i+1]));});
el('reset').addEventListener('click',()=>{el('stock').value='7';inventoryTable('inputs',InventorySample.map((r,i)=>[r.sku,r.stock,r.reserved,r.target,i+1]));runInventory();});
el('download').addEventListener('click',()=>{
  if(!latestInventory)return;
  const url=URL.createObjectURL(new Blob([InventoryDemo.csv(latestInventory)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='가상예시-재고점검.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
