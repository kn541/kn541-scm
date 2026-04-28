// Next Imports
import { cookies } from 'next/headers'

// Third-party Imports
import 'server-only'

// Type Imports
import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

// Config Imports
import themeConfig from '@configs/themeConfig'

export const getSettingsFromCookie = async (): Promise<Settings> => {
  const cookieStore = await cookies()

  const cookieName = themeConfig.settingsCookieName

  const raw = cookieStore.get(cookieName)?.value

  // 쿠키 없으면 빈 객체 반환 → settingsContext에서 기본값(primaryColor 포함) 사용
  if (!raw) return {}

  const parsed = JSON.parse(raw) as Settings

  // KN541 SCM: 대시보드는 수직(사이드바) 고정 — 쿠키에 horizontal이 있어도 무시
  return { ...parsed, layout: 'vertical' }
}

export const getMode = async () => {
  const settingsCookie = await getSettingsFromCookie()

  // Get mode from cookie or fallback to theme config
  const _mode = settingsCookie.mode || themeConfig.mode

  return _mode
}

export const getSystemMode = async (): Promise<SystemMode> => {
  const cookieStore = await cookies()
  const mode = await getMode()

  const colorPrefCookie = (cookieStore.get('colorPref')?.value || 'light') as SystemMode

  return (mode === 'system' ? colorPrefCookie : mode) || 'light'
}

export const getServerMode = async () => {
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return mode === 'system' ? systemMode : mode
}

export const getSkin = async () => {
  const settingsCookie = await getSettingsFromCookie()

  return settingsCookie.skin || 'default'
}
