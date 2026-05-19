'use client'
// KN541 옵션 2단 조합 — API 훅 (SCM용, Admin과 동일)

const BASE = process.env.NEXT_PUBLIC_API_URL || ''

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || localStorage.getItem('access_token') : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export interface OptionValue { id: string; group_id: string; value_name: string; sort_order: number; is_active: boolean }
export interface OptionGroup { id: string; product_id: string; group_name: string; sort_order: number; values: OptionValue[] }
export interface OptionCombination { id: string; product_id: string; option_name: string; option_group: string; value1_id: string | null; value2_id: string | null; add_price: string; stock_qty: number; is_active: boolean; sort_order: number }
export interface OptionGroupsData { groups: OptionGroup[]; combinations: OptionCombination[]; total_groups: number; total_combinations: number }

export async function fetchOptionGroups(productId: string): Promise<OptionGroupsData | null> {
  try { const res = await fetch(`${BASE}/products/${productId}/option-groups`, { headers: authHeaders() }); if (!res.ok) return null; return (await res.json()).data ?? null } catch { return null }
}
export async function createOptionGroup(productId: string, groupName: string, sortOrder = 0) {
  const res = await fetch(`${BASE}/products/${productId}/option-groups`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ group_name: groupName, sort_order: sortOrder }) }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '그룹 생성 실패') }; return (await res.json()).data
}
export async function deleteOptionGroup(productId: string, groupId: string) {
  const res = await fetch(`${BASE}/products/${productId}/option-groups/${groupId}`, { method: 'DELETE', headers: authHeaders() }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '그룹 삭제 실패') }; return (await res.json()).data
}
export async function createOptionValuesBulk(productId: string, groupId: string, values: string[]) {
  const res = await fetch(`${BASE}/products/${productId}/option-groups/${groupId}/values/bulk`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ values }) }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '값 추가 실패') }; return (await res.json()).data
}
export async function deleteOptionValue(productId: string, valueId: string) {
  const res = await fetch(`${BASE}/products/${productId}/option-values/${valueId}`, { method: 'DELETE', headers: authHeaders() }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '값 삭제 실패') }; return (await res.json()).data
}
export async function generateCombinations(productId: string, defaultAddPrice = 0, defaultStockQty = 0) {
  const res = await fetch(`${BASE}/products/${productId}/options/generate`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ default_add_price: defaultAddPrice, default_stock_qty: defaultStockQty }) }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '조합 생성 실패') }; return (await res.json()).data
}
export async function updateOption(productId: string, optionId: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/products/${productId}/options/${optionId}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '옵션 수정 실패') }; return (await res.json()).data
}
