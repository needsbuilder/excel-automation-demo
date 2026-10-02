"use strict";
const $ = id => document.getElementById(id);
const header = "주문ID,일자,지점,상품,수량,단가\n";
const samples = [
  {name:"A지점.csv",text:header+"S001,2026-09-28,A지점,노트,2,12000\nS002,2026-09-28,A지점,펜세트,1,18000\nS003,2026-09-29,A지점,파일,3,5000\n"},
  {name:"B지점.csv",text:header+"S004,2026-09-28,B지점,메모패드,2,8000\nS005,2026-09-29,B지점,스티커,4,6000\nS002,2026-09-28,A지점,펜세트,1,18000\n"},
  {name:"C지점.csv",text:header+"S006,2026-09-28,C지점,정리함,1,20000\nS007,2026-09-29,C지점,라벨,5,3000\nS008,2026-09-29,C지점,노트,수량없음,12000\n"}
];
let files = samples, result = null, reading = false;
const number = value => value.toLocaleString("ko-KR");
function row(body, cells) {
  const tr = document.createElement("tr");
  for (const value of cells) { const td = document.createElement("td"); td.textContent = value; tr.append(td); }
  body.append(tr);
}
function renderFiles() {
  $("files").replaceChildren();
  for (const file of files) {
    const div = document.createElement("div"); div.className = "file";
    const title = document.createElement("strong"); title.textContent = file.name;
    const count = document.createElement("span");
    try { count.textContent = CSVMerge.parseCSV(file.text).length - 1 + "행"; } catch { count.textContent = "형식 확인 필요"; }
    const preview = document.createElement("p"); preview.textContent = file.text.replace(/^\uFEFF/, "").split(/\r?\n/).slice(1, 3).join(" / ");
    div.append(title, count, preview); $("files").append(div);
  }
  $("file-count").textContent = (files === samples ? "가상 " : "선택한 ") + "CSV " + files.length + "개";
}
function clearResults(message) {
  result = null; $("accepted").textContent = $("excluded").textContent = $("total").textContent = "—";
  $("branches").replaceChildren(); $("exceptions").replaceChildren();
  row($("branches"), ["실행 전", "—"]); row($("exceptions"), ["실행 전", "—"]);
  $("download").disabled = true; $("state").textContent = "실행 전"; $("message").textContent = message;
}
$("run").addEventListener("click", () => {
  if (reading) return;
  try {
    result = CSVMerge.merge(files);
    $("accepted").textContent = number(result.accepted.length); $("excluded").textContent = number(result.excluded.length); $("total").textContent = number(result.total);
    $("branches").replaceChildren(); $("exceptions").replaceChildren();
    for (const [branch, total] of result.branches) row($("branches"), [branch, number(total)]);
    for (const item of result.excluded) row($("exceptions"), [item.file+" · "+item.row+"행", item.reason]);
    if (!result.branches.length) row($("branches"), ["정상 결과 없음", "0"]);
    if (!result.excluded.length) row($("exceptions"), ["제외된 행 없음", "—"]);
    $("message").textContent = "입력 " + number(result.inputRows) + "행 중 정상 " + number(result.accepted.length) + "행을 취합했습니다. 원본은 변경하지 않았습니다.";
    $("state").textContent = "실행 완료"; $("download").disabled = !result.accepted.length;
    document.querySelector(".output-pane").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
  } catch (error) { clearResults(error.message); $("state").textContent = "입력 확인 필요"; }
});
$("upload").addEventListener("change", async event => {
  const selected = [...event.target.files];
  if (!selected.length) return;
  clearResults("선택한 파일을 읽고 있습니다.");
  if (selected.length > 10 || selected.reduce((s, f) => s+f.size, 0) > 1024*1024 || selected.some(f => !/\.csv$/i.test(f.name))) { clearResults("CSV 최대 10개, 총 1MB 이하로 선택해 주세요."); event.target.value = ""; return; }
  reading = true; $("run").disabled = true;
  try {
    const decoded = await Promise.all(selected.map(async file => ({name:file.name, text:new TextDecoder("utf-8", {fatal:true}).decode(await file.arrayBuffer())})));
    files = decoded; renderFiles(); clearResults("파일을 읽었습니다. 취합 실행 버튼을 눌러 결과를 확인하세요.");
  } catch { clearResults("UTF-8 CSV로 저장한 파일을 선택해 주세요."); event.target.value = ""; }
  finally { reading = false; $("run").disabled = false; }
});
$("reset").addEventListener("click", () => { if (reading) return; files = samples; $("upload").value = ""; renderFiles(); clearResults("가상 샘플에는 중복 주문 1행과 수량 오류 1행이 들어 있습니다."); });
$("download").addEventListener("click", () => {
  if (!result) return;
  const quote = value => '"'+String(value).replaceAll('"', '""')+'"';
  const lines = [[...CSVMerge.HEADERS, "금액", "원본파일", "원본행"], ...result.accepted.map(r => [...r.cells, r.amount, r.file, r.row])];
  // File names come from visitors and can be interpreted as formulas in Excel.
  const safe = value => /^[=+\-@]/.test(String(value)) ? "'"+value : value;
  const blob = new Blob(["\uFEFF"+lines.map(r => r.map(v => quote(safe(v))).join(",")).join("\r\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "취합결과.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
renderFiles();
