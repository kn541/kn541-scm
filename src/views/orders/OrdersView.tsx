'use client'
/**
 * KN541 SCM 주문 관리
 * GET /scm/orders  — 목록
 * POST /scm/orders/:id/ship — 송장 등록
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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import AlertMui from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { scmGet, scmPost, fmtMoney, fmtDate } from '@/lib/scmApi'

interface ScmOrder {
  order_id: string
  order_no: string
  member_name: string | null
  total_amount: number
  order_status: string
  payment_method: string | null
  created_at: string
  items?: Array<{ product_name: string; quantity: number }>
  tracking_company?: string | null
  tracking_no?: string | null
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: 'default'|'info'|'warning'|'success'|'error'|'primary' }> = {
  PENDING:   { label: '결제대기',   color: 'default'  },
  PAID:      { label: '결제완료',   color: 'info'     },
  PREPARING: { label: '배송준비중', color: 'warning'  },
  SHIPPED:   { label: '배송중',    color: 'primary'  },
  DELIVERED: { label: '배송완료',  color: 'success'  },
  CANCELLED: { label: '취소',     color: 'error'    },
}

const COURIER_LIST = [
  'CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배',
  '경동택배', '일양로지스', '대신택배', 'SLX택배', '쿠팡로지스틱스', '기타'
]

export default function OrdersView() {
  const [rows,    setRows]    = useState<ScmOrder[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [snack,   setSnack]   = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  // 송장 등록 다이얼로그
  const [shipDialog, setShipDialog] = useState<{ open: boolean; order: ScmOrder | null }>({
    open: false, order: null
  })
  const [shipForm, setShipForm] = useState({ company: 'CJ대한통운', trackingNo: '' })
  const [shipping, setShipping] = useState(false)

  const load = useCallback(async (pg = 0, kw = keyword) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (kw.trim()) qs.set('keyword', kw.trim())
      const data = await scmGet<{ items: ScmOrder[]; total: number }>(`/scm/orders?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [keyword])

  useEffect(() => { void load(0) }, [load])

  const handleShip = async () => {
    if (!shipDialog.order) return
    if (!shipForm.trackingNo.trim()) { toast('송장번호를 입력하세요.', 'error'); return }
    setShipping(true)
    try {
      await scmPost(`/scm/orders/${shipDialog.order.order_id}/ship`, {
        tracking_company: shipForm.company,
        tracking_no: shipForm.trackingNo.trim()
      })
      toast('송장이 등록됐습니다.')
      setShipDialog({ open: false, order: null })
      setShipForm({ company: 'CJ대한통운', trackingNo: '' })
      void load(page)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '송장 등록 실패', 'error')
    } finally { setShipping(false) }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>주문 관리</Typography>

      <Card>
        <CardHeader title='주문 목록'
          action={!loading && (
            <Chip label={`총 ${total.toLocaleString()}건`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          )}
        />

        <Box sx={{ px: 3, pb: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size='small' placeholder='주문번호 / 주문자명' value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void load(0)}
            sx={{ flex: 1, maxWidth: 320 }} />
          <Button variant='contained' size='small' startIcon={<i className='tabler-search' />}
            onClick={() => void load(0, keyword)}>검색</Button>
          <Button variant='outlined' color='secondary' size='small'
            onClick={() => { setKeyword(''); void load(0, '') }}>초기화</Button>
        </Box>

        <Divider />
        {error && <Alert severity='error' sx={{ mx: 3, my: 2 }}>{error}</Alert>}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  {['No', '주문번호', '상품명', '주문자', '결제금액', '주문상태', '주문일', '송장'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--mui-palette-text-secondary)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Typography color='text.secondary'>주문이 없습니다.</Typography>
                  </td></tr>
                ) : rows.map((o, idx) => {
                  const sm = ORDER_STATUS_MAP[o.order_status] ?? { label: o.order_status, color: 'default' as const }
                  const firstProduct = o.items?.[0]?.product_name ?? '-'
                  return (
                    <tr key={o.order_id} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{page * 20 + idx + 1}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2' fontWeight={600}>{o.order_no}</Typography></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2' sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstProduct}
                        </Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{o.member_name ?? '-'}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{fmtMoney(o.total_amount)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip label={sm.label} size='small' color={sm.color}
                          variant={o.order_status === 'DELIVERED' ? 'filled' : 'outlined'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='caption'>{fmtDate(o.created_at)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.tracking_no ? (
                          <Box>
                            <Typography variant='caption' fontWeight={600}>{o.tracking_company}</Typography>
                            <Typography variant='caption' display='block' color='text.secondary'>{o.tracking_no}</Typography>
                          </Box>
                        ) : (
                          ['PAID', 'PREPARING'].includes(o.order_status) ? (
                            <Button size='small' variant='outlined' color='primary'
                              startIcon={<i className='tabler-truck' />}
                              onClick={() => { setShipDialog({ open: true, order: o }); setShipForm({ company: 'CJ대한통운', trackingNo: '' }) }}>
                              송장등록
                            </Button>
                          ) : (
                            <Typography variant='caption' color='text.disabled'>-</Typography>
                          )
                        )}
                      </td>
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

      {/* 송장 등록 다이얼로그 */}
      <Dialog open={shipDialog.open} onClose={() => setShipDialog({ open: false, order: null })} maxWidth='xs' fullWidth>
        <DialogTitle>송장 등록</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant='body2' color='text.secondary'>{shipDialog.order?.order_no}</Typography>
          <TextField select fullWidth size='small' label='택배사'
            value={shipForm.company}
            onChange={e => setShipForm(f => ({ ...f, company: e.target.value }))}>
            {COURIER_LIST.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField fullWidth size='small' label='송장번호'
            value={shipForm.trackingNo}
            onChange={e => setShipForm(f => ({ ...f, trackingNo: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && void handleShip()} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setShipDialog({ open: false, order: null })}>취소</Button>
          <Button variant='contained' onClick={() => void handleShip()} disabled={shipping}
            startIcon={shipping ? <CircularProgress size={14} color='inherit' /> : undefined}>
            {shipping ? '등록 중…' : '등록'}
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
