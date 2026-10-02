import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from compare_catalog import load, compare, run

ROOT = Path(__file__).resolve().parent


class Acceptance(unittest.TestCase):
    def test_expected_business_outcome(self):
        d = compare(load(ROOT / 'before.csv'), load(ROOT / 'after.csv'))
        self.assertEqual(d['counts'], {'신규': 1, '현재 목록에 없음': 1, '변경': 2, '동일': 1, '확인 필요': 3})
        rows = {r['code']: r for r in d['rows']}
        self.assertEqual(rows['0004']['reason'], '상품명 변경 / 단가 변경')
        self.assertEqual(rows['0005']['before_lines'], [6, 7])
        self.assertEqual(rows['0006']['status'], '확인 필요')
        self.assertEqual((rows['0001']['before_price'], rows['0001']['after_price']), (1000, 1200))

    def test_changed_input_and_duplicate_new_key(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 'after.csv'
            p.write_text((ROOT / 'after.csv').read_text().replace('연필,1200', '연필,1000'), encoding='utf-8')
            d = compare(load(ROOT / 'before.csv'), load(p))
            self.assertEqual((d['counts']['변경'], d['counts']['동일']), (1, 2))
            p.write_text(p.read_text() + '0007,지우개,800\n', encoding='utf-8')
            d = compare(load(ROOT / 'before.csv'), load(p))
            self.assertEqual((d['counts']['신규'], d['counts']['확인 필요']), (0, 4))

    def test_files_preserved_and_csv_text_protected(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 'after.csv'
            p.write_text((ROOT / 'after.csv').read_text().replace('0007,지우개', '=1+1,@名前'), encoding='utf-8')
            sources = [ROOT / 'before.csv', p]
            hashes = [hashlib.sha256(s.read_bytes()).hexdigest() for s in sources]
            out = Path(td) / 'result'
            run(*sources, out)
            expected = (out / 'result.json').read_bytes()
            with self.assertRaises(FileExistsError):
                run(*sources, out)
            self.assertEqual(expected, (out / 'result.json').read_bytes())
            self.assertEqual(hashes, [hashlib.sha256(s.read_bytes()).hexdigest() for s in sources])
            with (out / 'changes.csv').open(encoding='utf-8-sig', newline='') as f:
                rows = list(csv.reader(f))
            self.assertTrue(any(r[0] == "'=1+1" and r[4] == "'@名前" for r in rows[1:]))
            self.assertTrue(any(r[0] == '0001' for r in rows[1:]))
            self.assertEqual(json.loads(expected)['before_rows'], 8)

    def test_invalid_header_no_output_and_no_false_removal(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 'bad.csv'; out = Path(td) / 'result'
            p.write_text('コード,価格\n0001,1200\n', encoding='utf-8')
            with self.assertRaises(ValueError):
                run(ROOT / 'before.csv', p, out)
            self.assertFalse(out.exists())
            # A malformed row belonging to an existing code must be review, never removal.
            p.write_text('상품코드,상품명,단가\n0003,가방,10000,extra\n', encoding='utf-8')
            d = compare(load(ROOT / 'before.csv'), load(p))
            self.assertEqual(next(r for r in d['rows'] if r['code'] == '0003')['status'], '확인 필요')


if __name__ == '__main__':
    unittest.main()
