# KN541 SCM — 런타임 에러 긴급 수정

## 에러 내용

```
TypeError: Cannot read properties of undefined (reading 'type')
```

**모든 페이지**에서 발생 (로그인 포함). 빌드는 성공하지만 런타임에 클라이언트 사이드 에러.

## 브라우저 콘솔 스택트레이스

```
TypeError: Cannot read properties of undefined (reading 'type')
    at d (ede5cddd9cae34b5.js:1:48210)      ← @menu 패키지
    at x (ede5cddd9cae34b5.js:1:50369)      ← @menu 패키지
    at cde79a8a4ec627bd.js:1:64546           ← @menu 관련 컴포넌트
    at Object.useMemo (react)
```

## 원인 분석

- `src/@menu/utils/menuUtils.tsx`의 `mapHorizontalToVerticalMenu` 함수에서 `child.type` 읽기
- React 19 + Next.js 16 환경에서 RSC 직렬화된 자식 요소의 `.type`이 undefined
- Turbopack이 @menu 청크를 모든 페이지에 로드하면서 로그인 페이지에서도 발생

## 수정 방법

### 1단계: 에러 재현 확인
```bash
cd /Users/kn541/Desktop/GitHub/kn541-scm
pnpm dev
# http://localhost:3000/login 접속 → 브라우저 콘솔에서 에러 확인
```

### 2단계: menuUtils.tsx 방어 코드 추가

`src/@menu/utils/menuUtils.tsx`의 `mapHorizontalToVerticalMenu` 함수에서:

```tsx
// 수정 전
switch (child.type) {
  case HorizontalMenuItem:
  ...
}

// 수정 후 — child.type undefined 방어
if (!child || !child.type) return child  // 방어 코드 추가
switch (child.type) {
  case HorizontalMenuItem:
  ...
}
```

### 3단계: confirmUrlInChildren 함수도 방어

같은 파일에서 `confirmUrlInChildren` 함수의 `children.props` 접근에도 방어 추가.

### 4단계: 로컬 테스트

```bash
pnpm dev
# /login 페이지 → 에러 없이 로그인 폼 표시 확인
# /dashboard 페이지 → 사이드바 메뉴 정상 표시 확인
```

### 5단계: 빌드 + 배포

```bash
pnpm build   # 빌드 성공 확인
git add . && git commit -m "fix: @menu mapHorizontalToVerticalMenu child.type 방어 코드"
git push
```

## 핵심 규칙
- `src/@menu/` 폴더 내부 파일만 수정
- 다른 컴포넌트 (layout, Navigation, Providers 등) 건드리지 말 것
- `DashboardClientLayout.tsx`는 사용하지 않음 (이전 시도에서 실패)

## 참고: 이전 시도 (실패)
- DashboardClientLayout 분리 → 실패 (같은 에러)
- layout.tsx 롤백 → 실패 (같은 에러)
- 결론: 레이아웃 구조가 아닌 @menu 패키지 내부 코드 문제
