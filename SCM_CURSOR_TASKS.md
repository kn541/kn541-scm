# KN541 SCM 포털 — 버그 수정 작업지시서
> 작성일: 2026-04-27 | 현장 점검 결과 기반

---

## 진단 요약

| 항목 | 상태 | 원인 |
|---|---|---|
| 백엔드 /scm/* 라우터 | ✅ 구현완료 | dashboard, products, orders, settlements, inquiries |
| 백엔드 /scm/notices | ❌ 없음 | CS 라우터의 /cs/notices 사용해야 함 |
| 사이드바 메뉴 안보임 | 🔴 버그 | 쿠키에 horizontal 레이아웃 설정 잔존 → vertical 강제 필요 |
| API 응답 pending | 🔴 버그 | 토큰 없이 요청 시 타임아웃. 로그인 후 재요청 필요 |
| /notices 빈화면 | 🔴 버그 | API 경로 /scm/notices → /cs/notices 로 수정 필요 |
| /mypage 빈화면 | 🔴 확인 필요 | API 경로 확인 필요 |

---

## TASK 1 — 레이아웃 수직(사이드바) 강제 고정 (최우선)

**문제:** 브라우저 쿠키에 `layout=horizontal` 설정이 저장되어 있어 사이드바 메뉴가 보이지 않음.
수평 레이아웃(상단 탭바 Home/About만 표시)으로 렌더링되는 버그.

**파일:** `src/app/(dashboard)/layout.tsx`

**해결:** `getMode()` 이후 settings를 수직 레이아웃으로 강제:

```tsx
// layout.tsx에서 LayoutWrapper에 layoutMode 고정 prop 전달
// 또는 cookie 초기값을 vertical로 강제 설정
```

**또는 더 간단한 방법:**
`src/configs/themeConfig.ts` 파일에서 기본 레이아웃을 `vertical`로 확인하고,
`src/@core/utils/serverHelpers.ts`에서 `getMode()` 반환 이후 layout을 항상 vertical로 override.

**확인 파일:** `src/configs/themeConfig.ts` → `layout` 기본값이 `'horizontal'`이면 `'vertical'`로 변경.

---

## TASK 2 — /notices API 경로 수정

**문제:** 백엔드에 `/scm/notices` 엔드포인트가 없음. CS 공지사항 API 사용해야 함.

**파일:** `src/views/notices/NoticesView.tsx` (또는 notices 관련 뷰 파일)

**수정:**
```typescript
// 변경 전
const res = await scmGet('/scm/notices?page=1&size=20')

// 변경 후 (인증 불필요한 공개 API)
const res = await fetch(`${BASE}/cs/notices?page=1&size=20`, {
  headers: authHeaders()
})
```

**응답 구조:** `{ status: "success", data: { items: [...], total: N } }`

---

## TASK 3 — /mypage API 경로 확인 및 수정

**파일:** `src/views/mypage/` 디렉토리 확인

**백엔드 정확한 경로:**
- 공급사 내 정보: `GET /scm/profile` 또는 `GET /auth/me`
- 사업자 정보: `GET /suppliers/me` 또는 `GET /scm/supplier/me`

`src/views/mypage/` 내 파일을 읽고 현재 호출하는 API 경로를 확인한 후, 백엔드 실제 경로로 수정.

---

## TASK 4 — API 타임아웃 처리 (로딩 → 빈 결과 표시)

**문제:** 모든 목록 페이지(상품/주문/정산/문의)에서 API 응답이 오래 걸리거나 실패할 경우
로딩 스피너가 무한 표시됨. 타임아웃 후 빈 목록 메시지를 보여줘야 함.

**파일:** 각 View 파일 (`ProductsView.tsx`, `OrdersView.tsx`, `SettlementsView.tsx`, `InquiriesView.tsx`)

**해결:**
```typescript
// scmApi.ts의 scmGet에 timeout 추가
export async function scmGet<T>(path: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeaders(),
      signal: controller.signal
    })
    clearTimeout(timer)
    // ... 기존 처리
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다.')
    throw e
  }
}
```

각 View에서 에러 시 "데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요." 메시지 표시.

---

## TASK 5 — /orders/shipping 페이지 신규 생성

**파일:** `src/app/(dashboard)/orders/shipping/page.tsx` (신규)

메뉴에 '배송 처리' 링크가 있으나 페이지 없음.
주문 목록에서 `shipping_status = 'READY'` 인 주문만 필터해서 표시.
배송 처리 API: `PATCH /scm/orders/{order_id}/ship` body: `{tracking_number, carrier_name}`

---

## TASK 6 — /settlements/payments 페이지 신규 생성

**파일:** `src/app/(dashboard)/settlements/payments/page.tsx` (신규)

메뉴에 '입금 확인' 링크가 있으나 페이지 없음.
API: `GET /scm/settlements?status=PAID`
입금 완료된 정산 내역만 필터해서 표시.

---

## TASK 7 — /mypage/contacts, /mypage/password 페이지 신규 생성

**파일:**
- `src/app/(dashboard)/mypage/contacts/page.tsx` (신규)
- `src/app/(dashboard)/mypage/password/page.tsx` (신규)

담당자 관리: `GET/POST/PATCH /scm/supplier/contacts`
비밀번호 변경: `POST /auth/change-password` body: `{current_password, new_password}`

---

## 백엔드 확인된 SCM API 경로 (정확한 prefix)

```
prefix = /scm

GET  /scm/dashboard          → 대시보드 통계
GET  /scm/products           → 내 상품 목록 (공급사 본인 것만)
POST /scm/products           → 상품 등록
GET  /scm/products/{id}      → 상품 상세
PATCH /scm/products/{id}     → 상품 수정

GET  /scm/orders             → 주문 목록
PATCH /scm/orders/{id}/ship  → 배송처리

GET  /scm/settlements        → 정산 목록

GET  /scm/inquiries          → 문의 목록
POST /scm/inquiries          → 문의 등록

GET  /cs/notices             → 공지사항 (SCM prefix 아님!)
```

---

## 공통 참고

```typescript
// src/lib/scmApi.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://kn541-production.up.railway.app'

// 인증 헤더
authHeaders() → { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// API 래퍼
scmGet<T>(path)          → GET
scmPost<T>(path, body)   → POST
scmPatch<T>(path, body)  → PATCH
```
