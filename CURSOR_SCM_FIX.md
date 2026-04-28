# KN541 SCM 수정 작업지시서

**작성일:** 2026-04-28 | **기획 창 → 프론트엔드 창 전달**
**프로젝트:** kn541-scm (~/Desktop/GitHub/kn541-scm)
**완료 후:** git push → Vercel 자동 배포 → 기획 창에 보고

---

## 작업 규칙
- 수정 전 반드시 해당 파일을 먼저 읽고 파악할 것
- 기존 코드 스타일(scmApi 사용, 한국어 주석, toast 사용 등) 유지
- 각 TASK 완료 후 개별 커밋 (메시지 형식: `fix: TASK-N 설명`)
- API 필드명은 **백엔드 실제 응답 기준**으로 통일 (확인 필요 시 `/docs` Swagger 참조)

---

## TASK 1: AuthGuard 적용 (보안 — 최우선)

**파일:** `src/app/(dashboard)/layout.tsx`

**현재 문제:** AuthGuard.tsx가 존재하지만 dashboard layout에서 import하지 않음. 비로그인 상태에서 모든 페이지 접근 가능.

**수정 내용:**
```tsx
// 추가 import
import AuthGuard from '@components/AuthGuard'

// return 부분에서 children을 AuthGuard로 감싸기
<Providers direction={direction}>
  <AuthGuard>
    <VerticalLayout ...>
      {children}
    </VerticalLayout>
    <ScrollToTop ...>...</ScrollToTop>
  </AuthGuard>
</Providers>
```

**주의:** AuthGuard는 'use client' 컴포넌트이므로 Providers 안에 위치해야 함. VerticalLayout과 ScrollToTop을 모두 감쌀 것.

**완료 기준:**
- [ ] 비로그인 상태에서 /dashboard 접근 시 /login으로 리다이렉트
- [ ] 로그인 후 정상 접근 확인

---

## TASK 2: 이중 리다이렉트 제거

**파일:** `next.config.ts`

**현재 문제:** `/` → `/home` (next.config) → `/dashboard` (home/page.tsx). 2단 리다이렉트.

**수정 내용:** next.config.ts의 redirect destination을 `/dashboard`로 직접 변경:
```ts
redirects: async () => {
  return [
    {
      source: '/',
      destination: '/dashboard',  // /home 대신 /dashboard로 직접
      permanent: true,
      locale: false
    }
  ]
}
```

`src/app/(dashboard)/home/page.tsx`는 그대로 두어도 됨 (혹시 /home 직접 접근 시 대비).

**완료 기준:**
- [ ] localhost:3000 접속 시 /dashboard로 바로 이동 (중간 /home 경유 없음)

---

## TASK 3: 비밀번호 변경 API URL 수정

**파일:** `src/views/mypage/MypagePasswordView.tsx`

**현재 문제:**
```tsx
const API = process.env.NEXT_PUBLIC_API_URL ?? ''  // 빈 문자열 fallback → fetch('/auth/...') 상대경로
```

**수정 내용:**
1. 직접 fetch 대신 scmApi의 scmPatch 사용으로 변경:
```tsx
import { scmPatch } from '@/lib/scmApi'

// handleSave 내부:
const handleSave = async () => {
  // 유효성 검증 동일...
  setSaving(true)
  try {
    await scmPatch('/auth/change-password', {
      current_password: form.current_password,
      new_password: form.new_password
    })
    toast('비밀번호가 변경됐습니다.')
    setForm({ current_password: '', new_password: '', confirm_password: '' })
  } catch (e: unknown) {
    toast(e instanceof Error ? e.message : '변경 중 오류가 발생했습니다.', 'error')
  } finally { setSaving(false) }
}
```

2. deprecated `InputProps` → `slotProps.input`으로 변경:
```tsx
// 변경 전
InputProps={{ endAdornment: <EyeBtn field='current' /> }}

// 변경 후
slotProps={{ input: { endAdornment: <EyeBtn field='current' /> } }}
```

세 곳 모두 변경 (current_password, new_password, confirm_password 필드).

**완료 기준:**
- [ ] 비밀번호 변경 시 scmApi 사용 (인증 헤더 자동 포함)
- [ ] MUI deprecated 경고 없음

---

## TASK 4: 상품 수정 페이지 데이터 로드

**파일:** `src/views/products/ProductFormView.tsx`

**현재 문제:** edit 모드에서 기존 상품 데이터를 전혀 불러오지 않음.
```tsx
// 현재 (lines ~185-195): 목록 API만 호출하고 실제 데이터 매핑 없음
const res = await scmGet<any>('/scm/products?page=1&size=1')
```

**수정 내용:** 개별 상품 조회 API 사용으로 변경.
먼저 백엔드에 개별 조회 API가 있는지 확인:
- `GET /scm/products/{product_id}` 가 있으면 그대로 사용
- 없으면 `GET /scm/products?product_id={id}` 등 대안 확인

