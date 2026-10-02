const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {parseCSV, merge, HEADERS} = require("./docs/merge.js");
const header = HEADERS.join(",") + "\n";
const file = text => ({name:"test.csv", text:header + text});
test("published sample matches independently checked Python results", () => {
  const dir = path.join(__dirname, "sample/input");
  const r = merge(fs.readdirSync(dir).sort().map(name => ({name, text:fs.readFileSync(path.join(dir, name), "utf8")})));
  assert.equal(r.inputRows, 9); assert.equal(r.accepted.length, 7); assert.equal(r.excluded.length, 2); assert.equal(r.total, 132000);
  assert.deepEqual(r.branches, [["A지점",57000],["B지점",40000],["C지점",35000]]);
  assert.equal(r.excluded[0].row, 4); assert.equal(r.excluded[0].file, "B지점.csv");
});
test("CSV quoted commas, embedded newlines, BOM, CRLF and escaped quotes", () => {
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"x,y","line\n""two"""\r\n'), [["a","b"],["x,y",'line\n"two"']]);
  assert.throws(() => parseCSV('a,b\n"unfinished,1'), /닫히지/);
  assert.throws(() => parseCSV('a,b\n"closed"bad,1'), /형식/);
});
test("conflicting IDs and invalid dates, numbers, formula text are isolated", () => {
  const r = merge([file("A,2026-09-28,지점,상품,1,100\nA,2026-09-28,지점,상품,2,100\nB,2026-02-29,지점,상품,1,100\nC,2026-09-28,지점,상품,0,100\nD,2026-09-28,지점,=FORMULA,1,100\nE,2026-09-28,지점,상품,1,0\nF,2026-09-28,지점,상품,9007199254740992,1\n")]);
  assert.equal(r.accepted.length, 2); assert.equal(r.excluded.length, 5); assert.equal(r.total, 100);
  assert.match(r.excluded[0].reason, /값 충돌/);
});
test("a mismatched schema prevents partial results", () => {
  assert.throws(() => merge([file("A,2026-09-28,지점,상품,1,100\n"), {name:"bad.csv",text:"다른열\n1"}]), /열 이름/);
});
