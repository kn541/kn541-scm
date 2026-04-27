'use client'
/**
 * KN541 SCM 배송 처리 페이지 (TASK 5)
 * GET /scm/orders?shipping_status=READY
 * PATCH /scm/orders/{order_id}/ship
 */
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import { scmGet, scmPatch, fmtDate } from '@/lib/scmApi'

interface Order {
  id: string
  order_number: string
  product_name: string
  buyer_name: string
  qty: number
  ordered_at: string
  shipping_status: string
}

interface OrdersResponse {
  items: Order[]
  total: number
}

const CARRIERS = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '롯데택배', label: '롯데택배' },
  { value: '한진택배', label: '한진택배' },
  { value: '우체국택배', label: '우체국택배' },
  { value: '로젠택배', label: '로젠택배' },
  { value: '경동택배', label: '경동택배' },
]

export default function ShippingPage() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // 배송 입력 다이얼로그
  const [open, setOpen]           = useState(false)
  const [selected, setSelected]   = useState<Order | null>(null)
  const [carrier, setCarrier]     = useState('CJ대한통운')
  const [trackingNo, setTrackingNo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await scmGet<OrdersResponse>(
        `/scm/orders?shipping_status=READY&page=${page}&size=${SIZE}`
      )
      setOrders(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openDialog = (order: Order) => {
    setSelected(order)
    setCarrier('CJ대한통운')
    setTrackingNo('')
    setSubmitErr('')
    setOpen(true)
  }

  const handleShip = async () => {
    if (!selected) return
    if (!trackingNo.trim()) { setSubmitErr('운송장 번호를 입력해 주세요.'); return }
    setSubmitting(true)
    setSubmitErr('')
    try {
      await scmPatch(`/scm/orders/${selected.id}/ship`, {
        tracking_number: trackingNo.trim(),
        carrier_name: carrier,
      })
      setOpen(false)
      load()
    } catch (e) {
      setSubmitErr((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>배송 처리</Typography>

      {error && (
        <Alert severity='warning' sx={{ mb: 2 }} action={
          <Button size='small' onClick={load}>다시 시도</Button>
        }>{error}</Alert>
      )}

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color='text.secondary'>배송 처리할 주문이 없습니다.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>주문번호</TableCell>
                <TableCell>상품명</TableCell>
                <TableCell>구매자</TableCell>
                <TableCell align='center'>수량</TableCell>
                <TableCell>주문일</TableCell>
                <TableCell align='center'>상태</TableCell>
                <TableCell align='center'>처리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <Typography variant='caption' fontFamily='monospace'>{o.order_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.product_name}
                    </Typography>
                  </TableCell>
                  <TableCell>{o.buyer_name}</TableCell>
                  <TableCell align='center'>{o.qty}</TableCell>
                  <TableCell>{fmtDate(o.ordered_at)}</TableCell>
                  <TableCell align='center'>
                    <Chip label='배송준비' size='small' color='warning' />
                  </TableCell>
                  <TableCell align='center'>
                    <Button size='small' variant='contained' onClick={() => openDialog(o)}>
                      배송처리
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {total > SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={Math.ceil(total / SIZE)} page={page}
            onChange={(_, v) => setPage(v)} color='primary' />
        </Box>
      )}

      {/* 배송 입력 다이얼로그 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>배송 처리</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selected && (
            <Typography variant='body2' color='text.secondary'>
              {selected.order_number} · {selected.product_name}
            </Typography>
          )}
          <TextField select label='택배사' value={carrier} onChange={e => setCarrier(e.target.value)} fullWidth size='small'>
            {CARRIERS.map(c => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </TextField>
          <TextField label='운송장 번호' value={trackingNo}
            onChange={e => setTrackingNo(e.target.value)} fullWidth size='small'
            placeholder='운송장 번호 입력' />
          {submitErr && <Alert severity='error'>{submitErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>취소</Button>
          <Button variant='contained' onClick={handleShip} disabled={submitting}>
            {submitting ? '처리 중...' : '배송 처리'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
