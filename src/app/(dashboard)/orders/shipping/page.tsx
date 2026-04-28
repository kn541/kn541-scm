'use client'
/**
 * KN541 SCM 배송 처리
 * GET  /scm/orders — order_items 행 목록 (백엔드 스펙)
 * POST /scm/orders/{order_id}/ship — 송장 등록 (tracking_company, tracking_no)
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
import { scmGet, scmPost, fmtDate, fmtMoney } from '@/lib/scmApi'
import ExcelUploadDlg from '@/components/excel/ExcelUploadDlg'

/** /scm/orders 한 행 = order_items 레코드 (OrdersView ScmOrder 집계와 다를 수 있음) */
interface ScmOrderItemRow {
  id: string
  order_id: string
  order_no?: string | null
  product_name?: string | null
  quantity?: number
  item_total?: number
  delivery_status?: string | null
  tracking_company?: string | null
  tracking_no?: string | null
  created_at?: string | null
  member_name?: string | null
}

/** 화면 표시용 — OrdersView 필드명에 맞춤 */
interface ShippingRow {
  order_id: string
  order_no: string
  member_name: string | null
  product_summary: string | null
  /** 라인 수량 (주문 목록에 quantity 컬럼 대응) */
  line_qty: number
  total_amount: number
  order_status: string
  created_at: string
  line_id: string
}

function needsShipping(row: ScmOrderItemRow): boolean {
  const ds = String(row.delivery_status ?? '').toUpperCase()
  if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_COMPLETED'].includes(ds)) return false
  return true
}

function toShippingRow(r: ScmOrderItemRow): ShippingRow {
  return {
    order_id: String(r.order_id ?? ''),
    order_no: String(r.order_no ?? r.order_id ?? ''),
    member_name: r.member_name ?? null,
    product_summary: r.product_name ?? null,
    line_qty: Number(r.quantity ?? 0),
    total_amount: Number(r.item_total ?? 0),
    order_status: String(r.delivery_status ?? '-'),
    created_at: String(r.created_at ?? ''),
    line_id: String(r.id ?? ''),
  }
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
  const [rows, setRows] = useState<ShippingRow[]>([])
  const [totalRaw, setTotalRaw] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ShippingRow | null>(null)
  const [carrier, setCarrier] = useState('CJ대한통운')
  const [trackingNo, setTrackingNo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await scmGet<{ items: ScmOrderItemRow[]; total: number }>(
        `/scm/orders?page=${page}&size=${SIZE}`
      )
      const raw = res.items ?? []
      setTotalRaw(res.total ?? raw.length)
      const mapped = raw.filter(needsShipping).map(toShippingRow)
      setRows(mapped)
    } catch (e) {
      setError((e as Error).message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const openDialog = (row: ShippingRow) => {
    setSelected(row)
    setCarrier('CJ대한통운')
    setTrackingNo('')
    setSubmitErr('')
    setOpen(true)
  }

  const handleShip = async () => {
    if (!selected) return
    if (!trackingNo.trim()) {
      setSubmitErr('운송장 번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setSubmitErr('')
    try {
      await scmPost(`/scm/orders/${encodeURIComponent(selected.order_id)}/ship`, {
        tracking_company: carrier,
        tracking_no: trackingNo.trim(),
      })
      setOpen(false)
      void load()
    } catch (e) {
      setSubmitErr((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant='h5' fontWeight={700}>
          배송 처리
        </Typography>
        <ExcelUploadDlg entity='scm_shipping' label='대량 송장 등록' onComplete={() => void load()} />
      </Box>

      {error && (
        <Alert
          severity='warning'
          sx={{ mb: 2 }}
          action={
            <Button size='small' onClick={() => void load()}>
              다시 시도
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color='text.secondary'>배송 처리할 주문이 없습니다.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>주문번호</TableCell>
                <TableCell>상품</TableCell>
                <TableCell>주문자</TableCell>
                <TableCell align='center'>수량</TableCell>
                <TableCell align='right'>금액</TableCell>
                <TableCell>주문일</TableCell>
                <TableCell align='center'>상태</TableCell>
                <TableCell align='center'>처리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(o => (
                <TableRow key={o.line_id} hover>
                  <TableCell>
                    <Typography variant='caption' fontFamily='monospace'>
                      {o.order_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.product_summary}
                    </Typography>
                  </TableCell>
                  <TableCell>{o.member_name ?? '-'}</TableCell>
                  <TableCell align='center'>{o.line_qty}</TableCell>
                  <TableCell align='right'>{fmtMoney(o.total_amount)}</TableCell>
                  <TableCell>{fmtDate(o.created_at)}</TableCell>
                  <TableCell align='center'>
                    <Chip label={o.order_status} size='small' color='warning' variant='outlined' />
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

      {totalRaw > SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={Math.ceil(totalRaw / SIZE)} page={page} onChange={(_, v) => setPage(v)} color='primary' />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>배송 처리</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selected && (
            <Typography variant='body2' color='text.secondary'>
              {selected.order_no} · {selected.product_summary}
            </Typography>
          )}
          <TextField select label='택배사' value={carrier} onChange={e => setCarrier(e.target.value)} fullWidth size='small'>
            {CARRIERS.map(c => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='운송장 번호'
            value={trackingNo}
            onChange={e => setTrackingNo(e.target.value)}
            fullWidth
            size='small'
            placeholder='운송장 번호 입력'
          />
          {submitErr && <Alert severity='error'>{submitErr}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            취소
          </Button>
          <Button variant='contained' onClick={() => void handleShip()} disabled={submitting}>
            {submitting ? '처리 중...' : '배송 처리'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
