'use strict';
const PriceLookupDemo = (() => {
  function lookup(orders, prices) {
    const counts = (rows, key) => rows.reduce((m, row) => {const v = row[key].trim(); m.set(v, (m.get(v) || 0) + 1); return m;}, new Map());
    const pc = counts(prices, 'sku'), oc = counts(orders, 'order_id');
    const catalog = new Map(), priceReview = [], accepted = [], review = [];
    const integer = (value, min) => {
      const text = String(value).trim(), n = Number(text);
      return /^[0-9]+$/.test(text) && Number.isSafeInteger(n) && n >= min ? n : null;
    };
    prices.forEach((source, i) => {
      const sku = source.sku.trim(), n = integer(source.unit_price, 0), reasons = [];
      if (!sku) reasons.push('상품코드 없음');
      else if (pc.get(sku) > 1) reasons.push('중복 상품코드: 임의 선택하지 않음');
      if (n === null) reasons.push('단가: 0 이상의 정수 원 필요');
      if (reasons.length) priceReview.push({source_row: i + 2, source: {...source}, reasons});
      else catalog.set(sku, [n, i + 2]);
    });
    orders.forEach((source, i) => {
      const id = source.order_id.trim(), sku = source.sku.trim(), quantity = integer(source.quantity, 1), reasons = [];
      if (!id) reasons.push('주문ID 없음');
      else if (oc.get(id) > 1) reasons.push('중복 주문ID: 모든 해당 행 확인 필요');
      if (!sku) reasons.push('상품코드 없음');
      else if (!pc.get(sku)) reasons.push('단가표에 없는 상품코드');
      else if (pc.get(sku) > 1) reasons.push('단가표 중복 상품코드');
      else if (!catalog.has(sku)) reasons.push('단가표의 단가 오류');
      if (quantity === null) reasons.push('수량: 1 이상의 정수 필요');
      if (reasons.length) {review.push({source_row: i + 2, source: {...source}, reasons}); return;}
      const [unit_price, price_source_row] = catalog.get(sku), amount = quantity * unit_price;
      if (!Number.isSafeInteger(amount)) throw new Error('계산 금액이 이 예시의 정수 처리 범위를 넘었습니다.');
      accepted.push({order_id:id, sku, quantity, unit_price, amount, order_source_row:i + 2, price_source_row});
    });
    const total = accepted.reduce((s, r) => s + r.amount, 0);
    if (!Number.isSafeInteger(total)) throw new Error('합계가 이 예시의 정수 처리 범위를 넘었습니다.');
    return {fictional_example:true, input_order_rows:orders.length, accepted, review, price_review:priceReview, accepted_total_krw:total};
  }
  function toCSV(rows) {
    const cell = value => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
  }
  return {lookup, toCSV};
})();
if (typeof module !== 'undefined') module.exports = PriceLookupDemo;
