// KN541 SCM API 공통 헬퍼
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://kn541-backend.fly.dev'

export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export async function scmGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail ?? '요청 실패')
  return json.data as T
}

export async function scmPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail ?? '요청 실패')
  return json.data as T
}

export async function scmPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body)
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('401') }
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail ?? '요청 실패')
  return json.data as T
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '-'
  return `${Number(n).toLocaleString('ko-KR')}원`
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '-'
  return s.slice(0, 10)
}
