"""가상 데이터 작업 예시: 상품코드로 단가를 조회하며 주문·결제를 실행하지 않습니다."""
import argparse
from collections import Counter
import csv
import json
from pathlib import Path
import re


def read_csv(path, columns):
    with Path(path).open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != columns:
            raise ValueError(f'{Path(path).name}: 열 이름과 순서는 {columns}이어야 합니다.')
        rows = list(reader)
        if any(None in row or any(v is None for v in row.values()) for row in rows):
            raise ValueError(f'{Path(path).name}: 행의 열 개수가 헤더와 다릅니다.')
        return rows


def integer(value, minimum):
    text = value.strip()
    if not re.fullmatch(r'[0-9]+', text) or int(text) < minimum:
        raise ValueError('정수 범위 오류')
    return int(text)


def lookup(orders, prices):
    price_counts = Counter(row['sku'].strip() for row in prices)
    order_counts = Counter(row['order_id'].strip() for row in orders)
    catalog, price_review, accepted, review = {}, [], [], []
    for source_row, row in enumerate(prices, 2):
        sku = row['sku'].strip()
        reasons = []
        if not sku:
            reasons.append('상품코드 없음')
        elif price_counts[sku] > 1:
            reasons.append('중복 상품코드: 임의 선택하지 않음')
        try:
            price = integer(row['unit_price'], 0)
        except ValueError:
            reasons.append('단가: 0 이상의 정수 원 필요')
        if reasons:
            price_review.append({'source_row': source_row, 'source': dict(row), 'reasons': reasons})
        else:
            catalog[sku] = (price, source_row)
    for source_row, row in enumerate(orders, 2):
        order_id, sku = row['order_id'].strip(), row['sku'].strip()
        reasons = []
        if not order_id:
            reasons.append('주문ID 없음')
        elif order_counts[order_id] > 1:
            reasons.append('중복 주문ID: 모든 해당 행 확인 필요')
        if not sku:
            reasons.append('상품코드 없음')
        elif price_counts[sku] == 0:
            reasons.append('단가표에 없는 상품코드')
        elif price_counts[sku] > 1:
            reasons.append('단가표 중복 상품코드')
        elif sku not in catalog:
            reasons.append('단가표의 단가 오류')
        try:
            quantity = integer(row['quantity'], 1)
        except ValueError:
            reasons.append('수량: 1 이상의 정수 필요')
        if reasons:
            review.append({'source_row': source_row, 'source': dict(row), 'reasons': reasons})
            continue
        unit_price, price_source_row = catalog[sku]
        accepted.append({'order_id': order_id, 'sku': sku, 'quantity': quantity,
                         'unit_price': unit_price, 'amount': quantity * unit_price,
                         'order_source_row': source_row, 'price_source_row': price_source_row})
    return {'fictional_example': True, 'input_order_rows': len(orders),
            'accepted': accepted, 'review': review, 'price_review': price_review,
            'accepted_total_krw': sum(row['amount'] for row in accepted)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('orders_csv', type=Path)
    parser.add_argument('prices_csv', type=Path)
    parser.add_argument('output_json', type=Path)
    args = parser.parse_args()
    if args.output_json.resolve() in {args.orders_csv.resolve(), args.prices_csv.resolve()}:
        parser.error('원본과 다른 결과 파일 경로를 지정하세요.')
    orders = read_csv(args.orders_csv, ['order_id', 'sku', 'quantity'])
    prices = read_csv(args.prices_csv, ['sku', 'unit_price'])
    result = lookup(orders, prices)
    with args.output_json.open('x', encoding='utf-8') as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write('\n')


if __name__ == '__main__':
    main()
