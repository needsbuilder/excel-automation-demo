'use strict';
let latest = null;
const money = n => n.toLocaleString('ko-KR');
function tableRows(target, rows) {
  const body = document.querySelector(target); body.replaceChildren();
  for (const row of rows) {const tr = document.createElement('tr'); for (const value of row) {const td = document.createElement('td'); td.textContent = value; tr.append(td);} body.append(tr);}
}
function renderPrices() {
  tableRows('#prices', PriceLookupSample.prices.map((p, i) => [p.sku, i === 0 ? document.querySelector('#unit-price').value : money(Number(p.unit_price))]));
}
function run() {
  try {
    const text = document.querySelector('#unit-price').value.trim();
    if (!/^[0-9]+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('단가는 0 이상의 정수로 입력하세요. 쉼표·소수는 사용하지 않습니다.');
    const prices = PriceLookupSample.prices.map((p, i) => ({...p, unit_price:i === 0 ? text : p.unit_price}));
    latest = PriceLookupDemo.lookup(PriceLookupSample.orders, prices);
    const all = [...latest.accepted.map(r => ({row:r.order_source_row, cells:[r.order_id+' / '+r.sku, r.quantity, money(r.amount)+'원', '주문 '+r.order_source_row+' / 단가 '+r.price_source_row]})), ...latest.review.map(r => ({row:r.source_row, cells:[r.source.order_id+' / '+r.source.sku, r.source.quantity, r.reasons.join(' · '), '주문 '+r.source_row]}))].sort((a,b)=>a.row-b.row);
    tableRows('#results', all.map(r=>r.cells)); renderPrices();
    document.querySelector('#accepted').textContent=latest.accepted.length;
    document.querySelector('#excluded').textContent=latest.review.length;
    document.querySelector('#total').textContent=money(latest.accepted_total_krw);
    document.querySelector('#state').textContent='계산 완료';
    document.querySelector('#message').textContent='주문 '+latest.input_order_rows+'행을 모두 확인했습니다. 단가표의 중복 상품코드 2행은 임의 선택하지 않고 확인 대상으로 남깁니다.';
    document.querySelector('#download').disabled=false;
  } catch (e) {
    latest=null; tableRows('#results', []);
    for(const id of ['accepted','excluded','total']) document.querySelector('#'+id).textContent='—';
    document.querySelector('#state').textContent='입력 확인';
    document.querySelector('#message').textContent=e.message;
    document.querySelector('#download').disabled=true;
  }
}
document.querySelector('#run').addEventListener('click',run);
document.querySelector('#unit-price').addEventListener('input',()=>{latest=null;document.querySelector('#download').disabled=true;document.querySelector('#state').textContent='입력 변경';document.querySelector('#message').textContent='변경한 단가로 다시 실행하세요.';for(const id of ['accepted','excluded','total'])document.querySelector('#'+id).textContent='—';tableRows('#results',[]);renderPrices();});
document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#unit-price').value='12000';run();});
document.querySelector('#download').addEventListener('click',()=>{
  if(!latest)return;
  const rows=[['가상 데이터로 만든 작업 예시'],['판정','주문ID','상품코드','수량','단가','금액','주문 원본 행','단가 원본 행','확인 사유'],...latest.accepted.map(r=>['정상',r.order_id,r.sku,r.quantity,r.unit_price,r.amount,r.order_source_row,r.price_source_row,'']),...latest.review.map(r=>['확인',r.source.order_id,r.source.sku,r.source.quantity,'','',r.source_row,'',r.reasons.join('; ')])];
  const url=URL.createObjectURL(new Blob([PriceLookupDemo.toCSV(rows)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='가상예시-상품단가조회.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
renderPrices();
