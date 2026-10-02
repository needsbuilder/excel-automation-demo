/* Fictional example. Pure calculation, no requests or customer data. */
(function (root) {
  'use strict';
  const orders = [{id:'D100',amount:30000},{id:'D101',amount:20000},{id:'D102',amount:40000},{id:'D103',amount:50000}];
  const payments = [{id:'D100',amount:30000},{id:'D101',amount:19000},{id:'D103',amount:25000},{id:'D103',amount:25000},{id:'D999',amount:10000}];
  function reconcile(orderRows, paymentRows) {
    const groups = new Map();
    for (const [kind, rows] of [['orders',orderRows],['payments',paymentRows]]) {
      if (!Array.isArray(rows)) throw new Error('행 목록이 필요합니다.');
      rows.forEach((row, i) => {
        if (typeof row.id !== 'string' || !row.id.trim() || !Number.isSafeInteger(row.amount) || row.amount < 0) throw new Error('주문ID와 0 이상의 정수 금액을 확인하세요.');
        const id = row.id.trim();
        if (!groups.has(id)) groups.set(id, {id,orders:[],payments:[]});
        groups.get(id)[kind].push({amount:row.amount,row:i+2});
      });
    }
    const sum = rows => {
      const total = rows.reduce((n,r)=>n+r.amount,0);
      if (!Number.isSafeInteger(total)) throw new Error('금액 합계가 처리 범위를 넘습니다.');
      return total;
    };
    const result = Array.from(groups.values()).map(g => {
      const orderAmount=sum(g.orders), paymentAmount=sum(g.payments);
      let status;
      if (g.orders.length>1 || g.payments.length>1) status='중복 ID 확인';
      else if (!g.orders.length) status='주문 없는 입금';
      else if (!g.payments.length) status='미입금';
      else if (orderAmount!==paymentAmount) status='금액 차이';
      else status='일치';
      return {...g,orderAmount,paymentAmount,status};
    });
    return {rows:result,orderTotal:sum(orderRows),paymentTotal:sum(paymentRows)};
  }
  function csvCell(value) {
    let text=String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function toCSV(rows) {return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';}
  const api={orders,payments,reconcile,toCSV};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.ReconcileDemo=api;
})(typeof globalThis!=='undefined'?globalThis:this);
