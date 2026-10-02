'use strict';
const {orders,payments,reconcile,toCSV}=ReconcileDemo;
const money=n=>n.toLocaleString('ko-KR');
let latest=null;
function run(){
  const value=document.querySelector('#payment-amount').value.trim();
  const message=document.querySelector('#message');
  try {
    if (!/^\d+$/.test(value)) throw new Error('입금액은 0 이상의 정수로 입력하세요.');
    const input=payments.map((p,i)=>({...p,amount:i===1?Number(value):p.amount}));
    latest=reconcile(orders,input);
    const rows=document.querySelector('#results');rows.replaceChildren();
    for (const r of latest.rows){
      const tr=document.createElement('tr');
      for(const text of [r.id,r.orders.length?money(r.orderAmount):'—',r.payments.length?money(r.paymentAmount):'—',r.status,'주문 '+(r.orders.map(x=>x.row).join('·')||'없음')+' / 입금 '+(r.payments.map(x=>x.row).join('·')||'없음')]){
        const td=document.createElement('td');td.textContent=text;tr.append(td);
      }rows.append(tr);
    }
    document.querySelector('#accepted').textContent=latest.rows.filter(r=>r.status==='일치').length;
    document.querySelector('#excluded').textContent=latest.rows.filter(r=>r.status!=='일치').length;
    document.querySelector('#total').textContent=money(latest.paymentTotal);
    document.querySelector('#state').textContent='계산 완료';
    message.textContent='주문 합계 '+money(latest.orderTotal)+'원 / 입금 합계 '+money(latest.paymentTotal)+'원. 중복 ID는 합계가 같아도 일치로 확정하지 않습니다.';
    document.querySelector('#download').disabled=false;
  }catch(e){
    latest=null;document.querySelector('#results').replaceChildren();
    for(const id of ['accepted','excluded','total']) document.querySelector('#'+id).textContent='—';
    document.querySelector('#state').textContent='입력 확인';message.textContent=e.message;document.querySelector('#download').disabled=true;
  }
}
document.querySelector('#run').addEventListener('click',run);
document.querySelector('#download').addEventListener('click',()=>{
  if(!latest)return;
  const csv=toCSV([['가상 데이터로 만든 작업 예시'],['주문ID','주문액','입금액','판정','주문 원본 행','입금 원본 행'],...latest.rows.map(r=>[r.id,r.orders.length?r.orderAmount:'',r.payments.length?r.paymentAmount:'',r.status,r.orders.map(x=>x.row).join(';'),r.payments.map(x=>x.row).join(';')])]);
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='가상예시-주문입금대조.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
