"""Compare two fictional catalog snapshots. Python standard library only."""
import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

HEADER = ['상품코드', '상품명', '단가']


def load(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != HEADER:
            raise ValueError('열 이름과 순서는 상품코드,상품명,단가여야 합니다')
        rows = []
        for row in reader:
            issue = ''
            if None in row or any(row.get(k) is None for k in HEADER):
                issue = '열 개수 오류'
            code = (row.get('상품코드') or '').strip()
            name = (row.get('상품명') or '').strip()
            price = (row.get('단가') or '').strip()
            if not code:
                issue = issue or '상품코드 없음'
            elif not name:
                issue = issue or '상품명 없음'
            elif not re.fullmatch(r'[0-9]+', price):
                issue = issue or '단가는 0 이상의 정수 필요'
            rows.append({'code': code, 'name': name, 'price': int(price) if re.fullmatch(r'[0-9]+', price) else None,
                         'line': reader.line_num, 'issue': issue})
        return rows


def compare(before, after):
    groups = [defaultdict(list), defaultdict(list)]
    result = []
    for side, rows in enumerate((before, after)):
        for row in rows:
            if not row['code']:
                result.append({'code': '', 'status': '확인 필요', 'reason': row['issue'],
                               'before_lines': [row['line']] if side == 0 else [],
                               'after_lines': [row['line']] if side == 1 else [],
                               'before_name': row['name'] if side == 0 else '', 'after_name': row['name'] if side == 1 else '',
                               'before_price': row['price'] if side == 0 else None, 'after_price': row['price'] if side == 1 else None})
            else:
                groups[side][row['code']].append(row)
    for code in sorted(set(groups[0]) | set(groups[1])):
        old, new = groups[0][code], groups[1][code]
        reasons = []
        for label, rows in [('이전', old), ('현재', new)]:
            if len(rows) > 1:
                reasons.append(label + ' 상품코드 중복')
            reasons.extend(label + ' ' + r['issue'] for r in rows if r['issue'])
        a, b = (old[0] if old else None), (new[0] if new else None)
        if reasons:
            status = '확인 필요'
        elif not a:
            status = '신규'
        elif not b:
            status = '현재 목록에 없음'
        elif (a['name'], a['price']) != (b['name'], b['price']):
            status = '변경'
            reasons = [label for key, label in [('name', '상품명 변경'), ('price', '단가 변경')] if a[key] != b[key]]
        else:
            status = '동일'
        result.append({'code': code, 'status': status, 'reason': ' / '.join(dict.fromkeys(reasons)),
                       'before_lines': [r['line'] for r in old], 'after_lines': [r['line'] for r in new],
                       'before_name': a['name'] if a else '', 'after_name': b['name'] if b else '',
                       'before_price': a['price'] if a else None, 'after_price': b['price'] if b else None})
    return {'fictional_example': True, 'before_rows': len(before), 'after_rows': len(after),
            'counts': {s: sum(r['status'] == s for r in result) for s in ['신규', '현재 목록에 없음', '변경', '동일', '확인 필요']},
            'rows': result}


def safe_text(value):
    text = str(value)
    return "'" + text if text.lstrip().startswith(('=', '+', '-', '@')) or text.startswith(('\t', '\r', '\n')) else text


def run(before, after, output):
    # Read/validate both inputs before creating any output. Never overwrite.
    result = compare(load(before), load(after))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    with (output / 'changes.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['상품코드', '구분', '확인 사유', '이전 상품명', '현재 상품명', '이전 단가', '현재 단가', '이전 원본행', '현재 원본행'])
        for row in result['rows']:
            writer.writerow([safe_text(row['code']), row['status'], row['reason'], safe_text(row['before_name']),
                             safe_text(row['after_name']), row['before_price'], row['after_price'],
                             '·'.join(map(str, row['before_lines'])), '·'.join(map(str, row['after_lines']))])
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='가상 상품목록 변경 비교 예시')
    parser.add_argument('before'); parser.add_argument('after'); parser.add_argument('output')
    args = parser.parse_args()
    print(json.dumps(run(args.before, args.after, args.output)['counts'], ensure_ascii=False))
