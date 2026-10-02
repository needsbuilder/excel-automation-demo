import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from price_lookup import lookup, read_csv

ROOT = Path(__file__).resolve().parent


class Acceptance(unittest.TestCase):
    def setUp(self):
        self.orders = read_csv(ROOT / 'orders.csv', ['order_id', 'sku', 'quantity'])
        self.prices = read_csv(ROOT / 'prices.csv', ['sku', 'unit_price'])

    def test_independent_fixed_expectation_and_duplicates(self):
        original = copy.deepcopy((self.orders, self.prices))
        result = lookup(self.orders, self.prices)
        self.assertEqual([(r['order_id'], r['sku'], r['unit_price'], r['amount']) for r in result['accepted']],
                         [('Q001', '0001', 12000, 24000), ('Q002', '0002', 9000, 27000),
                          ('Q003', '0003', 5000, 20000)])
        self.assertEqual(result['accepted_total_krw'], 71000)
        self.assertEqual([r['source_row'] for r in result['review']], [5, 6, 7, 8, 9])
        self.assertEqual([r['source_row'] for r in result['price_review']], [5, 6])
        self.assertEqual((self.orders, self.prices), original)

    def test_price_change_recalculates_and_exact_code_matching(self):
        self.prices[0]['unit_price'] = '13000'
        result = lookup(self.orders, self.prices)
        self.assertEqual(result['accepted_total_krw'], 73000)
        self.orders[0]['sku'] = '1'
        result = lookup(self.orders, self.prices)
        self.assertEqual(result['accepted_total_krw'], 47000)
        self.assertEqual(result['review'][0]['reasons'], ['단가표에 없는 상품코드'])

    def test_invalid_price_and_quantity_do_not_silently_become_zero(self):
        for bad in ['-1', '', '1.5', '=1+1', '1,200']:
            with self.subTest(bad=bad):
                prices = copy.deepcopy(self.prices)
                prices[0]['unit_price'] = bad
                result = lookup(self.orders, prices)
                self.assertEqual(result['accepted_total_krw'], 47000)
                self.assertIn('단가표의 단가 오류', result['review'][0]['reasons'])
                orders = copy.deepcopy(self.orders)
                orders[0]['quantity'] = bad
                self.assertEqual(lookup(orders, self.prices)['accepted_total_krw'], 47000)

    def test_cli_source_preservation_existing_output_and_schema_failure(self):
        inputs = [ROOT / 'orders.csv', ROOT / 'prices.csv']
        hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs]
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'result.json'
            command = [sys.executable, str(ROOT / 'price_lookup.py'), *map(str, inputs), str(output)]
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(json.loads(output.read_text())['accepted_total_krw'], 71000)
            first_result = output.read_bytes()
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
            self.assertEqual(output.read_bytes(), first_result)
            invalid = Path(tmp) / 'bad.csv'
            invalid.write_text('sku,wrong\n0001,1\n')
            new_result = Path(tmp) / 'bad-result.json'
            self.assertNotEqual(subprocess.run([sys.executable, str(ROOT / 'price_lookup.py'),
                                                str(inputs[0]), str(invalid), str(new_result)],
                                               capture_output=True).returncode, 0)
            self.assertFalse(new_result.exists())
        self.assertEqual([hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs], hashes)


if __name__ == '__main__':
    unittest.main()
