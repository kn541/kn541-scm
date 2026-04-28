'use client'
/**
 * KN541 SCM 문의 관리
 * GET  /scm/inquiries — 목록 (scm_status 001/002 필터)
 * POST /scm/inquiries — title, content, inquiry_type
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
import Snackbar from '@mui/material/Snackbar'
import TablePagination from '@mui/material/TablePagination'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, scmPost, fmtDate } from '@/lib/scmApi'
import { INQUIRY_TYPE_OPTIONS } from '@/lib/inquiryOptions'
import { mapScmInquiryItem, inquiryTypeLabel, type InquiryRow } from '@/lib/mapScmInquiry'

const SCM_STATUS_FILTER: Record<string, { label: string; color: 'default' | 'warning' | 'success' }> = {
  '001': { label: '답변대기', color: 'warning' },
  '002': { label: '답변완료', color: 'success' },
}

export default function InquiriesView() {
  const [rows, setRows] = useState<InquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [scmStatus, setScmStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [writeOpen, setWriteOpen] = useState(false)
  const [writeForm, setWriteForm] = useState({ title: '', inquiry_type: 'PRODUCT', content: '' })
  const [writing, setWriting] = useState(false)

  const [detail, setDetail] = useState<InquiryRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })
  const toast = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  const load = useCallback(async (pg: number, st: string) => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (st) qs.set('scm_status', st)
      const data = await scmGet<{ items: Record<string, unknown>[]; total: number }>(`/scm/inquiries?${qs}`)
      setRows((data.items ?? []).map(r => mapScmInquiryItem(r)))
      setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page, scmStatus)
  }, [page, scmStatus, load])

  const openDetail = (id: string) => {
    const row = rows.find(r => r.inquiry_id === id)
    setDetailOpen(true)
    setDetail(row ?? null)
  }

  const handleWrite = async () => {
    if (!writeForm.title.trim()) {
      toast('제목을 입력하세요.', 'error')
      return
    }
    if (!writeForm.content.trim()) {
      toast('내용을 입력하세요.', 'error')
      return
    }
    setWriting(true)
    try {
      await scmPost('/scm/inquiries', {
        title: writeForm.title.trim(),
        inquiry_type: writeForm.inquiry_type,
        content: writeForm.content.trim(),
      })
      toast('문의가 등록됐습니다.')
      setWriteOpen(false)
      setWriteForm({ title: '', inquiry_type: 'PRODUCT', content: '' })
      if (page === 0) void load(0, scmStatus)
      else setPage(0)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '문의 등록 실패', 'error')
    } finally {
      setWriting(false)
    }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' fontWeight={700}>
          문의 관리
        </Typography>
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setWriteOpen(true)}>
          문의 등록
        </Button>
      </Box>

      <Card>
        <CardHeader
          title='문의 목록'
          action={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <Chip
                label={`총 ${total.toLocaleString()}건`}
                size='small'
                color='primary'
                variant='outlined'
                sx={{ fontWeight: 600 }}
              />
            )
          }
        />

        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CustomTextField
            select
            size='small'
            label='상태'
            value={scmStatus}
            onChange={e => {
              setScmStatus(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value=''>전체</MenuItem>
            {Object.entries(SCM_STATUS_FILTER).map(([v, m]) => (
              <MenuItem key={v} value={v}>
                {m.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mx: 3, my: 2 }}>
            {error}
          </Alert>
        )}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>제목</th>
                  <th>유형</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>답변일</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='text-center py-10'>
                      <Typography color='text.secondary'>문의 내역이 없습니다.</Typography>
                    </td>
                  </tr>
                ) : (
                  rows.map((q, idx) => {
                    const sm = SCM_STATUS_FILTER[q.scm_status] ?? {
                      label: q.scm_status || '-',
                      color: 'default' as const,
                    }
                    return (
                      <tr key={q.inquiry_id}>
                        <td>
                          <Typography variant='body2'>{page * 20 + idx + 1}</Typography>
                        </td>
                        <td>
                          <Typography
                            variant='body2'
                            fontWeight={600}
                            sx={{
                              maxWidth: 240,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {q.title}
                          </Typography>
                        </td>
                        <td>
                          <Typography variant='caption' color='text.secondary'>
                            {inquiryTypeLabel(q.inquiry_type)}
                          </Typography>
                        </td>
                        <td>
                          <Chip
                            label={sm.label}
                            size='small'
                            color={sm.color}
                            variant={q.has_answer ? 'filled' : 'outlined'}
                          />
                        </td>
                        <td>
                          <Typography variant='caption'>{fmtDate(q.created_at)}</Typography>
                        </td>
                        <td>
                          <Typography variant='caption' color={q.has_answer ? 'success.main' : 'text.disabled'}>
                            {q.answered_at ? fmtDate(q.answered_at) : '-'}
                          </Typography>
                        </td>
                        <td>
                          <Button
                            size='small'
                            variant='outlined'
                            color={q.has_answer ? 'success' : 'secondary'}
                            onClick={() => openDetail(q.inquiry_id)}
                          >
                            {q.has_answer ? '답변확인' : '상세'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <TablePagination
          component='div'
          count={total}
          page={page}
          rowsPerPage={20}
          rowsPerPageOptions={[]}
          onPageChange={(_, p) => setPage(p)}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}건`}
        />
      </Card>

      <Dialog open={writeOpen} onClose={() => !writing && setWriteOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>문의 등록</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <CustomTextField
            select
            fullWidth
            label='문의 유형'
            value={writeForm.inquiry_type}
            onChange={e => setWriteForm(f => ({ ...f, inquiry_type: e.target.value }))}
          >
            {INQUIRY_TYPE_OPTIONS.map(c => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            fullWidth
            label='제목 *'
            value={writeForm.title}
            onChange={e => setWriteForm(f => ({ ...f, title: e.target.value }))}
            placeholder='문의 제목을 입력하세요'
          />
          <CustomTextField
            fullWidth
            multiline
            rows={6}
            label='내용 *'
            value={writeForm.content}
            onChange={e => setWriteForm(f => ({ ...f, content: e.target.value }))}
            placeholder='문의 내용을 입력하세요'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant='outlined' color='secondary' onClick={() => setWriteOpen(false)} disabled={writing}>
            취소
          </Button>
          <Button
            variant='contained'
            onClick={() => void handleWrite()}
            disabled={writing}
            startIcon={writing ? <CircularProgress size={14} color='inherit' /> : undefined}
          >
            {writing ? '등록 중…' : '등록 완료'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>문의 상세</DialogTitle>
        <DialogContent dividers>
          {detail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  {inquiryTypeLabel(detail.inquiry_type)}
                </Typography>
                <Typography variant='h6' fontWeight={700} sx={{ mt: 0.5 }}>
                  {detail.title}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {fmtDate(detail.created_at)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                  {detail.content}
                </Typography>
              </Box>
              {detail.has_answer && detail.answer && (
                <>
                  <Divider />
                  <Box
                    sx={{
                      bgcolor: 'primary.lightOpacity',
                      borderRadius: 1,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='subtitle2' fontWeight={700} color='primary.main'>
                        답변
                      </Typography>
                      {detail.answered_at && (
                        <Typography variant='caption' color='text.secondary'>
                          {fmtDate(detail.answered_at)}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                      {detail.answer}
                    </Typography>
                  </Box>
                </>
              )}
              {!detail.has_answer && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Chip label='답변 대기 중' color='warning' variant='outlined' />
                </Box>
              )}
            </Box>
          ) : (
            <Typography color='text.secondary' textAlign='center'>
              상세 정보를 불러올 수 없습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setDetailOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} variant='filled' onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
