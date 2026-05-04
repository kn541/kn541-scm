'use client'
/**
 * SCM 정산 현황 목록 — GET /scm/settlements
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'
import { scmGet, fmtDate } from '@/lib/scmApi'

const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1]
const PAGE_SIZE = 10

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'info' | 'primary' | 'warning' | 'success' | 'error' }> = {
  BEFORE:     { label: '정산전',     color: 'default'  },
  PROCESSING: { label: '정산중',     color: 'info'     },
  COMPLETED:  { label: '정산완료',   color: 'primary'  },
  INVOICED:   { label: '계산서완료', color: 'warning'  },
  PAID:       { label: '지급완료',   color: 'success'  },
  ON_HOLD:    { label: '지급보류',   color: 'error'    },
}

interface SettlementListRow {
  id: string
  settle_year: number
  settle_month: number
  status: string
  total_order_amount: number | null
  total_supply_amount: number | null
  adjustment_amount: number | null
  final_settle_amount: number | null
  settle_amount: number | null
  order_count: number | null
  paid_at: string | null
}

function won(n: number | null | undefined) {
  if (n == null) return '-'
  return `${Number(n).toLocaleString('ko-KR')}원`
}

function fmtYm(y: number, m: number) {
  return `${y}년 ${m}월`
}

export default function SettlementListPage() {
  const router = useRouter()
  const [rows, setRows] = useState<SettlementListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [settleYear, setSettleYear] = useState<string>(String(THIS_YEAR))
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({
        page: String(page + 1),
        size: String(PAGE_SIZE),
      })
      if (settleYear !== '') qs.set('settle_year', settleYear)
      if (status) qs.set('status', status)
      const data = await scmGet<{ items: SettlementListRow[]; total: number }>(`/scm/settlements?${qs}`)
      setRows(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('오류가 발생했습니다')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, settleYear, status])

  useEffect(() => {
    void load()
  }, [load])

  const onFilterYear = (v: string) => {
    setSettleYear(v)
    setPage(0)
  }

  const onFilterStatus = (v: string) => {
    setStatus(v)
    setPage(0)
  }

  return (
    <Box className='flex flex-col gap-4'>
      <Typography variant='h5' fontWeight={700}>
        정산 현황
      </Typography>

      <Card>
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <CustomTextField select size='small' label='연도' value={settleYear} onChange={e => onFilterYear(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value=''>전체</MenuItem>
            {YEAR_OPTIONS.map(yr => (
              <MenuItem key={yr} value={String(yr)}>
                {yr}년
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField select size='small' label='상태' value={status} onChange={e => onFilterStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value=''>전체</MenuItem>
            {Object.entries(STATUS_CHIP).map(([code, m]) => (
              <MenuItem key={code} value={code}>
                {m.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Box>

        {error ? (
          <Alert severity='error' sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : null}

        <div className='overflow-x-auto'>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>정산년월</th>
                  <th>상태</th>
                  <th>판매금액</th>
                  <th>공급가</th>
                  <th>조정</th>
                  <th>최종정산액</th>
                  <th>주문수</th>
                  <th>지급일</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className='text-center py-10'>
                      <Typography color='text.secondary'>정산 내역이 없습니다.</Typography>
                    </td>
                  </tr>
                ) : (
                  rows.map(row => {
                    const smeta = STATUS_CHIP[row.status] ?? { label: row.status, color: 'default' as const }
                    const supply = row.total_supply_amount ?? row.settle_amount
                    return (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/settlements/${row.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <Typography variant='body2' fontWeight={600}>
                            {fmtYm(row.settle_year, row.settle_month)}
                          </Typography>
                        </td>
                        <td>
                          <Chip label={smeta.label} size='small' color={smeta.color} variant='tonal' />
                        </td>
                        <td>
                          <Typography variant='body2'>{won(row.total_order_amount)}</Typography>
                        </td>
                        <td>
                          <Typography variant='body2'>{won(supply)}</Typography>
                        </td>
                        <td>
                          <Typography variant='body2'>{won(row.adjustment_amount)}</Typography>
                        </td>
                        <td>
                          <Typography variant='body2' fontWeight={700}>
                            {won(row.final_settle_amount)}
                          </Typography>
                        </td>
                        <td>
                          <Typography variant='body2'>{row.order_count != null ? row.order_count.toLocaleString('ko-KR') : '-'}</Typography>
                        </td>
                        <td>
                          <Typography variant='caption'>{row.paid_at ? fmtDate(row.paid_at) : '-'}</Typography>
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
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[]}
          onPageChange={(_, p) => setPage(p)}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}건`}
        />
      </Card>
    </Box>
  )
}
