"""Fictional worklog example: calendar-month totals, with review rows."""
import argparse
from collections import Counter, defaultdict
from datetime import date
import json
from pathlib import Path
import re


def summarize(records):
    if not isinstance(records, list) or len(records) > 10000:
        raise ValueError("Expected a list of at most 10000 records")
    ids = Counter(r.get("record_id", "").strip() for r in records
                  if isinstance(r, dict) and isinstance(r.get("record_id"), str))
    accepted, review = [], []
    groups = defaultdict(int)
    for number, row in enumerate(records, 1):
        reasons = []
        if not isinstance(row, dict) or set(row) != {"record_id", "date", "minutes"}:
            review.append({"source_record": number, "reasons": ["record fields must be record_id,date,minutes"]})
            continue
        key = row["record_id"].strip() if isinstance(row["record_id"], str) else ""
        if not key:
            reasons.append("missing record ID")
        elif ids[key] > 1:
            reasons.append("duplicate record ID; all occurrences need review")
        day = row["date"]
        if not isinstance(day, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", day):
            reasons.append("date must be YYYY-MM-DD")
        else:
            try:
                date.fromisoformat(day)
            except ValueError:
                reasons.append("invalid calendar date")
        minutes = row["minutes"]
        if type(minutes) is not int or not 0 <= minutes <= 1440:
            reasons.append("minutes must be an integer from 0 to 1440")
        if reasons:
            review.append({"source_record": number, "record_id": key, "reasons": reasons})
            continue
        month = day[:7]
        accepted.append({"source_record": number, "record_id": key, "date": day, "minutes": minutes})
        groups[month] += minutes
    return {"input_records": len(records), "accepted_records": len(accepted),
            "review_records": len(review), "total_minutes": sum(groups.values()),
            "months": [{"month": k, "minutes": v} for k, v in sorted(groups.items())],
            "accepted": accepted, "review": review}


def run(source, output):
    source, output = Path(source), Path(output)
    if source.stat().st_size > 1024 * 1024:
        raise ValueError("Input limit is 1 MB")
    result = summarize(json.loads(source.read_text(encoding="utf-8-sig")))
    # Exclusive creation protects both the source and every existing output.
    with output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input"); parser.add_argument("output")
    args = parser.parse_args()
    run(args.input, args.output)
