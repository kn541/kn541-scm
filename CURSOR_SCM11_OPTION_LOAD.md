# SCM-11 수정: 상품 수정 시 기존 옵션 로드

## 문제
SCM > 상품등록 > 옵션 등록하고 저장 → 상품수정하면 옵션등록 값이 모두 사라짐

## 원인
ProductFormView.tsx의 옵션 섹션이 수정 모드에서 기존 product_options 데이터를 로드하지 않음.
로컬 state(optionDrafts)만 사용하여 빈 상태로 시작됨.

## 수정 방법

### 파일: src/views/products/ProductFormView.tsx

1. 상품 상세 로드 시 (useEffect에서 productId로 fetch 하는 부분) 기존 옵션도 함께 로드:

```typescript
// 기존 상품 로드 useEffect 안에서, formData 세팅 후 추가:
if (data.is_option && productId) {
  // 기존 1단 옵션 로드
  try {
    const optRes = await fetch(`${BASE}/products/${productId}/options`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (optRes.ok) {
      const optData = await optRes.json()
      const existingOptions = optData.data?.items || optData.data || []
      if (existingOptions.length > 0) {
        setOptionDrafts(existingOptions.map((opt: any) => ({
          option_name: opt.option_name || '',
          option_group: opt.option_group || '선택옵션',
          add_price: opt.add_price || '0',
          stock_qty: opt.stock_qty || 0,
          id: opt.id,  // 기존 옵션 ID 보존
        })))
      }
    }
  } catch (e) {
    console.error('기존 옵션 로드 실패:', e)
  }
}
```

2. 만약 `/products/{id}/options` 엔드포인트가 없다면, `/products/{id}/option-groups` 사용:

```typescript
const optRes = await fetch(`${BASE}/products/${productId}/option-groups`, {
  headers: { Authorization: `Bearer ${token}` }
})
if (optRes.ok) {
  const optData = await optRes.json()
  const legacy = optData.data?.legacy_options || []
  if (legacy.length > 0) {
    setOptionDrafts(legacy.map((opt: any) => ({
      option_name: opt.option_name || '',
      option_group: opt.option_group || '선택옵션',
      add_price: opt.add_price || '0',
      stock_qty: opt.stock_qty || 0,
      id: opt.id,
    })))
  }
}
```

3. 옵션 저장 시에도 기존 옵션 ID가 있으면 PATCH, 없으면 POST:

```typescript
// handleSubmit에서 옵션 저장 부분
if (formData.is_option && optionDrafts.length > 0) {
  for (const draft of optionDrafts) {
    if (draft.id) {
      // 기존 옵션 수정
      await fetch(`${BASE}/products/${productId}/options/${draft.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          option_name: draft.option_name,
          add_price: parseFloat(draft.add_price) || 0,
          stock_qty: draft.stock_qty || 0,
        })
      })
    } else {
      // 신규 옵션 추가
      await fetch(`${BASE}/products/${productId}/options`, {
        method: 'POST',
        headers,
        body: JSON.stringify(draft)
      })
    }
  }
}
```

## 완료 기준
- [x] 상품 등록 시 옵션 저장 정상
- [ ] 상품 수정 화면 진입 시 기존 옵션이 로드되어 표시
- [ ] 옵션 수정 후 저장 시 변경 반영
- [ ] 새 옵션 추가 후 저장 시 정상 저장
