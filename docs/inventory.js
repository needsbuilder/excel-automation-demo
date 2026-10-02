'use strict';
const InventoryDemo = (() => {
  function inspect(rows) {
    if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('입력은 객체 배열이어야 합니다.');
    const ids = rows.map(r => String(r.sku ?? '').trim()), counts = new Map();
    ids.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    const accepted = [], review = [];
    rows.forEach((source, i) => {
      const sku = ids[i], reasons = [];
      if (typeof source.sku !== 'string' || !sku) reasons.push('품목ID는 비어 있지 않은 문자열이어야 함');
      else if (counts.get(sku) > 1) reasons.push('중복 품목ID: 합산하지 않음');
      for (const field of ['stock', 'reserved', 'target']) {
        if (!Number.isSafeInteger(source[field]) || source[field] < 0) reasons.push(field + ': 0 이상의 정수 필요');
      }
      if (!reasons.length && source.reserved > source.stock) reasons.push('예약 수량이 현재 재고보다 큼');
      if (reasons.length) { review.push({source_row:i + 1, sku, reasons, source:{...source}}); return; }
      const available = source.stock - source.reserved, shortage = Math.max(source.target - available, 0);
      accepted.push({source_row:i + 1, sku, stock:source.stock, reserved:source.reserved, target:source.target, available, shortage});
    });
    const total = accepted.reduce((sum, r) => sum + r.shortage, 0);
    if (!Number.isSafeInteger(total)) throw new Error('수량 합계가 이 예시의 정수 처리 범위를 넘었습니다.');
    return {fictional_example:true, input_rows:rows.length, accepted, review, candidate_skus:accepted.filter(r => r.shortage > 0).length, candidate_units:total};
  }
  function csv(result) {
    const rows = [['가상 데이터로 만든 작업 예시'], ['판정','품목ID','현재 재고','예약 수량','목표 가용 수량','가용 수량','부족 수량','원본 행','확인 사유'],
      ...result.accepted.map(r => ['정상',r.sku,r.stock,r.reserved,r.target,r.available,r.shortage,r.source_row,'']),
      ...result.review.map(r => ['확인',r.sku,r.source.stock,r.source.reserved,r.source.target,'','',r.source_row,r.reasons.join('; ')])];
    const cell = v => {let s=String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"';};
    return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
  }
  return {inspect, csv};
})();
if (typeof module !== 'undefined') module.exports = InventoryDemo;
