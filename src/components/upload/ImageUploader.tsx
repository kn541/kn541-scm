'use client'
// KN541 어드민 — 재사용 이미지 업로더 컴포넌트
// docs/프론트엔드_작업지시서_이미지업로드.md
// 드래그앤드롭 + 클릭 업로드 / 100×100 미리보기 / 삭제 버튼 (서버+화면) / maxCount prop

import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'

const BASE = process.env.NEXT_PUBLIC_API_URL
const getToken = () =>
  typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''

export interface ImageUploaderProps {
  /** Supabase Storage 버킷명 */
  bucket: 'products' | 'banners' | 'brands' | 'members'
  /** 저장 하위 폴더 (예: 'thumbnails') */
  folder?: string
  /** 현재 이미지 URL 목록 */
  value?: string[]
  /** URL 목록 변경 콜백 */
  onChange?: (urls: string[]) => void
  /** 최대 업로드 수 (기본 1) */
  maxCount?: number
  /** 라벨 텍스트 */
  label?: string
  /** 비활성화 */
  disabled?: boolean
}

/** 버킷별 용량 제한 (bytes) */
const BUCKET_LIMIT: Record<string, number> = {
  products: 5  * 1024 * 1024,
  banners:  10 * 1024 * 1024,
  brands:   2  * 1024 * 1024,
  members:  10 * 1024 * 1024,
}

/** 허용 MIME 타입 */
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png',
  'image/gif', 'image/webp', 'image/svg+xml',
])

export default function ImageUploader({
  bucket,
  folder,
  value = [],
  onChange,
  maxCount = 1,
  label,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const limitMB = Math.round((BUCKET_LIMIT[bucket] ?? 5 * 1024 * 1024) / (1024 * 1024))

  // 단일 파일 업로드 → public URL 반환
  const uploadOne = async (file: File): Promise<string | null> => {
    if (!ALLOWED_MIME.has(file.type)) {
      alert('JPEG, PNG, WebP, GIF, SVG 파일만 업로드 가능합니다.')
      return null
    }
    if (file.size > (BUCKET_LIMIT[bucket] ?? 5 * 1024 * 1024)) {
      alert(`파일 크기가 ${limitMB}MB를 초과합니다.`)
      return null
    }

    const params = new URLSearchParams({ bucket })
    if (folder) params.set('folder', folder)

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const res  = await fetch(`${BASE}/upload/image?${params}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? '업로드 실패')
      return json.data.url as string
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다.')
      return null
    } finally {
      setUploading(false)
    }
  }

  // 여러 파일 처리
  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled || uploading) return
    const remaining = maxCount - value.length
    if (remaining <= 0) {
      alert(`최대 ${maxCount}장까지 업로드 가능합니다.`)
      return
    }
    const targets = Array.from(files).slice(0, remaining)
    const newUrls: string[] = []
    for (const f of targets) {
      const url = await uploadOne(f)
      if (url) newUrls.push(url)
    }
    if (newUrls.length > 0) onChange?.([...value, ...newUrls])
  }

  // 이미지 삭제 (서버 + 화면)
  const handleDelete = async (targetUrl: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return

    // Supabase Storage 경로 추출
    const storageBase = process.env.NEXT_PUBLIC_STORAGE_URL ?? ''
    const bucketPrefix = `${storageBase}/${bucket}/`
    const path = targetUrl.startsWith(bucketPrefix)
      ? targetUrl.slice(bucketPrefix.length)
      : null

    // 서버 삭제 시도 (실패해도 화면에서는 제거)
    if (path) {
      try {
        await fetch(
          `${BASE}/upload/image?${new URLSearchParams({ bucket, path })}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } }
        )
      } catch {
        // 서버 오류는 무시하고 화면에서만 제거
      }
    }
    onChange?.(value.filter(u => u !== targetUrl))
  }

  const canUpload = value.length < maxCount

  return (
    <Box>
      {label && (
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      {/* 업로드 영역 — 최대 수 도달 시 숨김 */}
      {canUpload && (
        <Box
          onClick={() => {
            if (!disabled && !uploading) inputRef.current?.click()
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
          sx={{
            border: '2px dashed',
            borderColor: dragging ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            bgcolor: dragging ? 'action.hover' : 'background.paper',
            transition: 'border-color 0.2s, background-color 0.2s',
            mb: 1,
            opacity: disabled ? 0.5 : 1,
            userSelect: 'none',
          }}
        >
          {uploading ? (
            <CircularProgress size={32} />
          ) : (
            <>
              <i className='tabler-cloud-upload' style={{ fontSize: 36, opacity: 0.45 }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                클릭하거나 파일을 이곳에 드래그하세요
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                JPEG &middot; PNG &middot; WebP &middot; GIF &middot; SVG
                &nbsp;&middot;&nbsp;최대 {limitMB}MB
                {maxCount > 1 && ` · 최대 ${maxCount}장`}
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* 파일 입력 (hidden) */}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        multiple={maxCount > 1}
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={e => {
          void handleFiles(e.target.files)
          e.target.value = '' // 동일 파일 재선택 허용
        }}
      />

      {/* 미리보기 그리드 */}
      {value.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {value.map((url, idx) => (
            <Box
              key={url}
              sx={{
                position: 'relative',
                width: 100,
                height: 100,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
                bgcolor: 'action.hover',
              }}
            >
              {/* 마비보 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`이미지 ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* 삭제 버튼 */}
              {!disabled && (
                <IconButton
                  size='small'
                  onClick={() => void handleDelete(url)}
                  aria-label='이미지 삭제'
                  sx={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: 'white',
                    p: 0.4,
                    '&:hover': { bgcolor: 'error.main' },
                  }}
                >
                  <i className='tabler-x' style={{ fontSize: 12 }} />
                </IconButton>
              )}

              {/* 순서 인덱스 (다중 업로드 시만) */}
              {maxCount > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    left: 2,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: 'white',
                    borderRadius: 0.5,
                    px: 0.5,
                    fontSize: 10,
                    lineHeight: '16px',
                  }}
                >
                  {idx + 1}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
