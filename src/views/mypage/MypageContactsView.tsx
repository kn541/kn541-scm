'use client'
/**
 * KN541 SCM 담당자 관리
 * GET/PATCH /scm/contacts
 * FIX: 404 에러 시 "서비스 준비 중" 메시지 표시
 */
import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'
import { scmGet, scmPatch } from '@/lib/scmApi'

interface Contacts {
  contact_name:  string | null
  contact_email: string | null
  contact_phone: string | null
  contact_dept:  string | null
}

export default function MypageContactsView() {
  const [form,    setForm]    = useState<Contacts>({ contact_name: '', contact_email: '', contact_phone: '', contact_dept: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })
  const toast = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    scmGet<Contacts>('/scm/contacts')
      .then(d => setForm({
        contact_name:  d.contact_name  ?? '',
        contact_email: d.contact_email ?? '',
        contact_phone: d.contact_phone ?? '',
        contact_dept:  d.contact_dept  ?? ''
      }))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await scmPatch('/scm/contacts', {
        contact_name:  form.contact_name  || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_dept:  form.contact_dept  || null,
      })
      toast('담당자 정보가 저장됐습니다.')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>

  // FIX: 404/에러 시 사용자 친화적 메시지
  if (error) return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>담당자 관리</Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-users' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)', marginBottom: 16 }} />
          <Typography variant='h6' fontWeight={600} sx={{ mb: 1 }}>서비스 준비 중입니다</Typography>
          <Typography variant='body2' color='text.secondary'>
            담당자 관리 기능을 준비하고 있습니다.<br />빠른 시일 내에 오픈될 예정입니다.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>담당자 관리</Typography>
      <Card>
        <CardHeader title='담당자 정보' subheader='공급사 업무 담당자 연락처를 관리합니다.' />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth label='담당자명'
                value={form.contact_name ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder='담당자 이름' />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth label='부서'
                value={form.contact_dept ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_dept: e.target.value }))}
                placeholder='부서명' />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth label='연락처'
                value={form.contact_phone ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                placeholder='010-0000-0000' />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField fullWidth label='이메일'
                value={form.contact_email ?? ''}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder='email@example.com' />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant='contained' onClick={() => void handleSave()}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
              {saving ? '저장 중…' : '저장'}
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
