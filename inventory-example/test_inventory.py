import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from inventory_check import inspect_inventory

ROOT = Path(__file__).resolve().parent

class InventoryAcceptance(unittest.TestCase):
    def setUp(self):
        self.rows = json.loads((ROOT / 'input.json').read_text())

    def test_independent_expected_rows_and_exception_sources(self):
        original = copy.deepcopy(self.rows)
        result = inspect_inventory(self.rows)
        self.assertEqual([(r['sku'], r['available'], r['shortage']) for r in result['accepted']],
                         [('S001', 15, 0), ('S002', 5, 7), ('S003', 0, 8)])
        self.assertEqual([r['source_row'] for r in result['review']], [4, 5, 6, 7])
        self.assertEqual((result['candidate_skus'], result['candidate_units']), (2, 15))
        self.assertEqual(self.rows, original)

    def test_input_changes_recompute_and_equal_target_is_not_short(self):
        self.rows[1]['stock'] = 14
        result = inspect_inventory(self.rows)
        self.assertEqual(result['accepted'][1]['shortage'], 0)
        self.assertEqual((result['candidate_skus'], result['candidate_units']), (1, 8))
        self.rows[2]['target'] = 0
        self.assertEqual(inspect_inventory(self.rows)['candidate_units'], 0)

    def test_bad_values_zero_and_ambiguous_ids(self):
        for value in (-1, 1.5, '4', True, None):
            result = inspect_inventory([{'sku':'A','stock':value,'reserved':0,'target':2}])
            self.assertEqual(len(result['review']), 1)
            self.assertEqual(result['candidate_units'], 0)
        self.assertEqual(inspect_inventory([{'sku':'A','stock':0,'reserved':0,'target':2}])['candidate_units'],2)
        for sku in ('', None, 7):
            self.assertEqual(len(inspect_inventory([{'sku':sku,'stock':1,'reserved':0,'target':2}])['review']),1)
        same = [{'sku':'A','stock':4,'reserved':0,'target':5},{'sku':' A ','stock':2,'reserved':0,'target':5}]
        self.assertEqual(len(inspect_inventory(same)['review']),2)
        self.assertEqual(inspect_inventory([])['candidate_units'],0)
        for bad in ({}, [1]):
            with self.assertRaises(ValueError): inspect_inventory(bad)

    def test_cli_source_hash_and_overwrite_protection(self):
        source = ROOT / 'input.json'
        before = hashlib.sha256(source.read_bytes()).hexdigest()
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'result.json'
            command = [sys.executable, str(ROOT/'inventory_check.py'), str(source), str(output)]
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(json.loads(output.read_text())['candidate_units'],15)
            output_before = output.read_bytes()
            self.assertNotEqual(subprocess.run(command,capture_output=True).returncode,0)
            self.assertEqual(output.read_bytes(),output_before)
            self.assertNotEqual(subprocess.run([*command[:-1],str(source)],capture_output=True).returncode,0)
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),before)

if __name__ == '__main__': unittest.main()
