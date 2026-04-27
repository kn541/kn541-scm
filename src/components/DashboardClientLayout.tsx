'use client'
/**
 * KN541 SCM 대시보드 클라이언트 레이아웃
 *
 * [근본 원인 수정 2026-04-28]
 * layout.tsx(Server Component)에서 <Navigation /> JSX를 verticalLayout prop으로
 * 넘기면 서버에서 직렬화 → @menu 패키지가 RSC 직렬화 형식 처리 불가 →
 * useMemo에서 children.type 읽기 시 undefined 에러 발생.
 *
 * 해결: Navigation을 포함한 레이아웃 전체를 이 Client Component 안에서 렌더링.
 * Server Component 경계를 넘어 @menu JSX를 props로 전달하지 않음.
 */
import type { Mode } from '@core/types'
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'
import Navigation from '@components/layout/vertical/Navigation'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import Header from '@components/layout/horizontal/Header'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'
import Button from '@mui/material/Button'
import AuthGuard from '@components/AuthGuard'

type Props = {
  children: React.ReactNode
  mode: Mode
  systemMode: string
}

export default function DashboardClientLayout({ children, mode, systemMode }: Props) {
  return (
    <AuthGuard>
      <LayoutWrapper
        forceVertical
        systemMode={systemMode as any}
        verticalLayout={
          <VerticalLayout
            navigation={<Navigation mode={mode} />}
            navbar={<Navbar />}
            footer={<VerticalFooter />}
          >
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
        <Button
          variant='contained'
          className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'
        >
          <i className='tabler-arrow-up' />
        </Button>
      </ScrollToTop>
    </AuthGuard>
  )
}
