'use client'
/**
 * KN541 SCM 주문 관리
 * GET  /scm/orders               — 목록
 * POST /scm/orders/:id/ship      — 송장 등록
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
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, scmPost, fmtMoney, fmtDate } from '@/lib/scmApi'

interface ScmOrder {
  order_id:         string
  order_no:         string
  member_name:      string | null
  phone:            string | null
  product_summary:  string | null
  total_amount:     number
  order_status:     string
  tracking_company: string | null
  tracking_no:      string | null
  created_at:       string
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: 'default'|'info'|'warning'|'success'|'error'|'primary' }> = {
  PENDING:   { label: '결제대기',   color: 'default'  },
  PAID:      { label: '결제완료',   color: 'info'     },
  PREPARING: { label: '배송준비중', color: 'warning'  },
  SHIPPED:   { label: '배송중',     color: 'primary'  },
  DELIVERED: { label: '배송완료',   color: 'success'  },
  CANCELLED: { label: '취소',       color: 'error'    },
}

const COURIER_LIST = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '롯데택배',   label: '롯데택배'   },
  { value: '우체국택배', label: '우체국택배' },
  { value: '한진택배',   label: '한진택배'   },
  { value: '로젠택배',   label: '로젠택배'   },
  { value: 'GS택배',     label: 'GS택배'     },
  { value: '경동택배',   label: '경동택배'   },
  { value: '직접입력',   label: '직접입력'   },
]

const SEARCH_TYPES = [
  { label: '주문번호', value: 'order_no'    },
  { label: '주문자명', value: 'member_name' },
]

export default function OrdersView() {
  const [rows,       setRows]       = useState<ScmOrder[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchType, setSearchType] = useState(SEARCH_TYPES[0].value)
  const [keyword,    setKeyword]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // 송장 다이얼로그
  const [shipDialog, setShipDialog] = useState<{
    open: boolean; orderId: string; orderNo: string; company: string; trackingNo: string; saving: boolean
  }>({ open: false, orderId: '', orderNo: '', company: '', trackingNo: '', saving: false })

  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success'|'error' })
  const toast = (msg: string, sev: 'success'|'error' = 'success') => setSnack({ open: true, msg, sev })

  const load = useCallback(async (pg = 0, status = statusFilter, kw = keyword, sType = searchType) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (status)    qs.set('order_status', status)
      if (kw.trim()) { qs.set('keyword', kw.trim()); qs.set('search_type', sType) }
      const data = await scmGet<{ items: ScmOrder[]; total: number }>(`/scm/orders?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [statusFilter, keyword, searchType])

  useEffect(() => { void load(0) }, [load])

  const handleSearch  = () => { setPage(0); void load(0, statusFilter, keyword, searchType) }
  const handleReset   = () => {
    setKeyword(''); setStatusFilter(''); setSearchType(SEARCH_TYPES[0].value); setPage(0)
    void load(0, '', '', SEARCH_TYPES[0].value)
  }

  const openShipDialog = (order: ScmOrder) => setShipDialog({
    open: true, orderId: order.order_id, orderNo: order.order_no,
    company: order.tracking_company ?? '', trackingNo: order.tracking_no ?? '',
    saving: false,
  })

  const handleShipSave = async () => {
    if (!shipDialog.company || !shipDialog.trackingNo.trim()) {
      toast('택배사와 송장번호를 모두 입력하세요.', 'error'); return
    }
    setShipDialog(d => ({ ...d, saving: true }))
    try {
      await scmPost(`/scm/orders/${shipDialog.orderId}/ship`, {
        tracking_company: shipDialog.company,
        tracking_no:      shipDialog.trackingNo.trim(),
      })
      toast('송장이 등록됐습니다.')
      setShipDialog(d => ({ ...d, open: false }))
      void load(page)
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '송장 등록 실패', 'error')
      setShipDialog(d => ({ ...d, saving: false }))
    }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>주문 관리</Typography>

      <Card>
        <CardHeader
          title='주문 목록'
          action={
            loading
              ? <CircularProgress size={16} />
              : <Chip label={`총 ${total.toLocaleString()}건`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          }
        />

        {/* 필터 + 검색 */}
        <Box sx={{ px: 3, py: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <CustomTextField select size='small' label='주문상태' value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); void load(0, e.target.value, keyword, searchType) }}
            sx={{ minWidth: 130 }}>
            <MenuItem value=''>전체</MenuItem>
            {Object.entries(ORDER_STATUS_MAP).map(([v, m]) => (
              <MenuItem key={v} value={v}>{m.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField select size='small' value={searchType}
            onChange={e => setSearchType(e.target.value)}
            sx={{ minWidth: 110 }}>
            {SEARCH_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </CustomTextField>
          <CustomTextField size='small' placeholder='검색어 입력' value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{ flex: 1, maxWidth: 280 }} />
          <Button variant='contained' size='small'
            startIcon={<i className='tabler-search' />}
            onClick={handleSearch}>검색</Button>
          <Button variant='outlined' color='secondary' size='small'
            startIcon={<i className='tabler-refresh' />}
            onClick={handleReset}>초기화</Button>
        </Box>

        {error && <Alert severity='error' sx={{ mx: 3, my: 2 }}>{error}</Alert>}

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
                  <th>주문번호</th>
                  <th>주문자</th>
                  <th>상품</th>
                  <th>결제금액</th>
                  <th>주문상태</th>
                  <th>송장번호</th>
                  <th>주문일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='text-center py-10'>
                      <Typography color='text.secondary'>주문이 없습니다.</Typography>
                    </td>
                  </tr>
                ) : rows.map((o, idx) => {
                  const sm = ORDER_STATUS_MAP[o.order_status] ?? { label: o.order_status, color: 'default' as const }
                  const hasTracking = !!o.tracking_no
                  return (
                    <tr key={o.order_id}>
                      <td><Typography variant='body2'>{page * 20 + idx + 1}</Typography></td>
                      <td><Typography variant='body2' fontWeight={600}>{o.order_no}</Typography></td>
                      <td>
                        <Typography variant='body2'>{o.member_name ?? '-'}</Typography>
                        {o.phone && <Typography variant='caption' color='text.secondary'>{o.phone}</Typography>}
                      </td>
                      <td>
                        <Typography variant='body2' sx={{
                          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{o.product_summary ?? '-'}</Typography>
                      </td>
                      <td><Typography variant='body2' fontWeight={600}>{fmtMoney(o.total_amount)}</Typography></td>
                      <td><Chip label={sm.label} size='small' color={sm.color} /></td>
                      <td>
                        {hasTracking ? (
                          <Box>
                            <Typography variant='caption' color='text.secondary'>{o.tracking_company}</Typography>
                            <Typography variant='body2'>{o.tracking_no}</Typography>
                          </Box>
                        ) : (
                          <Typography variant='caption' color='text.disabled'>미등록</Typography>
                        )}
                      </td>
                      <td><Typography variant='caption'>{fmtDate(o.created_at)}</Typography></td>
                      <td>
                        <Tooltip title={hasTracking ? '송장 수정' : '송장 등록'}>
                          <Button size='small'
                            variant={hasTracking ? 'outlined' : 'contained'}
                            color={hasTracking ? 'secondary' : 'primary'}
                            onClick={() => openShipDialog(o)}
                            disabled={['CANCELLED', 'DELIVERED'].includes(o.order_status)}
                          >
                            <i className='tabler-truck' style={{ fontSize: 16 }} />
                          </Button>
                        </Tooltip>
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
      <Dialog open={shipDialog.open}
        onClose={() => !shipDialog.saving && setShipDialog(d => ({ ...d, open: false }))}
        maxWidth='xs' fullWidth>
        <DialogTitle>송장 등록 — {shipDialog.orderNo}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <CustomTextField select fullWidth label='택배사 *' value={shipDialog.company}
            onChange={e => setShipDialog(d => ({ ...d, company: e.target.value }))}>
            <MenuItem value=''><em>택배사 선택</em></MenuItem>
            {COURIER_LIST.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </CustomTextField>
          <CustomTextField fullWidth label='송장번호 *' value={shipDialog.trackingNo}
            onChange={e => setShipDialog(d => ({ ...d, trackingNo: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && void handleShipSave()}
            placeholder='송장번호를 입력하세요' />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant='outlined' color='secondary'
            onClick={() => setShipDialog(d => ({ ...d, open: false }))}
            disabled={shipDialog.saving}>취소</Button>
          <Button variant='contained' onClick={() => void handleShipSave()}
            disabled={shipDialog.saving}
            startIcon={shipDialog.saving ? <CircularProgress size={14} color='inherit' /> : undefined}>
            {shipDialog.saving ? '등록 중…' : '등록 완료'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant='filled'
          onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
