import csv
import hashlib
import tempfile
import unittest
from pathlib import Path

from merge_demo import merge


class ExportTest(unittest.TestCase):
    def test_filename_is_csv_safe_and_original_remains_unchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'input'
            source.mkdir()
            filename = '=FORMULA.csv'
            original = source / filename
            original.write_text('주문ID,일자,지점,상품,수량,단가\nA,2026-09-28,지점,상품,2,100\n', encoding='utf-8')
            before = hashlib.sha256(original.read_bytes()).hexdigest()
            result = merge(source, root / 'output')
            self.assertEqual(result['total_krw'], 200)
            self.assertEqual(result['accepted'][0]['원본파일'], filename)
            self.assertEqual(hashlib.sha256(original.read_bytes()).hexdigest(), before)
            with (root / 'output/취합결과.csv').open(encoding='utf-8-sig', newline='') as f:
                row = next(csv.DictReader(f))
            self.assertEqual(row['원본파일'], "'" + filename)


if __name__ == '__main__':
    unittest.main()
