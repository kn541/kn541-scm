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
  settingsCookieName: 'kn541-scm-v2',       // v2: 예전 horizontal 쿠키 무효화
  mode: 'light',                             // 'system', 'light', 'dark'
  skin: 'default',                           // 'default', 'bordered'
  semiDark: false,
  layout: 'vertical',                        // SCM: 사이드바(수직) 기본
  layoutPadding: 24,
  compactContentWidth: 1440,
  navbar: {
    type: 'fixed',
    contentWidth: 'compact',
    floating: true,
    detached: true,
    blur: true
  },
  contentWidth: 'compact',
  footer: {
    type: 'static',
    contentWidth: 'compact',
    detached: true
  },
  disableRipple: false
}

export default themeConfig
