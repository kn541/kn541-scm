'use client'
// KN541 SCM 포털 — 수직 메뉴
// 어드민과 동일한 SubMenu + MenuItem 계층 구조 사용

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: (container: any) => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: (container: any) => scrollMenu(container, true)
          })}
    >
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {/* 대시보드 */}
        <MenuItem href='/dashboard' icon={<i className='tabler-layout-dashboard' />}>
          대시보드
        </MenuItem>

        {/* 상품 관리 */}
        <SubMenu label='상품 관리' icon={<i className='tabler-package' />}>
          <MenuItem href='/products'>내 상품 목록</MenuItem>
          <MenuItem href='/products/new'>상품 등록</MenuItem>
        </SubMenu>

        {/* 주문 확인 */}
        <SubMenu label='주문 확인' icon={<i className='tabler-shopping-cart' />}>
          <MenuItem href='/orders'>주문 목록</MenuItem>
          <MenuItem href='/orders/shipping'>배송 처리</MenuItem>
        </SubMenu>

        {/* 정산관리 */}
        <SubMenu label='정산관리' icon={<i className='tabler-receipt' />}>
          <MenuItem href='/settlements'>정산 현황</MenuItem>
          <MenuItem href='/settlements/payments'>입금 확인</MenuItem>
        </SubMenu>

        {/* 문의 — 문의 등록 서브메뉴 제거 (기능 없음) */}
        <MenuItem href='/inquiries' icon={<i className='tabler-message-circle' />}>
          문의
        </MenuItem>

        {/* 공지사항 */}
        <MenuItem href='/notices' icon={<i className='tabler-speakerphone' />}>
          공지사항
        </MenuItem>

        {/* 마이페이지 */}
        <SubMenu label='마이페이지' icon={<i className='tabler-user-circle' />}>
          <MenuItem href='/mypage'>사업자 정보</MenuItem>
          <MenuItem href='/mypage/contacts'>담당자 관리</MenuItem>
          <MenuItem href='/mypage/password'>비밀번호 변경</MenuItem>
        </SubMenu>
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
