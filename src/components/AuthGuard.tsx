'use client'
// KN541 SCM Auth Guard
// localStorage.access_token 없으면 /login 리다이렉트
//
// 2026-05-28 fix: children 항상 렌더링
//   기존: checked=false → children 미렌더 → 마운트 지연 → useEffect 불안정
//   수정: children 항상 렌더 + 로딩 오버레이로 가림
//   → ProductFormView 등 하위 컴포넌트의 state/effect가 안정적으로 동작
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [pathname, router])

  return (
    <>
      {!checked && (
        <Box sx={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          position: 'fixed', inset: 0, zIndex: 9999,
          bgcolor: 'background.default', minHeight: '100vh',
        }}>
          <CircularProgress />
        </Box>
      )}
      {children}
    </>
  )
}
