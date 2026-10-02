# 니즈랩 파일 취합 예시

[내 업무와 비슷한 예시 고르기 · 문의 전 준비 안내](CONSULTATION.md) · [빈 문의 양식](docs/downloads/consultation-template.txt)

일곱 예시의 차이와 실제 작업을 의뢰할 때 필요한 자료·검수 기준을 정리했습니다. 고객 파일은 공개 저장소에 올리지 않고 크몽 메시지로 받습니다.

## 상품코드별 단가 조회 Python 예시

[가상 원본·실행 코드·검증 내용](price-lookup-example/README.md) · [샘플 ZIP](docs/downloads/price-lookup-sample.zip)

가상 주문 CSV에 상품코드가 정확히 일치하는 단가만 붙입니다. 주문 8행 중 정상 3행/71,000원과 확인할 5행을 구분합니다. 없는 상품코드·단가표 중복·잘못된 수량·주문ID 중복은 임의 계산하지 않습니다. `0001` 단가를 13,000원으로 바꾸면 합계는 73,000원입니다.

Python 표준 라이브러리로 고정 기대값·입력 변경·앞자리 0 보존·원본/기존 결과 보존을 검증했습니다. 실제 Excel·VBA·Apps Script와 외부 주문 시스템 실행은 미검증이며 가상 데이터로 만든 작업 예시입니다.

## 합계 수식 수정 예시

