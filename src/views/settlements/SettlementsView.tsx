'use client'
/**
 * KN541 SCM 정산 관리
 * GET /scm/settlements — 목록 + 상세 (조회 전용)
 */
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TablePagination from '@mui/material/TablePagination'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import { scmGet, fmtMoney, fmtDate } from '@/lib/scmApi'

interface Settlement {
  settlement_id: string
  period_label: string   // 예: '2026-03'
  total_sales: number
  supply_amount: number
  commission_amount: number
  payout_amount: number
  status: string         // PENDING | CONFIRMED | PAID
  payout_date: string | null
  created_at: string
  item_count: number
}

interface SettlementDetail extends Settlement {
  items?: Array<{
    order_no: string
    product_name: string
    sale_price: number
    supply_price: number
    commission: number
    created_at: string
  }>
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'warning'|'primary'|'success' }> = {
  PENDING:   { label: '정산대기', color: 'warning'  },
  CONFIRMED: { label: '정산확정', color: 'primary'  },
  PAID:      { label: '지급완료', color: 'success'  },
}

export default function SettlementsView() {
  const [rows,    setRows]    = useState<Settlement[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [detail,  setDetail]  = useState<SettlementDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (pg = 0) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      const data = await scmGet<{ items: Settlement[]; total: number }>(`/scm/settlements?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(0) }, [load])

  const openDetail = async (s: Settlement) => {
    setDetailLoading(true)
    try {
      const d = await scmGet<SettlementDetail>(`/scm/settlements/${s.settlement_id}`)
      setDetail(d)
    } catch {
      setDetail(s as SettlementDetail)
    } finally { setDetailLoading(false) }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>정산 관리</Typography>

      <Card>
        <CardHeader title='정산 내역'
          subheader='조회 전용 — 정산 처리는 관리자 어드민에서 진행됩니다.'
          action={!loading && (
            <Chip label={`총 ${total.toLocaleString()}건`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          )}
        />

        {error && <Alert severity='error' sx={{ mx: 3, mb: 2 }}>{error}</Alert>}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  {['정산기간', '총 매출', '공급금액', '수수료', '지급금액', '상태', '지급일', '상세'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--mui-palette-text-secondary)', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Typography color='text.secondary'>정산 내역이 없습니다.</Typography>
                  </td></tr>
                ) : rows.map(s => {
                  const sm = STATUS_MAP[s.status] ?? { label: s.status, color: 'default' as const }
                  return (
                    <tr key={s.settlement_id} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2' fontWeight={700}>{s.period_label}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{fmtMoney(s.total_sales)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{fmtMoney(s.supply_amount)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='body2'>{fmtMoney(s.commission_amount)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Typography variant='body2' fontWeight={700} color={s.status === 'PAID' ? 'success.main' : 'text.primary'}>
                          {fmtMoney(s.payout_amount)}
                        </Typography>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip label={sm.label} size='small' color={sm.color}
                          variant={s.status === 'PAID' ? 'filled' : 'outlined'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}><Typography variant='caption'>{fmtDate(s.payout_date)}</Typography></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Button size='small' variant='text'
                          startIcon={detailLoading ? <CircularProgress size={12} /> : <i className='tabler-eye' />}
                          onClick={() => void openDetail(s)}>상세</Button>
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

      {/* 상세 다이얼로그 */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth='sm' fullWidth>
        <DialogTitle>정산 상세 — {detail?.period_label}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {detail && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={1}>
                {[
                  { label: '총 매출',  value: fmtMoney(detail.total_sales) },
                  { label: '공급금액', value: fmtMoney(detail.supply_amount) },
                  { label: '수수료',   value: fmtMoney(detail.commission_amount) },
                  { label: '지급금액', value: fmtMoney(detail.payout_amount), bold: true },
                  { label: '상태',     value: STATUS_MAP[detail.status]?.label ?? detail.status },
                  { label: '지급일',   value: fmtDate(detail.payout_date) },
                ].map(r => (
                  <Grid key={r.label} item xs={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                      py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant='body2' color='text.secondary'>{r.label}</Typography>
                      <Typography variant='body2' fontWeight={r.bold ? 700 : 400}>{r.value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {detail.items && detail.items.length > 0 && (
                <>
                  <Divider />
                  <Typography variant='subtitle2' color='text.secondary'>상세 항목 ({detail.items.length}건)</Typography>
                  <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                    {detail.items.map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between',
                        py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box>
                          <Typography variant='body2'>{item.product_name}</Typography>
                          <Typography variant='caption' color='text.secondary'>{item.order_no}</Typography>
                        </Box>
                        <Typography variant='body2' fontWeight={600}>{fmtMoney(item.supply_price)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setDetail(null)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
