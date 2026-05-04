'use client'
/**
 * SCM 정산 상세 — GET /scm/settlements/{id}, /items, POST dispute
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import Snackbar from '@mui/material/Snackbar'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, scmPost, fmtDate } from '@/lib/scmApi'

const ITEM_PAGE_SIZE = 50

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'info' | 'primary' | 'warning' | 'success' | 'error' }> = {
  BEFORE:     { label: '정산전',     color: 'default'  },
  PROCESSING: { label: '정산중',     color: 'info'     },
  COMPLETED:  { label: '정산완료',   color: 'primary'  },
  INVOICED:   { label: '계산서완료', color: 'warning'  },
  PAID:       { label: '지급완료',   color: 'success'  },
  ON_HOLD:    { label: '지급보류',   color: 'error'    },
}

interface AdjustmentRow {
  adj_type?: string
  amount?: number
  reason?: string
  created_at?: string | null
}

interface SettlementDetailData {
  id: string
  supplier_id?: string
  settle_year: number
  settle_month: number
  status: string
  total_order_amount: number | null
  settle_amount: number | null
  adjustment_amount: number | null
  final_settle_amount: number | null
  order_count: number | null
  adjustments?: AdjustmentRow[]
}

interface SettlementItemRow {
  order_no?: string | null
  product_name?: string | null
  product_code?: string | null
  quantity?: number | null
  sale_price?: number | null
  supply_price?: number | null
  settle_amount?: number | null
  delivered_at?: string | null
}

function won(n: number | null | undefined) {
  if (n == null) return '-'
  return `${Number(n).toLocaleString('ko-KR')}원`
}

function fmtYm(y: number, m: number) {
  return `${y}년 ${m}월`
}

function adjLabel(t: string | undefined) {
  if (t === 'ADD') return '추가'
  if (t === 'DEDUCT') return '차감'
  return t ?? '-'
}

type Props = { settlementId: string }

export default function SettlementDetailPage({ settlementId }: Props) {
  const router = useRouter()
  const [detail, setDetail] = useState<SettlementDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  const [items, setItems] = useState<SettlementItemRow[]>([])
  const [itemTotal, setItemTotal] = useState(0)
  const [itemPage, setItemPage] = useState(0)
  const [itemsLoading, setItemsLoading] = useState(false)

  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSaving, setDisputeSaving] = useState(false)

  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as 'success' | 'error' })
  const toast = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  const loadDetail = useCallback(async () => {
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    try {
      const d = await scmGet<SettlementDetailData>(`/scm/settlements/${settlementId}`)
      setDetail(d)
    } catch {
      setDetailError('오류가 발생했습니다')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [settlementId])

  const loadItems = useCallback(async (pg: number) => {
    setItemsLoading(true)
    try {
      const data = await scmGet<{ items: SettlementItemRow[]; total: number }>(
        `/scm/settlements/${settlementId}/items?page=${pg + 1}&size=${ITEM_PAGE_SIZE}`,
      )
      setItems(data.items ?? [])
      setItemTotal(data.total ?? 0)
    } catch {
      setSnack({ open: true, msg: '오류가 발생했습니다', sev: 'error' })
      setItems([])
      setItemTotal(0)
    } finally {
      setItemsLoading(false)
    }
  }, [settlementId])

  useEffect(() => {
    setItemPage(0)
    setItems([])
    setItemTotal(0)
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (!detail || String(detail.id) !== String(settlementId)) return
    void loadItems(itemPage)
  }, [detail, itemPage, loadItems, settlementId])

  const showDisputeBtn =
    detail && ['BEFORE', 'PROCESSING', 'COMPLETED'].includes(detail.status)

  const submitDispute = async () => {
    const r = disputeReason.trim()
    if (!r) {
      toast('이의 사유를 입력하세요.', 'error')
      return
    }
    setDisputeSaving(true)
    try {
      await scmPost<{ message?: string }>(`/scm/settlements/${settlementId}/dispute`, { reason: r })
      toast('이의 제기가 접수되었습니다.')
      setDisputeOpen(false)
      setDisputeReason('')
      router.push('/settlements')
    } catch {
      toast('오류가 발생했습니다', 'error')
    } finally {
      setDisputeSaving(false)
    }
  }

  if (detailLoading) {
    return (
      <Box className='flex justify-center py-16'>
        <CircularProgress />
      </Box>
    )
  }

  if (detailError || !detail) {
    return (
      <Box className='flex flex-col gap-3'>
        <Button variant='text' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/settlements')}>
          목록
        </Button>
        <Alert severity='error'>{detailError || '정산을 불러올 수 없습니다.'}</Alert>
      </Box>
    )
  }

  const smeta = STATUS_CHIP[detail.status] ?? { label: detail.status, color: 'default' as const }
  const adjustments = detail.adjustments ?? []

  return (
    <Box className='flex flex-col gap-4'>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant='text' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/settlements')}>
          목록
        </Button>
        {showDisputeBtn ? (
          <Button variant='contained' color='warning' startIcon={<i className='tabler-flag' />} onClick={() => setDisputeOpen(true)}>
            이의 제기
          </Button>
        ) : null}
      </Box>

      <Typography variant='h5' fontWeight={700}>
        정산 상세 — {fmtYm(detail.settle_year, detail.settle_month)}
      </Typography>

      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle2' color='text.secondary' gutterBottom>
            기본 정보
          </Typography>
          <Typography variant='body2'>
            정산년월: <strong>{fmtYm(detail.settle_year, detail.settle_month)}</strong>
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              상태
            </Typography>
            <Chip label={smeta.label} size='small' color={smeta.color} variant='tonal' />
          </Box>
          <Typography variant='body2' sx={{ mt: 1 }}>
            주문건수:{' '}
            <strong>{detail.order_count != null ? detail.order_count.toLocaleString('ko-KR') : '-'}</strong>
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='caption' color='text.secondary'>
              총 판매금액
            </Typography>
            <Typography variant='h6' fontWeight={600}>
              {won(detail.total_order_amount)}
            </Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='caption' color='text.secondary'>
              공급가 합계
            </Typography>
            <Typography variant='h6' fontWeight={600}>
              {won(detail.settle_amount)}
            </Typography>
          </CardContent>
        </Card>
        <Card variant='outlined' sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
          <CardContent>
            <Typography variant='caption' color='text.secondary'>
              최종 정산액
            </Typography>
            <Typography variant='h6' fontWeight={700} color='primary.main'>
              {won(detail.final_settle_amount)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant='h6' fontWeight={700} gutterBottom>
            조정(가감) 내역
          </Typography>
          {adjustments.length === 0 ? (
            <Typography color='text.secondary'>조정 내역이 없습니다.</Typography>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>유형</th>
                    <th>금액</th>
                    <th>사유</th>
                    <th>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a, i) => (
                    <tr key={i}>
                      <td>{adjLabel(a.adj_type)}</td>
                      <td>{won(a.amount)}</td>
                      <td>{a.reason ?? '-'}</td>
                      <td>{a.created_at ? fmtDate(a.created_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant='h6' fontWeight={700} gutterBottom>
            세부 주문
          </Typography>
          {itemsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>상품명</th>
                    <th>수량</th>
                    <th>판매가</th>
                    <th>공급가</th>
                    <th>정산액</th>
                    <th>배송완료일</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='text-center py-8'>
                        <Typography color='text.secondary'>주문 내역이 없습니다.</Typography>
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={`${it.order_no ?? ''}-${idx}`}>
                        <td>
                          <Typography variant='body2'>{it.order_no ?? '-'}</Typography>
                        </td>
                        <td>
                          <Typography variant='body2'>{it.product_name ?? '-'}</Typography>
                        </td>
                        <td>{it.quantity != null ? it.quantity : '-'}</td>
                        <td>{won(it.sale_price)}</td>
                        <td>{won(it.supply_price)}</td>
                        <td>{won(it.settle_amount)}</td>
                        <td>{it.delivered_at ? fmtDate(it.delivered_at) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination
            component='div'
            count={itemTotal}
            page={itemPage}
            rowsPerPage={ITEM_PAGE_SIZE}
            rowsPerPageOptions={[]}
            onPageChange={(_, p) => setItemPage(p)}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}건`}
          />
        </CardContent>
      </Card>

      <Dialog open={disputeOpen} onClose={() => !disputeSaving && setDisputeOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>정산 이의 제기</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Typography variant='body2' color='text.secondary'>
            이의 제기 시 정산이 보류되며, 관리자가 검토 후 연락드립니다.
          </Typography>
          <CustomTextField
            fullWidth
            multiline
            minRows={4}
            label='이의 사유 *'
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            placeholder='이의 사유를 입력하세요'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant='outlined' color='secondary' disabled={disputeSaving} onClick={() => setDisputeOpen(false)}>
            취소
          </Button>
          <Button
            variant='contained'
            onClick={() => void submitDispute()}
            disabled={disputeSaving}
            startIcon={disputeSaving ? <CircularProgress size={14} color='inherit' /> : undefined}
          >
            제출
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