```tsx
// edit 모드 데이터 로드 부분 교체:
useEffect(() => {
  if (mode !== 'edit' || !productId) return
  let cancelled = false
  const loadProduct = async () => {
    setLoading(true)
    try {
      // 개별 상품 조회 API 사용 (백엔드 확인 필요)
      const product = await scmGet<any>(`/scm/products/${productId}`)

      // 폼 데이터 매핑
      setForm({
        product_name:  product.product_name  ?? '',
        brand:         product.brand         ?? '',
        category_id:   product.category_id   ?? '',
        summary:       product.summary       ?? '',
        description:   product.description   ?? '',
        thumbnail_url: product.thumbnail_url ?? '',
        detail_img_1:  product.detail_images?.[0] ?? '',
        detail_img_2:  product.detail_images?.[1] ?? '',
        detail_img_3:  product.detail_images?.[2] ?? '',
        supply_price:  String(product.supply_price ?? 0),
        sale_price:    String(product.sale_price   ?? 0),
        stock_qty:     String(product.stock_qty    ?? 99999),
        min_order_qty: String(product.min_order_qty ?? 1),
        max_order_qty: product.max_order_qty ? String(product.max_order_qty) : '',
        is_option:     product.is_option ?? false,
        sale_start_at: product.sale_start_at ?? '',
        sale_end_at:   product.sale_end_at   ?? '',
      })

      // 배송 정보 매핑
      setShipping({
        sc_type:       product.sc_type       ?? 3,
        sc_price:      String(product.sc_price      ?? 0),
        sc_minimum:    product.sc_minimum    ? String(product.sc_minimum) : '',
        sc_condition:  product.sc_condition  ?? 'amount',
        delivery_days: String(product.delivery_days ?? 3),
        return_fee:    String(product.return_fee    ?? 0),
        exchange_fee:  String(product.exchange_fee  ?? 0),
        delivery_co:   product.delivery_co   ?? '',
      })

      // 카테고리 3단 복원 (category_id가 있으면)
      if (product.category_id) {
        // 카테고리 조상 조회 API가 있으면 사용, 없으면 category_id만 설정
        setForm(f => ({ ...f, category_id: product.category_id }))
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '상품 정보를 불러올 수 없습니다.', 'error')
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  void loadProduct()
  return () => { cancelled = true }
}, [mode, productId, toast])
```

**⚠️ 주의:** 백엔드 API 스펙을 먼저 확인할 것. Railway /docs (Swagger UI)에서 `/scm/products/{id}` 엔드포인트가 있는지 확인.

**완료 기준:**
- [ ] /products/{id}/edit 접근 시 기존 상품 데이터가 폼에 채워짐
- [ ] 수정 후 저장 정상 동작

---

## TASK 5: 주문 관련 API 필드명 통일

**파일들:**
- `src/views/orders/OrdersView.tsx` (기준)
- `src/app/(dashboard)/orders/shipping/page.tsx` (수정 대상)

**현재 문제:** 두 파일이 같은 백엔드 API를 호출하면서 필드명이 다름:

| 항목 | OrdersView | ShippingPage |
|------|-----------|-------------|
| 주문 ID | order_id | id |
| 주문번호 | order_no | order_number |
| 주문자 | member_name | buyer_name |
| 상품 | product_summary | product_name |
| 수량 | (없음) | qty |
| 주문일 | created_at | ordered_at |
| 송장 메서드 | POST | PATCH |
| 택배사 필드 | tracking_company | carrier_name |
| 송장번호 필드 | tracking_no | tracking_number |

**수정 방법:**
1. 먼저 Railway `/docs`에서 실제 API 응답 스펙 확인
2. OrdersView의 필드명이 맞다면 ShippingPage를 OrdersView 기준으로 통일
3. ShippingPage의 interface 수정:
```tsx
interface Order {
  order_id: string          // id → order_id
  order_no: string          // order_number → order_no
  member_name: string | null // buyer_name → member_name
  product_summary: string | null // product_name → product_summary
  total_amount: number
  order_status: string      // shipping_status → order_status
  created_at: string        // ordered_at → created_at
}
```
4. 송장 등록도 통일 (OrdersView 기준: scmPost + tracking_company/tracking_no)

**완료 기준:**
- [ ] 두 페이지에서 동일한 API 필드명 사용
- [ ] 송장 등록 동작 확인

---

## TASK 6: 정산 관련 API 필드명 통일

**파일들:**
- `src/views/settlements/SettlementsView.tsx` (기준)
- `src/app/(dashboard)/settlements/payments/page.tsx` (수정 대상)

**현재 문제:** SettlementsView와 PaymentsPage의 필드명 불일치:

| 항목 | SettlementsView | PaymentsPage |
|------|----------------|-------------|
| 정산 ID | settlement_id | id |
| 정산번호 | settlement_no | settlement_number |
| 기간 시작 | period_from | period_start |
| 기간 끝 | period_to | period_end |
| 매출 | gross_amount | total_sales |
| 정산금액 | net_amount | settlement_amount |

