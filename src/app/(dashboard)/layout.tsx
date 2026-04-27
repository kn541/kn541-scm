/**
 * KN541 SCM (dashboard) Layout — Server Component
 *
 * [수정 2026-04-28]
 * @menu JSX를 Server Component에서 직렬화하지 않도록 구조 변경.
 * Navigation/LayoutWrapper/AuthGuard 는 DashboardClientLayout(Client Component)에서 담당.
 * 이 파일은 Providers(MUI theme, SettingsContext 등)만 감싸는 역할.
 */
import type { ChildrenType } from '@core/types'
import Providers from '@components/Providers'
import DashboardClientLayout from '@components/DashboardClientLayout'
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

const Layout = async ({ children }: ChildrenType) => {
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return (
    <Providers direction='ltr'>
      <DashboardClientLayout mode={mode} systemMode={systemMode}>
        {children}
      </DashboardClientLayout>
    </Providers>
  )
}

export default Layout