[수정 전·후 설명과 XLSX 다운로드](https://needsbuilder.github.io/excel-automation-demo/formula-example.html)를 추가했습니다. 가상 주문 5건에서 마지막 행이 빠진 `SUM(E11:E14)`를 `SUM(E11:E15)`로 수정해 112,000원에서 132,000원이 됩니다. 노란색 수량·단가를 바꿔 재계산할 수 있습니다. 행 추가 자동 확장 예시는 아닙니다.

별도 합계 대조, 마지막 수량 3·0·빈칸, XLSX 재읽기 후 입력 변경 재계산을 Artifact Tool로 검증했습니다. [검증 결과](docs/formula-validation.json)를 공개합니다. 실제 Microsoft Excel 앱 실행은 미검증이며 VBA·Apps Script 예시가 아닙니다. 실제 고객 자료나 납품 실적이 아닌 가상 데이터로 만든 작업 예시입니다.

동일한 열 구조를 가진 CSV 파일을 취합하고 중복·입력 오류를 별도 내역으로 남기는 작은 예시입니다. **가상 데이터로 만든 작업 예시이며 실제 고객 자료나 납품 실적이 아닙니다.**

## 직접 확인

- [브라우저에서 예시 실행](https://needsbuilder.github.io/excel-automation-demo/)
- [예시 파일 ZIP](https://github.com/needsbuilder/excel-automation-demo/releases/latest/download/excel-merge-sample.zip)
- [검증된 결과](sample/output/취합결과.csv) · [제외 내역](sample/output/제외내역.csv)

Python 3만 있으면 추가 라이브러리 없이 실행할 수 있습니다. 내려받은 폴더에서 다음 명령을 실행합니다.

```sh
python3 merge_demo.py sample/input my-result
```

입력 열은 `주문ID,일자,지점,상품,수량,단가`입니다. UTF-8 CSV이며 날짜는 YYYY-MM-DD, 수량은 양의 정수, 단가는 0 이상의 정수입니다.

| 확인 항목 | 가상 예시 결과 |
| --- | --- |
| 원본 | CSV 3개, 총 9행 |
| 정상 | 7행 |
| 제외 | 동일 주문 중복 1행, 수량 오류 1행 |
| 합계 | 132,000원 |
| 추적 | 결과마다 원본 파일과 행 번호 기록 |
| 원본 | 읽기만 하며 변경하지 않음 |

재실행 결과 일치, 원본 해시 유지, ID 충돌·날짜 오류·수량 오류·열 누락을 검증했습니다. XLSX 확인 파일은 요약 수식 재계산을 별도로 검증했으며 실제 Excel 앱에서 실행한 VBA 예시는 아닙니다. 브라우저 데모도 VBA나 Apps Script 실행을 의미하지 않습니다.

실제 업무에는 열 이름·중복 기준·예외 처리·실행 환경에 맞춘 조정이 필요합니다. 니즈랩의 엑셀·구글시트 서비스는 [크몽 공개 페이지](https://kmong.com/gig/824498)에서 확인할 수 있습니다.

## 주문·입금 CSV 대조 예시

[브라우저에서 실행](https://needsbuilder.github.io/excel-automation-demo/reconcile-example.html) · [가상 원본 및 기대결과 ZIP](docs/downloads/reconcile-sample.zip) · [검증 결과](docs/reconcile-validation.json)

가상 주문 4건과 입금 5건을 정확한 주문ID로 대조합니다. 주문 합계 140,000원, 입금 합계 109,000원이며 일치 1건과 확인할 ID 4건(금액 차이·미입금·중복 ID·주문 없는 입금)을 구분합니다. D101의 입금액을 20,000원으로 바꾸면 일치 2건과 입금 합계 110,000원입니다.

각 파일에 주문ID가 한 번만 있다는 규칙을 사용하므로 합계가 같은 분할입금도 중복 확인 대상으로 남깁니다. 수수료·환불·통화 변환·유사 이름 매칭은 지원하지 않습니다. 브라우저 샘플에는 파일 업로드 기능이 없으며 계산 결과 CSV만 내려받을 수 있습니다. 고객 자료나 납품 실적이 아니고, 실제 Excel·VBA·Apps Script 실행은 미검증입니다. `node test_reconcile.cjs`로 기준값·입력 변경·잘못된 금액·중복 주문·원본 보존·CSV 수식 문자열 처리를 확인합니다.

## 재고 부족 수량 점검 Python 예시

[가상 원본·실행 코드·검증 내용](inventory-example/README.md) · [샘플 ZIP](docs/downloads/inventory-sample.zip)

가상 재고 7행에서 정상 3행과 확인할 4행을 구분합니다. 판매 가능 수량은 재고에서 예약 수량을 빼고, 목표 수량보다 부족한 2품목/15개를 표시합니다. 중복 품목은 합산하지 않으며 예약 초과와 잘못된 숫자는 확인 대상으로 남깁니다. S002 재고를 14로 바꾸면 부족 합계는 8개로 바뀝니다.

Python 표준 라이브러리로 기준값·입력 변경·잘못된 수량·중복ID·원본 해시 보존·기존 결과 덮어쓰기 방지를 확인했습니다. 실제 Excel·VBA·Apps Script 및 외부 재고 시스템 연동은 미검증이며 구매나 발주를 실행하지 않습니다. 고객 자료나 납품 실적이 아닌 가상 데이터 작업 예시입니다.


### 재고·예약 수량을 브라우저에서 확인

[재고 점검 실행 예시](https://needsbuilder.github.io/excel-automation-demo/inventory-example.html)에서 기존 가상 재고 7행을 계산합니다. 정상 3행·확인 4행·부족 2품목 15개이며 S002 재고를 14개로 바꾸면 부족 합계가 8개가 됩니다. 변경 뒤 재실행해야 CSV를 받을 수 있습니다. Python과 같은 입력·규칙을 대조했으며 실제 Excel·VBA·Apps Script 및 재고 시스템 연동은 미검증입니다. 발주를 실행하지 않습니다.


## 홈페이지 제작 문의 준비

[범위·준비자료·완료 확인 기준](https://needsbuilder.github.io/excel-automation-demo/website-consultation.html) · [빈 문의 양식](docs/downloads/website-consultation-template.txt)

상품 #740393의 2026-10-03 공개 조건을 확인해 랜딩·다중 페이지·회원/예약/결제의 차이와 문의 양식을 정리했습니다. 가격과 일정은 최신 크몽 상품과 합의한 범위에서 확인하며 고객 자료는 크몽 메시지로만 받습니다. 실제 고객 자료나 납품 실적이 아닙니다.

## 두 상품목록의 변경 비교

[가상 CSV·실행 코드·검증 기준](catalog-change-example/README.md) · [샘플 ZIP](docs/downloads/catalog-change-sample.zip)

이전 8행·현재 6행을 정확한 상품코드로 비교해 신규 1건, 현재 목록에 없음 1건, 변경 2건, 동일 1건, 확인 필요 3건을 구분합니다. 중복 코드와 잘못된 단가는 신규·누락으로 오판하지 않고 출처 행을 남깁니다. Python 표준 라이브러리의 고정 기대값·입력 변경·앞자리 0·원본과 기존 결과 보존·CSV 수식 문자 보호를 검증했습니다. 실제 Excel·VBA·Apps Script 및 외부 상품 시스템 실행은 미검증입니다. 가상 데이터로 만든 작업 예시입니다.
