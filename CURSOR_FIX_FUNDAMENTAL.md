# KN541 SCM — 근본 해결 작업지시서

## 상황
- admin.kn541.co.kr: 정상 동작 ✅
- scm.kn541.co.kr: 모든 페이지 500 에러 ❌
- 같은 Vuexy 5.0.1, Next.js 16.1.1, React 19.2.3
- 원인: SCM에서 원본 구조를 변경한 부분들이 @menu 패키지와 충돌

## 해결 방법: admin 구조 복원

### 원칙
1. `src/@menu/` 폴더는 admin과 100% 동일하게 복원 (패치 전부 되돌리기)
2. `src/@layouts/` 폴더도 admin과 동일하게 복원 (forceVertical 제거)
3. AuthGuard는 @menu 밖에서 처리
4. 수직 레이아웃 강제는 themeConfig에서 처리

### 1단계: @menu 패키지 원본 복원

admin 레포(kn541/kn541)의 `admin/starter-kit/src/@menu/` 폴더와
SCM 레포(kn541/kn541-scm)의 `src/@menu/` 폴더를 비교하여,
**SCM의 @menu를 admin과 100% 동일하게** 복원합니다.

특히 `menuUtils.tsx`에 추가했던 방어 코드를 모두 제거합니다.

```bash
# admin의 @menu 폴더를 SCM으로 복사
cp -R /Users/kn541/Desktop/GitHub/kn541/admin/starter-kit/src/@menu/ \
      /Users/kn541/Desktop/GitHub/kn541-scm/src/@menu/
```

### 2단계: LayoutWrapper 원본 복원

SCM의 `src/@layouts/LayoutWrapper.tsx`를 admin과 동일하게 복원합니다.
`forceVertical` prop을 제거합니다.

admin의 LayoutWrapper를 그대로 복사:
```bash
cp /Users/kn541/Desktop/GitHub/kn541/admin/starter-kit/src/@layouts/LayoutWrapper.tsx \
   /Users/kn541/Desktop/GitHub/kn541-scm/src/@layouts/LayoutWrapper.tsx
```

### 3단계: dashboard layout.tsx를 admin과 동일하게

SCM의 `src/app/(dashboard)/layout.tsx`를 admin과 거의 동일하게 변경합니다.
AuthGuard와 forceVertical을 제거합니다.

```tsx
// src/app/(dashboard)/layout.tsx
import Button from '@mui/material/Button'
import type { ChildrenType } from '@core/types'
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'
import Providers from '@components/Providers'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

const Layout = async (props: ChildrenType) => {
  const { children } = props
  const direction = 'ltr'
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <LayoutWrapper
        systemMode={systemMode}
        verticalLayout={
          <VerticalLayout navigation={<Navigation mode={mode} />} navbar={<Navbar />} footer={<VerticalFooter />}>
            {children}
          </VerticalLayout>
        }
        horizontalLayout={
          <HorizontalLayout header={<Header />} footer={<HorizontalFooter />}>
            {children}
          </HorizontalLayout>
        }
      />
      <ScrollToTop className='mui-fixed'>
        <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
          <i className='tabler-arrow-up' />
        </Button>
      </ScrollToTop>
    </Providers>
  )
}

export default Layout
```

### 4단계: 수직 레이아웃 강제 (themeConfig 방식)

`src/configs/themeConfig.ts`에서 기본 레이아웃을 vertical로 설정:
```ts
const themeConfig = {
  // ...
  layout: 'vertical', // 기본값을 vertical로
  // ...
}
```

### 5단계: AuthGuard를 middleware로 이동

`src/middleware.ts` 파일을 생성하여 인증을 처리합니다.
@menu 내부가 아닌 Next.js middleware에서 토큰 체크:

```ts
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)']
}
```

주의: 현재 AuthGuard는 localStorage를 사용하지만, middleware는 cookies만 접근 가능.
로그인 시 localStorage와 cookie 모두에 토큰을 저장하도록 Login.tsx 수정 필요.

### 6단계: DashboardClientLayout.tsx 삭제

이 파일은 더 이상 사용하지 않으므로 삭제:
```bash
rm src/components/DashboardClientLayout.tsx
```

### 7단계: 로컬 테스트

```bash
pnpm dev
# /login → 로그인 폼 표시 확인
# /dashboard → 사이드바 메뉴 정상 표시 확인
# 콘솔에 TypeError 없음 확인
```

### 8단계: 배포

```bash
git add .
git commit -m "fix: admin 구조로 완전 복원 — @menu/@layouts 원본, AuthGuard middleware 이동"
git push
```

## 핵심 원칙
- @menu, @layouts, @core 폴더는 **절대 수정하지 않음**
- 커스터마이징은 src/components/, src/app/, src/configs/ 에서만
- admin과 동일한 구조를 유지하면 동일하게 동작함
