'use client'
/**
 * KN541 SCM 마이페이지 — 사업자 정보
 * GET   /scm/profile  — 사업자정보(읽기) + 정산정보
 * PATCH /scm/profile  — 정산정보 수정
 * FIX: 404 에러 시 "서비스 준비 중" 메시지 표시
 */
import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'
import { scmGet, scmPatch } from '@/lib/scmApi'

interface Profile {
  company_name:    string | null
  business_no:     string | null
  ceo_name:        string | null
  company_phone:   string | null
  company_address: string | null
  contact_email:   string | null
  supplier_grade:  string | null
  status:          string | null
  joined_at:       string | null
  bank_name:        string | null
  account_no:       string | null
  account_holder:   string | null
  settlement_cycle: string | null
  commission_rate:  number | null
}

interface SettlementForm {
  bank_name:      string
  account_no:     string
  account_holder: string
}

const SUPPLIER_GRADE_MAP: Record<string, string> = {
  STANDARD: '일반 공급사',
  PREMIUM:  '프리미엄 공급사',
  PARTNER:  '파트너 공급사',
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'success'|'warning'|'error' }> = {
  ACTIVE:    { label: '활성',   color: 'success' },
  PENDING:   { label: '승인대기', color: 'warning' },
  SUSPENDED: { label: '정지',   color: 'error'   },
}

export default function MypageView() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState<SettlementForm>({ bank_name: '', account_no: '', account_holder: '' })
  const [saving,  setSaving]  = useState(false)
  const [editMode,setEditMode]= useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  useEffect(() => {
    scmGet<Profile>('/scm/profile')
      .then(d => {
        setProfile(d)
        setForm({
          bank_name:      d.bank_name      ?? '',
          account_no:     d.account_no     ?? '',
          account_holder: d.account_holder ?? '',
        })
      })
      .catch(e => setError(String((e as Error).message)))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!form.bank_name.trim())      { toast('은행명을 입력하세요.', 'error'); return }
    if (!form.account_no.trim())     { toast('계좌번호를 입력하세요.', 'error'); return }
    if (!form.account_holder.trim()) { toast('예금주를 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await scmPatch('/scm/profile', {
        bank_name:      form.bank_name.trim(),
        account_no:     form.account_no.trim(),
        account_holder: form.account_holder.trim(),
      })
      toast('정산정보가 저장됐습니다.')
      setEditMode(false)
      const updated = await scmGet<Profile>('/scm/profile')
      setProfile(updated)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>

  // FIX: 404/에러 시 사용자 친화적 메시지
  if (error) return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>마이페이지</Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-settings' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)', marginBottom: 16 }} />
          <Typography variant='h6' fontWeight={600} sx={{ mb: 1 }}>서비스 준비 중입니다</Typography>
          <Typography variant='body2' color='text.secondary'>
            사업자 정보 관리 기능을 준비하고 있습니다.<br />빠른 시일 내에 오픈될 예정입니다.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )

  const sm = STATUS_MAP[profile?.status ?? ''] ?? { label: profile?.status ?? '-', color: 'default' as const }

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>마이페이지</Typography>

      <Card>
        <CardHeader
          title='사업자 정보'
          subheader='사업자 정보는 관리자를 통해 변경 가능합니다.'
          action={<Chip label={sm.label} color={sm.color} size='small' sx={{ fontWeight: 700 }} />}
        />
        <CardContent>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='상호명'    value={profile?.company_name    ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='사업자번호' value={profile?.business_no      ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='대표자'    value={profile?.ceo_name         ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='연락처'    value={profile?.company_phone    ?? '-'} />
            </Grid>
            <Grid size={12}>
              <ReadField label='사업장 주소' value={profile?.company_address ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='담당자 이메일' value={profile?.contact_email   ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='공급사 등급'
                value={SUPPLIER_GRADE_MAP[profile?.supplier_grade ?? ''] ?? profile?.supplier_grade ?? '-'} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title='정산 정보'
          action={
            !editMode ? (
              <Button variant='outlined' size='small'
                startIcon={<i className='tabler-edit' />}
                onClick={() => setEditMode(true)}>수정</Button>
            ) : null
          }
        />
        <CardContent>
          <Grid container spacing={2.5} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='정산 주기' value={profile?.settlement_cycle ?? '-'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadField label='수수료율'
                value={profile?.commission_rate != null ? `${profile.commission_rate}%` : '-'} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {editMode ? (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField fullWidth label='은행명 *' value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder='예: 국민은행' />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField fullWidth label='계좌번호 *' value={form.account_no}
                  onChange={e => setForm(f => ({ ...f, account_no: e.target.value }))}
                  placeholder='000-0000-0000' />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField fullWidth label='예금주 *' value={form.account_holder}
                  onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
                  placeholder='예금주명' />
              </Grid>
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant='outlined' color='secondary'
                    onClick={() => {
                      setEditMode(false)
                      setForm({
                        bank_name:      profile?.bank_name      ?? '',
                        account_no:     profile?.account_no     ?? '',
                        account_holder: profile?.account_holder ?? '',
                      })
                    }}
                    disabled={saving}>취소</Button>
                  <Button variant='contained' onClick={() => void handleSave()}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} color='inherit' /> : undefined}>
                    {saving ? '저장 중…' : '저장'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadField label='은행명'  value={profile?.bank_name      ?? '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadField label='계좌번호' value={profile?.account_no     ?? '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadField label='예금주'  value={profile?.account_holder ?? '-'} />
              </Grid>
            </Grid>
          )}
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

const ReadField = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant='caption' color='text.secondary' display='block' sx={{ mb: 0.25 }}>{label}</Typography>
    <Typography variant='body2' fontWeight={500}>{value}</Typography>
  </Box>
)
