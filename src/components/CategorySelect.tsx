'use client'
/**
 * KN541 공통 카테고리 연동 셀렉터
 * 어드민 CategorySelect.tsx와 동일 — SCM용 복사본
 * 2026-05-28: SCM ProductFormView 모듈화를 위해 추가
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'

interface CategoryItem { id: string; name: string; hasChildren?: boolean }

export interface CategorySelectProps {
  value?: string
  onChange?: (id: string, depth: number) => void
  allowAll?: boolean
  maxDepth?: number
  size?: 'small' | 'medium'
  disabled?: boolean
  labels?: string[]
  initialPath?: string[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const DEPTH_LABELS_DEFAULT = ['대분류', '중분류', '소분류', '세분류']

export default function CategorySelect({
  value = '',
  onChange,
  allowAll = true,
  maxDepth = 4,
  size = 'small',
  disabled = false,
  labels = DEPTH_LABELS_DEFAULT,
  initialPath,
}: CategorySelectProps) {
  const [selected, setSelected] = useState<string[]>(Array(maxDepth).fill(''))
  const [lists,    setLists]    = useState<CategoryItem[][]>(Array(maxDepth).fill([]))
  const [loading,  setLoading]  = useState<boolean[]>(Array(maxDepth).fill(false))

  const pathRestoredRef = useRef(false)
  const restoringRef = useRef(false)

  const loadList = useCallback(async (depth: number, parentId: string): Promise<CategoryItem[]> => {
    if (depth > maxDepth) return []
    setLoading(prev => { const n = [...prev]; n[depth - 1] = true; return n })
    try {
      let items: CategoryItem[] = []
      if (depth === 1) {
        const r = await fetch(`${BASE}/categories`, { headers: getHeaders() })
        if (r.ok) {
          const d = await r.json()
          items = (d.data?.items ?? [])
            .filter((c: { depth: number }) => c.depth === 1)
            .map((c: { id: string; category_name: string; children?: unknown[] }) => ({
              id: c.id, name: c.category_name,
              hasChildren: (c.children ?? []).length > 0,
            }))
        }
      } else {
        const r = await fetch(`${BASE}/categories/${parentId}`, { headers: getHeaders() })
        if (r.ok) {
          const d = await r.json()
          items = (d.data?.children ?? []).map((c: { id: string; category_name: string; children?: unknown[] }) => ({
            id: c.id, name: c.category_name,
            hasChildren: (c.children ?? []).length > 0,
          }))
        }
      }
      setLists(prev => {
        const n = [...prev]
        n[depth - 1] = items
        if (!restoringRef.current) {
          for (let d = depth; d < maxDepth; d++) n[d] = []
        }
        return n
      })
      return items
    } catch {
      return []
    } finally {
      setLoading(prev => { const n = [...prev]; n[depth - 1] = false; return n })
    }
  }, [maxDepth])

  useEffect(() => { void loadList(1, '') }, [loadList])

  useEffect(() => {
    if (!initialPath || initialPath.length === 0) return
    if (pathRestoredRef.current) return
    const validPath = initialPath.filter(Boolean)
    if (validPath.length === 0) return
    pathRestoredRef.current = true

    const restorePath = async () => {
      restoringRef.current = true
      try {
        const newSelected = Array(maxDepth).fill('')
        for (let i = 0; i < Math.min(validPath.length, maxDepth); i++) {
          newSelected[i] = validPath[i]
        }
        setSelected(newSelected)
        for (let i = 1; i < Math.min(validPath.length, maxDepth); i++) {
          const parentId = validPath[i - 1]
          if (parentId) await loadList(i + 1, parentId)
        }
      } finally {
        restoringRef.current = false
      }
    }
    void restorePath()
  }, [initialPath, maxDepth, loadList])

  const handleChange = (depth: number, id: string) => {
    const newSelected = [...selected]
    newSelected[depth - 1] = id
    for (let d = depth; d < maxDepth; d++) newSelected[d] = ''
    setSelected(newSelected)
    setLists(prev => {
      const n = [...prev]
      for (let d = depth; d < maxDepth; d++) n[d] = []
      return n
    })
    if (id) {
      void loadList(depth + 1, id)
      onChange?.(id, depth)
    } else {
      const parentId = depth > 1 ? newSelected[depth - 2] : ''
      onChange?.(parentId, depth - 1)
    }
  }

  let lastSelected = -1
  for (let i = selected.length - 1; i >= 0; i--) {
    if (selected[i] !== '') { lastSelected = i; break }
  }
  const visibleDepths = Math.min(maxDepth, lastSelected + 2)

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {Array.from({ length: Math.max(1, visibleDepths) }, (_, i) => {
        const depth = i + 1
        const list = lists[i] ?? []
        const val = selected[i] ?? ''
        const isLoading = loading[i]
        const isDisabled = disabled || (depth > 1 && !selected[i - 1])
        if (depth > 1 && list.length === 0 && !isLoading && !val) return null
        return (
          <CustomTextField key={depth} select size={size}
            label={labels[i] ?? `${depth}단`}
            value={val}
            onChange={e => handleChange(depth, e.target.value)}
            disabled={isDisabled}
            sx={{ minWidth: 150 }}>
            {allowAll && <MenuItem value=''>전체</MenuItem>}
            {isLoading ? (
              <MenuItem disabled>
                <Typography variant='caption' color='text.secondary'>로딩 중…</Typography>
              </MenuItem>
            ) : list.length === 0 ? (
              <MenuItem disabled>
                <Typography variant='caption' color='text.secondary'>항목 없음</Typography>
              </MenuItem>
            ) : (
              list.map(item => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))
            )}
          </CustomTextField>
        )
      })}
    </Box>
  )
}
