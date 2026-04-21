// Type Imports
import type { Mode, Skin, Layout, LayoutComponentPosition, LayoutComponentWidth } from '@core/types'

type Navbar = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  floating: boolean
  detached: boolean
  blur: boolean
}

type Footer = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  detached: boolean
}

export type Config = {
  templateName: string
  homePageUrl: string
  settingsCookieName: string
  mode: Mode
  skin: Skin
  semiDark: boolean
  layout: Layout
  layoutPadding: number
  navbar: Navbar
  contentWidth: LayoutComponentWidth
  compactContentWidth: number
  footer: Footer
  disableRipple: boolean
}

const themeConfig: Config = {
  templateName: 'KN541 SCM',
  homePageUrl: '/dashboard',
  settingsCookieName: 'kn541-scm-v1',       // 쿠키 이름 변경 → 기존 vertical 쿠키 무효화
  mode: 'light',                             // 'system', 'light', 'dark'
  skin: 'default',                           // 'default', 'bordered'
  semiDark: false,
  layout: 'horizontal',                      // ← 탑바 수평 레이아웃
  layoutPadding: 24,
  compactContentWidth: 1440,
  navbar: {
    type: 'fixed',
    contentWidth: 'compact',
    floating: false,                          // horizontal 에서는 false 필수
    detached: false,                          // horizontal 에서는 false 필수
    blur: true
  },
  contentWidth: 'compact',
  footer: {
    type: 'static',
    contentWidth: 'compact',
    detached: false                           // horizontal 에서는 false 필수
  },
  disableRipple: false
}

export default themeConfig
