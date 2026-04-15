'use client'
/**
 * KN541 SCM 문의 관리
 * GET /scm/inquiries  — 목록
 * POST /scm/inquiries — 새 문의 등록
 * POST /scm/inquiries/:id/reply — 관리자 답변 확인 (읽기전용)
 */
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TablePagination from '@mui/material/TablePagination'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Snackbar from '@mui/material/Snackbar'
import AlertMui from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import { scmGet, scmPost, fmtDate } from '@/lib/scmApi'

interface Inquiry {
  inquiry_id: string
  category: string
  title: string
  content: string
  status: string     // PENDING | ANSWERED | CLOSED
  created_at: string
  replied_at: string | null
  reply_content: string | null
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'warning'|'success'|'secondary' }> = {
  PENDING:  { label: '답변대기', color: 'warning'   },
  ANSWERED: { label: '답변완료', color: 'success'   },
  CLOSED:   { label: '종료',    color: 'secondary'  },
}

const CATEGORY_OPTIONS = ['상품문의', '정산문의', '배송문의', '기타']

export default function InquiriesView() {
  const [rows,    setRows]    = useState<Inquiry[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [tab,     setTab]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  // 문의 상세
  const [detail, setDetail] = useState<Inquiry | null>(null)

  // 문의 등록 다이얼로그
  const [newDialog, setNewDialog] = useState(false)
  const [newForm, setNewForm] = useState({ category: '상품문의', title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (pg = 0, status = tab) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (status) qs.set('status', status)
      const data = await scmGet<{ items: Inquiry[]; total: number }>(`/scm/inquiries?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { void load(0) }, [load])

  const handleTabChange = (v: string) => { setTab(v); setPage(0); void load(0, v) }

  const handleSubmitInquiry = async () => {
    if (!newForm.title.trim() || !newForm.content.trim()) {
      toast('제목과 내용을 입력하세요.', 'error'); return
    }
    setSubmitting(true)
    try {
      await scmPost('/scm/inquiries', newForm)
      toast('문의가 등록됐습니다.')
      setNewDialog(false)
      setNewForm({ category: '상품문의', title: '', content: '' })
      void load(0, tab)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '등록 실패', 'error')
    } finally { setSubmitting(false) }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>문의 관리</Typography>
        <Button variant='contained' startIcon={<i className='tabler-plus' />}
          onClick={() => setNewDialog(true)}>문의 등록</Button>
      </Box>

      <Card>
        <CardHeader title='문의 목록'
          action={!loading && (
            <Chip label={`총 ${total.toLocaleString()}건`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          )}
        />

        {/* 상태 탭 */}
        <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => handleTabChange(v)} variant='scrollable'>
            <Tab value='' label='전체' />
            <Tab value='PENDING'  label='답변대기' />
            <Tab value='ANSWERED' label='답변완료' />
            <Tab value='CLOSED'   label='종료' />
          </Tabs>
        </Box>

        {error && <Alert severity='error' sx={{ mx: 3, my: 2 }}>{error}</Alert>}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  {['No', '분류', '제목', '상태', '등록일', '답변일'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--mui-palette-text-secondary)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Typography color='text.secondary'>문의가 없습니다.</Typography>
                  </td></tr>
                ) : rows.map((inq, idx) => {
                  const sm = STATUS_MAP[inq.status] ?? { label: inq.status, color: 'default' as const }
                  return (
                    <tr key={inq.inquiry_id}
                      style={{ borderBottom: '1px solid var(--mui-palette-divider)', cursor: 'pointer' }}
                      onClick={() => setDetail(inq)}>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{page * 20 + idx + 1}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Chip label={inq.category} size='small' variant='outlined' /></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2' fontWeight={600}
                          sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inq.title}
                        </Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip label={sm.label} size='small' color={sm.color}
                          variant={inq.status === 'ANSWERED' ? 'filled' : 'outlined'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='caption'>{fmtDate(inq.created_at)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='caption'>{fmtDate(inq.replied_at)}</Typography></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <TablePagination component='div' count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[]}
          onPageChange={(_, p) => { setPage(p); void load(p) }}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}건`} />
      </Card>

      {/* 문의 상세 */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth='sm' fullWidth>
        <DialogTitle>문의 상세</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {detail && (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={detail.category} size='small' variant='outlined' />
                <Chip label={STATUS_MAP[detail.status]?.label ?? detail.status} size='small'
                  color={STATUS_MAP[detail.status]?.color ?? 'default'} />
                <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                  {fmtDate(detail.created_at)}
                </Typography>
              </Box>
              <Typography variant='subtitle1' fontWeight={700}>{detail.title}</Typography>
              <Paper variant='outlined' sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{detail.content}</Typography>
              </Paper>
              {detail.reply_content && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant='caption' color='text.secondary' fontWeight={600}
                      sx={{ display: 'block', mb: 0.75 }}>관리자 답변 ({fmtDate(detail.replied_at)})</Typography>
                    <Paper variant='outlined' sx={{ p: 2, borderColor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant='body2' color='primary.main' sx={{ whiteSpace: 'pre-wrap' }}>
                        {detail.reply_content}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              )}
              {!detail.reply_content && detail.status === 'PENDING' && (
                <Alert severity='info' icon={<i className='tabler-clock' />}>
                  관리자가 답변 준비 중입니다.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setDetail(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 문의 등록 다이얼로그 */}
      <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth='sm' fullWidth>
        <DialogTitle>문의 등록</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField select fullWidth size='small' label='분류'
            value={newForm.category}
            onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORY_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField fullWidth size='small' label='제목 *'
            value={newForm.title}
            onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
          <TextField fullWidth multiline rows={5} size='small' label='내용 *'
            value={newForm.content}
            onChange={e => setNewForm(f => ({ ...f, content: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setNewDialog(false)}>취소</Button>
          <Button variant='contained' onClick={() => void handleSubmitInquiry()} disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} color='inherit' /> : undefined}>
            {submitting ? '등록 중…' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <AlertMui severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</AlertMui>
      </Snackbar>
    </Box>
  )
}
