'use client'
/**
 * KN541 SCM 문의 등록
 * POST /scm/inquiries
 */
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Grid from '@mui/material/Grid'
import CustomTextField from '@core/components/mui/TextField'
import { scmPost } from '@/lib/scmApi'

const INQUIRY_TYPES = [
  { value: 'PRODUCT',    label: '상품 문의' },
  { value: 'SETTLEMENT', label: '정산 문의' },
  { value: 'CONTRACT',   label: '계약 문의' },
  { value: 'SYSTEM',     label: '시스템 문의' },
  { value: 'OTHER',      label: '기타' },
]

export default function InquiryFormView() {
  const [form, setForm] = useState({ inquiry_type: 'PRODUCT', title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })

  const toast = (msg: string, sev: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev })

  const handleSubmit = async () => {
    if (!form.title.trim())   { toast('제목을 입력하세요.', 'error'); return }
    if (!form.content.trim()) { toast('내용을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await scmPost('/scm/inquiries', form)
      toast('문의가 등록됐습니다.')
      setForm({ inquiry_type: 'PRODUCT', title: '', content: '' })
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '등록 중 오류가 발생했습니다.', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>문의 등록</Typography>
      <Card>
        <CardHeader title='문의 내용 작성' />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField select fullWidth label='문의 유형'
                value={form.inquiry_type}
                onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))}>
                {INQUIRY_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <CustomTextField fullWidth label='제목 *'
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder='문의 제목을 입력하세요' />
            </Grid>
            <Grid size={12}>
              <CustomTextField fullWidth multiline rows={8} label='내용 *'
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder='문의 내용을 자세히 입력해주세요' />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant='contained' onClick={() => void handleSubmit()}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}>
              {saving ? '등록 중…' : '문의 등록'}
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
