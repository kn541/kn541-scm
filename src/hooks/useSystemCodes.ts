'use client'
/**
 * KN541 SCM — system_codes 동적 로드 훅
 * 어드민의 useSystemCodes 와 동일 인터페이스
 * 2026-05-19: SCM ProductFormView 빌드 에러 해결을 위해 생성
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSystemCodesPublic } from '@/lib/scmApi'

export interface CodeItem {
  code: string
  code_name: string
  code_value: string | null
  sort_order: number
}

export function useSystemCodes(categories: string[]) {
  const [codes, setCodes] = useState<Record<string, CodeItem[]>>({})
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef<Set<string>>(new Set())

  const load = useCallback(async () => {
    const toLoad = categories.filter(c => !loadedRef.current.has(c))
    if (toLoad.length === 0) return

    setLoading(true)
    try {
      const results = await Promise.all(
        toLoad.map(async (cat) => {
          try {
            const items = await fetchSystemCodesPublic(cat)
            return { cat, items }
          } catch {
            return { cat, items: [] as CodeItem[] }
          }
        })
      )

      setCodes(prev => {
        const next = { ...prev }
        for (const { cat, items } of results) {
          next[cat] = items
          loadedRef.current.add(cat)
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [categories.join(',')])

  useEffect(() => { load() }, [load])

  return { codes, loading }
}
