"""니즈랩: 가상 매출 CSV 취합. 원본은 읽기만 하며 표준 라이브러리만 사용."""
import csv
import hashlib
import json
import os
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

FIELDS = ['주문ID', '일자', '지점', '상품', '수량', '단가']

def write_csv(path, fields, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        # Source filenames can begin with Excel formula characters too.
        # Keep original values in the JSON report; protect CSV presentation.
        w.writerows({key: "'" + value if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')) else value
                     for key, value in row.items()} for row in rows)

def merge(source, output):
    paths = sorted(source.glob('*.csv'))
    if not paths:
        raise ValueError('입력 CSV 파일이 없습니다')
    accepted, excluded, seen = [], [], {}
    count = 0
    for path in paths:
        with path.open(encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames != FIELDS:
                raise ValueError(f'{path.name}: 열 이름 또는 순서가 다릅니다')
            for line, row in enumerate(reader, 2):
                count += 1
                reason = None
                try:
                    if set(row) != set(FIELDS) or any(not str(row[k] or '').strip() for k in FIELDS):
                        raise ValueError('필수 값 누락')
                    row = {k: v.strip() for k, v in row.items()}
                    if any(row[k].startswith(('=', '+', '-', '@')) for k in ['주문ID', '지점', '상품']):
                        raise ValueError('수식으로 해석될 수 있는 텍스트')
                    date.fromisoformat(row['일자'])
                    try:
                        qty, unit = int(row['수량']), int(row['단가'])
                    except ValueError:
                        raise ValueError('수량·단가는 정수로 입력해 주세요') from None
                    if qty <= 0 or unit < 0:
                        raise ValueError('수량은 양의 정수, 단가는 0 이상이어야 합니다')
                    if row['주문ID'] in seen:
                        reason = '동일 주문 중복' if seen[row['주문ID']] == row else '동일 주문ID의 값 충돌: 확인 필요'
                    else:
                        seen[row['주문ID']] = row.copy()
                        accepted.append({**row, '수량': qty, '단가': unit, '금액': qty*unit, '원본파일': path.name, '원본행': line})
                except (ValueError, TypeError) as exc:
                    reason = f'입력 오류: {exc}'
                if reason:
                    excluded.append({'원본파일': path.name, '원본행': line, '주문ID': row.get('주문ID', ''), '사유': reason})
    sums = defaultdict(int)
    for row in accepted:
        sums[row['지점']] += row['금액']
    report = {'label': '가상 데이터로 만든 작업 예시', 'input_files': len(paths), 'input_rows': count,
              'accepted_rows': len(accepted), 'excluded_rows': len(excluded), 'total_krw': sum(sums.values()),
              'branch_totals': dict(sums), 'accepted': accepted, 'excluded': excluded,
              'source_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}
    output.mkdir(parents=True, exist_ok=True)
    output.chmod(0o700)
    write_csv(output/'취합결과.csv', FIELDS+['금액', '원본파일', '원본행'], accepted)
    write_csv(output/'지점요약.csv', ['지점', '금액'], [{'지점': k, '금액': v} for k,v in sums.items()])
    write_csv(output/'제외내역.csv', ['원본파일', '원본행', '주문ID', '사유'], excluded)
    (output/'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report

if __name__ == '__main__':
    os.umask(0o077)
    if len(sys.argv) != 3:
        sys.exit('사용법: python3 merge_demo.py 입력폴더 결과폴더')
    try:
        r = merge(Path(sys.argv[1]), Path(sys.argv[2]))
        print(json.dumps({k: r[k] for k in ['input_files','input_rows','accepted_rows','excluded_rows','total_krw']}, ensure_ascii=False))
    except ValueError as exc:
        sys.exit(str(exc))
