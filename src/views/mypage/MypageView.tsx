'use client'
/**
 * KN541 SCM 마이페이지
 * GET  /scm/profile — 사업자정보 (읽기)
 * PATCH /scm/profile — 정산정보 (수정)
 */
import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import { scmGet, scmPatch } from '@/lib/scmApi'

interface ScmProfile {
  // 사업자정보 (읽기 전용)
  company_name: string | null
  business_no: string | null
  representative: string | null
  business_type: string | null
  business_item: string | null
  address: string | null
  phone: string | null
  email: string | null
  // 정산정보 (수정 가능)
  bank_name: string | null
  account_no: string | null
  account_holder: string | null
  // 상태
  status: string | null
  approved_at: string | null
}

interface SettlementForm {
  bank_name: string
  account_no: string
  account_holder: string
}

export default function MypageView() {
  const [profile, setProfile] = useState<ScmProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<SettlementForm>({ bank_name: '', account_no: '', account_holder: '' })
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    scmGet<ScmProfile>('/scm/profile')
      .then(p => {
        setProfile(p)
        setForm({
          bank_name:      p.bank_name      ?? '',
          account_no:     p.account_no     ?? '',
          account_holder: p.account_holder ?? '',
        })
      })
      .catch(e => toast(String(e.message), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await scmPatch('/scm/profile', form)
      toast('정산정보가 저장됐습니다.')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant='body2' color='text.secondary' sx={{ minWidth: 120, flexShrink: 0 }}>{label}</Typography>
      <Typography variant='body2' textAlign='right'>{value || '-'}</Typography>
    </Box>
  )

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>마이페이지</Typography>
        {profile?.status && (
          <Chip
            label={profile.status === 'ACTIVE' ? '승인완료' : profile.status === 'PENDING' ? '심사중' : profile.status}
            color={profile.status === 'ACTIVE' ? 'success' : 'warning'}
            variant='filled' size='small' sx={{ fontWeight: 700 }}
          />
        )}
      </Box>

      {/* 사업자정보 — 읽기 전용 */}
      <Card>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} sx={{ mb: 2 }}>사업자 정보</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
            사업자정보 수정이 필요한 경우 관리자에게 문의해 주세요.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Row label='상호명'       value={profile?.company_name} />
            <Row label='사업자등록번호' value={profile?.business_no} />
            <Row label='대표자명'      value={profile?.representative} />
            <Row label='업태'         value={profile?.business_type} />
            <Row label='업종'         value={profile?.business_item} />
            <Row label='주소'         value={profile?.address} />
            <Row label='연락처'       value={profile?.phone} />
            <Row label='이메일'       value={profile?.email} />
          </Box>
        </CardContent>
      </Card>

      {/* 정산정보 — 수정 가능 */}
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant='subtitle1' fontWeight={700}>정산 계좌 정보</Typography>
          <Typography variant='caption' color='text.secondary'>
            정산금 지급에 사용할 계좌 정보를 입력하세요.
          </Typography>
          <Divider />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size='small' label='은행명'
                placeholder='예: 국민은행'
                value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size='small' label='계좌번호'
                placeholder='- 없이 숫자만'
                value={form.account_no}
                onChange={e => setForm(f => ({ ...f, account_no: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size='small' label='예금주'
                value={form.account_holder}
                onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant='contained' onClick={() => void handleSave()} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
              {saving ? '저장 중…' : '정산정보 저장'}
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