**수정 방법:** TASK 5와 동일하게 Railway `/docs`에서 실제 스펙 확인 후, 기준 파일(SettlementsView)에 맞춰 PaymentsPage interface 수정.

**완료 기준:**
- [ ] 두 페이지에서 동일한 API 필드명 사용

---

## TASK 7: 문의 등록 중복 제거 + 카테고리 통일

**파일들:**
- `src/views/inquiries/InquiriesView.tsx`
- `src/views/inquiries/InquiryFormView.tsx`
- `src/app/(dashboard)/inquiries/new/page.tsx`
- `src/data/navigation/verticalMenuData.tsx`

**현재 문제:**
1. InquiriesView에 인라인 다이얼로그로 문의 등록 기능 있음
2. 별도로 /inquiries/new 페이지도 존재 (InquiryFormView)
3. 카테고리 옵션이 다름:
   - InquiriesView: PRODUCT, ORDER, SETTLEMENT, ETC
   - InquiryFormView: PRODUCT, SETTLEMENT, CONTRACT, SYSTEM, OTHER

**수정 방법:** InquiriesView의 인라인 다이얼로그를 기준으로 통일. /inquiries/new 페이지 삭제하는 대신:

1. InquiryFormView의 카테고리를 InquiriesView와 동일하게 변경:
```tsx
const INQUIRY_TYPES = [
  { value: 'PRODUCT',    label: '상품 문의' },
  { value: 'ORDER',      label: '주문/배송' },
  { value: 'SETTLEMENT', label: '정산 문의' },
  { value: 'ETC',        label: '기타' },
]
```

2. 사이드바 메뉴에서 "문의 등록" 항목 제거 (InquiriesView 목록에서 등록 가능하므로):
```tsx
// verticalMenuData.tsx — 문의 children에서 '문의 등록' 제거
{
  label: '문의',
  icon: 'tabler-message-circle',
  children: [
    { label: '문의 내역', href: '/inquiries', icon: 'tabler-messages' },
    // { label: '문의 등록', href: '/inquiries/new', icon: 'tabler-edit' },  ← 제거
  ]
}
```

또는 children 없이 단일 메뉴로:
```tsx
{
  label: '문의',
  href: '/inquiries',
  icon: 'tabler-message-circle'
}
```

**완료 기준:**
- [ ] 문의 등록 경로가 하나로 통일
- [ ] 카테고리 옵션 동일

---

## TASK 8: 코드 정리

### 8-1. package.json에서 deepmerge 제거
```bash
cd ~/Desktop/GitHub/kn541-scm
pnpm remove deepmerge
# 또는 package.json에서 "deepmerge": "4.3.1" 줄 삭제 후 pnpm install
```

### 8-2. mergedTheme.ts deepmerge import 수정
**파일:** `src/components/theme/mergedTheme.ts`
```tsx
// 변경 전
import deepmerge from 'deepmerge'

// 변경 후
import { deepmerge } from '@mui/utils'
```

### 8-3. about 페이지 제거
`src/app/(dashboard)/about/` 디렉토리 삭제 (플레이스홀더 페이지)

### 8-4. 카테고리 API에 scmApi 사용
**파일:** `src/views/products/ProductFormView.tsx`

카테고리 로드 부분에서 직접 `fetch(BASE+'/categories...')` 대신:
```tsx
// scmGet 대신 publicGet 사용 (카테고리는 인증 불필요할 수 있음)
// 또는 scmGet으로 통일
import { scmGet } from '@/lib/scmApi'

// 대분류 로드
scmGet<{ items: Category[] }>('/categories?parent_id=null&size=100')
  .then(data => setCats1(data.items ?? []))
  .catch(() => setCats1([]))
```

**⚠️ 주의:** scmGet은 `json.data`를 자동 추출하므로 응답 구조에 맞게 타입 조정 필요.

**완료 기준:**
- [ ] deepmerge 패키지 제거됨
- [ ] 빌드 에러 없음
- [ ] about 페이지 제거됨

---

## 커밋 순서 (권장)

```
1. fix: TASK-1 AuthGuard 적용 — 비로그인 접근 차단
2. fix: TASK-2 이중 리다이렉트 제거
3. fix: TASK-3 비밀번호 변경 API URL + deprecated API 수정
4. fix: TASK-4 상품 수정 페이지 데이터 로드 구현
5. fix: TASK-5 주문 API 필드명 통일
6. fix: TASK-6 정산 API 필드명 통일
7. fix: TASK-7 문의 등록 중복 제거 + 카테고리 통일
8. chore: TASK-8 코드 정리 (deepmerge 제거, about 삭제 등)
```

## 작업 전 확인사항

1. `git pull origin main` — 최신 코드 확인
2. Railway /docs (Swagger UI)에서 실제 API 필드명 확인 (TASK 4,5,6)
3. `npm run dev` → localhost:3000 정상 확인 후 작업 시작

---

*KN541 SCM 수정 작업지시서 | 2026-04-28 | 기획 창*
