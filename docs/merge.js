(function (root) {
  "use strict";
  const HEADERS = ["주문ID", "일자", "지점", "상품", "수량", "단가"];
  function parseCSV(input) {
    const text = input.replace(/^\uFEFF/, "");
    const rows = []; let row = [], field = "", quoted = false, closed = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { quoted = false; closed = true; }
        else field += ch;
      } else if (ch === '"') {
        if (field || closed) throw new Error("CSV 따옴표 형식을 확인해 주세요.");
        quoted = true;
      } else if (ch === "," || ch === "\n" || ch === "\r") {
        row.push(field); field = ""; closed = false;
        if (ch !== ",") {
          if (row.some(v => v !== "")) rows.push(row);
          row = [];
          if (ch === "\r" && text[i + 1] === "\n") i++;
        }
      } else {
        if (closed) throw new Error("닫힌 따옴표 뒤의 CSV 형식을 확인해 주세요.");
        field += ch;
      }
    }
    if (quoted) throw new Error("CSV 따옴표가 닫히지 않았습니다.");
    if (field || row.length || closed) { row.push(field); rows.push(row); }
    return rows;
  }
  function merge(files) {
    const accepted = [], excluded = [], branches = new Map(), seen = new Map();
    let inputRows = 0, total = 0;
    for (const file of files) {
      const rows = parseCSV(file.text);
      if (!rows.length || JSON.stringify(rows[0]) !== JSON.stringify(HEADERS)) throw new Error(file.name + ": 열 이름 또는 순서가 다릅니다.");
      for (let i = 1; i < rows.length; i++) {
        inputRows++; const cells = rows[i].map(v => v.trim()); let reason = "";
        if (cells.length !== 6 || cells.some(v => !v)) reason = "필수 값 누락 또는 열 수 오류";
        else if ([cells[0], cells[2], cells[3]].some(v => /^[=+\-@]/.test(v))) reason = "수식으로 해석될 수 있는 텍스트";
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(cells[1]) || !Number.isFinite(Date.parse(cells[1])) || new Date(cells[1]).toISOString().slice(0, 10) !== cells[1] || cells[1].startsWith("0000")) reason = "날짜 형식 오류";
        else if (!/^\d+$/.test(cells[4]) || !/^\d+$/.test(cells[5]) || Number(cells[4]) <= 0) reason = "수량은 양의 정수, 단가는 0 이상의 정수여야 합니다";
        else if (![Number(cells[4]), Number(cells[5]), Number(cells[4]) * Number(cells[5]), total + Number(cells[4]) * Number(cells[5])].every(Number.isSafeInteger)) reason = "정확히 계산할 수 있는 숫자 범위를 초과했습니다";
        else if (seen.has(cells[0])) reason = seen.get(cells[0]) === JSON.stringify(cells) ? "동일 주문 중복" : "동일 주문ID의 값 충돌: 확인 필요";
        if (reason) { excluded.push({file: file.name, row: i + 1, id: cells[0] || "", reason}); continue; }
        const amount = Number(cells[4]) * Number(cells[5]);
        seen.set(cells[0], JSON.stringify(cells));
        total += amount; branches.set(cells[2], (branches.get(cells[2]) || 0) + amount);
        accepted.push({cells, amount, file: file.name, row: i + 1});
      }
    }
    return {inputRows, accepted, excluded, branches: [...branches], total};
  }
  const api = {HEADERS, parseCSV, merge};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CSVMerge = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
