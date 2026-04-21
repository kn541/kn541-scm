'use client'
/**
 * KN541 SCM 비밀번호 변경
 * PATCH /auth/change-password
 */
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function MypagePasswordView() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [snack,  setSnack]  = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })
  const toast = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  const handleSave = async () => {
    if (!form.current_password) { toast('현재 비밀번호를 입력하세요.', 'error'); return }
    if (!form.new_password)     { toast('새 비밀번호를 입력하세요.', 'error'); return }
    if (form.new_password.length < 8) { toast('새 비밀번호는 8자 이상이어야 합니다.', 'error'); return }
    if (form.new_password !== form.confirm_password) { toast('비밀번호가 일치하지 않습니다.', 'error'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password:     form.new_password
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? `HTTP ${res.status}`)
      }
      toast('비밀번호가 변경됐습니다.')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '변경 중 오류가 발생했습니다.', 'error')
    } finally { setSaving(false) }
  }

  const EyeBtn = ({ field }: { field: 'current' | 'next' | 'confirm' }) => (
    <InputAdornment position='end'>
      <IconButton onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))} edge='end' size='small'>
        <i className={show[field] ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 18 }} />
      </IconButton>
    </InputAdornment>
  )

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>비밀번호 변경</Typography>
      <Card sx={{ maxWidth: 480 }}>
        <CardHeader title='비밀번호 변경' subheader='보안을 위해 주기적으로 변경해주세요.' />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={12}>
              <CustomTextField fullWidth label='현재 비밀번호 *'
                type={show.current ? 'text' : 'password'}
                value={form.current_password}
                onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
                InputProps={{ endAdornment: <EyeBtn field='current' /> }} />
            </Grid>
            <Grid size={12}>
              <CustomTextField fullWidth label='새 비밀번호 * (8자 이상)'
                type={show.next ? 'text' : 'password'}
                value={form.new_password}
                onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                InputProps={{ endAdornment: <EyeBtn field='next' /> }} />
            </Grid>
            <Grid size={12}>
              <CustomTextField fullWidth label='새 비밀번호 확인 *'
                type={show.confirm ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                InputProps={{ endAdornment: <EyeBtn field='confirm' /> }} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Button fullWidth variant='contained' onClick={() => void handleSave()}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
              {saving ? '변경 중…' : '비밀번호 변경'}
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
