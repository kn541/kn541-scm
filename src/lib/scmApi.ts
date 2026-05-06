// KN541 SCM API 공통 헬퍼
// 수정: 2026-04-28
//   - scmGet: 10초 timeout + AbortController 추가 (TASK 4)
//   - publicGet: 인증 없는 공개 API 전용 (공지사항 등)
// 수정: 2026-05-06 — fetchSystemCodesPublic (product_status 탭 라벨)
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://kn541-production.up.railway.app'

/** 엑셀 다운로드 등 비 JSON 응답용 */
export const SCM_API_BASE = BASE

export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** system_codes 공개 조회 (인증 불필요) — 탭 라벨용 category=product_status 등 */
export async function fetchSystemCodesPublic(
  category: string,
  timeoutMs = 10000,
): Promise<Array<{ code: string; code_name: string; code_value: string | null; sort_order: number }>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}/system-codes?category=${encodeURIComponent(category)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const json = await res.json()
    if (!res.ok) throw new Error(json.detail ?? '코드 조회 실패')
    const items = json.data?.items ?? []
    return items as Array<{ code: string; code_name: string; code_value: string | null; sort_order: number }>
  } catch (e: unknown) {
    clearTimeout(timer)
    if (e && typeof e === 'object' && 'name' in e && (e as { name?: string }).name === 'AbortError') {
      throw new Error('요청 시간이 초과됐습니다.')
    }
    throw e
  }
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

export async function scmPost<T>(path: string, body: unknown, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
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
    if (!res.ok) {
      const d = json.detail
      const msg = Array.isArray(d) ? d.map((x: unknown) => String(x)).join(', ') : (d ?? '요청 실패')
      throw new Error(msg)
    }
    return json.data as T
  } catch (e: any) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('요청 시간이 초과됐습니다.')
    throw e
  }
}

/** multipart/form-data (파일 업로드) — Content-Type 은 브라우저가 설정 */
export async function scmPostMultipart<T>(path: string, form: FormData, timeoutMs = 120000): Promise<T> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
    const json = await res.json()
    if (!res.ok) {
      const d = json.detail
      const msg = Array.isArray(d) ? d.map((x: unknown) => String(x)).join(', ') : (d ?? '요청 실패')
      throw new Error(msg)
    }
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
