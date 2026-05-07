'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

// Third-party Imports
import styled from '@emotion/styled'

// Type Imports
import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

type LogoWrapperProps = {
  isHovered?: VerticalNavContextProps['isHovered']
  isCollapsed?: VerticalNavContextProps['isCollapsed']
  transitionDuration?: VerticalNavContextProps['transitionDuration']
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached']
}

const LogoWrapper = styled.div<LogoWrapperProps>`
  transition: ${({ transitionDuration }) =>
    `opacity ${transitionDuration}ms ease-in-out, max-width ${transitionDuration}ms ease-in-out`};
  ${({ isHovered, isCollapsed, isBreakpointReached }) =>
    !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; max-width: 0; overflow: hidden;'
      : 'opacity: 1; max-width: 200px;'}
`

// KN541 CI 로고 (Supabase 공용 자산) - admin/shop/scm 공통 사용
const LOGO_LIGHT_URL = 'https://ghtkropmnrelkxivzpim.supabase.co/storage/v1/object/public/assets/kn541-logo.png'
const LOGO_DARK_URL = 'https://ghtkropmnrelkxivzpim.supabase.co/storage/v1/object/public/assets/kn541-logo-dark.png'

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  // Refs
  const logoRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()

  // Vars
  const { layout, mode } = settings

  // 시스템 모드(prefers-color-scheme) 감지
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(media.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (layout !== 'collapsed') {
      return
    }

    if (logoRef && logoRef.current) {
      if (!isBreakpointReached && layout === 'collapsed' && !isHovered) {
        logoRef.current?.classList.add('hidden')
      } else {
        logoRef.current.classList.remove('hidden')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, layout, isBreakpointReached])

  // 다크/라이트 모드 분기 (system 모드는 OS 설정 따름)
  const isDark = mode === 'dark' || (mode === 'system' && systemDark)
  const logoSrc = isDark ? LOGO_DARK_URL : LOGO_LIGHT_URL

  return (
    <div className='flex items-center'>
      <LogoWrapper
        ref={logoRef}
        isHovered={isHovered}
        isCollapsed={layout === 'collapsed'}
        transitionDuration={transitionDuration}
        isBreakpointReached={isBreakpointReached}
      >
        <img
          src={logoSrc}
          alt='KN541'
          style={{
            height: 28,
            width: 'auto',
            display: 'block',
            objectFit: 'contain'
          }}
        />
      </LogoWrapper>
    </div>
  )
}

export default Logo
