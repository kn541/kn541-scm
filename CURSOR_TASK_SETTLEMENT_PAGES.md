# KN541 SCM — 정산 페이지 개발 작업지시서

## 작업 개요
SCM(공급사 포털)에 정산 관련 페이지 3개를 추가합니다.

## 참고 파일
- **어드민 정산 페이지 (참고용):** `kn541/admin/starter-kit/src/views/scm/ScmSettlementPage.tsx`
- **어드민 정산 상세:** `kn541/admin/starter-kit/src/views/scm/ScmSettlementDetailDrawer.tsx`
- **SCM API 호출:** `src/utils/scmApi.ts` 사용 (기존 패턴 따르기)

## 백엔드 API (이미 완성)

### 정산 목록
```
GET /scm/settlements?page=1&size=10&status=BEFORE&settle_year=2026
Authorization: Bearer {token}
응답: { status, data: { items: [...], total, page, size } }
```

### 정산 상세 (조정내역 포함)
```
GET /scm/settlements/{settlement_id}
Authorization: Bearer {token}
응답: { status, data: { id, supplier_id, settle_year, settle_month, status, 
  total_order_amount, total_supply_amount, settle_amount, adjustment_amount,
  final_settle_amount, order_count, adjustments: [...], ... } }
```

### 정산 아이템 (세부 주문)
```
GET /scm/settlements/{settlement_id}/items?page=1&size=50
Authorization: Bearer {token}
응답: { status, data: { items: [...], total } }
각 아이템: { order_no, product_name, product_code, quantity, sale_price, 
  supply_price, settle_amount, delivered_at }
```

### 이의 제기
```
POST /scm/settlements/{settlement_id}/dispute
Authorization: Bearer {token}
Body: { reason: "이의 사유" }
응답: { status, data: { message, settlement_id, new_status: "ON_HOLD" } }
```

## 상태값
| 코드 | 라벨 | 색상 (Chip) |
|------|------|------------|
| BEFORE | 정산전 | default (gray) |
| PROCESSING | 정산중 | info (blue) |
| COMPLETED | 정산완료 | primary (purple) |
| INVOICED | 계산서완료 | warning (amber) |
| PAID | 지급완료 | success (green) |
| ON_HOLD | 지급보류 | error (red) |

## 만들 페이지 3개

### 1. 정산 목록 페이지
**경로:** `src/app/(dashboard)/settlements/page.tsx`
**뷰:** `src/views/settlements/SettlementListPage.tsx`

**화면 구성:**
- 상단: "정산 현황" 제목
- 필터: 연도 셀렉트 + 상태 셀렉트 (선택)
- 테이블 컬럼: 정산년월 / 상태(Chip) / 판매금액 / 공급가 / 조정 / 최종정산액 / 주문수 / 지급일
- 행 클릭 → 정산 상세 페이지로 이동
- 페이지네이션

**금액 표시:** 숫자에 쉼표 (toLocaleString) + "원" 접미사

### 2. 정산 상세 페이지
**경로:** `src/app/(dashboard)/settlements/[id]/page.tsx`
**뷰:** `src/views/settlements/SettlementDetailPage.tsx`

**화면 구성 (상단):**
- 정산 기본 정보 카드: 정산년월, 상태(Chip), 주문건수
- 금액 요약 카드 (3열):
  - 총 판매금액 (total_order_amount)
  - 공급가 합계 (settle_amount)  
  - 최종 정산액 (final_settle_amount) — 강조 표시

**화면 구성 (중단):**
- 조정(가감) 내역 테이블: 유형 / 금액 / 사유 / 등록일
  - 조정 없으면 "조정 내역이 없습니다" 표시

**화면 구성 (하단):**
- 세부 주문 리스트 테이블: 주문번호 / 상품명 / 수량 / 판매가 / 공급가 / 정산액 / 배송완료일
- 페이지네이션
- "이의 제기" 버튼 (BEFORE/PROCESSING/COMPLETED 상태에서만 표시)

### 3. 이의 제기 다이얼로그
**위치:** 정산 상세 페이지에 포함

**화면:**
- Dialog (MUI Dialog)
- 제목: "정산 이의 제기"
- 입력: 이의 사유 (TextField, multiline, 필수)
- 안내 텍스트: "이의 제기 시 정산이 보류되며, 관리자가 검토 후 연락드립니다."
- 버튼: 취소 / 제출
- 제출 성공 → toast.success + 목록으로 이동

## 메뉴 등록
사이드바 메뉴에 정산 항목 추가:
```
정산관리
  └ 정산 현황  → /settlements
```

기존 메뉴 파일 `src/components/layout/vertical/VerticalMenu.tsx` 에 추가.
아이콘: `tabler-receipt` 또는 `tabler-calculator`

## 규칙
- API 호출은 기존 `scmApi.ts` 패턴 사용 (get/post)
- 에러 처리: toast.error("오류가 발생했습니다")
- 로딩: 테이블에 CircularProgress 표시
- 반응형: 테이블은 PC 기준, 모바일은 카드형으로 전환 안 해도 됨
- alert() 금지 → toast 사용
- 기존 SCM 페이지(상품목록, 주문관리 등)의 스타일과 통일

## 완료 기준
- [ ] /settlements 목록 페이지 — API 연동 + 필터 + 페이지네이션
- [ ] /settlements/{id} 상세 페이지 — 금액 카드 + 조정내역 + 주문리스트
- [ ] 이의 제기 다이얼로그 — API 연동 + 성공 시 리다이렉트
- [ ] 사이드바 메뉴에 "정산 현황" 추가
- [ ] 로컬 테스트 후 git push
