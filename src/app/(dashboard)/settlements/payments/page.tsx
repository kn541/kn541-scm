'use client'
/**
 * KN541 SCM 입금 확인 페이지 (TASK 6)
 * GET /scm/settlements?status=PAID
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
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import { scmGet, fmtMoney, fmtDate } from '@/lib/scmApi'

interface Settlement {
  id: string
  settlement_number: string
  period_start: string
  period_end: string
  total_sales: number
  commission_amount: number
  settlement_amount: number
  status: string
  paid_at: string | null
}

interface SettlementsResponse {
  items: Settlement[]
  total: number
}

export default function PaymentsPage() {
  const [items, setItems]     = useState<Settlement[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await scmGet<SettlementsResponse>(
        `/scm/settlements?status=PAID&page=${page}&size=${SIZE}`
      )
      setItems(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <Box>
      <Typography variant='h5' fontWeight={700} sx={{ mb: 3 }}>입금 확인</Typography>

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
        ) : items.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color='text.secondary'>입금 완료된 정산 내역이 없습니다.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>정산번호</TableCell>
                <TableCell>정산기간</TableCell>
                <TableCell align='right'>총 매출</TableCell>
                <TableCell align='right'>수수료</TableCell>
                <TableCell align='right'>정산금액</TableCell>
                <TableCell align='center'>상태</TableCell>
                <TableCell>입금일</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography variant='caption' fontFamily='monospace'>{s.settlement_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {fmtDate(s.period_start)} ~ {fmtDate(s.period_end)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{fmtMoney(s.total_sales)}</TableCell>
                  <TableCell align='right'>{fmtMoney(s.commission_amount)}</TableCell>
                  <TableCell align='right'>
                    <Typography fontWeight={700} color='primary.main'>
                      {fmtMoney(s.settlement_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Chip label='입금완료' size='small' color='success' />
                  </TableCell>
                  <TableCell>{fmtDate(s.paid_at)}</TableCell>
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
    </Box>
  )
}
