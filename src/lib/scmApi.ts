// KN541 SCM API 공통 헬퍼
// 수정: 2026-04-28
//   - scmGet: 10초 timeout + AbortController 추가 (TASK 4)
//   - publicGet: 인증 없는 공개 API 전용 (공지사항 등)
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://kn541-production.up.railway.app'

/** 엑셀 다운로드 등 비 JSON 응답용 */
export const SCM_API_BASE = BASE

export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** 인증 필요 GET — 10초 timeout, 401 시 로그인 리다이렉트 */
export async function scmGet<T>(path: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '요청 실패')
    return json.data as T
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.')
    throw e
  }
}

/** 공개 API GET — 인증 필요 없음 (공지사항, 약관 등) */
export async function publicGet<T>(path: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '요청 실패')
    return json.data as T
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다.')
    throw e
  }
}

export async function scmPost<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '요청 실패')
    return json.data as T
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다.')
    throw e
  }
}

export async function scmPatch<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '요청 실패')
    return json.data as T
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다.')
    throw e
  }
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '-'
  return `${Number(n).toLocaleString('ko-KR')}원`
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '-'
  return s.slice(0, 10)
}
