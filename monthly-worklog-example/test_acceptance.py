import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from monthly_report import summarize, run

BASE = Path(__file__).parent


class Acceptance(unittest.TestCase):
    def setUp(self):
        self.rows = json.loads((BASE / "input.json").read_text())

    def test_independent_fixed_totals_and_source_rows(self):
        result = summarize(self.rows)
        self.assertEqual([result[k] for k in ["input_records", "accepted_records", "review_records", "total_minutes"]], [9, 5, 4, 300])
        self.assertEqual(result["months"], [{"month":"2026-09","minutes":60},{"month":"2026-10","minutes":120},{"month":"2027-01","minutes":120}])
        self.assertEqual([r["source_record"] for r in result["review"]], [6,7,8,9])
        self.assertEqual(result["accepted"][0]["record_id"], "0001")
        self.assertEqual(self.rows, json.loads((BASE / "input.json").read_text()))

    def test_changed_month_and_minutes(self):
        changed = copy.deepcopy(self.rows)
        changed[0]["date"] = "2026-10-01"; changed[0]["minutes"] = 90
        result = summarize(changed)
        self.assertEqual(result["total_minutes"], 330)
        self.assertEqual(result["months"], [{"month":"2026-10","minutes":210},{"month":"2027-01","minutes":120}])

    def test_calendar_and_quantity_boundaries(self):
        rows = [{"record_id":str(i),"date":day,"minutes":m} for i,(day,m) in enumerate([
            ("2024-02-29",0),("2023-02-29",10),("2026-1-01",10),
            ("2026-12-31",1440),("2027-01-01",1441),("2026-10-01",True),
            ("2026-10-01",1.5),("2026-10-01","60"),("2026-10-01",None)])]
        r = summarize(rows)
        self.assertEqual([r["accepted_records"],r["review_records"],r["total_minutes"]],[2,7,1440])
        self.assertEqual(r["months"],[{"month":"2024-02","minutes":0},{"month":"2026-12","minutes":1440}])

    def test_missing_fields_and_duplicate_all_occurrences(self):
        rows = [{"record_id":" A ","date":"2026-10-01","minutes":10},
                {"record_id":"A","date":"2026-10-02","minutes":20},
                {"record_id":"","date":"2026-10-01","minutes":5}, None,
                {"record_id":"B","date":"2026-10-01","minutes":5,"extra":1}]
        r = summarize(rows)
        self.assertEqual([r["accepted_records"],r["review_records"],r["total_minutes"]],[0,5,0])
        self.assertIn("duplicate", r["review"][0]["reasons"][0])
        self.assertIn("duplicate", r["review"][1]["reasons"][0])

    def test_source_and_existing_output_preserved_and_bad_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp); source=p/'input.json'; output=p/'output.json'
            source.write_bytes((BASE/'input.json').read_bytes())
            before=hashlib.sha256(source.read_bytes()).hexdigest()
            run(source,output); original=output.read_bytes()
            with self.assertRaises(FileExistsError): run(source,output)
            with self.assertRaises(FileExistsError): run(source,source)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),before)
            self.assertEqual(output.read_bytes(),original)
            source.write_text('{}')
            with self.assertRaises(ValueError): run(source,p/'invalid.json')
            self.assertFalse((p/'invalid.json').exists())


if __name__ == "__main__": unittest.main()
