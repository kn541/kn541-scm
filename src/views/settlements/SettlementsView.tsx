'use client'
/**
 * KN541 SCM 정산 관리
 * GET /scm/settlements       — 목록
 * GET /scm/settlements/:id   — 상세 (조회 전용)
 */
import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
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
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, fmtMoney, fmtDate } from '@/lib/scmApi'

interface Settlement {
  settlement_id:     string
  settlement_no:     string
  period_from:       string
  period_to:         string
  gross_amount:      number
  commission_amount: number
  net_amount:        number
  status:            string
  paid_at:           string | null
  created_at:        string
}

interface SettlementDetail extends Settlement {
  items?: Array<{
    order_no:    string
    product_name:string
    sale_amount: number
    commission:  number
    net_amount:  number
  }>
}

const STATUS_MAP: Record<string, { label: string; color: 'default'|'warning'|'success'|'info' }> = {
  PENDING:   { label: '정산예정', color: 'warning' },
  CONFIRMED: { label: '확정',     color: 'info'    },
  PAID:      { label: '지급완료', color: 'success' },
}

export default function SettlementsView() {
  const [rows,    setRows]    = useState<Settlement[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [detail,       setDetail]       = useState<SettlementDetail | null>(null)
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [detailLoading,setDetailLoading]= useState(false)

  const load = useCallback(async (pg = 0, s = status) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({ page: String(pg + 1), size: '20' })
      if (s) qs.set('status', s)
      const data = await scmGet<{ items: Settlement[]; total: number }>(`/scm/settlements?${qs}`)
      setRows(data.items ?? []); setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다.')
    } finally { setLoading(false) }
  }, [status])

  useEffect(() => { void load(0) }, [load])

  const openDetail = async (id: string) => {
    setDetailOpen(true); setDetail(null); setDetailLoading(true)
    try {
      const data = await scmGet<SettlementDetail>(`/scm/settlements/${id}`)
      setDetail(data)
    } catch { setDetail(null) }
    finally { setDetailLoading(false) }
  }

  const fmtPeriod = (s: Settlement) =>
    `${fmtDate(s.period_from)} ~ ${fmtDate(s.period_to)}`

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>정산 관리</Typography>

      <Card>
        <CardHeader
          title='정산 목록'
          subheader='정산 내역은 조회만 가능합니다.'
          action={
            loading
              ? <CircularProgress size={16} />
              : <Chip label={`총 ${total.toLocaleString()}건`} size='small' color='primary' variant='outlined' sx={{ fontWeight: 600 }} />
          }
        />

        {/* 필터 */}
        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <CustomTextField select size='small' label='정산상태' value={status}
            onChange={e => { setStatus(e.target.value); setPage(0); void load(0, e.target.value) }}
            sx={{ minWidth: 130 }}>
            <MenuItem value=''>전체</MenuItem>
            {Object.entries(STATUS_MAP).map(([v, m]) => (
              <MenuItem key={v} value={v}>{m.label}</MenuItem>
            ))}
          </CustomTextField>
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
                  <th>정산번호</th>
                  <th>정산기간</th>
                  <th>매출합계</th>
                  <th>수수료</th>
                  <th>정산금액</th>
                  <th>상태</th>
                  <th>지급일</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='text-center py-10'>
                      <Typography color='text.secondary'>정산 내역이 없습니다.</Typography>
                    </td>
                  </tr>
                ) : rows.map((s, idx) => {
                  const sm = STATUS_MAP[s.status] ?? { label: s.status, color: 'default' as const }
                  return (
                    <tr key={s.settlement_id}>
                      <td><Typography variant='body2'>{page * 20 + idx + 1}</Typography></td>
                      <td><Typography variant='body2' fontWeight={600}>{s.settlement_no}</Typography></td>
                      <td><Typography variant='body2'>{fmtPeriod(s)}</Typography></td>
                      <td><Typography variant='body2'>{fmtMoney(s.gross_amount)}</Typography></td>
                      <td>
                        <Typography variant='body2' color='error.main'>
                          -{fmtMoney(s.commission_amount)}
                        </Typography>
                      </td>
                      <td>
                        <Typography variant='body2' fontWeight={700} color='success.main'>
                          {fmtMoney(s.net_amount)}
                        </Typography>
                      </td>
                      <td><Chip label={sm.label} size='small' color={sm.color} variant='tonal' /></td>
                      <td>
                        <Typography variant='caption'>
                          {s.paid_at ? fmtDate(s.paid_at) : '-'}
                        </Typography>
                      </td>
                      <td>
                        <Button size='small' variant='outlined'
                          onClick={() => void openDetail(s.settlement_id)}>
                          상세
                        </Button>
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
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>정산 상세 — {detail?.settlement_no ?? '로딩 중'}</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : detail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <InfoRow label='정산기간'  value={fmtPeriod(detail)} />
              <InfoRow label='매출합계'  value={fmtMoney(detail.gross_amount)} />
              <InfoRow label='수수료'    value={`-${fmtMoney(detail.commission_amount)}`} />
              <InfoRow label='정산금액'  value={fmtMoney(detail.net_amount)} bold />
              <InfoRow label='상태'      value={STATUS_MAP[detail.status]?.label ?? detail.status} />
              <InfoRow label='지급일'    value={detail.paid_at ? fmtDate(detail.paid_at) : '-'} />

              {(detail.items?.length ?? 0) > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='subtitle2' fontWeight={700} color='text.secondary'>
                    주문 내역 ({detail.items!.length}건)
                  </Typography>
                  {detail.items!.map((item, i) => (
                    <Card key={i} variant='outlined' sx={{ p: 1.5 }}>
                      <Typography variant='body2' fontWeight={600}>{item.product_name}</Typography>
                      <Typography variant='caption' color='text.secondary'>{item.order_no}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant='caption'>매출: {fmtMoney(item.sale_amount)}</Typography>
                        <Typography variant='caption' color='error.main'>수수료: -{fmtMoney(item.commission)}</Typography>
                        <Typography variant='caption' color='success.main' fontWeight={600}>정산: {fmtMoney(item.net_amount)}</Typography>
                      </Box>
                    </Card>
                  ))}
                </>
              )}
            </Box>
          ) : (
            <Typography color='text.secondary' textAlign='center'>상세 정보를 불러올 수 없습니다.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant='outlined' color='secondary' onClick={() => setDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

const InfoRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={bold ? 700 : 400}>{value}</Typography>
  </Box>
)
