'use client'
/**
 * 엑셀 내보내기 — GET /excel/export/{entity} (바이너리)
 */
import { useCallback, useState } from 'react'
import { SCM_API_BASE, authHeaders } from '@/lib/scmApi'

const EXCEL_TIMEOUT_MS = 120_000

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback
  const mStar = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (mStar) {
    try {
      return decodeURIComponent(mStar[1].trim())
    } catch {
      /* fallthrough */
    }
  }
  const m = /filename="([^"]+)"/i.exec(contentDisposition)
  if (m) return m[1].trim()
  const m2 = /filename=([^;]+)/i.exec(contentDisposition)
  if (m2) return m2[1].trim().replace(/^"|"$/g, '')
  return fallback
}

export function useExcelDownload() {
  const [downloading, setDownloading] = useState(false)

  const download = useCallback(async (entity: string, filters?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams()
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v != null && String(v).trim() !== '') qs.set(k, String(v).trim())
      }
    }
    const path = `/excel/export/${encodeURIComponent(entity)}${qs.toString() ? `?${qs}` : ''}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), EXCEL_TIMEOUT_MS)
    setDownloading(true)
    try {
      const res = await fetch(`${SCM_API_BASE}${path}`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.status === 401) {
        window.location.href = '/login'
        throw new Error('401')
      }
      if (!res.ok) {
        let msg = '다운로드에 실패했습니다.'
        try {
          const j = (await res.json()) as { detail?: string | string[] }
          const d = j.detail
          msg = Array.isArray(d) ? d.join(', ') : (d ?? msg)
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const fallback = `KN541_${entity}_${new Date().toISOString().slice(0, 10)}.xlsx`
      const filename = parseFilename(res.headers.get('Content-Disposition'), fallback)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      clearTimeout(timer)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('다운로드 시간이 초과됐습니다. 범위를 줄이고 다시 시도해 주세요.')
      }
      throw e
    } finally {
      setDownloading(false)
    }
  }, [])

  return { downloading, download }
}
