"""가상 데이터 작업 예시: 재고 점검만 수행하며 발주를 실행하지 않습니다."""
import argparse
from collections import Counter
import json
from pathlib import Path


def inspect_inventory(rows):
    if not isinstance(rows, list) or any(not isinstance(r, dict) for r in rows):
        raise ValueError('입력은 객체 배열이어야 합니다.')
    ids = [str(r.get('sku', '')).strip() for r in rows]
    counts = Counter(ids)
    accepted, review = [], []
    for index, (row, sku) in enumerate(zip(rows, ids), start=1):
        reasons = []
        if not isinstance(row.get('sku'), str) or not sku:
            reasons.append('품목ID는 비어 있지 않은 문자열이어야 함')
        elif counts[sku] > 1:
            reasons.append('중복 품목ID: 합산하지 않음')
        for field in ('stock', 'reserved', 'target'):
            if type(row.get(field)) is not int or row[field] < 0:
                reasons.append(f'{field}: 0 이상의 정수 필요')
        if not reasons and row['reserved'] > row['stock']:
            reasons.append('예약 수량이 현재 재고보다 큼')
        if reasons:
            review.append({'source_row': index, 'sku': sku, 'reasons': reasons, 'source': dict(row)})
            continue
        available = row['stock'] - row['reserved']
        shortage = max(row['target'] - available, 0)
        accepted.append({'source_row': index, 'sku': sku, 'stock': row['stock'],
                         'reserved': row['reserved'], 'target': row['target'],
                         'available': available, 'shortage': shortage})
    return {'fictional_example': True, 'input_rows': len(rows), 'accepted': accepted,
            'review': review, 'candidate_skus': sum(r['shortage'] > 0 for r in accepted),
            'candidate_units': sum(r['shortage'] for r in accepted)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input_json', type=Path)
    parser.add_argument('output_json', type=Path)
    args = parser.parse_args()
    if args.input_json.resolve() == args.output_json.resolve():
        parser.error('원본과 다른 결과 파일 경로를 지정하세요.')
    result = inspect_inventory(json.loads(args.input_json.read_text(encoding='utf-8')))
    # Existing files are never overwritten, preserving earlier output and source files.
    with args.output_json.open('x', encoding='utf-8') as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write('\n')


if __name__ == '__main__':
    main()
