// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'
import Navigation from '@components/layout/vertical/Navigation'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import Header from '@components/layout/horizontal/Header'
import HorizontalFooter from '@components/layout/horizontal/Footer'

// Util Imports
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

// Component Imports
import ScrollToTop from '@core/components/scroll-to-top'

// MUI Imports
import Button from '@mui/material/Button'

// Auth Imports
import AuthGuard from '@components/AuthGuard'

const Layout = async ({ children }: ChildrenType) => {
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return (
    <Providers direction='ltr'>
      <AuthGuard>
        <LayoutWrapper
          forceVertical
          systemMode={systemMode}
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
    </Providers>
  )
}

export default Layout
