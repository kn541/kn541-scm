'use client'
// KN541 SCM 로그인
// POST /auth/login → access_token localStorage 저장 → /dashboard 이동
// 백엔드 LoginRequest: login_id (또는 username) + password

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import classnames from 'classnames'
import type { SystemMode } from '@core/types'
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'
import themeConfig from '@configs/themeConfig'
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://kn541-production.up.railway.app'

const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: { maxBlockSize: 550 },
  [theme.breakpoints.down('lg')]:  { maxBlockSize: 450 },
}))

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1,
})

export default function LoginV2({ mode }: { mode: SystemMode }) {
  const [loginId,  setLoginId]  = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const router = useRouter()
  const { settings } = useSettings()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))

  const darkImg   = '/images/pages/auth-mask-dark.png'
  const lightImg  = '/images/pages/auth-mask-light.png'
  const darkIll   = '/images/illustrations/auth/v2-login-dark.png'
  const lightIll  = '/images/illustrations/auth/v2-login-light.png'
  const darkBord  = '/images/illustrations/auth/v2-login-dark-border.png'
  const lightBord = '/images/illustrations/auth/v2-login-light-border.png'

  const authBackground        = useImageVariant(mode, lightImg, darkImg)
  const characterIllustration = useImageVariant(mode, lightIll, darkIll, lightBord, darkBord)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginId.trim())  { setError('아이디 또는 이메일을 입력하세요.'); return }
    if (!password.trim()) { setError('비밀번호를 입력하세요.'); return }

    setLoading(true)
    setError('')

    try {
      // 백엔드 LoginRequest 스펙: { login_id, password }
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: loginId.trim(), password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.detail ?? '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.')
        return
      }

      const data = json.data ?? json

      // user_type 확인 — 004(공급사)만 허용
      if (data.user_type && data.user_type !== '004') {
        setError('공급사 계정이 아닙니다. SCM 포털은 공급사만 이용 가능합니다.')
        return
      }

      // 토큰 저장
      localStorage.setItem('access_token',  data.access_token  ?? '')
      localStorage.setItem('refresh_token', data.refresh_token ?? '')
      localStorage.setItem('user_type',     data.user_type     ?? '004')
      localStorage.setItem('user_id',       data.user_id       ?? '')
      localStorage.setItem('username',      loginId.trim())

      // 대시보드로 이동
      router.push('/dashboard')

    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      {/* 왼쪽 일러스트레이션 */}
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          { 'border-ie': settings.skin === 'bordered' }
        )}
      >
        <LoginIllustration src={characterIllustration} alt='illustration' />
        {!hidden && <MaskImg alt='mask' src={authBackground} />}
      </div>

      {/* 오른쪽 폼 */}
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <Link className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </Link>

        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
          <div className='flex flex-col gap-1'>
            <Typography variant='h4'>KN541 SCM 포털 환영합니다 📦</Typography>
            <Typography color='text.secondary'>공급사 계정으로 로그인하세요</Typography>
          </div>

          {error && (
            <Alert severity='error' onClose={() => setError('')}>{error}</Alert>
          )}

          <form noValidate autoComplete='off' onSubmit={handleLogin} className='flex flex-col gap-5'>
            <CustomTextField
              autoFocus
              fullWidth
              label='아이디 또는 이메일'
              placeholder='아이디 또는 이메일 주소'
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              disabled={loading}
            />
            <CustomTextField
              fullWidth
              label='비밀번호'
              placeholder='비밀번호 입력'
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton edge='end' onClick={() => setShowPw(v => !v)} onMouseDown={e => e.preventDefault()}>
                        <i className={showPw ? 'tabler-eye-off' : 'tabler-eye'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              fullWidth
              variant='contained'
              type='submit'
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color='inherit' /> : undefined}
            >
              {loading ? '로그인 중…' : '로그인'}
            </Button>
          </form>

          <Typography variant='caption' color='text.disabled' align='center'>
            {themeConfig.templateName} — 공급사 전용 포털
          </Typography>
        </div>
      </div>
    </div>
  )
}
